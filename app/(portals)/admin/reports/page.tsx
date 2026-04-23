'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function AdminReportsPage() {
  const [loading, setLoading] = useState(true)
  
  // Platform-wide KPIs
  const [metrics, setMetrics] = useState({
    totalVolume: 0,
    platformRevenue: 0,
    capitalDeployed: 0,
    totalArrears: 0,
    activeSchools: 0,
    totalParents: 0
  })

  // Table Data
  const [schoolPerformance, setSchoolPerformance] = useState<any[]>([])

  useEffect(() => {
    const fetchPlatformData = async () => {
      try {
        // 1. Fetch all active plans across the platform
        const { data: plansData, error: plansError } = await supabase
          .from('active_plans')
          .select(`
            total_fee, amount_paid, status,
            students (
              partner_schools ( name, id )
            )
          `)

        if (plansError) throw plansError

        // 2. Fetch all successful withdrawals to calculate deployed capital
        const { data: withdrawalsData, error: withdrawalsError } = await supabase
          .from('withdrawal_requests')
          .select('amount, status')
          .in('status', ['Paid', 'Approved'])

        if (withdrawalsError) throw withdrawalsError

        // --- MATH ENGINE ---
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
            
            // Reverse-engineer the 5% margin. If Parent Total = 105%, Base = Total / 1.05
            const baseTuition = totalFee / 1.05
            const paytermCut = totalFee - baseTuition

            volume += totalFee
            revenue += paytermCut
            arrears += (totalFee - paid)

            // Map data to specific schools for the ledger
            const schoolName = plan.students?.partner_schools?.name || 'Unassigned'
            const schoolId = plan.students?.partner_schools?.id || 'Unknown'

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

        // Convert Map to Array and sort by Revenue Generated (Highest first)
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

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-full flex items-center justify-center animate-pulse">Aggregating platform metrics...</div>

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0a1128] tracking-tight mb-2">Platform Treasury Reports</h1>
        <p className="text-gray-500 text-sm">Real-time revenue, risk exposure, and capital deployment across {metrics.activeSchools} partner schools.</p>
      </div>

      {/* TOP KPI GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        {/* Revenue Card (Dark Mode for emphasis) */}
        <div className="bg-[#0a1128] p-6 rounded-2xl border border-[#15234b] shadow-xl relative overflow-hidden transform hover:-translate-y-1 transition-transform">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-blue-500 opacity-20 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-2">Total PayTerm Revenue</p>
            <p className="text-3xl font-bold text-white truncate mb-1">₦{metrics.platformRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 font-medium">Earned from the 5% platform margin.</p>
          </div>
        </div>

        {/* Volume Card */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Gross Volume Processed</p>
          <p className="text-3xl font-bold text-[#0a1128] truncate mb-1">₦{metrics.totalVolume.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 font-medium">Across {metrics.totalParents} active parent plans.</p>
        </div>

        {/* Capital Deployed Card */}
        <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">Total Capital Deployed</p>
          <p className="text-3xl font-bold text-green-800 truncate mb-1">₦{metrics.capitalDeployed.toLocaleString()}</p>
          <p className="text-[10px] text-green-600 font-medium">80% tranches successfully paid to schools.</p>
        </div>

        {/* Arrears Risk Card */}
        <div className="bg-red-50 p-6 rounded-2xl border border-red-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-red-700 uppercase tracking-wide mb-2">Total Missing Arrears</p>
          <p className="text-3xl font-bold text-red-800 truncate mb-1">₦{metrics.totalArrears.toLocaleString()}</p>
          <p className="text-[10px] text-red-600 font-medium">Outstanding 40% mid-term balances.</p>
        </div>
      </div>

      {/* SCHOOL PERFORMANCE LEDGER */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50/50 p-6 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-[#0a1128]">School Performance Ledger</h2>
            <p className="text-xs text-gray-500 mt-1">Analyze which institutions are driving the most revenue vs. risk.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-white border-b border-gray-200 text-xs text-[#0a1128] uppercase tracking-wide">
                <th className="p-5 font-bold">Partner Institution</th>
                <th className="p-5 font-bold text-right">Gross Volume</th>
                <th className="p-5 font-bold text-right text-blue-700">Revenue Generated</th>
                <th className="p-5 font-bold text-right">Outstanding Arrears</th>
                <th className="p-5 font-bold text-center">Default Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {schoolPerformance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-gray-500 font-medium">
                    No transaction data available yet.
                  </td>
                </tr>
              ) : (
                schoolPerformance.map((school, index) => {
                  const riskLevel = school.defaults > 5 ? 'High' : school.defaults > 0 ? 'Medium' : 'Low'
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="p-5">
                        <p className="font-bold text-[#0a1128]">{school.name}</p>
                      </td>
                      <td className="p-5 text-right font-medium text-gray-600 font-mono">
                        ₦{school.volume.toLocaleString()}
                      </td>
                      <td className="p-5 text-right">
                        <span className="text-sm font-bold text-blue-600 font-mono bg-blue-50 px-2 py-1 rounded-md">
                          + ₦{school.revenueGenerated.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-5 text-right font-bold text-[#0a1128] font-mono">
                        ₦{school.arrears.toLocaleString()}
                      </td>
                      <td className="p-5 text-center">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${
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