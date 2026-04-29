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
    totalExpected: 0,
    parentsOutstanding: 0,
    payoutsCleared: 0
  })

  const [recentPayments, setRecentPayments] = useState<any[]>([])
  const [classFilter, setClassFilter] = useState<string>('All')

  const fetchDashboardData = async (idToFetch: string, isMounted: boolean = true) => {
    try {
      const { data: schoolData } = await supabase
        .from('partner_schools')
        .select('*')
        .eq('id', idToFetch)
        .maybeSingle()

      const payoutRate = (schoolData as any)?.tier === 'Tier 2' ? 0.70 : 0.60
      const remainderRate = (schoolData as any)?.tier === 'Tier 2' ? 0.30 : 0.40

      const { data: studentData, error } = await supabase
        .from('students')
        .select(`
          id, full_name, student_class,
          active_plans ( total_fee, amount_paid )
        `)
        .eq('school_id', idToFetch)

      if (error) throw error

      let expected = 0
      let outstanding = 0
      let cleared = 0
      let activeCount = 0
      let ledger: any[] = [] 

      if (studentData) {
        studentData.forEach(student => {
          const plan = student.active_plans[0]
          if (!plan) return

          const { base: baseTuition } = getFeeBreakdown(Number(plan.total_fee))
          const amountPaid = Number(plan.amount_paid)
          const totalInvoice = Number(plan.total_fee)
          const parentOwes = Math.max(0, totalInvoice - amountPaid)
          
          activeCount++
          expected += baseTuition
          outstanding += parentOwes
          
          if (amountPaid > 0) {
            const progress = amountPaid / totalInvoice
            if (progress >= 0.59) cleared += (baseTuition * payoutRate)
            if (progress >= 0.99) cleared += (baseTuition * remainderRate)

            ledger.push({
              id: student.id,
              studentName: student.full_name,
              className: student.student_class,
              baseTuition: baseTuition,
              totalInvoice: totalInvoice,
              amountPaid: amountPaid,
              outstanding: parentOwes
            })
          }
        })

        if (isMounted) {
          setMetrics({
            activeStudents: activeCount,
            totalExpected: expected,
            parentsOutstanding: outstanding,
            payoutsCleared: cleared
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
       const { data: { session } } = await supabase.auth.getSession()
       let activeUserId = session?.user?.id

       if (!activeUserId) {
         const { data: { user }, error: userError } = await supabase.auth.getUser()
         if (userError || !user) {
           window.location.href = '/school-login'
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
        
        if (!schoolProfile) {
          window.location.href = '/school-login'
          return
        }

        if (isMounted) {
          setTargetSchool(schoolProfile.name)
        }

        await fetchDashboardData(activeUserId, isMounted)

      } catch (err: any) {
        console.error("🔥 EXPOSED ERROR:", err.message)
      }
    }

    initializeDashboard()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        window.location.href = '/school-login'
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

  if (loading || !targetSchool) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-screen flex items-center justify-center animate-pulse">Authenticating Secure Session...</div>

  const uniqueClasses = Array.from(new Set(recentPayments.map(tx => tx.className).filter(Boolean))).sort()
  const filteredPayments = classFilter === 'All' ? recentPayments : recentPayments.filter(tx => tx.className === classFilter)

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      
      {/* Hide Header on Print */}
      <div className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0a1128] tracking-tight mb-1">School Dashboard</h1>
          <p className="text-gray-500 text-sm">Financial overview and collections for <strong>{targetSchool}</strong>.</p>
        </div>
        <Link href="/school/payouts" className="bg-[#0a1128] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-sm text-center active:scale-95">
          Request Withdrawal
        </Link>
      </div>
  
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:hidden">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Total Expected Tuition</p>
          <p className="text-2xl font-black text-[#0a1128] truncate">₦{metrics.totalExpected.toLocaleString()}</p>
        </div>
        
        <div className="bg-red-50 p-5 rounded-2xl border border-red-200 shadow-sm">
          <p className="text-[10px] font-bold text-red-700 uppercase tracking-wide mb-1.5">Parents Outstanding</p>
          <p className="text-2xl font-black text-red-800 truncate">₦{metrics.parentsOutstanding.toLocaleString()}</p>
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
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50 p-4 sm:p-5 border-b border-gray-200 print:bg-white print:border-b-2 print:border-gray-900 print:mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0a1128] print:text-xl">{targetSchool} - Payment Ledger</h2>
            <p className="text-xs text-gray-500 mt-0.5 print:hidden">Real-time transparency on funds remitted to your PayTerm Account.</p>
            <p className="hidden print:block text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleDateString()}</p>
          </div>
          
          <div className="flex w-full sm:w-auto items-center gap-3 print:hidden">
            <select 
              value={classFilter} 
              onChange={(e) => setClassFilter(e.target.value)}
              className="flex-1 sm:w-auto bg-white border border-gray-300 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 shadow-sm"
            >
              <option value="All">All Classes</option>
              {uniqueClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            
            <button 
              onClick={() => window.print()}
              className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider bg-gray-50/20 print:bg-gray-100 print:text-black">
                <th className="p-4 font-bold">Student</th>
                <th className="p-4 font-bold">Base School Tuition</th>
                <th className="p-4 font-bold text-red-600 print:text-black">Outstanding</th>
                <th className="p-4 font-bold text-blue-700 print:text-black">Amount Paid (Account)</th>
                <th className="p-4 font-bold text-right print:text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-gray-300">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-sm text-gray-500 font-medium">
                    No parent payments found for {classFilter === 'All' ? 'this school' : `class ${classFilter}`}.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((tx, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <p className="font-bold text-[#0a1128] text-sm print:text-black">{tx.studentName}</p>
                      <p className="text-[10px] text-gray-500 font-medium mt-0.5 print:text-gray-700">{tx.className}</p>
                    </td>
                    <td className="p-4 text-xs font-medium text-gray-500 font-mono print:text-black">
                      ₦{tx.baseTuition.toLocaleString()}
                    </td>
                    <td className="p-4">
                      <span className={`text-xs font-bold font-mono ${tx.outstanding > 0 ? 'text-red-600' : 'text-gray-400'} print:text-black`}>
                        ₦{tx.outstanding.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-xs font-bold text-blue-600 font-mono print:text-black">
                        ₦{tx.amountPaid.toLocaleString()}
                      </span>
                    </td>
                    <td className="p-4 text-right print:text-left">
                      <span className="px-2 py-1 rounded text-[9px] font-bold uppercase tracking-wider border inline-block bg-green-50 text-green-700 border-green-200 print:border-none print:p-0 print:bg-transparent print:text-black">
                        Cleared
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