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

  // NEW: Household Grouped State
  const [householdLedger, setHouseholdLedger] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  const fetchDashboardData = async (idToFetch: string, isMounted: boolean = true) => {
    try {
      // 1. Fetch School Tier Profile
      const { data: schoolData } = await supabase
        .from('partner_schools')
        .select('*')
        .eq('id', idToFetch)
        .maybeSingle()

      const payoutRate = (schoolData as any)?.tier === 'Tier 2' ? 0.70 : 0.60
      const remainderRate = (schoolData as any)?.tier === 'Tier 2' ? 0.30 : 0.40

      // 2. Fetch only students for THIS school, plus their plans
      const { data: studentData, error } = await supabase
        .from('students')
        .select(`
          id, full_name, student_class, enrollment_status, parent_id,
          active_plans ( id, total_fee, amount_paid, status, next_payment_date )
        `)
        .eq('school_id', idToFetch)

      if (error) throw error

      let expected = 0
      let outstandingTotal = 0
      let cleared = 0
      let activeCount = 0
      let groupedHouseholds: Record<string, any> = {} 

      if (studentData && studentData.length > 0) {
        // 3. Fetch Parent Details securely for the enrolled students
        const parentIds = [...new Set(studentData.map(s => s.parent_id).filter(Boolean))]
        const { data: parentsData } = await supabase
          .from('parents')
          .select('id, full_name, email, phone')
          .in('id', parentIds)

        // 4. Process and Group by Household
        studentData.forEach(student => {
          const plan = student.active_plans?.[0]
          if (!plan) return

          const { base: baseTuition } = getFeeBreakdown(Number(plan.total_fee))
          const amountPaid = Number(plan.amount_paid)
          const totalInvoice = Number(plan.total_fee)
          const parentOwes = Math.max(0, totalInvoice - amountPaid)
          
          activeCount++
          expected += baseTuition
          outstandingTotal += parentOwes
          
          if (amountPaid > 0) {
            const progress = amountPaid / totalInvoice
            if (progress >= 0.59) cleared += (baseTuition * payoutRate)
            if (progress >= 0.99) cleared += (baseTuition * remainderRate)
          }

          const pId = student.parent_id
          if (!pId) return

          if (!groupedHouseholds[pId]) {
            const pData = (parentsData || []).find(p => p.id === pId)
            groupedHouseholds[pId] = {
              parent_id: pId,
              parent_name: pData?.full_name || 'Unknown Parent',
              parent_phone: pData?.phone || 'No Phone',
              parent_email: pData?.email || 'No Email',
              children: [],
              total_outstanding: 0,
              statuses: new Set(),
              earliest_due: null,
            }
          }

          groupedHouseholds[pId].total_outstanding += parentOwes
          groupedHouseholds[pId].statuses.add(plan.status)

          if (plan.next_payment_date) {
            const planDate = new Date(plan.next_payment_date).getTime()
            if (!groupedHouseholds[pId].earliest_due || planDate < groupedHouseholds[pId].earliest_due) {
              groupedHouseholds[pId].earliest_due = planDate
            }
          }

          groupedHouseholds[pId].children.push({
            student_name: student.full_name,
            className: student.student_class,
            outstanding: parentOwes,
            amountPaid: amountPaid,
            baseTuition: baseTuition
          })
        })

        // 5. Determine Household Health and format array
        let ledgerArr = Object.values(groupedHouseholds).map((g: any) => {
          let hStatus = 'Active'
          if (g.statuses.has('Default')) hStatus = 'Default'
          else if (g.statuses.has('Late')) hStatus = 'Late'
          else if (g.statuses.has('Pending Verification')) hStatus = 'Pending'

          return { ...g, household_status: hStatus }
        })

        // Sort by highest outstanding balance at the top
        ledgerArr.sort((a: any, b: any) => b.total_outstanding - a.total_outstanding)

        if (isMounted) {
          setMetrics({
            activeStudents: activeCount,
            totalExpected: expected,
            parentsOutstanding: outstandingTotal,
            payoutsCleared: cleared
          })
          setHouseholdLedger(ledgerArr)
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

  const handleNudge = (parentName: string, phone: string, amount: number) => {
    alert(`School Action: Reminder drafted for ${parentName} regarding their ₦${amount.toLocaleString()} balance at ${phone}.`)
  }

  const filteredLedger = householdLedger.filter(item => {
    const searchString = `${item.parent_name} ${item.parent_phone} ${item.children.map((c: any) => `${c.student_name} ${c.className}`).join(' ')}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'All' || item.household_status === filterStatus;
    return matchesSearch && matchesStatus;
  })

  if (loading || !targetSchool) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-screen flex items-center justify-center animate-pulse">Authenticating Secure Session...</div>

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
  
      {/* Hide Metrics on Print */}
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
  
      {/* HOUSEHOLD LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50 p-4 sm:p-5 border-b border-gray-200 print:bg-white print:border-b-2 print:border-gray-900 print:mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0a1128] print:text-xl">{targetSchool} - Parent Collections</h2>
            <p className="text-xs text-gray-500 mt-0.5 print:hidden">Household-level transparency for active parent payments.</p>
            <p className="hidden print:block text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleDateString()}</p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3 print:hidden">
            <input 
              type="text" placeholder="Search parent or student..." 
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:w-auto flex-1 border border-gray-300 bg-white p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 text-sm text-[#0a1128] shadow-sm transition-all"
            />
            <select 
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full sm:w-auto border border-gray-300 bg-white p-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-600 text-sm font-medium text-[#0a1128] shadow-sm transition-all"
            >
              <option value="All">All Health</option>
              <option value="Active">Active (On Track)</option>
              <option value="Late">Late (Missed)</option>
              <option value="Default">Default (Critical)</option>
            </select>
            <button 
              onClick={() => window.print()}
              className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-wider print:bg-gray-100 print:text-black">
                <th className="p-4 font-bold">Household / Contact</th>
                <th className="p-4 font-bold">Enrolled Students</th>
                <th className="p-4 font-bold">Health Status</th>
                <th className="p-4 font-bold text-right print:text-left">Next Due</th>
                <th className="p-4 font-bold text-right">Household Arrears</th>
                <th className="p-4 font-bold text-right print:hidden">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-gray-300">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-sm font-medium text-gray-500">
                    No matching household records found.
                  </td>
                </tr>
              ) : (
                filteredLedger.map((item) => {
                  const isCritical = item.household_status === 'Default' || item.household_status === 'Late'
                  
                  return (
                    <tr key={item.parent_id} className={`hover:bg-gray-50 transition-colors ${isCritical ? 'bg-red-50/10' : ''}`}>
                      <td className="p-4 align-top">
                        <p className="font-bold text-[#0a1128] text-sm print:text-black">{item.parent_name}</p>
                        <p className="text-[11px] text-gray-500 mt-1 font-mono print:text-gray-700">{item.parent_phone}</p>
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-3">
                          {item.children.map((child: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-0.5">
                              <p className="text-xs font-bold text-gray-800 print:text-black">{child.student_name} <span className="text-gray-400 font-normal">({child.className})</span></p>
                              {child.outstanding > 0 ? (
                                <p className="text-[10px] text-red-600 font-mono font-medium print:text-black">Owing: ₦{child.outstanding.toLocaleString()}</p>
                              ) : (
                                <p className="text-[10px] text-green-600 font-mono font-medium print:text-black">Cleared</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border inline-block ${
                          item.household_status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200 print:border-none print:p-0 print:bg-transparent print:text-black' : 
                          item.household_status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200 print:border-none print:p-0 print:bg-transparent print:text-black' : 
                          'bg-red-50 text-red-700 border-red-200 print:border-none print:p-0 print:bg-transparent print:text-black'
                        }`}>
                          {item.household_status}
                        </span>
                      </td>
                      <td className="p-4 text-right print:text-left text-xs text-gray-600 font-medium align-top print:text-black">
                        {item.earliest_due ? new Date(item.earliest_due).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-4 text-right font-bold text-[#0a1128] font-mono text-sm align-top print:text-black">
                        ₦{item.total_outstanding.toLocaleString()}
                      </td>
                      <td className="p-4 text-right align-top print:hidden">
                        <button 
                          onClick={() => handleNudge(item.parent_name, item.parent_phone, item.total_outstanding)}
                          className="bg-white border border-gray-200 text-[#0a1128] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
                        >
                          Nudge
                        </button>
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