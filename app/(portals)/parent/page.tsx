'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import DummyPaystack from './components/DummyPaystack'

export default function ParentDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [parentName, setParentName] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [childrenData, setChildrenData] = useState<any[]>([])
  
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // Payment State
  const [paystackConfig, setPaystackConfig] = useState<{
    isOpen: boolean; amount: number; email: string; studentName: string;
    studentClass: string; planId: string; studentId: string; isMidTerm: boolean;
  } | null>(null)

  // Renewal State (FIXED: Added schoolName for the query)
  const [renewConfig, setRenewConfig] = useState<{ 
    studentId: string, 
    schoolId: string, 
    schoolName: string, 
    currentClass: string 
  } | null>(null)
  
  const [renewForm, setRenewForm] = useState({ session: '', term: '', className: '' })
  const [isRenewing, setIsRenewing] = useState(false)

  const classList = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]

  // Unified, Safe Two-Step Fetch
  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !session?.user) {
        router.push('/parent-login')
        return
      }
      
      const userId = session.user.id
      setCurrentUserId(userId)

      const { data: parentProfile } = await supabase.from('parents').select('full_name').eq('id', userId).single()
      if (parentProfile) setParentName(parentProfile.full_name)

      // Fetch students with ALL their plans (added created_at to sort them safely)
      const { data: students, error: studentError } = await supabase
        .from('students')
        .select(`
          id, full_name, school_id, student_class, enrollment_status,
          active_plans ( 
            id, total_fee, amount_paid, next_payment_date, status, clearance_code, created_at,
            payment_history ( id, amount, receipt_number, payment_date, status )
          )
        `)
        .eq('parent_id', userId)
        .order('created_at', { ascending: false })

      if (studentError) throw studentError
      
      if (students && students.length > 0) {
        const schoolIds = students.map((s: any) => s.school_id).filter(Boolean)
        const { data: schoolsData } = await supabase.from('partner_schools').select('id, name').in('id', schoolIds)

        const finalStudentsData = students.map((child: any) => {
          const foundSchool = schoolsData?.find((sch: any) => sch.id === child.school_id)
          
          // Sort plans so the newest one is always at index 0
          if (child.active_plans) {
            child.active_plans.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          }

          return {
            ...child,
            display_school_name: foundSchool ? foundSchool.name : child.school_id
          }
        })
        setChildrenData(finalStudentsData)
      } else {
        setChildrenData([])
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    fetchDashboardData()
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) router.push('/parent-login')
    })
    return () => authListener.subscription.unsubscribe()
  }, [fetchDashboardData, router])

  const triggerPayment = (plan: any, child: any) => {
    const isFirstPayment = Number(plan.amount_paid) === 0
    const paymentAmount = isFirstPayment ? Number(plan.total_fee) * 0.60 : Number(plan.total_fee) - Number(plan.amount_paid)
    const dummyEmail = parentName ? `${parentName.replace(/\s+/g, '').toLowerCase()}@email.com` : 'parent@email.com'

    setPaystackConfig({
      isOpen: true, amount: paymentAmount, email: dummyEmail, studentName: child.full_name,
      studentClass: child.student_class, planId: plan.id, studentId: child.id, isMidTerm: !isFirstPayment
    })
  }

  const handlePaymentSuccess = async (reference: string) => {
    try {
      if (paystackConfig?.isMidTerm) {
        await supabase.from('active_plans').update({ mid_term_cleared: true }).eq('id', paystackConfig.planId)
      }
      
      // NEW: Generate the Notification!
      await supabase.from('notifications').insert({
        parent_id: currentUserId,
        title: 'Payment Successful',
        message: `Your payment of ₦${paystackConfig?.amount.toLocaleString()} for ${paystackConfig?.studentName} was received successfully. Receipt: ${reference}`
      })

      alert(`Payment confirmed! Receipt No: ${reference}`)
      setPaystackConfig(null)
      fetchDashboardData() 
    } catch (err) {
      console.error("Update error:", err)
    }
  }

  // Engine for renewing a term and generating a new active_plans row
  const handleRenewTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!renewConfig || !currentUserId) return
    setIsRenewing(true)

    try {
      // 1. FIX: Changed to 'school_name' to match your strict Typescript DB schema
      const { data: feeConfig, error: feeError } = await supabase
        .from('class_fees')
        .select('parent_total_fee, mid_term_date')
        .eq('school_name', renewConfig.schoolName)
        .eq('class_name', renewForm.className)
        .eq('academic_session', renewForm.session)
        .eq('term', renewForm.term)
        .single()

      if (feeError || !feeConfig) throw new Error("School has not added the fee structure for this term yet. Contact the school.")

      // 2. Archive the old plan so it steps out of the way
      await supabase
        .from('active_plans')
        .update({ status: 'Completed' })
        .eq('student_id', renewConfig.studentId)
        .neq('status', 'Completed')

      // 3. Update the student's class if they got promoted
      if (renewForm.className !== renewConfig.currentClass) {
        await supabase.from('students').update({ student_class: renewForm.className }).eq('id', renewConfig.studentId)
      }

      // 4. Generate the new plan
      const uniqueCode = `PT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      // FIX: Added 'as any' bypass because your local Typescript file is missing 'student_id'
      const { error: newPlanError } = await supabase
        .from('active_plans')
        .insert({
          student_id: renewConfig.studentId,
          parent_id: currentUserId,
          school_id: renewConfig.schoolId,
          total_fee: Number(feeConfig.parent_total_fee) || 0, // FIX: Strict number conversion
          amount_paid: 0,
          next_payment_date: feeConfig.mid_term_date || null,
          status: 'Pending Verification',
          clearance_code: uniqueCode,
          mid_term_cleared: false,
          payterm_advance: 0
        } as any)

      if (newPlanError) throw newPlanError

      alert("Child successfully enrolled for the new term! You can now pay the initial deposit.")
      setRenewConfig(null)
      fetchDashboardData()

    } catch (err: any) {
      alert(`Renewal Failed: ${err.message}`)
    } finally {
      setIsRenewing(false)
    }
  }

  const toggleHistory = (id: string) => {
    setExpandedHistoryId(prev => prev === id ? null : id)
  }

  if (loading) return <div className="p-10 text-center text-sm font-bold text-[#0a1128] uppercase tracking-widest h-screen flex items-center justify-center animate-pulse">Loading Dashboard...</div>

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 animate-in fade-in pb-24">
      
      {/* PAYSTACK MODAL */}
      {paystackConfig && (
        <DummyPaystack
          isOpen={paystackConfig.isOpen} onClose={() => setPaystackConfig(null)} onSuccess={handlePaymentSuccess}
          amount={paystackConfig.amount} email={paystackConfig.email} studentName={paystackConfig.studentName}
          studentClass={paystackConfig.studentClass} planId={paystackConfig.planId} studentId={paystackConfig.studentId}
        />
      )}

      {/* RENEWAL MODAL */}
      {renewConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1128]/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 mx-auto p-6">
            <h2 className="text-xl font-extrabold text-[#0a1128] mb-1 tracking-tight">Start New Term</h2>
            <p className="text-sm text-gray-500 mb-6">Enroll your child for the upcoming academic period.</p>
            
            <form onSubmit={handleRenewTerm} className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Session</label>
                  <select required value={renewForm.session} onChange={e => setRenewForm({...renewForm, session: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600">
                    <option value="" disabled>Select Year</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Term</label>
                  <select required value={renewForm.term} onChange={e => setRenewForm({...renewForm, term: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600">
                    <option value="" disabled>Select Term</option>
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Child's Class</label>
                <select required value={renewForm.className} onChange={e => setRenewForm({...renewForm, className: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600">
                  <option value="" disabled>Select Class</option>
                  {classList.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setRenewConfig(null)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={isRenewing} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center">
                  {isRenewing ? 'Enrolling...' : 'Confirm Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a1128]/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-[300px] sm:max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 mx-auto">
            <div className="bg-[#0a1128] p-4 text-center text-white border-b-4 border-blue-600">
              <h2 className="text-base sm:text-lg font-bold tracking-widest uppercase">PayTerm</h2>
              <p className="text-[9px] text-blue-200 mt-0.5 uppercase tracking-wider">Official Receipt</p>
            </div>
            <div className="p-4 sm:p-5 space-y-3 bg-gray-50/50">
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs font-medium">Receipt No.</span>
                <span className="font-bold font-mono text-gray-900 text-xs">{activeReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs font-medium">Date</span>
                <span className="font-bold text-gray-900 text-xs">{new Date(activeReceipt.payment_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-2">
                <span className="text-gray-500 text-xs font-medium">Amount Paid</span>
                <span className="font-bold text-green-600 text-sm sm:text-base tracking-tight">₦{Number(activeReceipt.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs font-medium">Status</span>
                <span className="font-bold text-green-700 uppercase text-[9px] tracking-wider px-2 py-1 bg-green-100 rounded border border-green-200">{activeReceipt.status || 'Cleared'}</span>
              </div>
            </div>
            <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
              <button onClick={() => setActiveReceipt(null)} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100">Close</button>
              <button onClick={() => window.print()} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Print PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 px-1 md:px-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0a1128] tracking-tight">
            Welcome back, {parentName ? parentName.split(' ')[0] : 'Parent'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your active payment plans and student enrollments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/parent/profile" className="hidden sm:flex px-5 py-2.5 border border-gray-300 bg-white rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
            Profile
          </Link>
          <Link href="/parent/add-student" className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95">
            + Register Child
          </Link>
        </div>
      </div>

      {childrenData.length > 0 && (
        <h2 className="text-lg font-bold text-[#0a1128] mb-4 px-1 md:px-0 tracking-tight">Your Active Plans</h2>
      )}

      {/* STUDENTS GRID */}
      <div className={childrenData.length === 0 ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5"}>
        {childrenData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center flex flex-col items-center justify-center shadow-sm">
            <h3 className="text-base font-bold text-[#0a1128] mb-1">No Students Linked</h3>
            <p className="text-gray-500 text-xs font-medium mb-5">Register your child to a partner school to see your plans here.</p>
            <Link href="/parent/add-student" className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 active:scale-95 transition-all">
              + Register Child
            </Link>
          </div>
        ) : (
          childrenData.map((child) => {
            // Because we sorted the query, index 0 is always the most recent plan
            const plan = child.active_plans?.[0] 
            const isPending = child.enrollment_status === 'Pending Verification'
            const isEscrowFunded = isPending && plan && plan.amount_paid > 0
            
            const isFirstPayment = plan?.amount_paid === 0
            const isFullyPaid = plan && plan.total_fee > 0 && plan.amount_paid >= plan.total_fee
            
            const progressPercentage = plan && plan.total_fee > 0 
              ? Math.min(100, Math.round((Number(plan.amount_paid) / Number(plan.total_fee)) * 100)) 
              : 0

            // AGGREGATE ALL RECEIPTS: Map over every single plan (past and present) to gather the full history
            const allHistory = child.active_plans?.flatMap((p: any) => p.payment_history || []) || []
            const sortedHistory = allHistory.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
            
            const isHistoryExpanded = expandedHistoryId === child.id

            return (
              <div key={child.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6 flex flex-col transition-all">
                
                {/* Top Row: Name & Status Badge */}
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-bold text-[#0a1128] tracking-tight truncate pr-4">{child.full_name}</h3>
                  <div className="shrink-0">
                    {isFullyPaid ? (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 border border-green-100 rounded uppercase tracking-wider">Cleared</span>
                    ) : isEscrowFunded ? (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 border border-blue-100 rounded uppercase tracking-wider">Verifying</span>
                    ) : (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 border border-orange-100 rounded uppercase tracking-wider">Active</span>
                    )}
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-xs text-gray-500 truncate mb-6">
                  {child.student_class ? `${child.student_class} • ` : ''} {child.display_school_name}
                </p>

                {/* Financials & Progress */}
                {plan && (
                  <div className="mt-auto">
                    <div className="flex justify-between text-[11px] font-bold mb-2">
                      <span className="text-blue-600 uppercase tracking-widest">Paid: ₦{Number(plan.amount_paid).toLocaleString()}</span>
                      <span className="text-gray-500 uppercase tracking-widest">Total: ₦{Number(plan.total_fee).toLocaleString()}</span>
                    </div>
                    
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                    </div>

                    {/* DYNAMIC ACTION BLOCK */}
                    {isFullyPaid ? (
                      <div className="flex gap-2">
                        <div className="flex-1 bg-green-50 text-green-700 py-2.5 rounded-xl text-sm font-bold text-center border border-green-100 flex items-center justify-center">
                          Fully Paid
                        </div>
                        <button 
                          onClick={() => {
                            setRenewForm({ session: '', term: '', className: child.student_class })
                            setRenewConfig({ 
                              studentId: child.id, 
                              schoolId: child.school_id, 
                              schoolName: child.display_school_name, // FIX: Pass the school name explicitly 
                              currentClass: child.student_class 
                            })
                          }}
                          className="flex-1 bg-[#0a1128] text-white py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors active:scale-[0.98]"
                        >
                          Start New Term
                        </button>
                      </div>
                    ) : isEscrowFunded ? (
                      <div className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl text-sm font-bold text-center border border-blue-100">
                        Awaiting School Approval
                      </div>
                    ) : (
                      <button 
                        onClick={() => triggerPayment(plan, child)}
                        className="w-full bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
                      >
                        {isFirstPayment ? 'Pay 60% Initial Deposit' : 'Pay 40% Balance'}
                      </button>
                    )}

                    {/* UNIFIED HISTORY TOGGLE */}
                    {sortedHistory && sortedHistory.length > 0 && (
                      <div className="pt-3 border-t border-gray-100 mt-4">
                        <button onClick={() => toggleHistory(child.id)} className="w-full flex items-center justify-between text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                          <span>{isHistoryExpanded ? 'Hide All Transactions' : 'View Transaction History'}</span>
                          <svg className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {isHistoryExpanded && (
                          <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200 max-h-48 overflow-y-auto pr-1">
                            {sortedHistory.map((tx: any) => (
                              <div key={tx.id} className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                                <div>
                                  <p className="text-xs font-bold text-gray-900">₦{Number(tx.amount).toLocaleString()}</p>
                                  <p className="text-[9px] font-medium text-gray-500 uppercase">{new Date(tx.payment_date).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => setActiveReceipt(tx)} className="text-[10px] font-bold text-blue-600 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm hover:bg-gray-50 active:scale-95">
                                  Receipt
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}