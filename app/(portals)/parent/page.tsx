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

  // State to control the DummyPaystack modal
  const [paystackConfig, setPaystackConfig] = useState<{
    isOpen: boolean;
    amount: number;
    email: string;
    studentName: string;
    studentClass: string;
    planId: string;
    studentId: string; // ADDED: Required for the DB insert
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
        // 1. Securely await the local session FIRST
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.user) {
          router.push('/parent-login');
          return;
        }

        if (isMounted) setCurrentUserId(session.user.id);

        // 2. Fetch Parent Profile
        const { data: parentProfile } = await supabase
          .from('parents')
          .select('full_name')
          .eq('id', session.user.id)
          .single();
          
        if (isMounted && parentProfile) {
          setParentName(parentProfile.full_name);
        }

        // 3. Fetch Relational Data
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

    // 4. Listen for logouts
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

  // Trigger Modal instead of instant DB logic
  const triggerPayment = (plan: any, child: any) => {
    // 1. Force the browser to show us exactly what the database returned
    console.log("DEBUG DASHBOARD - Full Child Object:", child);

    // 2. Safely grab the ID whether your column is named 'id' or 'student_id'
    const validStudentId = child.id || child.student_id;

    if (!validStudentId) {
      alert("STOP: The dashboard cannot find the student's ID. Open your browser console to see what the database returned.");
      return; // Stop the modal from even opening
    }

    const isFirstPayment = Number(plan.amount_paid) === 0
    const paymentAmount = isFirstPayment 
      ? Number(plan.total_fee) * 0.60 
      : Number(plan.total_fee) - Number(plan.amount_paid)

    const dummyEmail = parentName ? `${parentName.replace(/\s+/g, '').toLowerCase()}@email.com` : 'parent@email.com'

    // 3. Pass the strictly verified validStudentId
    setPaystackConfig({
      isOpen: true,
      amount: paymentAmount,
      email: dummyEmail,
      studentName: child.full_name,
      studentClass: child.student_class,
      planId: plan.id,
      studentId: validStudentId, // <--- Using the verified ID
      isMidTerm: !isFirstPayment
    })
  }

  // Handle Success from Modal
  const handlePaymentSuccess = async (reference: string) => {
    try {
      // If this was the 40% mid-term payment, instantly unlock their clearance ticket
      if (paystackConfig?.isMidTerm) {
        await supabase
          .from('active_plans')
          .update({ mid_term_cleared: true })
          .eq('id', paystackConfig.planId)
      }
      
      alert(`Payment confirmed! Receipt No: ${reference}`)
      setPaystackConfig(null)
      fetchDashboardData() // Refresh UI instantly
    } catch (err) {
      console.error("Post-payment update error:", err)
    }
  }

  const toggleHistory = (id: string) => {
    setExpandedHistoryId(prev => prev === id ? null : id)
  }

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-full flex items-center justify-center animate-pulse">Loading Dashboard...</div>

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto animate-in fade-in pb-24">
      
      {/* --- VIRTUAL PAYSTACK MODAL --- */}
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
          studentId={paystackConfig.studentId} // ADDED: Passing the ID to the component
        />
      )}

      {/* --- RECEIPT MODAL --- */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-[#0a1128] p-6 text-center text-white border-b-4 border-blue-600">
              <h2 className="text-xl font-bold tracking-widest uppercase">PayTerm</h2>
              <p className="text-[10px] text-blue-200 mt-1 uppercase tracking-wider">Official Receipt</p>
            </div>
            <div className="p-6 space-y-4 bg-gray-50/50">
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-500 text-xs font-medium">Receipt No.</span>
                <span className="font-bold font-mono text-[#0a1128] text-sm">{activeReceipt.receipt_number}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-500 text-xs font-medium">Date</span>
                <span className="font-bold text-[#0a1128] text-sm">{new Date(activeReceipt.payment_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-200 pb-3">
                <span className="text-gray-500 text-xs font-medium">Amount Paid</span>
                <span className="font-bold text-green-600 text-lg tracking-tight">₦{Number(activeReceipt.amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-xs font-medium">Status</span>
                <span className="font-bold text-green-700 uppercase text-[9px] tracking-wider px-2 py-1 bg-green-100 rounded border border-green-200">{activeReceipt.status || 'Cleared'}</span>
              </div>
            </div>
            <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
              <button onClick={() => setActiveReceipt(null)} className="flex-1 py-3 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors">Close</button>
              <button onClick={() => window.print()} className="flex-1 py-3 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors">Print PDF</button>
            </div>
          </div>
        </div>
      )}
      {/* --------------------- */}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] tracking-tight">Parent Dashboard</h1>
          <p className="text-gray-500 text-sm sm:text-base mt-1">Welcome back, <strong className="text-[#0a1128]">{parentName || 'Parent'}</strong>.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-3 bg-white border border-gray-300 rounded-full text-gray-600 hover:bg-gray-50 shadow-sm transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </button>
          
          <Link href="/parent/add-student" className="bg-[#0a1128] text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-[#15234b] transition-colors shadow-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Student
          </Link>
        </div>
      </div>

      <div className="space-y-6">
        {childrenData.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-8 text-center flex flex-col items-center justify-center shadow-sm">
            <h3 className="text-base font-bold text-[#0a1128] mb-1">No Students Linked</h3>
            <p className="text-gray-500 text-xs max-w-xs font-medium mb-5">Connect your child to a partner school to generate a plan.</p>
            <Link href="/parent/add-student" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm">Link Student Now</Link>
          </div>
        ) : (
          childrenData.map((child) => {
            const plan = child.active_plans[0]
            const isPending = child.enrollment_status === 'Pending Verification'
            const isEscrowFunded = isPending && plan && plan.amount_paid > 0
            
            // 60/40 UI Logic calculations
            const isFirstPayment = plan?.amount_paid === 0
            const isFullyPaid = plan?.amount_paid >= plan?.total_fee
            const amountDue = isFirstPayment ? Number(plan?.total_fee) * 0.60 : Number(plan?.total_fee) - Number(plan?.amount_paid)

            const sortedHistory = plan?.payment_history?.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
            const isHistoryExpanded = expandedHistoryId === child.id

            return (
              <div key={child.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-all">
                
                <div className="p-4 sm:p-5 bg-gray-50/80 border-b border-gray-100 flex justify-between items-start">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-[#0a1128]">{child.full_name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{child.student_class} • {child.school_id}</p>
                  </div>
                  <div className="text-right">
                    {isEscrowFunded ? (
                      <span className="text-[9px] font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded shadow-sm uppercase tracking-wider border border-blue-200">In Escrow</span>
                    ) : isPending ? (
                      <span className="text-[9px] font-bold text-orange-700 bg-orange-100 px-2 py-1 rounded shadow-sm uppercase tracking-wider border border-orange-200">Awaiting</span>
                    ) : (
                      <span className="text-[9px] font-bold text-green-700 bg-green-100 px-2 py-1 rounded shadow-sm uppercase tracking-wider border border-green-200">Active</span>
                    )}
                    {!isPending && plan?.mid_term_cleared && <p className="text-[10px] text-green-600 font-bold mt-2">✓ Mid-Term Cleared</p>}
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  
                  {isPending && isFirstPayment && (
                    <div className="bg-orange-50 text-orange-800 p-3 rounded-lg border border-orange-200 text-xs font-medium">
                      Pay the 60% downpayment into Escrow to secure enrollment and access the school gates.
                    </div>
                  )}

                  {plan && (
                    <div className="flex justify-between items-end border-b border-gray-100 pb-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Invoice</p>
                        <p className="text-2xl font-bold font-mono text-[#0a1128]">₦{Number(plan.total_fee).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-0.5">Total Paid</p>
                        <p className="text-lg font-bold font-mono text-green-700">₦{Number(plan.amount_paid).toLocaleString()}</p>
                      </div>
                    </div>
                  )}

                  {/* REBUILT 60/40 BILLING TRACKER */}
                  {plan && (
                    <div className={`rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 ${isEscrowFunded ? 'bg-blue-50/50 border border-blue-100' : isFullyPaid ? 'bg-green-50/50 border border-green-100' : 'bg-gray-50 border border-gray-200'}`}>
                      <div className="w-full sm:w-auto text-center sm:text-left">
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                          {isEscrowFunded ? 'Status' : isFullyPaid ? 'Status' : isFirstPayment ? 'Action Required' : 'Mid-Term Resumption Date'}
                        </p>
                        <p className="text-base font-bold text-[#0a1128]">
                          {isEscrowFunded ? 'Awaiting School Verification' : isFullyPaid ? 'Term Completely Paid' : isFirstPayment ? 'Resumption Downpayment' : (plan.next_payment_date || 'Awaiting Calendar')}
                        </p>
                        {!isEscrowFunded && !isFullyPaid && (
                          <p className="text-sm font-mono font-bold text-blue-600 mt-1">₦{amountDue.toLocaleString()} due</p>
                        )}
                      </div>

                      {!isEscrowFunded && !isFullyPaid && (
                        <button 
                          onClick={() => triggerPayment(plan, child)}
                          className="w-full sm:w-auto bg-[#0a1128] text-white px-6 py-3 rounded-lg text-sm font-bold shadow-sm hover:bg-[#15234b] transition-colors shrink-0"
                        >
                          {isFirstPayment ? `Pay 60% Escrow` : `Pay 40% Balance`}
                        </button>
                      )}
                    </div>
                  )}

                  {sortedHistory && sortedHistory.length > 0 && (
                    <div className="pt-2">
                      <button onClick={() => toggleHistory(child.id)} className="w-full py-2 flex items-center justify-center gap-2 text-xs font-bold text-gray-500 hover:text-[#0a1128] transition-colors bg-white rounded-lg border border-gray-200 shadow-sm">
                        {isHistoryExpanded ? 'Hide Transactions' : 'View Billing History'}
                        <svg className={`w-3 h-3 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      
                      {isHistoryExpanded && (
                        <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200">
                          {sortedHistory.map((tx: any) => (
                            <div key={tx.id} className="flex justify-between items-center p-3 rounded-xl border border-gray-100 bg-gray-50">
                              <div>
                                <p className="text-sm font-bold text-[#0a1128]">₦{Number(tx.amount).toLocaleString()}</p>
                                <p className="text-[10px] font-medium text-gray-500">{new Date(tx.payment_date).toLocaleDateString()}</p>
                              </div>
                              <button onClick={() => setActiveReceipt(tx)} className="text-[10px] font-bold text-[#0a1128] bg-white border border-gray-200 px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors shadow-sm">Receipt</button>
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