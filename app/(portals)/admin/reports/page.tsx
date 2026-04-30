'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

import { 
  LayoutDashboard, TrendingUp, BarChart3, 
  CheckCircle2, AlertCircle, Building2, FileSearch
} from 'lucide-react'

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  
  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    platformRevenue: 0,
    capitalDeployed: 0,
    totalArrears: 0,
    activeSchools: 0,
    totalParents: 0
  })

  const [schoolPerformance, setSchoolPerformance] = useState<any[]>([])

  useEffect(() => {
    const fetchPlatformData = async () => {
      try {
        // 1. Fetch active plans without nested joins
        const { data: plansData, error: plansError } = await supabase
          .from('active_plans')
          .select('school_id, total_fee, amount_paid, status')

        if (plansError) throw plansError

        // 2. Fetch withdrawals
        const { data: withdrawalsData, error: withdrawalsError } = await supabase
          .from('withdrawal_requests')
          .select('amount, status')
          .in('status', ['Paid', 'Approved'])

        if (withdrawalsError) throw withdrawalsError

        // 3. Fetch schools independently
        const { data: schoolsData, error: schoolsError } = await supabase
          .from('partner_schools')
          .select('id, name')

        if (schoolsError) throw schoolsError

        let volume = 0
        let revenue = 0
        let arrears = 0
        let deployed = 0
        let parentCount = 0
        const schoolMap = new Map()

        if (withdrawalsData) {
          deployed = withdrawalsData.reduce((sum, req) => sum + Number(req.amount), 0)
        }

        if (plansData) {
          parentCount = plansData.length
          
          plansData.forEach((plan: any) => {
            const totalFee = Number(plan.total_fee)
            const paid = Number(plan.amount_paid)
            
            const baseTuition = totalFee / 1.05
            const paytermCut = totalFee - baseTuition

            volume += totalFee
            revenue += paytermCut
            arrears += (totalFee - paid)

            // Map data to specific schools using the flat array
            const schoolName = schoolsData?.find(s => s.id === plan.school_id)?.name || 'Unassigned'
            const schoolId = plan.school_id || 'Unknown'

            if (!schoolMap.has(schoolId)) {
              schoolMap.set(schoolId, {
                id: schoolId,
                name: schoolName,
                volume: 0,
                revenueGenerated: 0,
                arrears: 0,
                defaults: 0
              })
            }

            const schoolStats = schoolMap.get(schoolId)
            schoolStats.volume += totalFee
            schoolStats.revenueGenerated += paytermCut
            schoolStats.arrears += (totalFee - paid)
            if (plan.status === 'Default' || plan.status === 'Late') {
              schoolStats.defaults += 1
            }
          })
        }

        setMetrics({
          totalVolume: volume,
          platformRevenue: revenue,
          capitalDeployed: deployed,
          totalArrears: arrears,
          activeSchools: schoolMap.size,
          totalParents: parentCount
        })

        const sortedSchools = Array.from(schoolMap.values()).sort((a, b) => b.revenueGenerated - a.revenueGenerated)
        setSchoolPerformance(sortedSchools)

      } catch (err: any) {
        console.error("Reports Fetch Error:", err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPlatformData()
  }, [])

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-screen flex items-center justify-center animate-pulse">Aggregating platform metrics...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20 relative">
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
          <LayoutDashboard className="w-8 h-8 text-purple-600" />
          Platform Treasury Reports
        </h1>
        <p className="text-gray-500 font-medium text-sm">Real-time revenue, risk exposure, and capital deployment across {metrics.activeSchools} partner schools.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        <div className="bg-gradient-to-br from-[#050a15] to-purple-950 p-6 md:p-8 rounded-3xl shadow-xl shadow-purple-900/10 text-white relative overflow-hidden group">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-purple-300 uppercase tracking-widest">Total PayTerm Revenue</p>
              <TrendingUp className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl font-black text-white truncate mb-1 tracking-tight">₦{metrics.platformRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-purple-300/70 font-medium">Earned from the 5% platform margin.</p>
          </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Gross Volume Processed</p>
              <BarChart3 className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-3xl font-black text-[#0a1128] truncate mb-1 tracking-tight">₦{metrics.totalVolume.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-medium">Across {metrics.totalParents} active parent plans.</p>
          </div>
        </div>

        <div className="bg-green-50/50 p-6 md:p-8 rounded-3xl border border-green-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest">Total Capital Deployed</p>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl font-black text-green-800 truncate mb-1 tracking-tight">₦{metrics.capitalDeployed.toLocaleString()}</p>
            <p className="text-[10px] text-green-600 font-medium">80% tranches successfully paid to schools.</p>
          </div>
        </div>

        <div className="bg-red-50/50 p-6 md:p-8 rounded-3xl border border-red-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-100 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] font-bold text-red-700 uppercase tracking-widest">Total Missing Arrears</p>
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-3xl font-black text-red-800 truncate mb-1 tracking-tight">₦{metrics.totalArrears.toLocaleString()}</p>
            <p className="text-[10px] text-red-600 font-medium">Outstanding 40% mid-term balances.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit relative">
        <div className="p-6 border-b border-gray-100 bg-white flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0a1128]">School Performance Ledger</h2>
            <p className="text-xs text-gray-500 mt-1 font-medium">Analyze which institutions are driving the most revenue vs. risk.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="p-5">Partner Institution</th>
                <th className="p-5 text-right">Gross Volume</th>
                <th className="p-5 text-right text-purple-700">Revenue Generated</th>
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
                    <p className="text-sm text-gray-500 font-medium">Once parents start paying, school performance metrics will appear here.</p>
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
                      <td className="p-5 text-right font-medium text-gray-600 font-mono">
                        ₦{school.volume.toLocaleString()}
                      </td>
                      <td className="p-5 text-right">
                        <span className="text-[11px] font-black text-purple-700 font-mono bg-purple-50 px-2.5 py-1 rounded-md border border-purple-100 tracking-tight">
                          + ₦{school.revenueGenerated.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-5 text-right font-black text-[#0a1128] font-mono tracking-tight text-base">
                        ₦{school.arrears.toLocaleString()}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border inline-block ${
                          riskLevel === 'Low' ? 'bg-green-50 text-green-700 border-green-200' : 
                          riskLevel === 'Medium' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {school.defaults} Defaults
                        </span>
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