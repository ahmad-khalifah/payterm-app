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
  Landmark, Coins
} from 'lucide-react'

// --- NEW FLAT FEE ENGINE ---
const PLATFORM_FEE = 1500;
const SCHOOL_COMMISSION = 500;

export default function SchoolDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  const [metrics, setMetrics] = useState({
    activeStudents: 0,
    totalExpected: 0,
    tuitionCollected: 0,
    parentsOutstanding: 0,
    commissionEarned: 0 
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
          active_plans ( id, total_fee, amount_paid, status, next_payment_date, commission_earned )
        `)
        .eq('school_id', idToFetch) as any; 

      if (error) throw error

      let expected = 0
      let outstandingTotal = 0
      let collected = 0
      let activeCount = 0
      let totalCommission = 0
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

          // BaaS Ledger Math
          const baseTuition = Number(plan.total_fee) - PLATFORM_FEE
          const rawAmountPaid = Number(plan.amount_paid) || 0
          
          // The first 1500 goes to the platform, the rest is the school's collected tuition
          const schoolAmountPaid = rawAmountPaid > 0 ? Math.max(0, rawAmountPaid - PLATFORM_FEE) : 0
          const parentOwes = Math.max(0, baseTuition - schoolAmountPaid)
          const commission = Number(plan.commission_earned) || 0
          
          activeCount++
          expected += baseTuition
          collected += schoolAmountPaid
          outstandingTotal += parentOwes
          totalCommission += commission

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
              statuses: new Set(),
              earliest_due: null,
            }
          }

          groupedHouseholds[pId].total_outstanding += parentOwes
          groupedHouseholds[pId].total_paid += schoolAmountPaid 
          groupedHouseholds[pId].statuses.add(plan.status)

          groupedHouseholds[pId].children.push({
            student_name: student.full_name,
            className: student.student_class,
            outstanding: parentOwes,
            amountPaid: schoolAmountPaid, 
            baseTuition: baseTuition
          })
        })

        let ledgerArr = Object.values(groupedHouseholds).map((g: any) => {
          let hStatus = 'Active'
          if (g.statuses.has('Default')) hStatus = 'Default'
          else if (g.statuses.has('Late')) hStatus = 'Late'
          else if (g.statuses.has('Pending Verification')) hStatus = 'Pending'
          else if (Array.from(g.statuses).every((s: any) => s === 'Completed')) hStatus = 'Completed'
          return { ...g, household_status: hStatus }
        })

        ledgerArr.sort((a: any, b: any) => b.total_outstanding - a.total_outstanding)

        if (isMounted) {
          setMetrics({
            activeStudents: activeCount,
            totalExpected: expected,
            tuitionCollected: collected,
            parentsOutstanding: outstandingTotal,
            commissionEarned: totalCommission 
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
    <div className="w-full max-w-7xl mx-auto animate-in fade-in pb-20 relative bg-[#FAFAFA] min-h-screen">
      
      {/* STICKY HEADER */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md pt-6 pb-4 px-4 sm:px-6 lg:px-8 border-b border-gray-200 mb-6 print:hidden">
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-extrabold text-[#0a1128] tracking-tight mb-1.5 flex items-center gap-2">
              <Building2 className="w-6 h-6 text-blue-600" />
              School Dashboard
            </h1>
            <p className="text-gray-500 font-medium text-sm flex items-center gap-2">
              Financial overview for <strong className="text-[#0a1128]">{targetSchool}</strong>
              <span className="bg-gray-100 text-[#0a1128] px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 border border-gray-200 ml-2">
                <Users className="w-3 h-3 text-gray-500" /> {metrics.activeStudents} Active
              </span>
            </p>
          </div>
          <Link href="/school/payouts" className="bg-[#0a1128] text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all active:scale-95 flex items-center justify-center gap-2">
            <Wallet className="w-4 h-4" />
            Request Withdrawal
          </Link>
        </div>
      </div>
  
      <div className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        
        {/* METRICS - Clean, solid boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 print:hidden">
          
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Total Enrolled Tuition</p>
              <Building2 className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-black text-[#0a1128] tracking-tight">₦{metrics.totalExpected.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Tuition Collected</p>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl font-black text-[#0a1128] tracking-tight">₦{metrics.tuitionCollected.toLocaleString()}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">Parent Arrears</p>
              <AlertCircle className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-black text-[#0a1128] tracking-tight">₦{metrics.parentsOutstanding.toLocaleString()}</p>
          </div>

          <div className="bg-[#0a1128] p-5 rounded-2xl border border-[#15234b] shadow-sm text-white">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[11px] font-bold text-blue-300 uppercase tracking-widest">Admin Commission</p>
              <Coins className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black tracking-tight">₦{metrics.commissionEarned.toLocaleString()}</p>
          </div>

        </div>
    
        {/* SOLID LEDGER TABLE */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden print:border-none print:shadow-none mb-10">
          
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white p-5 border-b border-gray-200 print:border-b-2 print:border-gray-900 print:mb-4">
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
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white text-xs text-[#0a1128] transition-all"
                />
              </div>
              
              <div className="relative w-full sm:w-auto">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Filter className="h-4 w-4 text-gray-400" />
                </div>
                <select 
                  value={filterStatus} 
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white text-xs font-medium text-[#0a1128] transition-all appearance-none cursor-pointer"
                >
                  <option value="All">All Health</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Late">Late</option>
                  <option value="Default">Default</option>
                </select>
              </div>
              
              <button 
                onClick={() => window.print()}
                className="w-full sm:w-auto bg-white border border-gray-200 text-[#0a1128] px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-1.5"
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
                  <th className="px-5 py-3 font-bold">Household / Contact</th>
                  <th className="px-5 py-3 font-bold">Child Breakdowns</th>
                  <th className="px-5 py-3 font-bold text-right text-gray-400 print:text-black">Total Arrears</th>
                  <th className="px-5 py-3 font-bold text-right text-gray-400 print:text-black">Tuition Collected</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 print:divide-gray-300">
                {filteredLedger.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <p className="text-sm font-bold text-[#0a1128]">No ledger entries found.</p>
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
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-[#0a1128] text-sm">{item.parent_name}</span>
                            <span className="text-xs text-gray-500 font-mono tracking-tight">{item.parent_phone}</span>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                item.household_status === 'Active' ? 'bg-blue-500' : 
                                item.household_status === 'Completed' ? 'bg-green-500' :
                                item.household_status === 'Late' ? 'bg-orange-500' : 'bg-red-500'
                              }`}></span>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{item.household_status}</span>
                            </div>
                          </div>
                        </td>
                        
                        {/* SUB-LEDGER CHILD COLUMN */}
                        <td className="px-5 py-4 align-top min-w-[300px]">
                          <div className="flex flex-col gap-2">
                            {visibleChildren.map((child: any, idx: number) => (
                              <div key={idx} className="flex flex-col gap-1 pb-2 border-b border-gray-50 last:border-0 last:pb-0">
                                <span className="text-xs font-bold text-[#0a1128]">
                                  {child.student_name} <span className="font-medium text-gray-500">({child.className})</span>
                                </span>
                                
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
                                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-[#0a1128] transition-colors pt-1 print:hidden"
                              >
                                {isExpanded ? (
                                  <><ChevronUp className="w-3 h-3" /> Collapse details</>
                                ) : (
                                  <><ChevronDown className="w-3 h-3" /> {hiddenCount} more student{hiddenCount !== 1 ? 's' : ''}</>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        
                        {/* RIGHT ALIGNED FINANCIAL COLUMNS */}
                        <td className={`px-5 py-4 text-right font-mono text-sm tracking-tight align-top ${item.total_outstanding > 0 ? 'text-red-600 font-bold' : 'text-gray-400'}`}>
                          {item.total_outstanding > 0 ? `₦${item.total_outstanding.toLocaleString()}` : '-'}
                        </td>
                        
                        <td className="px-5 py-4 text-right font-mono text-[#0a1128] font-bold text-sm tracking-tight align-top">
                          ₦{item.total_paid.toLocaleString()}
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