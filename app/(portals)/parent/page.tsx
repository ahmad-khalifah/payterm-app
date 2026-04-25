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
            schools ( name ), 
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
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 animate-in fade-in pb-24">
      
      {/* MODALS (Paystack & Receipt) remain unchanged... */}
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

      {/* NEW HEADER LAYOUT */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Welcome back, {parentName ? parentName.split(' ')[0] : 'Parent'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage your active payment plans and student enrollments.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/parent/profile" className="hidden sm:flex px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
            Profile
          </Link>
          <Link href="/parent/add-student" className="w-full sm:w-auto bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95">
            + Register Child
          </Link>
        </div>
      </div>

      {childrenData.length > 0 && (
        <h2 className="text-lg font-bold text-gray-900 mb-4 px-1 md:px-0">Your Active Plans</h2>
      )}

      {/* STUDENTS GRID */}
      <div className={childrenData.length === 0 ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6"}>
        {childrenData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center flex flex-col items-center justify-center shadow-sm">
            <h3 className="text-base font-bold text-gray-900 mb-1">No Students Linked</h3>
            <p className="text-gray-500 text-xs font-medium mb-5">Register your child to a partner school to see your plans here.</p>
            <Link href="/parent/add-student" className="bg-blue-600 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-700 active:scale-95 transition-all">
              + Register Child
            </Link>
          </div>
        ) : (
          childrenData.map((child) => {
            const plan = child.active_plans?.[0]
            const isPending = child.enrollment_status === 'Pending Verification'
            const isEscrowFunded = isPending && plan && plan.amount_paid > 0
            
            const isFirstPayment = plan?.amount_paid === 0
            const isFullyPaid = plan && plan.total_fee > 0 && plan.amount_paid >= plan.total_fee
            
            // Calculate progress bar percentage safely
            const progressPercentage = plan && plan.total_fee > 0 
              ? Math.min(100, Math.round((Number(plan.amount_paid) / Number(plan.total_fee)) * 100)) 
              : 0

            const sortedHistory = plan?.payment_history?.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
            const isHistoryExpanded = expandedHistoryId === child.id

            return (
              <div key={child.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6 flex flex-col transition-all">
                
                {/* Top Row: Name & Status Badge */}
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate pr-4">{child.full_name}</h3>
                  <div className="shrink-0">
                    {isFullyPaid ? (
                      <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2.5 py-1 rounded uppercase tracking-wider">Fully Paid</span>
                    ) : isEscrowFunded ? (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded uppercase tracking-wider">Verifying</span>
                    ) : (
                      <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded uppercase tracking-wider">Active</span>
                    )}
                  </div>
                </div>

                {/* Subtitle */}
                <p className="text-xs text-gray-500 truncate mb-6">
                  {child.student_class ? `${child.student_class} • ` : ''} {child.schools?.name}
                </p>

                {/* Financials & Progress */}
                {plan && (
                  <div className="mt-auto">
                    
                    {/* Paid / Total Labels */}
                    <div className="flex justify-between text-[11px] font-bold mb-2">
                      <span className="text-blue-600 uppercase tracking-widest">Paid: ₦{Number(plan.amount_paid).toLocaleString()}</span>
                      <span className="text-gray-500 uppercase tracking-widest">Total: ₦{Number(plan.total_fee).toLocaleString()}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden">
                      <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
                    </div>

                    {/* Action Block */}
                    {isFullyPaid ? (
                      <div className="w-full bg-[#f0fdf4] text-green-700 py-3 rounded-xl text-sm font-bold text-center border border-green-100">
                        Plan Fully Paid
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

                    {/* History Toggle */}
                    {sortedHistory && sortedHistory.length > 0 && (
                      <div className="pt-3 border-t border-gray-100 mt-4">
                        <button onClick={() => toggleHistory(child.id)} className="w-full flex items-center justify-between text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                          <span>{isHistoryExpanded ? 'Hide Transactions' : 'View Transactions'}</span>
                          <svg className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        
                        {isHistoryExpanded && (
                          <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                            {sortedHistory.map((tx: any) => (
                              <div key={tx.id} className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                                <div>
                                  <p className="text-xs font-bold text-gray-900">₦{Number(tx.amount).toLocaleString()}</p>
                                  <p className="text-[9px] font-medium text-gray-500 uppercase">{new Date(tx.payment_date).toLocaleDateString()}</p>
                                </div>
                                <button onClick={() => setActiveReceipt(tx)} className="text-[10px] font-bold text-blue-600 bg-white border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-50">
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