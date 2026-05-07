'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import { UserPlus, ChevronRight, AlertCircle, Wallet, CheckCircle2, Bell } from 'lucide-react'

import DummyPaystack from './components/DummyPaystack'
import StudentCard from './components/StudentCard'
import RenewalModal from './components/RenewalModal'
import ReceiptModal from './components/ReceiptModal'

// --- UNIVERSAL TIERED PRICING ENGINE ---
export const getFeeBreakdown = (parentTotalFee: number, isInstallment: boolean = true) => {
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

export default function ParentDashboard() {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(true)
  const [parentName, setParentName] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [childrenData, setChildrenData] = useState<any[]>([])
  
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [renewConfig, setRenewConfig] = useState<any | null>(null)
  
  const [breakdownConfig, setBreakdownConfig] = useState<{
    plan: any; child: any; isFirstPayment: boolean;
  } | null>(null)

  const [paystackConfig, setPaystackConfig] = useState<{
    isOpen: boolean; amount: number; email: string; studentName: string;
    studentClass: string; planId: string; studentId: string; isMidTerm: boolean;
    mode: 'installment' | 'full';
  } | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      // DEMO-SAFE FIX: Instant local storage check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        toast.error("Session expired. Please log in again.")
        router.push('/parent-login') 
        return
      }
      
      const activeUserId = session.user.id
      setCurrentUserId(activeUserId)
      
      const { data: parentProfile } = await supabase.from('parents').select('full_name').eq('id', activeUserId).single()
      if (parentProfile) setParentName(parentProfile.full_name)

      const { data: students, error: studentError } = await supabase
        .from('students')
        .select(`
          id, full_name, school_id, student_class, enrollment_status,
          active_plans ( 
            id, total_fee, amount_paid, next_payment_date, status, clearance_code, created_at,
            academic_session, term, plan_type,
            payment_history ( id, amount, receipt_number, payment_date, status )
          )
        `)
        .eq('parent_id', activeUserId)
        .order('created_at', { ascending: false })

      if (studentError) throw studentError
      
      if (students && students.length > 0) {
        const schoolIds = students.map((s: any) => s.school_id).filter(Boolean)
        const { data: schoolsData } = await supabase.from('partner_schools').select('id, name').in('id', schoolIds)

        const finalStudentsData = students.map((child: any) => {
          const foundSchool = schoolsData?.find((sch: any) => sch.id === child.school_id)
          
          if (child.active_plans) {
            child.active_plans.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            child.active_plans = child.active_plans.map((plan: any) => ({
              ...plan,
              status: plan.status === 'Pending Verification' ? 'Active' : plan.status
            }))
          }
          
          return {
            ...child,
            enrollment_status: child.enrollment_status === 'Pending Verification' ? 'Active' : child.enrollment_status,
            display_school_name: foundSchool ? foundSchool.name : child.school_id
          }
        })
        setChildrenData(finalStudentsData)
      } else {
        setChildrenData([])
      }
    } catch (err) {
      console.error("Dashboard Fetch Error:", err)
      toast.error("Failed to load dashboard data.")
    } finally {
      setIsInitializing(false)
    }
  }, [router])

  useRealtimeSync(fetchDashboardData)

  useEffect(() => {
    fetchDashboardData()
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') router.push('/parent-login')
    })
    return () => authListener.subscription.unsubscribe()
  }, [fetchDashboardData, router])

  const handleShowBreakdown = (plan: any, child: any) => {
    const isFirstPayment = Number(plan.amount_paid) === 0
    setBreakdownConfig({ plan, child, isFirstPayment })
  }

  const triggerPayment = (amountToPay: number) => {
    if (!breakdownConfig) return
    const { plan, child, isFirstPayment } = breakdownConfig
    const dummyEmail = parentName ? `${parentName.replace(/\s+/g, '').toLowerCase()}@email.com` : 'parent@email.com'
    const planMode = plan.plan_type === 'full' ? 'full' : 'installment'

    setPaystackConfig({
      isOpen: true, amount: amountToPay, email: dummyEmail, studentName: child.full_name,
      studentClass: child.student_class, planId: plan.id, studentId: child.id, isMidTerm: !isFirstPayment,
      mode: planMode
    })
    setBreakdownConfig(null) 
  }

  const handlePaymentSuccess = async (reference: string) => {
    try {
      const isFullPayment = paystackConfig?.mode === 'full';
      const currentPlanId = paystackConfig?.planId;
      
      if (!currentPlanId) throw new Error("Missing Plan ID for payment update");
      
      const currentPlan = childrenData.flatMap(c => c.active_plans).find(p => p.id === currentPlanId);

      if (isFullPayment && currentPlan) {
        // Adjust the total fee in the DB to reflect the cheaper full-payment service fee
        const { base } = getFeeBreakdown(Number(currentPlan.total_fee), true);
        const { fee: fullFee } = getFeeBreakdown(Number(currentPlan.total_fee), false);
        const adjustedTotal = base + fullFee;

        await supabase.from('active_plans').update({ 
          amount_paid: adjustedTotal,
          total_fee: adjustedTotal, 
          status: 'Completed',
          plan_type: 'full'
        } as any).eq('id', currentPlanId);
      } else {
        const updateData: any = { 
          plan_type: 'installment',
          amount_paid: paystackConfig?.isMidTerm ? currentPlan?.total_fee : paystackConfig?.amount 
        };
        if (paystackConfig?.isMidTerm) {
          updateData.mid_term_cleared = true;
          updateData.status = 'Completed';
        }
        
        await supabase.from('active_plans').update(updateData).eq('id', currentPlanId);
      }
      
      await supabase.from('notifications').insert({
        parent_id: currentUserId,
        title: 'Payment Successful',
        message: `Your payment of ₦${paystackConfig?.amount.toLocaleString()} for ${paystackConfig?.studentName} was received successfully. Receipt: ${reference}`
      })

      toast.success(`Payment confirmed! Receipt No: ${reference}`) 
      setPaystackConfig(null)
      fetchDashboardData() 
    } catch (err) {
      console.error("Update error:", err)
      toast.error("Payment recorded, but there was an issue updating your dashboard.")
    }
  }

  const enrolledCount = childrenData.length;
  const totalOutstanding = childrenData.reduce((acc, child) => {
    const plan = child.active_plans?.[0];
    if (!plan) return acc;
    const due = Number(plan.total_fee) - Number(plan.amount_paid);
    return acc + Math.max(0, due);
  }, 0);

  if (isInitializing) return <div className="p-10 text-center text-sm font-bold text-[#0a1128] uppercase tracking-widest h-screen flex items-center justify-center animate-pulse">Loading...</div>

  return (
    <div className="w-full max-w-6xl mx-auto animate-in fade-in pb-24 relative bg-[#f8fafc] min-h-screen">
      
      {/* DYNAMIC PAYMENT BREAKDOWN MODAL */}
      {breakdownConfig && (() => {
        const planMode = breakdownConfig.plan.plan_type === 'full' ? 'full' : 'installment'
        const isInstallment = planMode === 'installment'

        const { fee: activeFee, base: baseTuition } = getFeeBreakdown(Number(breakdownConfig.plan.total_fee), isInstallment)
        
        const depositAmount = isInstallment ? (baseTuition * 0.60) : baseTuition
        const balanceAmount = isInstallment ? (baseTuition * 0.40) : 0
        
        const totalDueToday = breakdownConfig.isFirstPayment 
          ? depositAmount + activeFee
          : balanceAmount

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a1128]/40 backdrop-blur-md p-4 transition-all">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl shadow-blue-900/20 border border-white/50 animate-in zoom-in-95 mx-auto">
              
              <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0a1128] tracking-tight leading-tight">Payment Confirmation</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{breakdownConfig.child.full_name} • {breakdownConfig.child.student_class}</p>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {breakdownConfig.isFirstPayment ? (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${isInstallment ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'}`}>
                        {isInstallment ? 'Installment Plan' : 'Full Payment Plan'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-100 mt-2">
                      <span className="text-gray-500 font-medium">School Tuition</span>
                      <span className="font-bold text-[#0a1128]">₦{baseTuition.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-100">
                      <span className="text-gray-500 font-medium">{isInstallment ? 'Initial Deposit (60%)' : 'Full Tuition (100%)'}</span>
                      <span className="font-bold text-[#0a1128]">₦{depositAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Platform Fee</span>
                      <span className="font-bold text-[#0a1128]">₦{activeFee.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-orange-50 text-orange-700">
                        Final Installment
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-100 mt-2">
                      <span className="text-gray-500 font-medium">Final Balance (40%)</span>
                      <span className="font-bold text-[#0a1128]">₦{balanceAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Platform Fee</span>
                      <span className="font-bold text-gray-400 italic">Paid upfront</span>
                    </div>
                  </>
                )}
                
                <div className="bg-blue-50/50 rounded-2xl p-4 mt-2 flex justify-between items-center border border-blue-100/50">
                  <span className="text-sm font-bold text-blue-900 tracking-wide">Total Due Today</span>
                  <span className="text-2xl font-black text-blue-600">₦{totalDueToday.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 flex gap-3 border-t border-gray-100">
                <button onClick={() => setBreakdownConfig(null)} className="flex-1 py-3.5 text-sm font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-all active:scale-95">Cancel</button>
                <button onClick={() => triggerPayment(totalDueToday)} className="flex-[2] py-3.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all active:scale-95 flex items-center justify-center gap-2 group">
                  Proceed to Pay
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* EXTERNALLY MANAGED MODALS */}
      {paystackConfig && (
        <DummyPaystack
          isOpen={paystackConfig.isOpen} onClose={() => setPaystackConfig(null)} onSuccess={handlePaymentSuccess}
          amount={paystackConfig.amount} email={paystackConfig.email} studentName={paystackConfig.studentName}
          studentClass={paystackConfig.studentClass} planId={paystackConfig.planId} studentId={paystackConfig.studentId}
        />
      )}

      {renewConfig && (
        <RenewalModal 
          config={renewConfig} 
          currentUserId={currentUserId} 
          onClose={() => setRenewConfig(null)} 
          onSuccess={() => { setRenewConfig(null); fetchDashboardData(); }} 
        />
      )}

      {activeReceipt && (
        <ReceiptModal 
          receipt={activeReceipt} 
          onClose={() => setActiveReceipt(null)} 
        />
      )}

      {/* --- STICKY PROFILE HEADER --- */}
      <header className="sticky top-0 z-40 bg-[#f8fafc]/95 backdrop-blur-md pt-4 sm:pt-6 lg:pt-8 pb-4 border-b border-gray-200/50 px-4 sm:px-6 lg:px-10 transition-all">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-sm font-extrabold border border-blue-100 shrink-0">
              {parentName ? parentName.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-gray-400">Welcome back</span>
              <h1 className="text-sm font-extrabold text-[#0a1128] leading-none mt-0.5">
                {parentName ? parentName.split(' ')[0] : 'Parent'}
              </h1>
            </div>
          </div>
          <button className="relative w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>
      </header>

      {/* --- SCROLLING CONTENT --- */}
      <div className="px-4 sm:px-6 lg:px-10 pt-6">

        {/* THE COMPACT WHITE WIDGET CARD */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-5 sm:p-6 mb-8 transition-all">
          
          <div className="mb-5">
            <p className="text-[11px] font-medium text-gray-500 mb-1">Outstanding Balance</p>
            <div className="text-3xl sm:text-4xl font-black text-[#0a1128] tracking-tight">
              ₦{totalOutstanding.toLocaleString()}
            </div>
          </div>

          <div className="bg-[#0a1128] rounded-2xl flex items-stretch shadow-md shadow-[#0a1128]/10 overflow-hidden">
            <div className="flex-1 py-3 px-4 flex flex-col items-center justify-center border-r border-white/10">
              <span className="text-[10px] text-blue-200/70 mb-0.5">Active Plans</span>
              <span className="text-sm font-bold text-white">{enrolledCount}</span>
            </div>
            
            <Link 
              href="/parent/add-student" 
              className="flex-1 py-3 px-4 flex flex-col items-center justify-center hover:bg-white/5 active:bg-white/10 transition-colors cursor-pointer"
            >
              <span className="text-[10px] text-blue-200/70 mb-0.5">New Student</span>
              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" />
                Add Child
              </span>
            </Link>
          </div>
        </div>

        {/* STUDENTS GRID */}
        <div className={childrenData.length === 0 ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6"}>
          {childrenData.length === 0 ? (
            <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 border border-gray-100">
                <AlertCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0a1128] mb-2 relative z-10">No Students Linked</h3>
              <p className="text-gray-500 text-sm font-medium mb-8 max-w-sm mx-auto relative z-10 leading-relaxed">Connect your child to a verified partner school to instantly generate your flexible payment plan.</p>
              
              <Link href="/parent/add-student" className="group relative w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-[#0a1128] text-white rounded-full font-bold text-sm transition-all shadow-lg shadow-blue-900/20 hover:shadow-blue-900/40 active:scale-95 z-10">
                <span className="tracking-wide">Register Your Child</span>
                <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ) : (
            childrenData.map((child) => (
              <StudentCard 
                key={child.id}
                child={child}
                expandedHistoryId={expandedHistoryId}
                onToggleHistory={(id: string) => setExpandedHistoryId(prev => prev === id ? null : id)}
                onPay={handleShowBreakdown} 
                onRenew={setRenewConfig}
                viewReceipt={setActiveReceipt}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}