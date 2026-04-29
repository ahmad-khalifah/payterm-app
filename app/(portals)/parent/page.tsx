'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'

import DummyPaystack from './components/DummyPaystack'
import StudentCard from './components/StudentCard'
import RenewalModal from './components/RenewalModal'
import ReceiptModal from './components/ReceiptModal'

// --- NEW UNIVERSAL PRICING ENGINE ---
export const getFeeBreakdown = (totalInvoice: number) => {
  if (totalInvoice <= 52499) return { fee: 2500, base: totalInvoice - 2500 }
  if (totalInvoice <= 105000) return { fee: 5000, base: totalInvoice - 5000 }
  if (totalInvoice <= 208500) return { fee: 8500, base: totalInvoice - 8500 }
  return { fee: 10000, base: totalInvoice - 10000 }
}

export default function ParentDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [parentName, setParentName] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [childrenData, setChildrenData] = useState<any[]>([])
  
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [renewConfig, setRenewConfig] = useState<any | null>(null)

  // NEW: Breakdown Modal State
  const [breakdownConfig, setBreakdownConfig] = useState<{
    plan: any; child: any; isFirstPayment: boolean;
  } | null>(null)

  const [paystackConfig, setPaystackConfig] = useState<{
    isOpen: boolean; amount: number; email: string; studentName: string;
    studentClass: string; planId: string; studentId: string; isMidTerm: boolean;
  } | null>(null)

  const fetchDashboardData = useCallback(async () => {
    try {
      // 1. Fast Check: Reads local storage (Handles page refreshes perfectly)
      const { data: { session } } = await supabase.auth.getSession()
      let activeUserId = session?.user?.id

      // 2. Secure Safety Net: If local storage lags (Tab-switching), ping the server
      if (!activeUserId) {
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        if (userError || !user) {
          router.push('/parent-login')
          return
        }
        activeUserId = user.id
      }
      
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
      if (event === 'SIGNED_OUT') router.push('/parent-login')
    })
    return () => authListener.subscription.unsubscribe()
  }, [fetchDashboardData, router])

  // STEP 1: Intercept the Pay button to show the Breakdown Modal first
  const handleShowBreakdown = (plan: any, child: any) => {
    const isFirstPayment = Number(plan.amount_paid) === 0
    setBreakdownConfig({ plan, child, isFirstPayment })
  }

  // STEP 2: The actual trigger for Paystack (called from the breakdown modal)
  const triggerPayment = (amountToPay: number) => {
    if (!breakdownConfig) return
    const { plan, child, isFirstPayment } = breakdownConfig
    const dummyEmail = parentName ? `${parentName.replace(/\s+/g, '').toLowerCase()}@email.com` : 'parent@email.com'

    setPaystackConfig({
      isOpen: true, amount: amountToPay, email: dummyEmail, studentName: child.full_name,
      studentClass: child.student_class, planId: plan.id, studentId: child.id, isMidTerm: !isFirstPayment
    })
    setBreakdownConfig(null) // Close breakdown modal
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

      alert(`Payment confirmed! Receipt No: ${reference}`)
      setPaystackConfig(null)
      fetchDashboardData() 
    } catch (err) {
      console.error("Update error:", err)
    }
  }

  if (loading) return <div className="p-10 text-center text-sm font-bold text-[#0a1128] uppercase tracking-widest h-screen flex items-center justify-center animate-pulse">Loading Dashboard...</div>

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-10 animate-in fade-in pb-24">
      
      {/* 1. NEW PAYMENT BREAKDOWN MODAL */}
      {breakdownConfig && (() => {
        const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(Number(breakdownConfig.plan.total_fee))
        const depositAmount = baseTuition * 0.60
        const balanceAmount = baseTuition * 0.40
        const totalDueToday = breakdownConfig.isFirstPayment ? (depositAmount + serviceFee) : balanceAmount

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1128]/80 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 mx-auto">
              <div className="bg-gray-50 border-b border-gray-200 p-5">
                <h2 className="text-lg font-bold text-[#0a1128] tracking-tight mb-1">Payment Breakdown</h2>
                <p className="text-xs text-gray-500">{breakdownConfig.child.full_name} • {breakdownConfig.child.student_class}</p>
              </div>
              
              <div className="p-5 space-y-4">
                {breakdownConfig.isFirstPayment ? (
                  <>
                    <div className="flex justify-between items-center text-sm pb-2 border-b border-gray-100">
                      <span className="text-gray-600 font-medium">School Tuition</span>
                      <span className="font-bold text-[#0a1128]">₦{baseTuition.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">Initial Deposit (60%)</span>
                      <span className="font-bold text-[#0a1128]">₦{depositAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">Platform Service Fee</span>
                      <span className="font-bold text-[#0a1128]">₦{serviceFee.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">Final Balance (40%)</span>
                      <span className="font-bold text-[#0a1128]">₦{balanceAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 font-medium">Platform Service Fee</span>
                      <span className="font-bold text-gray-400">Paid upfront</span>
                    </div>
                  </>
                )}
                
                <div className="border-t border-gray-200 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-[#0a1128] uppercase tracking-wide">Total Due Today</span>
                  <span className="text-xl font-black text-blue-600">₦{totalDueToday.toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 flex gap-2 border-t border-gray-200">
                <button onClick={() => setBreakdownConfig(null)} className="flex-1 py-3 text-xs font-bold text-gray-600 bg-white border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors">Cancel</button>
                <button onClick={() => triggerPayment(totalDueToday)} className="flex-[2] py-3 text-xs font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm">Proceed to Checkout ➔</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* 2. EXTERNALLY MANAGED MODALS */}
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
          childrenData.map((child) => (
            <StudentCard 
              key={child.id}
              child={child}
              expandedHistoryId={expandedHistoryId}
              onToggleHistory={(id: string) => setExpandedHistoryId(prev => prev === id ? null : id)}
              onPay={handleShowBreakdown} // Now triggers the breakdown modal first!
              onRenew={setRenewConfig}
              onViewReceipt={setActiveReceipt}
            />
          ))
        )}
      </div>
    </div>
  )
}