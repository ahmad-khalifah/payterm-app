'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import { 
  LayoutDashboard, TrendingUp, BarChart3, 
  CheckCircle2, AlertCircle, Building2, FileSearch
} from 'lucide-react'

import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts'

type MetricType = 'Revenue' | 'Volume' | 'Deployed' | 'Arrears'

export default function AdminReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) // Session lock
  const [activeChart, setActiveChart] = useState<MetricType>('Revenue')
  
  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    platformRevenue: 0,
    capitalDeployed: 0,
    totalArrears: 0,
    activeSchools: 0,
    totalParents: 0
  })

  const [schoolPerformance, setSchoolPerformance] = useState<any[]>([])
  const [chartData, setChartData] = useState<any[]>([])

  // 1. Pure Fetch Function
  const fetchPlatformData = useCallback(async (isMounted: boolean = true, isSilent: boolean = false) => {
    try {
      if (isMounted && !isSilent) setLoading(true)
      const { data: plansData, error: plansError } = await supabase
        .from('active_plans')
        .select('school_id, total_fee, amount_paid, status, created_at')

      if (plansError) throw plansError

      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from('withdrawal_requests')
        .select('amount, status')
        .in('status', ['Paid', 'Approved'])

      if (withdrawalsError) throw withdrawalsError

      const { data: schoolsData, error: schoolsError } = await supabase
        .from('partner_schools')
        .select('id, name, tier')

      if (schoolsError) throw schoolsError

      let volume = 0, revenue = 0, arrears = 0, deployed = 0, parentCount = 0
      const schoolMap = new Map()

      if (withdrawalsData) {
        deployed = withdrawalsData.reduce((sum, req) => sum + Number(req.amount), 0)
      }

      // --- GRAPH DATA INITIALIZATION ---
      const monthlyMap = new Map()
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
        monthlyMap.set(key, { name: label, Volume: 0, Revenue: 0, Deployed: 0, Arrears: 0 })
      }

      if (plansData) {
        parentCount = plansData.length
        
        plansData.forEach((plan: any) => {
          const totalFee = Number(plan.total_fee) || 0
          const paid = Number(plan.amount_paid) || 0
          const progress = totalFee > 0 ? paid / totalFee : 0
          
          const baseTuition = totalFee / 1.05
          const paytermCut = totalFee - baseTuition

          const school = schoolsData?.find((s: any) => s.id === plan.school_id)
          const schoolName = (school as any)?.name as string || 'Unassigned'
          const schoolId = plan.school_id || 'Unknown'
          const isTier2 = school && (school as any).tier === 'Tier 2'
          const payoutRate = isTier2 ? 0.70 : 0.60
          const remainderRate = isTier2 ? 0.30 : 0.40

          // Add to totals
          volume += totalFee
          revenue += paytermCut
           arrears += (totalFee - paid)

          // --- POPULATE GRAPH DATA OVER TIME ---
          const d = plan.created_at ? new Date(plan.created_at) : new Date()
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
          
          if (!monthlyMap.has(monthKey)) {
             const label = d.toLocaleString('default', { month: 'short', year: '2-digit' })
             monthlyMap.set(monthKey, { name: label, Volume: 0, Revenue: 0, Deployed: 0, Arrears: 0 })
          }

          const monthStats = monthlyMap.get(monthKey)
          monthStats.Volume += totalFee
          monthStats.Revenue += paytermCut
          monthStats.Arrears += (totalFee - paid)

          let planDeployed = 0
          if (progress >= 0.59) planDeployed += (baseTuition * payoutRate)
          if (progress >= 0.99) planDeployed += (baseTuition * remainderRate)
          monthStats.Deployed += planDeployed

          // --- MAP DATA TO SPECIFIC SCHOOLS ---
          if (!schoolMap.has(schoolId)) {
            schoolMap.set(schoolId, {
              id: schoolId, name: schoolName, volume: 0, revenueGenerated: 0, arrears: 0, defaults: 0
            })
          }

          const schoolStats = schoolMap.get(schoolId)
          schoolStats.volume += totalFee
          schoolStats.revenueGenerated += paytermCut
          schoolStats.arrears += (totalFee - paid)
          if (plan.status === 'Default' || plan.status === 'Late') schoolStats.defaults += 1
        })
      }

      if (isMounted) {
        setMetrics({ totalVolume: volume, platformRevenue: revenue, capitalDeployed: deployed, totalArrears: arrears, activeSchools: schoolMap.size, totalParents: parentCount })
        setSchoolPerformance(Array.from(schoolMap.values()).sort((a, b) => b.revenueGenerated - a.revenueGenerated))
        
        const sortedKeys = Array.from(monthlyMap.keys()).sort()
        setChartData(sortedKeys.map(k => monthlyMap.get(k)))
      }

    } catch (err: any) {
      console.error("Reports Fetch Error:", err.message)
      if (isMounted && !isSilent) toast.error("Failed to compile financial reports.")
    } finally {
      if (isMounted && !isSilent) setLoading(false)
    }
  }, [])

  // 2. THE HOOK GOES HERE: At the top level!
  useRealtimeSync(() => fetchPlatformData(true, true))

  // 3. Normal Component Initialization
  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          router.push('/admin-login')
          return
        }

        // CRITICAL HQ VERIFICATION
        const { data: hqData } = await supabase
          .from('hq_users')
          .select('role')
          .eq('user_email', user.email as string || '')
          .maybeSingle()

        if (!hqData) {
          await supabase.auth.signOut()
          router.push('/admin-login')
          return
        }

        if (isMounted) {
          await fetchPlatformData(isMounted, false)
        }

      } catch (err) {
        console.error("Initialization Error:", err)
        toast.error("HQ Authentication failed.")
        if (isMounted) setLoading(false)
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    initializePage()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/admin-login')
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router, fetchPlatformData])

  const formatYAxis = (val: any) => {
    const num = Number(val) || 0
    if (num >= 1000000) return `₦${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `₦${(num / 1000).toFixed(0)}k`
    return `₦${num}`
  }

  // Define dynamic colors based on the active chart
  const chartConfigs = {
    Revenue: { color: '#0a1128', gradient: 'colorRevenue', title: 'Total PayTerm Revenue' },
    Volume: { color: '#2563eb', gradient: 'colorVolume', title: 'Gross Volume Processed' },
    Deployed: { color: '#16a34a', gradient: 'colorDeployed', title: 'Total Capital Deployed' },
    Arrears: { color: '#dc2626', gradient: 'colorArrears', title: 'Total Missing Arrears' }
  }

  const activeConfig = chartConfigs[activeChart]

  if (isInitializing || loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest text-sm h-screen flex items-center justify-center animate-pulse">Aggregating platform metrics...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20 relative">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-blue-600" />
          Platform Treasury Reports
        </h1>
        <p className="text-gray-500 font-medium text-sm">Real-time revenue, risk exposure, and capital deployment across {metrics.activeSchools} partner schools.</p>
      </div>

      {/* METRIC CARDS - NOW CLICKABLE! */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        <div 
          onClick={() => setActiveChart('Revenue')}
          className={`bg-gradient-to-br from-[#0a1128] to-[#15234b] p-6 md:p-8 rounded-3xl shadow-xl shadow-blue-900/10 text-white relative overflow-hidden group cursor-pointer transition-all duration-200 ${activeChart === 'Revenue' ? 'ring-4 ring-blue-500 ring-offset-2 scale-[1.02]' : 'hover:scale-[1.02] opacity-90 hover:opacity-100'}`}
        >
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest">Total PayTerm Revenue</p>
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <p className="text-3xl font-black text-white truncate mb-1 tracking-tight">₦{metrics.platformRevenue.toLocaleString()}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveChart('Volume')}
          className={`bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm cursor-pointer transition-all duration-200 relative overflow-hidden group ${activeChart === 'Volume' ? 'ring-4 ring-blue-500 ring-offset-2 scale-[1.02]' : 'hover:scale-[1.02] opacity-90 hover:opacity-100'}`}
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gross Volume</p>
              <BarChart3 className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-3xl font-black text-[#0a1128] truncate mb-1 tracking-tight">₦{metrics.totalVolume.toLocaleString()}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveChart('Deployed')}
          className={`bg-green-50/50 p-6 md:p-8 rounded-3xl border border-green-100 shadow-sm cursor-pointer transition-all duration-200 relative overflow-hidden group ${activeChart === 'Deployed' ? 'ring-4 ring-green-500 ring-offset-2 scale-[1.02]' : 'hover:scale-[1.02] opacity-90 hover:opacity-100'}`}
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Capital Deployed</p>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-black text-green-800 truncate mb-1 tracking-tight">₦{metrics.capitalDeployed.toLocaleString()}</p>
          </div>
        </div>

        <div 
          onClick={() => setActiveChart('Arrears')}
          className={`bg-red-50/50 p-6 md:p-8 rounded-3xl border border-red-100 shadow-sm cursor-pointer transition-all duration-200 relative overflow-hidden group ${activeChart === 'Arrears' ? 'ring-4 ring-red-500 ring-offset-2 scale-[1.02]' : 'hover:scale-[1.02] opacity-90 hover:opacity-100'}`}
        >
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Missing Arrears</p>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-black text-red-800 truncate mb-1 tracking-tight">₦{metrics.totalArrears.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* --- DYNAMIC APP PROGRESS GRAPH --- */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm mb-8 relative overflow-hidden transition-all">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: activeConfig.color }}></span>
              {activeConfig.title} Trajectory
            </h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">Monthly historical breakdown over the last 6 months.</p>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#0a1128" stopOpacity={0.3}/><stop offset="95%" stopColor="#0a1128" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/><stop offset="95%" stopColor="#2563eb" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorDeployed" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.3}/><stop offset="95%" stopColor="#16a34a" stopOpacity={0}/></linearGradient>
                <linearGradient id="colorArrears" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dc2626" stopOpacity={0.3}/><stop offset="95%" stopColor="#dc2626" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} tickFormatter={formatYAxis} />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold', color: activeConfig.color }}
                formatter={(value: any, name: any) => [`₦${Number(value).toLocaleString()}`, activeConfig.title]}
              />
              <Area type="monotone" dataKey={activeChart} stroke={activeConfig.color} strokeWidth={4} fillOpacity={1} fill={`url(#${activeConfig.gradient})`} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit relative">
        <div className="p-6 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0a1128]">School Performance Ledger</h2>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="p-5">Partner Institution</th>
                <th className="p-5 text-right">Gross Volume</th>
                <th className="p-5 text-right text-blue-700">Revenue Generated</th>
                <th className="p-5 text-right">Outstanding Arrears</th>
                <th className="p-5 text-center">Default Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {schoolPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                      <FileSearch className="w-8 h-8" />
                    </div>
                    <p className="text-[#0a1128] font-bold text-lg mb-1">No transaction data available yet.</p>
                  </td>
                </tr>
              ) : (
                schoolPerformance.map((school, index) => {
                  const riskLevel = school.defaults > 5 ? 'High' : school.defaults > 0 ? 'Medium' : 'Low'
                  return (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-5">
                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <p className="font-extrabold text-[#0a1128] text-sm">{school.name}</p>
                        </div>
                      </td>
                      <td className="p-5 text-right font-medium text-gray-600 font-mono">₦{school.volume.toLocaleString()}</td>
                      <td className="p-5 text-right">
                        <span className="text-[11px] font-black text-blue-700 font-mono bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 tracking-tight">
                          + ₦{school.revenueGenerated.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black text-[#0a1128] font-mono tracking-tight text-base">₦{school.arrears.toLocaleString()}</td>
                      <td className="p-5 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border inline-block ${
                          riskLevel === 'Low' ? 'bg-green-50 text-green-700 border-green-200' : 
                          riskLevel === 'Medium' ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>{school.defaults} Defaults</span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}