'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'

import { 
  Building2, Users, AlertTriangle, Wallet, 
  CheckCircle2, AlertCircle, Banknote, ShieldAlert,
  ArrowUpRight, XCircle
} from 'lucide-react'

// --- UNIVERSAL PRICING ENGINE ---
const getFeeBreakdown = (totalInvoice: number) => {
  if (!totalInvoice || totalInvoice <= 0) return { fee: 0, base: 0 }
  if (totalInvoice <= 52499) return { fee: 2500, base: totalInvoice - 2500 }
  if (totalInvoice <= 105000) return { fee: 5000, base: totalInvoice - 5000 }
  if (totalInvoice <= 208500) return { fee: 8500, base: totalInvoice - 8500 }
  return { fee: 10000, base: totalInvoice - 10000 }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  const [stats, setStats] = useState({
    schools: 0,
    parents: 0,
    escrowVault: 0,    
    capitalDeployed: 0, 
    recoverable: 0,    
    revenue: 0,        
    personalFloat: 0,  
    overdraftExposure: 0 
  })

  useEffect(() => {
    let isMounted = true;

    const fetchLiveStats = async () => {
      try {
        setFetchError(null)

        const schoolsResponse = await supabase.from('partner_schools').select('*')
        if (schoolsResponse.error) throw new Error(`Schools Table Error: ${schoolsResponse.error.message}`)

        const studentsResponse = await supabase.from('students').select('*')
        if (studentsResponse.error) throw new Error(`Students Table Error: ${studentsResponse.error.message}`)

        const plansResponse = await supabase.from('active_plans').select('*')
        if (plansResponse.error) throw new Error(`Plans Table Error: ${plansResponse.error.message}`)

        const schoolsData = schoolsResponse.data || []
        const studentData = studentsResponse.data || []
        const planData = plansResponse.data || []

        let parentCount = 0
        let vault = 0
        let deployed = 0
        let recoverable = 0
        let revenue = 0
        let overdraft = 0
        
        const activeSchoolsCount = schoolsData.filter((s: any) => s.status === 'Active').length

        studentData.forEach((student: any) => {
          const studentPlan = planData.find((p: any) => p.student_id === student.id && p.status !== 'Completed')
          if (!studentPlan) return
          
          parentCount++

          const totalInvoice = Number(studentPlan.total_fee) || 0
          const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(totalInvoice)
          const amountPaid = Number(studentPlan.amount_paid) || 0
          const progress = totalInvoice > 0 ? (amountPaid / totalInvoice) : 0

          vault += amountPaid
          
          if (amountPaid > 0) revenue += serviceFee

          const school = schoolsData.find((s: any) => s.id === studentPlan.school_id)
          const isTier2 = school && (school as any).tier === 'Tier 2'
          const payoutRate = isTier2 ? 0.70 : 0.60
          
          const isVerified = student.enrollment_status === 'Verified' || studentPlan.status === 'Active'
          
          if (isVerified) {
            if (progress >= 0.59 && progress < 0.99) {
              deployed += (baseTuition * payoutRate)
              recoverable += (totalInvoice - amountPaid) 
              if (isTier2) overdraft += (baseTuition * 0.10)
            } else if (progress >= 0.99) {
              deployed += baseTuition 
            }
          }
        })

        const activeFloat = Math.max(0, deployed - (vault - revenue))

        if (isMounted) {
          setStats({
            schools: activeSchoolsCount,
            parents: parentCount,
            escrowVault: vault,
            capitalDeployed: deployed,
            recoverable: recoverable,
            revenue: revenue,
            personalFloat: activeFloat,
            overdraftExposure: overdraft
          })
          setFetchError(null)
        }

      } catch (err: any) {
        console.error("Dashboard fetch error:", err)
        if (isMounted) setFetchError(err.message || "Failed to fetch data from Supabase.")
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchLiveStats()
    // Add this right under where you call your fetch function (e.g., fetchLiveStats())
    const handleSilentRefresh = () => { if (isMounted) fetchLiveStats() }
    window.addEventListener('payterm-db-update', handleSilentRefresh)

    // And make sure to remove it in the cleanup return:
    return () => { 
      isMounted = false 
      window.removeEventListener('payterm-db-update', handleSilentRefresh)
    }

    return () => { isMounted = false }
  }, [])

  if (fetchError) {
    return (
      <div className="w-full max-w-3xl mx-auto p-10 mt-20 bg-red-50 border border-red-200 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
          <h1 className="text-xl font-bold text-red-900">Dashboard Render Failure</h1>
        </div>
        <p className="text-red-700 font-mono text-sm bg-white p-4 rounded-xl border border-red-100">
          {fetchError}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase text-sm h-screen flex items-center justify-center animate-pulse">Loading Liquidity Engine...</div>
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20 relative">
      
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0a1128] tracking-tight mb-1.5 flex items-center gap-2">
            <Wallet className="w-6 h-6 text-blue-600" />
            Admin Liquidity Center
          </h1>
          <p className="text-gray-500 font-medium text-xs">Real-time tracking of escrow balances, factoring liabilities, and float.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        
        <div className="bg-gradient-to-br from-[#0a1128] to-[#15234b] p-5 md:p-6 rounded-2xl shadow-xl shadow-blue-900/10 text-white relative overflow-hidden group col-span-1 md:col-span-2">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-[9px] sm:text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Banknote className="w-3.5 h-3.5" /> Total Platform Escrow
              </p>
              <p className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-white">₦{stats.escrowVault.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 backdrop-blur-sm">
              <p className="text-[9px] text-blue-200 uppercase tracking-widest font-bold mb-0.5">Realized Margin</p>
              <p className="text-lg font-bold font-mono text-green-400">₦{stats.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50/80 p-5 md:p-6 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full blur-2xl -mt-6 -mr-6 pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-[9px] sm:text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Partner Bank Overdraft
            </h3>
            <div className="text-2xl font-black font-mono text-[#0a1128] tracking-tight">₦{stats.overdraftExposure.toLocaleString()}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Active Schools</p>
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-xl font-black text-[#0a1128] tracking-tight">{stats.schools}</p>
        </div>

        <div className="bg-white p-4 md:p-5 rounded-2xl border border-gray-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Parent Plans</p>
            <Users className="w-3.5 h-3.5 text-gray-400" />
          </div>
          <p className="text-xl font-black text-[#0a1128] tracking-tight">{stats.parents}</p>
        </div>

        <div className="bg-blue-50/50 p-4 md:p-5 rounded-2xl border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[9px] font-bold text-blue-700 uppercase tracking-widest">Capital Deployed</p>
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-lg md:text-xl font-black font-mono text-[#0a1128] tracking-tight">₦{stats.capitalDeployed.toLocaleString()}</p>
        </div>

        <div className="bg-orange-50/50 p-4 md:p-5 rounded-2xl border border-orange-100 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <p className="text-[9px] font-bold text-orange-700 uppercase tracking-widest">Pending Receivables</p>
            <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
          </div>
          <p className="text-lg md:text-xl font-black font-mono text-orange-800 tracking-tight">₦{stats.recoverable.toLocaleString()}</p>
        </div>
      </div>

      <div className={`p-5 md:p-6 rounded-2xl border shadow-sm mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 transition-colors ${
        stats.personalFloat > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 ${stats.personalFloat > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h2 className={`text-sm font-extrabold tracking-tight mb-1 ${stats.personalFloat > 0 ? 'text-red-800' : 'text-gray-600'}`}>
              Active Personal Float
            </h2>
            <p className={`text-[11px] font-medium max-w-xl leading-relaxed ${stats.personalFloat > 0 ? 'text-red-600/80' : 'text-gray-500'}`}>
              The exact amount of personal capital currently deployed to cover the gap between parent downpayments and immediate school payouts.
            </p>
          </div>
        </div>
        <div className={`text-2xl md:text-3xl font-black font-mono tracking-tight ${stats.personalFloat > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          ₦{stats.personalFloat.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-50 bg-white">
          <h2 className="text-base font-bold text-[#0a1128]">Action Required: Pending Payouts</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[9px] text-gray-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">School</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Destination</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-500 mb-3">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-[#0a1128] font-bold text-sm mb-0.5">Inbox Zero</p>
                  <p className="text-xs text-gray-500 font-medium">No pending withdrawal requests. All schools are settled.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}