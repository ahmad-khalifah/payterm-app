'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'

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

  // ADDED isMounted parameter to prevent memory leaks during realtime updates
  const fetchDashboardData = async (idToFetch: string, isMounted: boolean = true) => {
    try {
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

          const baseTuition = Number(plan.total_fee) / 1.05
          const amountPaid = Number(plan.amount_paid)
          
          // 60/40 Math Calculations
          if (student.enrollment_status === 'Verified') {
            activeCount++
            financed += baseTuition
            
            const progress = amountPaid / Number(plan.total_fee)
            // Using 0.59 to prevent floating point decimal bugs
            if (progress >= 0.59) cleared += (baseTuition * 0.80)
            if (progress >= 0.99) cleared += (baseTuition * 0.20)
          } 
          else if (student.enrollment_status === 'Pending Verification' && amountPaid > 0) {
            // Money is held in Escrow until the school verifies the student
            pendingPayment += (baseTuition * 0.80)
          }

          if (amountPaid > 0) {
            ledger.push({
              id: student.id,
              studentName: student.full_name,
              className: student.student_class,
              amountPaid: amountPaid,
              totalInvoice: Number(plan.total_fee),
              status: student.enrollment_status,
              schoolCut: (baseTuition * 0.80)
            })
          }
        })

        // THE FIX: Only update React state if the component is still mounted
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

  // THE FIX: Unified initialization block using getSession to bypass RLS blocks
  useEffect(() => {
    let isMounted = true

    const initializeDashboard = async () => {
      try {
        // 1. Securely await the local session FIRST
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session?.user) {
          router.push('/school-login')
          return
        }

        if (isMounted) setSchoolId(session.user.id)

        // 2. Fetch School Profile
        const { data: schoolProfile, error: profileError } = await supabase
          .from('partner_schools')
          .select('name')
          .eq('id', session.user.id)
          .single()

        if (profileError) throw profileError

        if (isMounted && schoolProfile) {
          setTargetSchool(schoolProfile.name)
        }

        // 3. Trigger the main math engine using the verified session ID
        await fetchDashboardData(session.user.id, isMounted)

      } catch (err) {
        console.error("Initialization Error:", err)
      }
    }

    initializeDashboard()

    // 4. Secure Auth Listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/school-login')
      }
    })

    // 5. Cleanup function
    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router])

  // Realtime Sync Engine
  useEffect(() => {
    if (!schoolId) return 

    const channel = supabase.channel('school-dashboard-sync')
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'active_plans' },
      // Pass true for isMounted since this is an active listener
      (payload) => { fetchDashboardData(schoolId, true) } 
    ).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [schoolId]) 

  if (loading || !targetSchool) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-full flex items-center justify-center animate-pulse">Loading dashboard...</div>

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in pb-20">
      <div className="mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#0a1128] tracking-tight mb-2">School Dashboard</h1>
          <p className="text-gray-500 text-sm">Financial overview and collections monitoring for <strong>{targetSchool}</strong>.</p>
        </div>
        <Link href="/school/payouts" className="bg-[#0a1128] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#15234b] transition-colors shadow-sm text-center">
          Request Withdrawal
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        
        <div className="bg-blue-600 p-6 rounded-2xl border border-blue-700 shadow-lg relative overflow-hidden transform hover:-translate-y-1 transition-all">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-24 h-24 bg-white opacity-10 rounded-full blur-xl pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-xs font-bold text-blue-200 uppercase tracking-wide mb-2 flex items-center gap-2">
              <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span></span>
              Unclaimed Payment
            </p>
            <p className="text-3xl font-bold text-white truncate mb-2">₦{metrics.paymentWaiting.toLocaleString()}</p>
            <Link href="/school/students" className="text-[10px] text-white font-bold uppercase tracking-wider underline hover:text-blue-200">
              Verify students to claim &rarr;
            </Link>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Total Financed Pipeline</p>
          <p className="text-3xl font-bold text-[#0a1128] truncate">₦{metrics.totalFinanced.toLocaleString()}</p>
        </div>
        
        <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wide mb-2">Cleared for Withdrawal</p>
          <p className="text-3xl font-bold text-green-800 truncate">₦{metrics.payoutsCleared.toLocaleString()}</p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Active Students</p>
          <p className="text-3xl font-bold text-[#0a1128]">{metrics.activeStudents}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50/50 p-5 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-[#0a1128]">Parent Payment Ledger</h2>
            <p className="text-xs text-gray-500 mt-1">Real-time transparency on all funds remitted to PayTerm Escrow.</p>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-xs text-[#0a1128] uppercase tracking-wide bg-gray-50/20">
                <th className="p-5 font-bold">Student</th>
                <th className="p-5 font-bold">Total Parent Invoice</th>
                <th className="p-5 font-bold text-blue-700">Amount Paid (Escrow)</th>
                <th className="p-5 font-bold text-green-700">Your Cleared Tranche</th>
                <th className="p-5 font-bold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-sm text-gray-500 font-medium">
                    No parent payments detected yet.
                  </td>
                </tr>
              ) : (
                recentPayments.map((tx, index) => (
                  <tr key={index} className={`hover:bg-gray-50 transition-colors ${tx.status === 'Pending Verification' ? 'bg-orange-50/30' : ''}`}>
                    <td className="p-5">
                      <p className="font-bold text-[#0a1128] text-sm">{tx.studentName}</p>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">{tx.className}</p>
                    </td>
                    <td className="p-5 text-sm font-medium text-gray-500 font-mono">
                      ₦{tx.totalInvoice.toLocaleString()}
                    </td>
                    <td className="p-5">
                      <span className="text-sm font-bold text-blue-600 font-mono">
                        ₦{tx.amountPaid.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-5">
                      <span className={`text-sm font-bold font-mono ${tx.status === 'Verified' ? 'text-green-600' : 'text-gray-400'}`}>
                        ₦{tx.schoolCut.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border inline-block ${
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