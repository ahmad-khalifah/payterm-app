'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import { 
  Building2, AlertCircle, CheckCircle2, Users, Search, 
  Filter, Printer, Wallet, ChevronRight, ChevronDown, ChevronUp,
  Landmark
} from 'lucide-react'

// --- UNIVERSAL PRICING ENGINE ---
const getFeeBreakdown = (parentTotalFee: number, isInstallment: boolean = true) => {
  let fee = 0;
  if (parentTotalFee <= 103500) { 
    fee = isInstallment ? 3500 : 1500;
  } else if (parentTotalFee <= 207500) {
    fee = isInstallment ? 5500 : 2500;
  } else {
    fee = isInstallment ? 7500 : 3500;
  }
  return { fee, base: parentTotalFee - fee }
}

export default function SchoolDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  const [metrics, setMetrics] = useState({
    activeStudents: 0,
    totalExpected: 0,
    parentsOutstanding: 0,
    payoutsCleared: 0,
    totalBankGapDeployed: 0,
    schoolPendingReceivables: 0 
  })

  const [householdLedger, setHouseholdLedger] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')
  
  const [expandedHouseholds, setExpandedHouseholds] = useState<Set<string>>(new Set())

  const toggleHousehold = (parentId: string) => {
    setExpandedHouseholds(prev => {
      const next = new Set(prev)
      if (next.has(parentId)) next.delete(parentId)
      else next.add(parentId)
      return next
    })
  }

  const fetchDashboardData = useCallback(async (idToFetch: string, isMounted: boolean = true) => {
    try {
      const { data: studentData, error } = await supabase
        .from('students')
        .select(`
          id, full_name, student_class, enrollment_status, parent_id,
          active_plans ( id, total_fee, amount_paid, status, next_payment_date, plan_type )
        `)
        .eq('school_id', idToFetch) as any; 

      if (error) throw error

      let expected = 0
      let outstandingTotal = 0
      let cleared = 0
      let activeCount = 0
      let totalBankGap = 0
      let groupedHouseholds: Record<string, any> = {} 

      if (studentData && studentData.length > 0) {
        const parentIds = [...new Set(studentData.map((s: any) => s.parent_id).filter(Boolean))] as string[]
        
        const { data: parentsData } = await supabase
          .from('parents')
          .select('id, full_name, email, phone')
          .in('id', parentIds)

        studentData.forEach((student: any) => {
          const plan = student.active_plans?.[0]
          if (!plan) return

          const isInstallment = plan.plan_type !== 'full'
          const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(Number(plan.total_fee), isInstallment)
          
          const rawAmountPaid = Number(plan.amount_paid)
          const schoolAmountPaid = rawAmountPaid > 0 ? Math.max(0, rawAmountPaid - serviceFee) : 0
          const parentOwes = Math.max(0, baseTuition - schoolAmountPaid)
          
          activeCount++
          expected += baseTuition
          outstandingTotal += parentOwes
          
          let childCleared = 0
          let bankGapContribution = 0

          if (schoolAmountPaid > 0) {
            const progress = schoolAmountPaid / baseTuition
            
            if (!isInstallment) {
              if (progress >= 0.99) childCleared += baseTuition
            } else {
              if (progress >= 0.59) {
                bankGapContribution = baseTuition * 0.10;
                childCleared += (baseTuition * 0.70); 
              }
              if (progress >= 0.99) {
                childCleared += (baseTuition * 0.30);
              }
            }
            
            cleared += childCleared
            totalBankGap += bankGapContribution
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
            cleared: childCleared,
            planType: plan.plan_type || 'installment'
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
            payoutsCleared: cleared,
            totalBankGapDeployed: totalBankGap,
            schoolPendingReceivables: Math.max(0, expected - cleared)
          })
          setHouseholdLedger(ledgerArr)
        }
      }
    } catch (err: any) {
      console.error("Dashboard Fetch Error:", err.message)
      if (isMounted) toast.error("Failed to load dashboard data.")
    } finally {
      if (isMounted) setLoading(false)
    }
  }, [])

  useRealtimeSync(() => {
    if (schoolId) fetchDashboardData(schoolId, true)
  })

  useEffect(() => {
    let isMounted = true

    const initializeDashboard = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/school-login')
          return
        }
        const activeUser = session.user

        const activeUserId = activeUser.id
        if (isMounted) setSchoolId(activeUserId)

        const { data: schoolProfile, error: profileError } = await supabase
          .from('partner_schools')
          .select('name')
          .eq('id', activeUserId)
          .maybeSingle()

        if (profileError) throw profileError
        if (!schoolProfile) {
          router.push('/school-login')
          return
        }

        if (isMounted) {
          setTargetSchool(schoolProfile.name)
        }

        await fetchDashboardData(activeUserId, isMounted)

      } catch (err: any) {
        console.error("Initialize Error:", err.message)
        if (isMounted) toast.error("Could not authenticate session.")
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    initializeDashboard()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/school-login')
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router, fetchDashboardData])

  const filteredLedger = householdLedger.filter(item => {
    const searchString = `${item.parent_name} ${item.parent_phone} ${item.children.map((c: any) => `${c.student_name} ${c.className}`).join(' ')}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'All' || item.household_status === filterStatus;
    return matchesSearch && matchesStatus;
  })

  if (isInitializing || loading || !targetSchool) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-screen flex items-center justify-center animate-pulse">Loading...</div>

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
            <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
              Financial overview for <strong className="text-[#0a1128]">{targetSchool}</strong>
              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 border border-indigo-100">
                <Users className="w-3 h-3" /> {metrics.activeStudents} Active
              </span>
            </p>
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
            <div className="absolute top-0 right-0 w-24 h-24 bg-gray-100 rounded-full blur-2xl -mt-8 -mr-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 border border-gray-200">
                <Building2 className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Total Expected</p>
            </div>
            <p className="text-3xl font-black text-[#0a1128] truncate relative z-10 tracking-tight">₦{metrics.totalExpected.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mt-8 -mr-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Upfront Cleared</p>
            </div>
            <p className="text-3xl font-black text-blue-700 truncate relative z-10 tracking-tight">₦{metrics.payoutsCleared.toLocaleString()}</p>
            {metrics.totalBankGapDeployed > 0 && (
              <p className="text-[10px] text-gray-500 font-medium relative z-10 mt-1">
                Includes ₦{metrics.totalBankGapDeployed.toLocaleString()} Upfront Gap
              </p>
            )}
          </div>

          <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-50 rounded-full blur-2xl -mt-8 -mr-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-orange-600 border border-orange-100">
                <Landmark className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">School Pending</p>
            </div>
            <p className="text-3xl font-black text-orange-600 truncate relative z-10 tracking-tight">₦{metrics.schoolPendingReceivables.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 font-medium relative z-10 mt-1">
              Final tranches awaiting payment.
            </p>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full blur-2xl -mt-8 -mr-8 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center gap-3 mb-3 relative z-10">
              <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-600 border border-red-100">
                <AlertCircle className="w-4 h-4" />
              </div>
              <p className="text-[10px] font-bold text-red-600 uppercase tracking-widest">Parents Outstanding</p>
            </div>
            <p className="text-3xl font-black text-red-600 truncate relative z-10 tracking-tight">₦{metrics.parentsOutstanding.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 font-medium relative z-10 mt-1">
              What parents actually owe.
            </p>
          </div>

        </div>
    
        {/* NEW PROFESSIONAL LEDGER TABLE */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 md:px-6 md:py-4 border-b border-gray-200 print:border-b-2 print:border-gray-900 print:mb-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 print:text-xl">Master Payment Ledger</h2>
              <p className="text-xs text-gray-500 mt-0.5 font-medium print:hidden">Household-level transparency for active parent payments.</p>
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
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-400 focus:bg-white text-xs text-gray-900 transition-all"
                />
              </div>
              
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-gray-400 focus:bg-white text-xs font-medium text-gray-900 transition-all appearance-none cursor-pointer"
                >
                  <option value="All">All Health</option>
                  <option value="Active">Active</option>
                  <option value="Late">Late</option>
                  <option value="Default">Default</option>
                </select>
              </div>
              
              <button 
                onClick={() => window.print()}
                className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-medium hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Print
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs text-gray-500 uppercase tracking-wider font-semibold print:bg-gray-100 print:text-black">
                  <th className="px-6 py-3 font-medium">Household / Contact</th>
                  <th className="px-6 py-3 font-medium">Child Breakdowns</th>
                  <th className="px-6 py-3 font-medium text-right text-gray-400 print:text-black">Total Arrears</th>
                  <th className="px-6 py-3 font-medium text-right text-gray-400 print:text-black">Total Paid</th>
                  <th className="px-6 py-3 font-medium text-right text-gray-400 print:text-black">Cleared Tranche</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <p className="text-sm font-medium text-gray-900">No ledger entries found.</p>
                      <p className="text-xs text-gray-500 mt-1">Adjust your search or filter settings.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLedger.map((item) => {
                    const isExpanded = expandedHouseholds.has(item.parent_id)
                    const visibleChildren = isExpanded ? item.children : item.children.slice(0, 1)
                    const hiddenCount = item.children.length - 1
                    
                    return (
                      <tr key={item.parent_id} className="hover:bg-gray-50/50 transition-colors">
                        
                        {/* HOUSEHOLD COLUMN */}
                        <td className="px-6 py-4 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-gray-900 text-sm">{item.parent_name}</span>
                            <span className="text-xs text-gray-500 font-mono tracking-tight">{item.parent_phone}</span>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                item.household_status === 'Active' ? 'bg-green-500' : 
                                item.household_status === 'Late' ? 'bg-orange-500' : 'bg-red-500'
                              }`}></span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{item.household_status}</span>
                            </div>
                          </div>
                        </td>
                        
                        {/* SUB-LEDGER CHILD COLUMN */}
                        <td className="px-6 py-4 align-top min-w-[340px]">
                          <div className="flex flex-col gap-2">
                            {visibleChildren.map((child: any, idx: number) => (
                              <div key={idx} className="flex flex-col gap-1 pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                                
                                {/* FIX: Tightly grouped Name, Class, and Plan Type Badge */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-gray-900">
                                    {child.student_name} <span className="font-normal text-gray-500">({child.className})</span>
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${child.planType === 'full' ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                    {child.planType}
                                  </span>
                                </div>
                                
                                <div className="flex items-center gap-2.5 text-[11px] font-mono tracking-tight text-gray-500">
                                  <span>Fee: ₦{child.baseTuition.toLocaleString()}</span>
                                  <span className="text-gray-300">•</span>
                                  <span>Paid: ₦{child.amountPaid.toLocaleString()}</span>
                                  {child.outstanding > 0 ? (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span className="text-red-600 font-medium">Owes: ₦{child.outstanding.toLocaleString()}</span>
                                    </>
                                  ) : (
                                    <>
                                      <span className="text-gray-300">•</span>
                                      <span className="text-green-600 font-medium">Cleared</span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}

                            {item.children.length > 1 && (
                              <button 
                                onClick={() => toggleHousehold(item.parent_id)}
                                className="flex items-center gap-1 text-[11px] font-medium text-gray-500 hover:text-gray-900 transition-colors pt-1 print:hidden"
                              >
                                {isExpanded ? (
                                  <><ChevronUp className="w-3.5 h-3.5" /> Collapse details</>
                                ) : (
                                  <><ChevronDown className="w-3.5 h-3.5" /> {hiddenCount} more student{hiddenCount !== 1 ? 's' : ''}</>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        
                        {/* RIGHT ALIGNED FINANCIAL COLUMNS */}
                        <td className={`px-6 py-4 text-right font-mono text-sm tracking-tight align-top ${item.total_outstanding > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                          {item.total_outstanding > 0 ? `₦${item.total_outstanding.toLocaleString()}` : '-'}
                        </td>
                        
                        <td className="px-6 py-4 text-right font-mono text-gray-900 text-sm tracking-tight align-top">
                          ₦{item.total_paid.toLocaleString()}
                        </td>

                        <td className="px-6 py-4 text-right font-mono text-gray-900 text-sm tracking-tight align-top">
                          ₦{item.total_cleared.toLocaleString()}
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