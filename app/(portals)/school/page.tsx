'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'

// --- NEW UNIVERSAL PRICING ENGINE ---
const getFeeBreakdown = (totalInvoice: number) => {
  if (totalInvoice <= 52499) return { fee: 2500, base: totalInvoice - 2500 }
  if (totalInvoice <= 105000) return { fee: 5000, base: totalInvoice - 5000 }
  if (totalInvoice <= 208500) return { fee: 8500, base: totalInvoice - 8500 }
  return { fee: 10000, base: totalInvoice - 10000 }
}

export default function SchoolDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  const [metrics, setMetrics] = useState({
    activeStudents: 0,
    totalFinanced: 0,
    payoutsCleared: 0,
    paymentWaiting: 0, 
  })

  const [recentPayments, setRecentPayments] = useState<any[]>([])

  const fetchDashboardData = async (idToFetch: string, isMounted: boolean = true) => {
    try {
      // 1. Fetch the School's Tier to determine payout logic dynamically
      const { data: schoolData } = await supabase
        .from('partner_schools')
        .select('*')
        .eq('id', idToFetch)
        .maybeSingle()

      // Set the dynamic math variables
      const payoutRate = (schoolData as any)?.tier === 'Tier 2' ? 0.70 : 0.60
      const remainderRate = (schoolData as any)?.tier === 'Tier 2' ? 0.30 : 0.40

      // 2. Fetch the Students and Plans
      const { data: studentData, error } = await supabase
        .from('students')
        .select(`
          id, full_name, enrollment_status, student_class,
          active_plans ( total_fee, amount_paid )
        `)
        .eq('school_id', idToFetch)

      if (error) throw error

      let financed = 0
      let cleared = 0
      let pendingPayment = 0
      let activeCount = 0
      let ledger: any[] = [] 

      if (studentData) {
        studentData.forEach(student => {
          const plan = student.active_plans[0]
          if (!plan) return

          // NEW PRICING ENGINE CALCULATION
          const { base: baseTuition } = getFeeBreakdown(Number(plan.total_fee))
          const amountPaid = Number(plan.amount_paid)
          
          // Dynamic Tier Math Calculations
          if (student.enrollment_status === 'Verified') {
            activeCount++
            financed += baseTuition
            
            const progress = amountPaid / Number(plan.total_fee)
            // Using 0.59 to prevent floating point decimal bugs
            if (progress >= 0.59) cleared += (baseTuition * payoutRate)
            if (progress >= 0.99) cleared += (baseTuition * remainderRate)
          } 
          else if (student.enrollment_status === 'Pending Verification' && amountPaid > 0) {
            // Money is held in Escrow based on their tier until the school verifies the student
            pendingPayment += (baseTuition * payoutRate)
          }

          if (amountPaid > 0) {
            ledger.push({
              id: student.id,
              studentName: student.full_name,
              className: student.student_class,
              amountPaid: amountPaid,
              baseTuition: baseTuition, // <--- ADDED FIX HERE
              totalInvoice: Number(plan.total_fee),
              status: student.enrollment_status,
              schoolCut: (baseTuition * payoutRate)
            })
          }
        })

        if (isMounted) {
          setMetrics({
            activeStudents: activeCount,
            totalFinanced: financed,
            payoutsCleared: cleared,
            paymentWaiting: pendingPayment
          })
          setRecentPayments(ledger)
        }
      }
    } catch (err: any) {
      console.error("Dashboard Fetch Error:", err.message || JSON.stringify(err, null, 2))
    } finally {
      if (isMounted) setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const initializeDashboard = async () => {
      try {
       // 1. Fast Check: Reads local storage (Handles page refreshes perfectly)
       const { data: { session } } = await supabase.auth.getSession()
       let activeUserId = session?.user?.id

       // 2. Secure Safety Net: If local storage lags (Tab-switching), ping the server
       if (!activeUserId) {
         const { data: { user }, error: userError } = await supabase.auth.getUser()
         if (userError || !user) {
           router.push('/school-login')
           return
         }
         activeUserId = user.id
       }

       if (isMounted) setSchoolId(activeUserId)

       const { data: schoolProfile, error: profileError } = await supabase
         .from('partner_schools')
         .select('*')
         .eq('id', activeUserId)
         .maybeSingle()

        if (profileError) throw profileError
        
        // NEW: If no school profile exists for this user, boot them to login!
        if (!schoolProfile) {
          router.push('/school-login')
          return
        }

        if (isMounted) {
          setTargetSchool(schoolProfile.name)
        }

        await fetchDashboardData(activeUserId, isMounted) // FIXED: Replaced user.id with activeUserId

      } catch (err: any) {
        const errorMessage = err.message || JSON.stringify(err, null, 2) || "Unknown Error"
        console.error("🔥 EXPOSED ERROR:", errorMessage)
        alert(`Dashboard Failed to Load: \n${errorMessage}`)
      }
    }

    initializeDashboard()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/school-login')
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    if (!schoolId) return 

    const channel = supabase.channel('school-dashboard-sync')
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'active_plans' },
      (payload) => { fetchDashboardData(schoolId, true) } 
    ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [schoolId]) 

  if (loading || !targetSchool) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-full flex items-center justify-center animate-pulse">Loading dashboard...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0a1128] tracking-tight mb-1">School Dashboard</h1>
          <p className="text-gray-500 text-sm">Financial overview and collections for <strong>{targetSchool}</strong>.</p>
        </div>
        <Link href="/school/payouts" className="bg-[#0a1128] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-sm text-center active:scale-95">
          Request Withdrawal
        </Link>
      </div>
  
      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-600 p-5 rounded-2xl border border-blue-700 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white opacity-10 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-blue-200 uppercase tracking-wide mb-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span>
              Unclaimed Payment
            </p>
            <p className="text-2xl font-black text-white truncate mb-2">₦{metrics.paymentWaiting.toLocaleString()}</p>
            <Link href="/school/students" className="text-[10px] text-white font-bold uppercase tracking-wider underline hover:text-blue-100">
              Verify students to claim &rarr;
            </Link>
          </div>
        </div>
  
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Total Financed Pipeline</p>
          <p className="text-2xl font-black text-[#0a1128] truncate">₦{metrics.totalFinanced.toLocaleString()}</p>
        </div>
        
        <div className="bg-green-50 p-5 rounded-2xl border border-green-200 shadow-sm">
          <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide mb-1.5">Cleared for Withdrawal</p>
          <p className="text-2xl font-black text-green-800 truncate">₦{metrics.payoutsCleared.toLocaleString()}</p>
        </div>
  
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Active Students</p>
          <p className="text-2xl font-black text-[#0a1128]">{metrics.activeStudents}</p>
        </div>
      </div>
  
      {/* PAYMENT LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50/50 p-4 sm:p-5 border-b border-gray-200">
          <h2 className="text-base font-bold text-[#0a1128]">Parent Payment Ledger</h2>
          <p className="text-xs text-gray-500 mt-0.5">Real-time transparency on funds remitted to PayTerm Escrow.</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider bg-gray-50/20">
                <th className="p-4 font-bold">Student</th>
                {/* FIX: Changed from Total Parent Invoice to Base School Tuition */}
                <th className="p-4 font-bold">Base School Tuition</th>
                <th className="p-4 font-bold text-blue-700">Amount Paid (Escrow)</th>
                <th className="p-4 font-bold text-green-700">Your Cleared Tranche</th>
                <th className="p-4 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-gray-500 font-medium">
                    No parent payments detected yet.
                  </td>
                </tr>
              ) : (
                recentPayments.map((tx, index) => (
                  <tr key={index} className={`hover:bg-gray-50 transition-colors ${tx.status === 'Pending Verification' ? 'bg-orange-50/30' : ''}`}>
                    <td className="p-4">
                      <p className="font-bold text-[#0a1128] text-sm">{tx.studentName}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5">{tx.className}</p>
                    </td>
                    {/* FIX: Displaying baseTuition instead of totalInvoice */}
                    <td className="p-4 text-xs font-medium text-gray-500 font-mono">
                      ₦{tx.baseTuition.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-blue-600 font-mono">
                        ₦{tx.amountPaid.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold font-mono ${tx.status === 'Verified' ? 'text-green-600' : 'text-gray-400'}`}>
                        ₦{tx.schoolCut.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border inline-block ${
                        tx.status === 'Verified' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'
                      }`}>
                        {tx.status === 'Verified' ? 'Cleared' : 'Awaiting Claim'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}