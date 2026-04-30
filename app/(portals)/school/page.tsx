'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'

import { 
  Building2, AlertCircle, CheckCircle2, Users, Search, 
  Filter, Printer, BellRing, User, Phone, GraduationCap, 
  Wallet, ChevronRight, ChevronDown, ChevronUp
} from 'lucide-react'

// --- UNIVERSAL PRICING ENGINE ---
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

  const [householdLedger, setHouseholdLedger] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  
  // NEW: Track which households are expanded to show all children
  const [expandedHouseholds, setExpandedHouseholds] = useState<Set<string>>(new Set())

  const toggleHousehold = (parentId: string) => {
    setExpandedHouseholds(prev => {
      const next = new Set(prev)
      if (next.has(parentId)) next.delete(parentId)
      else next.add(parentId)
      return next
    })
  }

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
        const parentIds = [...new Set(studentData.map(s => s.parent_id).filter(Boolean))]
        const { data: parentsData } = await supabase
          .from('parents')
          .select('id, full_name, email, phone')
          .in('id', parentIds)

        studentData.forEach(student => {
          const plan = student.active_plans?.[0]
          if (!plan) return

          const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(Number(plan.total_fee))
          const rawAmountPaid = Number(plan.amount_paid)
          const schoolAmountPaid = rawAmountPaid > 0 ? Math.max(0, rawAmountPaid - serviceFee) : 0
          const parentOwes = Math.max(0, baseTuition - schoolAmountPaid)
          
          activeCount++
          expected += baseTuition
          outstandingTotal += parentOwes
          
          let childCleared = 0
          if (schoolAmountPaid > 0) {
            const progress = schoolAmountPaid / baseTuition
            if (progress >= 0.59) childCleared += (baseTuition * payoutRate)
            if (progress >= 0.99) childCleared += (baseTuition * remainderRate)
            cleared += childCleared 
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
              total_paid: 0,         
              total_cleared: 0,      
              statuses: new Set(),
              earliest_due: null,
            }
          }

          groupedHouseholds[pId].total_outstanding += parentOwes
          groupedHouseholds[pId].total_paid += schoolAmountPaid 
          groupedHouseholds[pId].total_cleared += childCleared
          groupedHouseholds[pId].statuses.add(plan.status)

          groupedHouseholds[pId].children.push({
            student_name: student.full_name,
            className: student.student_class,
            outstanding: parentOwes,
            amountPaid: schoolAmountPaid, 
            baseTuition: baseTuition,
            cleared: childCleared
          })
        })

        let ledgerArr = Object.values(groupedHouseholds).map((g: any) => {
          let hStatus = 'Active'
          if (g.statuses.has('Default')) hStatus = 'Default'
          else if (g.statuses.has('Late')) hStatus = 'Late'
          else if (g.statuses.has('Pending Verification')) hStatus = 'Pending'

          return { ...g, household_status: hStatus }
        })

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
      console.error("Dashboard Fetch Error:", err.message)
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
        console.error("Initialize Error:", err.message)
      }
    }

    initializeDashboard()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') window.location.href = '/school-login'
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router])

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
    <div className="w-full max-w-7xl mx-auto animate-in fade-in pb-20 relative">
      
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-40 bg-gray-50/95 backdrop-blur-md pt-4 sm:pt-6 lg:pt-10 pb-4 px-4 sm:px-6 lg:px-8 border-b border-gray-200/50 mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 max-w-7xl mx-auto">
          <div>
            <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              School Dashboard
            </h1>
            <p className="text-gray-500 font-medium text-sm">Financial overview and collections for <strong className="text-[#0a1128]">{targetSchool}</strong>.</p>
          </div>
          <Link href="/school/payouts" className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-3.5 rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 group">
            <Wallet className="w-4 h-4" />
            Request Withdrawal
            <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
  
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-10 print:hidden">
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mt-8 -mr-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <Building2 className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Expected Tuition</p>
            </div>
            <p className="text-3xl font-black text-[#0a1128] truncate relative z-10 tracking-tight">₦{metrics.totalExpected.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full blur-2xl -mt-8 -mr-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Parents Outstanding</p>
            </div>
            <p className="text-3xl font-black text-red-600 truncate relative z-10 tracking-tight">₦{metrics.parentsOutstanding.toLocaleString()}</p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-full blur-2xl -mt-8 -mr-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-green-50 flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Cleared for Withdrawal</p>
            </div>
            <p className="text-3xl font-black text-green-600 truncate relative z-10 tracking-tight">₦{metrics.payoutsCleared.toLocaleString()}</p>
          </div>
    
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-2xl -mt-8 -mr-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Users className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Active Students</p>
            </div>
            <p className="text-3xl font-black text-[#0a1128] relative z-10 tracking-tight">{metrics.activeStudents}</p>
          </div>
        </div>
    
        {/* HOUSEHOLD LEDGER TABLE */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden print:border-none print:shadow-none relative">
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 md:p-6 border-b border-gray-100 print:border-b-2 print:border-gray-900 print:mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#0a1128] print:text-xl">Payment Ledger</h2>
              <p className="text-xs text-gray-500 mt-1 font-medium print:hidden">Household-level transparency for active parent payments.</p>
              <p className="hidden print:block text-xs text-gray-500 mt-1">Generated on: {new Date().toLocaleDateString()}</p>
            </div>
            
            <div className="flex flex-col sm:flex-row w-full xl:w-auto items-center gap-3 print:hidden">
              <div className="relative w-full sm:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input 
                  type="text" 
                  placeholder="Search records..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm text-[#0a1128] font-medium transition-all"
                />
              </div>
              
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full pl-10 pr-8 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm font-bold text-[#0a1128] transition-all appearance-none cursor-pointer"
                >
                  <option value="All">All Health</option>
                  <option value="Active">Active (On Track)</option>
                  <option value="Late">Late (Missed)</option>
                  <option value="Default">Default (Critical)</option>
                </select>
              </div>
              
              <button 
                onClick={() => window.print()}
                className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 hover:text-[#0a1128] transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold print:bg-gray-100 print:text-black">
                  <th className="p-5">Household / Contact</th>
                  <th className="p-5">Child Breakdowns</th>
                  <th className="p-5 text-red-600 print:text-black">Total Arrears</th>
                  <th className="p-5 text-blue-700 print:text-black">Total Paid (Account)</th>
                  <th className="p-5 text-green-700 print:text-black">Cleared Tranche</th>
                  <th className="p-5 text-right print:hidden">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 print:divide-gray-300">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400 mb-3">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-[#0a1128]">No records found.</p>
                      <p className="text-xs text-gray-500 mt-1">Try adjusting your search or filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((item) => {
                    const isCritical = item.household_status === 'Default' || item.household_status === 'Late'
                    const isExpanded = expandedHouseholds.has(item.parent_id)
                    
                    // Progressive disclosure logic
                    const visibleChildren = isExpanded ? item.children : item.children.slice(0, 1)
                    const hiddenCount = item.children.length - 1
                    
                    return (
                      <tr key={item.parent_id} className={`hover:bg-gray-50/50 transition-colors group ${isCritical ? 'bg-red-50/20' : ''}`}>
                        <td className="p-5 align-top">
                          <div className="flex items-center gap-2 mb-1.5">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            <p className="font-extrabold text-[#0a1128] text-sm print:text-black">{item.parent_name}</p>
                          </div>
                          <div className="flex items-center gap-2 mb-2.5">
                            <Phone className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-xs text-gray-500 font-mono print:text-gray-700">{item.parent_phone}</p>
                          </div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                            item.household_status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200 print:border-none print:p-0 print:bg-transparent print:text-black' : 
                            item.household_status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200 print:border-none print:p-0 print:bg-transparent print:text-black' : 
                            'bg-red-50 text-red-700 border-red-200 print:border-none print:p-0 print:bg-transparent print:text-black'
                          }`}>
                            {item.household_status === 'Active' && <CheckCircle2 className="w-3 h-3" />}
                            {item.household_status === 'Late' && <AlertCircle className="w-3 h-3" />}
                            {item.household_status}
                          </span>
                        </td>
                        
                        <td className="p-5 align-top min-w-[280px]">
                          <div className="space-y-3">
                            {visibleChildren.map((child: any, idx: number) => (
                              <div key={idx} className="flex flex-col gap-1.5 p-3 bg-white border border-gray-100 rounded-xl shadow-sm transition-all">
                                <p className="text-[11px] font-bold text-[#0a1128] flex items-center gap-1.5 print:text-black">
                                  <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                                  {child.student_name} <span className="text-gray-400 font-medium">({child.className})</span>
                                </p>
                                <div className="pl-5 flex items-center gap-2 text-[10px] font-bold flex-wrap">
                                  <span className="text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">Fee: ₦{child.baseTuition.toLocaleString()}</span>
                                  <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">Paid: ₦{child.amountPaid.toLocaleString()}</span>
                                  {child.outstanding > 0 ? (
                                    <span className="text-red-600 bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Owes: ₦{child.outstanding.toLocaleString()}</span>
                                  ) : (
                                    <span className="text-green-600 bg-green-50 px-1.5 py-0.5 rounded border border-green-100">Cleared</span>
                                  )}
                                </div>
                              </div>
                            ))}

                            {/* Show More / Show Less Toggle Button */}
                            {item.children.length > 1 && (
                              <button 
                                onClick={() => toggleHousehold(item.parent_id)}
                                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors pl-1 pt-1 print:hidden"
                              >
                                {isExpanded ? (
                                  <><ChevronUp className="w-3.5 h-3.5" /> Show less</>
                                ) : (
                                  <><ChevronDown className="w-3.5 h-3.5" /> +{hiddenCount} more student{hiddenCount !== 1 ? 's' : ''}</>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        
                        <td className="p-5 font-black text-red-600 font-mono text-sm align-top tracking-tight print:text-black">
                          ₦{item.total_outstanding.toLocaleString()}
                        </td>
                        
                        <td className="p-5 font-black text-blue-600 font-mono text-sm align-top tracking-tight print:text-black">
                          ₦{item.total_paid.toLocaleString()}
                        </td>
  
                        <td className="p-5 font-black text-green-600 font-mono text-sm align-top tracking-tight print:text-black">
                          ₦{item.total_cleared.toLocaleString()}
                        </td>
  
                        <td className="p-5 text-right align-top print:hidden">
                          <button 
                            onClick={() => handleNudge(item.parent_name, item.parent_phone, item.total_outstanding)}
                            className="bg-white border border-gray-200 text-[#0a1128] px-4 py-2 rounded-xl text-[11px] font-bold hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm active:scale-95 inline-flex items-center gap-1.5"
                          >
                            <BellRing className="w-3.5 h-3.5" />
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
    </div>
  )
}