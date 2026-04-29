'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// --- NEW UNIVERSAL PRICING ENGINE ---
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
    capitalDeployed: 0, // Tranches cleared for schools (Tier 1: 60%, Tier 2: 70%)
    recoverable: 0,    // The 40% mid-term balances owed by parents
    revenue: 0,        // Our realized flat-rate cut
    personalFloat: 0,  // Out-of-pocket cash covering the gap
    overdraftExposure: 0 // TAJBank's 10% risk for Tier 2 schools
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

        // Liquidity Engine Variables
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
          
          // EXTRACT FLAT FEE LOGIC
          const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(totalInvoice)
          const amountPaid = Number(studentPlan.amount_paid) || 0
          
          const progress = totalInvoice > 0 ? (amountPaid / totalInvoice) : 0

          vault += amountPaid
          
          // REVENUE IS FRONT-LOADED: If they paid anything at all, we instantly realize the full flat service fee
          if (amountPaid > 0) {
            revenue += serviceFee
          }

          // Determine the payout rate based on the school's tier
          const school = schoolsData?.find((s: any) => s.id === studentPlan.school_id)
          const isTier2 = (school as any)?.tier === 'Tier 2'
          const payoutRate = isTier2 ? 0.70 : 0.60

          const isVerified = student.enrollment_status === 'Verified' || studentPlan.status === 'Active'
          
          if (isVerified) {
            if (progress >= 0.59 && progress < 0.99) {
              // Deploy capital dynamically based on Tier
              deployed += (baseTuition * payoutRate)
              recoverable += (totalInvoice - amountPaid) 
              
              // If it's Tier 2, log the 10% overdraft exposure
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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0a1128] mb-1 tracking-tight">Admin Liquidity Center</h1>
        <p className="text-gray-500 text-sm">Real-time tracking of escrow balances, factoring liabilities, and float.</p>
      </div>

      {/* OPERATIONS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <h3 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Partner Schools</h3>
            <div className="text-2xl md:text-3xl font-bold text-[#0a1128]">{stats.schools}</div>
          </div>
          <div className="h-10 w-10 md:h-12 md:w-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 text-xl shrink-0"></div>
        </div>

        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center">
          <div>
            <h3 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Active Parent Plans</h3>
            <div className="text-2xl md:text-3xl font-bold text-[#0a1128]">{stats.parents}</div>
          </div>
          <div className="h-10 w-10 md:h-12 md:w-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 text-xl shrink-0"></div>
        </div>

        {/* OVERDRAFT EXPOSURE */}
        <div className="bg-purple-50 p-5 md:p-6 rounded-2xl border border-purple-200 shadow-sm flex justify-between items-center">
          <div>
            <h3 className="text-[10px] md:text-xs font-bold text-purple-700 uppercase tracking-wide mb-1">Partner Bank Overdraft</h3>
            <div className="text-2xl md:text-3xl font-bold font-mono text-purple-900">₦{stats.overdraftExposure.toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* LIQUIDITY ENGINE GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
        
        {/* VAULT */}
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 md:mb-3">
            Escrow Vault
          </h3>
          <div className="text-2xl md:text-3xl font-black font-mono text-[#0a1128] truncate mb-1">₦{stats.escrowVault.toLocaleString()}</div>
          <p className="text-[9px] md:text-[10px] text-gray-400 font-bold uppercase tracking-wider">Raw parent cash collected</p>
        </div>

        {/* DEPLOYED */}
        <div className="bg-blue-50 p-5 md:p-6 rounded-2xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-[10px] md:text-xs font-bold text-blue-700 uppercase tracking-wide mb-2 md:mb-3">School Payouts Cleared</h3>
          <div className="text-2xl md:text-3xl font-black font-mono text-blue-800 truncate mb-1">₦{stats.capitalDeployed.toLocaleString()}</div>
          <p className="text-[9px] md:text-[10px] text-blue-500 font-bold uppercase tracking-wider">Total school liabilities</p>
        </div>

        {/* RECOVERABLE */}
        <div className="bg-orange-50 p-5 md:p-6 rounded-2xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-[10px] md:text-xs font-bold text-orange-700 uppercase tracking-wide mb-2 md:mb-3">Pending Receivables</h3>
          <div className="text-2xl md:text-3xl font-black font-mono text-orange-800 truncate mb-1">₦{stats.recoverable.toLocaleString()}</div>
          <p className="text-[9px] md:text-[10px] text-orange-500 font-bold uppercase tracking-wider">Owed by parents (40%)</p>
        </div>

        {/* REVENUE */}
        <div className="bg-green-50 p-5 md:p-6 rounded-2xl border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-[10px] md:text-xs font-bold text-green-700 uppercase tracking-wide mb-2 md:mb-3">Realized Margin</h3>
          <div className="text-2xl md:text-3xl font-black font-mono text-green-800 truncate mb-1">₦{stats.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          <p className="text-[9px] md:text-[10px] text-green-600 font-bold uppercase tracking-wider">Safe to withdraw</p>
        </div>

      </div>

      {/* CRITICAL RISK WARNING */}
      <div className={`p-5 md:p-6 rounded-2xl border shadow-sm mb-8 md:mb-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
        stats.personalFloat > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
      }`}>
        <div>
          <h2 className={`text-sm md:text-base font-bold tracking-wide mb-1 ${stats.personalFloat > 0 ? 'text-red-700' : 'text-gray-600'}`}>
            Active Personal Float
          </h2>
          <p className={`text-xs ${stats.personalFloat > 0 ? 'text-red-500' : 'text-gray-500'} max-w-xl leading-relaxed`}>
            The exact amount of personal capital currently deployed to cover the gap between parent downpayments and school payouts.
          </p>
        </div>
        <div className={`text-3xl md:text-4xl font-black font-mono truncate ${stats.personalFloat > 0 ? 'text-red-600' : 'text-gray-400'}`}>
          ₦{stats.personalFloat.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>

      {/* ACTION REQUIRED TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50/50 p-4 sm:p-5 border-b border-gray-200">
          <h2 className="text-sm font-bold text-[#0a1128]">Action Required: Pending Payouts</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-bold">Date</th>
                <th className="p-4 font-bold">School</th>
                <th className="p-4 font-bold">Amount</th>
                <th className="p-4 font-bold">Destination</th>
                <th className="p-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="p-8 text-center text-sm text-gray-500 font-medium">
                  No pending withdrawal requests. All schools are settled.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}