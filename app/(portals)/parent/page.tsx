'use client'

import { useState, useEffect } from 'react'
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

  const [paystackConfig, setPaystackConfig] = useState<{
    isOpen: boolean;
    amount: number;
    email: string;
    studentName: string;
    studentClass: string;
    planId: string;
    studentId: string;
    isMidTerm: boolean;
  } | null>(null)

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/parent-login')
        return
      }
      setCurrentUserId(user.id)

      const { data: parentProfile } = await supabase.from('parents').select('full_name').eq('id', user.id).single()
      if (parentProfile) setParentName(parentProfile.full_name)

      const { data: students, error: studentError } = await supabase
        .from('students')
        .select(`
          id, full_name, school_id, student_class, enrollment_status,
          active_plans ( 
            id, total_fee, amount_paid, next_payment_date, status, clearance_code, mid_term_cleared,
            payment_history ( id, amount, receipt_number, payment_date, status )
          )
        `)
        .eq('parent_id', user.id)
        .order('created_at', { ascending: false })

      if (studentError) throw studentError
      if (students) setChildrenData(students)

    } catch (err) {
      console.error("Dashboard Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true;

    const loadDashboardData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          router.push('/parent-login');
          return;
        }

        if (isMounted) setCurrentUserId(session.user.id);

        const { data: parentProfile } = await supabase
          .from('parents')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
          
        if (isMounted && parentProfile) {
          setParentName(parentProfile.full_name);
        }

        const { data: students, error: studentError } = await supabase
          .from('students')
          .select(`
            id, full_name, school_id, student_class, enrollment_status,
            active_plans ( 
              id, total_fee, amount_paid, next_payment_date, status, clearance_code, mid_term_cleared,
              payment_history ( id, amount, receipt_number, payment_date, status )
            )
          `)
          .eq('parent_id', session.user.id)
          .order('created_at', { ascending: false });

        if (studentError) throw studentError;
        
        if (isMounted && students) {
          setChildrenData(students);
        }

      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDashboardData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/parent-login');
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const triggerPayment = (plan: any, child: any) => {
    const validStudentId = child.id || child.student_id;

    if (!validStudentId) {
      alert("STOP: The dashboard cannot find the student's ID. Open your browser console to see what the database returned.");
      return; 
    }

    const isFirstPayment = Number(plan.amount_paid) === 0
    const paymentAmount = isFirstPayment 
      ? Number(plan.total_fee) * 0.60 
      : Number(plan.total_fee) - Number(plan.amount_paid)

    const dummyEmail = parentName ? `${parentName.replace(/\s+/g, '').toLowerCase()}@email.com` : 'parent@email.com'

    setPaystackConfig({
      isOpen: true,
      amount: paymentAmount,
      email: dummyEmail,
      studentName: child.full_name,
      studentClass: child.student_class,
      planId: plan.id,
      studentId: validStudentId, 
      isMidTerm: !isFirstPayment
    })
  }

  const handlePaymentSuccess = async (reference: string) => {
    try {
      if (paystackConfig?.isMidTerm) {
        await supabase
          .from('active_plans')
          .update({ mid_term_cleared: true })
          .eq('id', paystackConfig.planId)
      }
      
      alert(`Payment confirmed! Receipt No: ${reference}`)
      setPaystackConfig(null)
      fetchDashboardData() 
    } catch (err) {
      console.error("Post-payment update error:", err)
    }
  }

  const toggleHistory = (id: string) => {
    setExpandedHistoryId(prev => prev === id ? null : id)
  }

  if (loading) return <div className="p-10 text-center text-sm font-bold text-[#0a1128] uppercase tracking-widest h-full flex items-center justify-center animate-pulse">Loading Dashboard...</div>

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-24">
      
      {/* PAYMENT MODAL */}
      {paystackConfig && (
        <DummyPaystack
          isOpen={paystackConfig.isOpen}
          onClose={() => setPaystackConfig(null)}
          onSuccess={handlePaymentSuccess}
          amount={paystackConfig.amount}
          email={paystackConfig.email}
          studentName={paystackConfig.studentName}
          studentClass={paystackConfig.studentClass}
          planId={paystackConfig.planId}
          studentId={paystackConfig.studentId}
        />
      )}

      {/* RECEIPT MODAL */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
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
              <button onClick={() => setActiveReceipt(null)} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors active:scale-95">Close</button>
              <button onClick={() => window.print()} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors active:scale-95">Print PDF</button>
            </div>
          </div>
        </div>
      )}

      {/* DASHBOARD HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 border-b border-gray-200 pb-5">
        <div>
          <p className="text-gray-500 text-xs font-medium mb-1">Overview</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome, {parentName ? parentName.split(' ')[0] : 'Parent'}
          </h1>
        </div>
        
        <Link href="/parent/add-student" className="w-full sm:w-auto bg-[#0a1128] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-sm flex items-center justify-center gap-2 shrink-0 active:scale-95">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
          Add Student
        </Link>
      </div>

      {/* STUDENTS LIST */}
      <div className="space-y-5">
        {childrenData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-6 sm:p-8 text-center flex flex-col items-center justify-center shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">No Students Linked</h3>
            <p className="text-gray-500 text-xs max-w-xs font-medium mb-5">Connect your child to a partner school to set up a payment plan.</p>
            <Link href="/parent/add-student" className="w-full sm:w-auto bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 active:scale-95 transition-all">Link Student Now</Link>
          </div>
        ) : (
          childrenData.map((child) => {
            const plan = child.active_plans?.[0]
            const isPending = child.enrollment_status === 'Pending Verification'
            const isEscrowFunded = isPending && plan && plan.amount_paid > 0
            
            const isFirstPayment = plan?.amount_paid === 0
            const isFullyPaid = plan?.amount_paid >= plan?.total_fee
            const amountDue = isFirstPayment ? Number(plan?.total_fee) * 0.60 : Number(plan?.total_fee) - Number(plan?.amount_paid)

            const sortedHistory = plan?.payment_history?.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
            const isHistoryExpanded = expandedHistoryId === child.id

            return (
              <div key={child.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
                
                {/* CARD HEADER: Student Details & Status */}
                <div className="p-4 sm:p-5 bg-gray-50/50 border-b border-gray-100 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div className="min-w-0 flex-1 pr-4">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight truncate">{child.full_name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-[220px] sm:max-w-none">{child.student_class} • {child.school_id}</p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 shrink-0 mt-2 sm:mt-0">
                    {isEscrowFunded ? (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md border border-blue-200 uppercase tracking-wider">
                        Verifying Payment
                      </span>
                    ) : isPending ? (
                      <span className="text-[10px] font-bold text-orange-700 bg-orange-100 px-2.5 py-1 rounded-md border border-orange-200 uppercase tracking-wider">
                        Payment Due
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-md border border-green-200 uppercase tracking-wider">
                        Active Plan
                      </span>
                    )}
                    {!isPending && plan?.mid_term_cleared && (
                      <span className="text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 px-2.5 py-1 rounded-md flex items-center gap-1 uppercase tracking-wider">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        Cleared
                      </span>
                    )}
                  </div>
                </div>

                {/* CARD BODY: Financials & Actions */}
                <div className="p-4 sm:p-5 space-y-5">
                  
                  {isPending && isFirstPayment && (
                    <div className="bg-orange-50 text-orange-800 p-3 rounded-xl border border-orange-100 text-xs font-medium leading-relaxed flex gap-2.5">
                      <svg className="w-4 h-4 shrink-0 text-orange-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Please make the initial 60% payment to secure your child's enrollment for the term.
                    </div>
                  )}

                  {plan && (
                    <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                      <div>
                        <p className="text-[10px] font-medium text-gray-500 mb-1 uppercase tracking-wider">Total School Fees</p>
                        <p className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">₦{Number(plan.total_fee).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-medium text-green-600 mb-1 uppercase tracking-wider">Amount Paid</p>
                        <p className="text-base sm:text-lg font-black text-green-600">₦{Number(plan.amount_paid).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {plan && (
                    <div className={`rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${isEscrowFunded ? 'bg-blue-50 border border-blue-100' : isFullyPaid ? 'bg-green-50 border border-green-100' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className="w-full sm:w-auto text-left">
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mb-1">
                          {isEscrowFunded ? 'Current Status' : isFullyPaid ? 'Current Status' : isFirstPayment ? 'Action Required' : 'Next Payment Date'}
                        </p>
                        <p className="text-sm sm:text-base font-bold text-gray-900">
                          {isEscrowFunded ? 'Waiting for school confirmation' : isFullyPaid ? 'All fees paid for this term' : isFirstPayment ? 'Initial Payment Required' : (plan.next_payment_date || 'Awaiting Calendar')}
                        </p>
                        {!isEscrowFunded && !isFullyPaid && (
                          <p className="text-xs font-black text-blue-600 mt-1">₦{amountDue.toLocaleString()} due now</p>
                        )}
                      </div>

                      {!isEscrowFunded && !isFullyPaid && (
                        <button 
                          onClick={() => triggerPayment(plan, child)}
                          className="w-full sm:w-auto bg-[#0a1128] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 transition-all active:scale-[0.98] shrink-0 mt-2 sm:mt-0"
                        >
                          {isFirstPayment ? `Pay 60% Now` : `Pay 40% Balance`}
                        </button>
                      )}
                    </div>
                  )}

                  {sortedHistory && sortedHistory.length > 0 && (
                    <div className="pt-1">
                      <button 
                        onClick={() => toggleHistory(child.id)} 
                        className="w-full py-3 flex items-center justify-center gap-2 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors bg-gray-50 hover:bg-gray-100 rounded-xl active:scale-[0.99]"
                      >
                        {isHistoryExpanded ? 'Hide Past Payments' : 'View Past Payments'}
                        <svg className={`w-3.5 h-3.5 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      
                      {isHistoryExpanded && (
                        <div className="mt-3 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                          {sortedHistory.map((tx: any) => (
                            <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-white shadow-sm">
                              <div>
                                <p className="text-sm font-bold text-gray-900">₦{Number(tx.amount).toLocaleString()}</p>
                                <p className="text-[10px] font-medium text-gray-500 mt-0.5">{new Date(tx.payment_date).toLocaleDateString()}</p>
                              </div>
                              <button 
                                onClick={() => setActiveReceipt(tx)} 
                                className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors active:scale-95"
                              >
                                Receipt
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}