'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// --- NEW LUCIDE ICONS ---
import { 
  Building2, Users, AlertTriangle, Wallet, 
  CheckCircle2, AlertCircle, Banknote, ShieldAlert,
  ArrowUpRight
} from 'lucide-react'

// --- UNIVERSAL PRICING ENGINE ---
const getFeeBreakdown = (totalInvoice: number) => {
  if (totalInvoice <= 52499) return { fee: 2500, base: totalInvoice - 2500 }
  if (totalInvoice <= 105000) return { fee: 5000, base: totalInvoice - 5000 }
  if (totalInvoice <= 208500) return { fee: 8500, base: totalInvoice - 8500 }
  return { fee: 10000, base: totalInvoice - 10000 }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    schools: 0,
    parents: 0,
    escrowVault: 0,    // Cash collected from parents
    capitalDeployed: 0, // Tranches cleared for schools
    recoverable: 0,    // Mid-term balances owed by parents
    revenue: 0,        // Realized flat-rate cut
    personalFloat: 0,  // Out-of-pocket cash covering the gap
    overdraftExposure: 0 // TAJBank's 10% risk
  })

  useEffect(() => {
    let isMounted = true;

    const fetchLiveStats = async () => {
      try {
        const [
          { data: schoolsData, error: schoolError },
          { data: studentData, error: studentError },
          { data: planData, error: planError }
        ] = await Promise.all([
          supabase.from('partner_schools').select('*'),
          supabase.from('students').select('id, enrollment_status'),
          supabase.from('active_plans').select('student_id, school_id, total_fee, amount_paid, status')
        ])

        if (schoolError) throw schoolError
        if (studentError) throw studentError
        if (planError) throw planError

        let parentCount = 0
        let vault = 0
        let deployed = 0
        let recoverable = 0
        let revenue = 0
        let overdraft = 0

        const safeStudents = studentData || []
        const safePlans = planData || []
        
        const activeSchoolsCount = schoolsData?.filter((s: any) => s.status === 'Active').length || 0

        safeStudents.forEach((student: any) => {
          const studentPlan = safePlans.find((p: any) => p.student_id === student.id && p.status !== 'Completed')
          if (!studentPlan) return
          
          parentCount++

          const totalInvoice = Number(studentPlan.total_fee) || 0
          const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(totalInvoice)
          const amountPaid = Number(studentPlan.amount_paid) || 0
          const progress = totalInvoice > 0 ? (amountPaid / totalInvoice) : 0

          vault += amountPaid
          
          if (amountPaid > 0) {
            revenue += serviceFee
          }

          const school = schoolsData?.find((s: any) => s.id === studentPlan.school_id)
          const isTier2 = (school as any)?.tier === 'Tier 2'
          const payoutRate = isTier2 ? 0.70 : 0.60
          const isVerified = student.enrollment_status === 'Verified' || studentPlan.status === 'Active'
          
          if (isVerified) {
            if (progress >= 0.59 && progress < 0.99) {
              deployed += (baseTuition * payoutRate)
              recoverable += (totalInvoice - amountPaid) 
              
              if (isTier2) {
                overdraft += (baseTuition * 0.10)
              }
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
        }

      } catch (err: any) {
        console.error("Dashboard fetch error:", err.message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchLiveStats()

    return () => { isMounted = false }
  }, [])

  if (loading) {
    return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-screen flex items-center justify-center animate-pulse">Loading Liquidity Engine...</div>
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20 relative">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
            <Wallet className="w-8 h-8 text-purple-600" />
            Admin Liquidity Center
          </h1>
          <p className="text-gray-500 font-medium text-sm">Real-time tracking of escrow balances, factoring liabilities, and float.</p>
        </div>
      </div>

      {/* TOP OPERATIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        
        <div className="bg-gradient-to-br from-[#050a15] to-purple-950 p-6 md:p-8 rounded-3xl shadow-xl shadow-purple-900/10 text-white relative overflow-hidden group col-span-1 md:col-span-2">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none transition-transform group-hover:scale-110"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <p className="text-[10px] sm:text-xs font-bold text-purple-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                <Banknote className="w-4 h-4" />
                Total Platform Escrow
              </p>
              <p className="text-3xl sm:text-5xl font-black font-mono tracking-tight text-white">₦{stats.escrowVault.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 px-4 py-2.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] text-purple-200 uppercase tracking-widest font-bold mb-1">Realized Margin</p>
              <p className="text-xl font-bold font-mono text-green-400">₦{stats.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
          </div>
        </div>

        {/* OVERDRAFT EXPOSURE */}
        <div className="bg-purple-50/80 p-6 md:p-8 rounded-3xl border border-purple-100 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none"></div>
          <div className="relative z-10">
            <h3 className="text-[10px] sm:text-xs font-bold text-purple-700 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              Partner Bank Overdraft
            </h3>
            <div className="text-3xl font-black font-mono text-purple-900 tracking-tight">₦{stats.overdraftExposure.toLocaleString()}</div>
            <p className="text-[10px] text-purple-500 mt-2 font-bold uppercase tracking-wider">TAJBank 10% Risk (Tier 2)</p>
          </div>
        </div>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5 mb-8">
        <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Schools</p>
            <Building2 className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-[#0a1128] tracking-tight">{stats.schools}</p>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Parent Plans</p>
            <Users className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-black text-[#0a1128] tracking-tight">{stats.parents}</p>
        </div>

        <div className="bg-blue-50/50 p-5 md:p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">Capital Deployed</p>
            <ArrowUpRight className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-xl md:text-2xl font-black font-mono text-blue-800 tracking-tight">₦{stats.capitalDeployed.toLocaleString()}</p>
        </div>

        <div className="bg-orange-50/50 p-5 md:p-6 rounded-3xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="flex justify-between items-start mb-3">
            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest">Pending Receivables</p>
            <AlertCircle className="w-4 h-4 text-orange-500" />
          </div>
          <p className="text-xl md:text-2xl font-black font-mono text-orange-800 tracking-tight">₦{stats.recoverable.toLocaleString()}</p>
        </div>
      </div>

      {/* CRITICAL RISK WARNING */}
      <div className={`p-6 md:p-8 rounded-3xl border shadow-sm mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-colors ${
        stats.personalFloat > 0 ? 'bg-red-50/80 border-red-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-2xl shrink-0 ${stats.personalFloat > 0 ? 'bg-red-100 text-red-600' : 'bg-gray-200 text-gray-500'}`}>
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className={`text-base font-extrabold tracking-tight mb-1 ${stats.personalFloat > 0 ? 'text-red-800' : 'text-gray-600'}`}>
              Active Personal Float
            </h2>
            <p className={`text-xs font-medium max-w-xl leading-relaxed ${stats.personalFloat > 0 ? 'text-red-600/80' : 'text-gray-500'}`}>
              The exact amount of personal capital currently deployed to cover the gap between parent downpayments and immediate school payouts.
            </p>
          </div>
        </div>
        <div className={`text-3xl md:text-4xl font-black font-mono tracking-tight ${stats.personalFloat > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          ₦{stats.personalFloat.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>

      {/* ACTION REQUIRED TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-50 bg-white">
          <h2 className="text-lg font-bold text-[#0a1128]">Action Required: Pending Payouts</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="p-5">Date</th>
                <th className="p-5">School</th>
                <th className="p-5">Amount</th>
                <th className="p-5">Destination</th>
                <th className="p-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="p-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-green-500 mb-4">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <p className="text-[#0a1128] font-bold text-lg mb-1">Inbox Zero</p>
                  <p className="text-sm text-gray-500 font-medium">No pending withdrawal requests. All schools are settled.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}