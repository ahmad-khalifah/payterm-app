'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync' // <-- The Hook
import { Settings, UserPlus, FileText, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react'

import DummyPaystack from './components/DummyPaystack'
import StudentCard from './components/StudentCard'
import RenewalModal from './components/RenewalModal'
import ReceiptModal from './components/ReceiptModal'

// --- UNIVERSAL PRICING ENGINE ---
export const getFeeBreakdown = (totalInvoice: number) => {
  if (totalInvoice <= 52499) return { fee: 2500, base: totalInvoice - 2500 }
  if (totalInvoice <= 105000) return { fee: 5000, base: totalInvoice - 5000 }
  if (totalInvoice <= 208500) return { fee: 8500, base: totalInvoice - 8500 }
  return { fee: 10000, base: totalInvoice - 10000 }
}

export default function ParentDashboard() {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(true) // <-- Strict Session Lock
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
  } | null>(null)

  // 1. Pure Fetch Function
  const fetchDashboardData = useCallback(async () => {
    try {
      // STRICT PROTOCOL: Only use getUser() to validate secure HTTP cookies.
      // This permanently fixes the tab-switching ghost account bug.
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        toast.error("Session expired. Please log in again.")
        router.push('/parent-login') 
        return
      }
      
      const activeUserId = user.id
      setCurrentUserId(activeUserId)
      
      const { data: parentProfile } = await supabase.from('parents').select('full_name').eq('id', activeUserId).single()
      if (parentProfile) setParentName(parentProfile.full_name)

      const { data: students, error: studentError } = await supabase
        .from('students')
        .select(`
          id, full_name, school_id, student_class, enrollment_status,
          active_plans ( 
            id, total_fee, amount_paid, next_payment_date, status, clearance_code, created_at,
            academic_session, term,
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
      setIsInitializing(false) // Release the UI lock once secure
    }
  }, [router])

  // 2. THE HOOK GOES HERE: At the top level!
  useRealtimeSync(() => fetchDashboardData())

  // 3. Normal Initialization Check
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

    setPaystackConfig({
      isOpen: true, amount: amountToPay, email: dummyEmail, studentName: child.full_name,
      studentClass: child.student_class, planId: plan.id, studentId: child.id, isMidTerm: !isFirstPayment
    })
    setBreakdownConfig(null) 
  }

  const handlePaymentSuccess = async (reference: string) => {
    try {
      if (paystackConfig?.isMidTerm) {
        await supabase.from('active_plans').update({ mid_term_cleared: true }).eq('id', paystackConfig.planId)
      }
      
      await supabase.from('notifications').insert({
        parent_id: currentUserId,
        title: 'Payment Successful',
        message: `Your payment of ₦${paystackConfig?.amount.toLocaleString()} for ${paystackConfig?.studentName} was received successfully. Receipt: ${reference}`
      })

      toast.success(`Payment confirmed! Receipt No: ${reference}`) 
      setPaystackConfig(null)
      fetchDashboardData() 
      
      // We don't need a useRealtimeSync here. 
      // 1. We just called fetchDashboardData() above manually.
      // 2. The global listener (step 2) will catch any further DB updates anyway.
    } catch (err) {
      console.error("Update error:", err)
      toast.error("Payment recorded, but there was an issue updating your dashboard.")
    }
  }

  // Lock the UI until initialization is complete
  if (isInitializing) return <div className="p-10 text-center text-sm font-bold text-[#0a1128] uppercase tracking-widest h-screen flex items-center justify-center animate-pulse">Authenticating Secure Session...</div>

  return (
    <div className="w-full max-w-6xl mx-auto animate-in fade-in pb-24 relative">
      
      {/* PAYMENT BREAKDOWN MODAL */}
      {breakdownConfig && (() => {
        const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(Number(breakdownConfig.plan.total_fee))
        const depositAmount = baseTuition * 0.60
        const balanceAmount = baseTuition * 0.40
        const totalDueToday = breakdownConfig.isFirstPayment ? (depositAmount + serviceFee) : balanceAmount

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a1128]/40 backdrop-blur-md p-4 transition-all">
            <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl shadow-blue-900/20 border border-white/50 animate-in zoom-in-95 mx-auto">
              
              <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-6 flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#0a1128] tracking-tight leading-tight">Payment Breakdown</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{breakdownConfig.child.full_name} • {breakdownConfig.child.student_class}</p>
                </div>
              </div>
              
              <div className="p-6 space-y-4">
                {breakdownConfig.isFirstPayment ? (
                  <>
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-100">
                      <span className="text-gray-500 font-medium">School Tuition</span>
                      <span className="font-bold text-[#0a1128]">₦{baseTuition.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Initial Deposit (60%)</span>
                      <span className="font-bold text-[#0a1128]">₦{depositAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500 font-medium">Platform Fee</span>
                      <span className="font-bold text-[#0a1128]">₦{serviceFee.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-sm pb-3 border-b border-gray-100">
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

      {/* STICKY HEADER SECTION */}
      <div className="sticky top-0 z-40 bg-gray-50/95 backdrop-blur-md pt-4 sm:pt-6 lg:pt-10 pb-4 px-4 sm:px-6 lg:px-10 border-b border-gray-200/50 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#0a1128] to-blue-900 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-900/20">
              {parentName ? parentName.charAt(0) : 'P'}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0a1128] tracking-tight">
                Welcome back, {parentName ? parentName.split(' ')[0] : 'Parent'}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">Manage your active payment plans and enrollments.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Link href="/parent/profile" className="hidden sm:flex px-6 py-3 border border-gray-200 bg-white rounded-full text-sm font-bold text-gray-700 hover:bg-gray-50 hover:shadow-md transition-all active:scale-95 items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            
            <Link href="/parent/add-student" className="group relative w-full sm:w-auto flex items-center justify-center gap-3 px-6 py-3 bg-[#0a1128] text-white rounded-full font-bold text-sm transition-all shadow-lg shadow-[#0a1128]/20 hover:shadow-blue-900/30 active:scale-95 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <div className="relative flex items-center justify-center w-6 h-6 rounded-full bg-white/10 shadow-inner border border-white/20">
                <UserPlus className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="relative tracking-wide">Add New Student</span>
            </Link>
          </div>
        </div>
      </div>

      {/* DASHBOARD CONTENT CONTAINER */}
      <div className="px-4 sm:px-6 lg:px-10">
        {childrenData.length > 0 && (
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-extrabold text-[#0a1128] tracking-tight">Your Active Plans</h2>
          </div>
        )}

        {/* STUDENTS GRID */}
        <div className={childrenData.length === 0 ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6"}>
          {childrenData.length === 0 ? (
            <div className="bg-gradient-to-b from-white to-gray-50 rounded-3xl border border-dashed border-gray-300 p-12 text-center flex flex-col items-center justify-center shadow-sm relative overflow-hidden">
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
              <div className="w-20 h-20 bg-white shadow-xl shadow-blue-900/5 rounded-full flex items-center justify-center mb-6 relative z-10">
                <AlertCircle className="w-10 h-10 text-blue-600" />
              </div>
              <h3 className="text-xl font-extrabold text-[#0a1128] mb-2 relative z-10">No Students Linked</h3>
              <p className="text-gray-500 text-sm font-medium mb-8 max-w-sm mx-auto relative z-10 leading-relaxed">Connect your child to a verified partner school to instantly generate your flexible payment plan.</p>
              
              <Link href="/parent/add-student" className="group relative w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full font-bold text-sm transition-all shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 active:scale-95 z-10">
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
                viewReceipt={setActiveReceipt} // Make sure this prop name matches your StudentCard component!
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}