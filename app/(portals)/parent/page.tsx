'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import { UserPlus, ChevronRight, AlertCircle, Wallet, CheckCircle2, Bell, Landmark } from 'lucide-react'

import StudentCard from './components/StudentCard'
import RenewalModal from './components/RenewalModal'
import ReceiptModal from './components/ReceiptModal'

// --- NEW FLAT FEE ENGINE ---
const PLATFORM_FEE = 1500;

export const getFeeBreakdown = (parentTotalFee: number, isInstallment: boolean = true) => {
  return { fee: PLATFORM_FEE, base: parentTotalFee - PLATFORM_FEE }
}

export default function ParentDashboard() {
  const router = useRouter()
  const [isInitializing, setIsInitializing] = useState(true)
  const [parentData, setParentData] = useState<any>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [childrenData, setChildrenData] = useState<any[]>([])
  
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [renewConfig, setRenewConfig] = useState<any | null>(null)
  
  const [breakdownConfig, setBreakdownConfig] = useState<{
    plan: any; child: any; isFirstPayment: boolean;
  } | null>(null)

  const [isProcessing, setIsProcessing] = useState(false)

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        toast.error("Session expired. Please log in again.")
        router.push('/parent-login') 
        return
      }
      
      const activeUserId = session.user.id
      setCurrentUserId(activeUserId)
      
      // Fetch Parent Profile & Wallet
      const { data } = await supabase.from('parents').select('*').eq('id', activeUserId).single()
      const profile = data as any;
      
      // Demo fallback: Auto-generate dummy virtual account if missing
      if (profile && !profile.virtual_account_number) {
        profile.virtual_account_number = `80${Math.floor(10000000 + Math.random() * 90000000)}`
        profile.virtual_account_name = `PayTerm / ${profile.full_name}`
        profile.wallet_balance = 500000 // Demo starting balance
        
        await supabase.from('parents').update({
          virtual_account_number: profile.virtual_account_number,
          virtual_account_name: profile.virtual_account_name,
          wallet_balance: profile.wallet_balance
        } as any).eq('id', activeUserId)
      }
      
      setParentData(profile)

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

  const handleWalletPayment = async (amountToPay: number) => {
    if (!breakdownConfig || !parentData) return
    
    if (parentData.wallet_balance < amountToPay) {
      toast.error("Insufficient wallet balance. Please transfer funds to your virtual account.")
      return
    }

    setIsProcessing(true)
    const toastId = toast.loading("Processing payment from wallet...")

    try {
      const { plan, child } = breakdownConfig
      const reference = `PT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

      // 1. Deduct from Parent Wallet
      const newBalance = parentData.wallet_balance - amountToPay
      const { error: walletError } = await supabase.from('parents').update({ 
        wallet_balance: newBalance 
      } as any).eq('id', parentData.id)
      if (walletError) throw walletError

      // 2. Log Payment History using the exact outstanding amount paid
      const { error: txError } = await supabase.from('payment_history').insert({
        parent_id: parentData.id,
        plan_id: plan.id,
        student_id: child.id,
        amount: amountToPay, 
        receipt_number: reference,
        status: 'Cleared'
      } as any)
      if (txError) throw txError

      // 3. Update Plan
      const newAmountPaid = Number(plan.amount_paid) + amountToPay
      const isComplete = newAmountPaid >= Number(plan.total_fee)

      await supabase.from('active_plans').update({ 
        amount_paid: newAmountPaid,
        status: isComplete ? 'Completed' : 'Active',
        mid_term_cleared: isComplete ? true : plan.mid_term_cleared,
        commission_earned: 500
      } as any).eq('id', plan.id)

      toast.success(`Payment successful! Receipt No: ${reference}`, { id: toastId }) 
      setBreakdownConfig(null)
      fetchDashboardData() 
    } catch (err: any) {
      console.error("Update error:", err)
      toast.error("Payment failed. Please try again.", { id: toastId })
    } finally {
      setIsProcessing(false)
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
      
      {/* WALLET PAYMENT MODAL */}
      {breakdownConfig && (() => {
        const totalFee = Number(breakdownConfig.plan.total_fee)
        const amountPaid = Number(breakdownConfig.plan.amount_paid)
        const outstandingBalance = totalFee - amountPaid
        
        const activeFee = breakdownConfig.isFirstPayment ? PLATFORM_FEE : 0
        const tuitionPortion = outstandingBalance - activeFee

        const hasSufficientFunds = parentData?.wallet_balance >= outstandingBalance

        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a1128]/40 backdrop-blur-sm p-4 transition-all">
            <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 mx-auto">
              
              <div className="bg-gray-50 border-b border-gray-100 p-5 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#0a1128] tracking-tight leading-tight">Pay from Wallet</h2>
                  <p className="text-xs text-gray-500 mt-0.5">{breakdownConfig.child.full_name}</p>
                </div>
              </div>
              
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center text-sm pb-2 border-b border-gray-100 mt-1">
                  <span className="text-gray-500 font-medium">Outstanding Tuition</span>
                  <span className="font-bold text-[#0a1128]">₦{tuitionPortion.toLocaleString()}</span>
                </div>
                {breakdownConfig.isFirstPayment && (
                  <div className="flex justify-between items-center text-sm pb-2 border-b border-gray-100">
                    <span className="text-gray-500 font-medium">Platform Service Fee</span>
                    <span className="font-bold text-[#0a1128]">₦{PLATFORM_FEE.toLocaleString()}</span>
                  </div>
                )}
                
                <div className="bg-blue-50 rounded-xl p-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-blue-900 tracking-wide">Total Due</span>
                  <span className="text-xl font-black text-blue-600">₦{outstandingBalance.toLocaleString()}</span>
                </div>

                <div className={`p-3 rounded-lg border flex items-center justify-between text-xs font-medium ${hasSufficientFunds ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
                  <span>Wallet Balance: ₦{parentData?.wallet_balance?.toLocaleString()}</span>
                  {!hasSufficientFunds && <span className="font-bold uppercase tracking-wider">Top Up Required</span>}
                </div>
              </div>

              <div className="p-4 flex gap-3 border-t border-gray-100 bg-gray-50">
                <button onClick={() => setBreakdownConfig(null)} disabled={isProcessing} className="flex-1 py-3 text-sm font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-all active:scale-95 disabled:opacity-50">Cancel</button>
                <button 
                  onClick={() => handleWalletPayment(outstandingBalance)} 
                  disabled={!hasSufficientFunds || isProcessing}
                  className="flex-[2] py-3 text-sm font-bold text-white bg-[#0a1128] rounded-xl hover:bg-blue-600 transition-all active:scale-95 disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  {isProcessing ? 'Processing...' : 'Authorize Payment'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

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
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-extrabold border border-blue-200 shrink-0">
              {parentData?.full_name ? parentData.full_name.charAt(0).toUpperCase() : 'P'}
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-medium text-gray-500">Welcome back</span>
              <h1 className="text-sm font-extrabold text-[#0a1128] leading-none mt-0.5">
                {parentData?.full_name ? parentData.full_name.split(' ')[0] : 'Parent'}
              </h1>
            </div>
          </div>
          <button className="relative w-9 h-9 rounded-xl border border-gray-200 bg-white flex items-center justify-center text-gray-600 hover:bg-gray-50 active:scale-95 transition-all shadow-sm">
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-red-500 rounded-full border border-white"></span>
          </button>
        </div>
      </header>

      <div className="px-4 sm:px-6 lg:px-10 pt-6">

        {/* --- COMPACT SOLID WALLET WIDGET --- */}
        <div className="bg-[#0a1128] rounded-2xl shadow-sm p-5 mb-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
          <div>
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-1">Family Wallet</p>
            <div className="text-3xl font-black font-mono tracking-tight mb-2">
              ₦{parentData?.wallet_balance?.toLocaleString() || '0'}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-300 font-medium bg-white/10 px-3 py-1.5 rounded-lg w-fit border border-white/10">
              <Landmark className="w-3.5 h-3.5" />
              <span>{parentData?.virtual_account_bank || 'PayTerm MFB'}</span>
              <span>•</span>
              <span className="font-mono text-white tracking-wide">{parentData?.virtual_account_number || 'Pending'}</span>
            </div>
          </div>

          <Link 
            href="/parent/add-student" 
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-bold transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Child
          </Link>
        </div>

        {/* OUTSTANDING BALANCE & ACTIVE PLANS COMPACT WIDGET */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-8 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-gray-500 mb-1">Outstanding Balance</p>
            <div className="text-2xl font-black text-[#0a1128] tracking-tight">
              ₦{totalOutstanding.toLocaleString()}
            </div>
          </div>
          <div className="text-right">
            <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">Active Plans</span>
            <span className="block text-xl font-black text-[#0a1128]">{enrolledCount}</span>
          </div>
        </div>

        {/* STUDENTS GRID */}
        <div className={childrenData.length === 0 ? "" : "grid grid-cols-1 lg:grid-cols-2 gap-5 md:gap-6"}>
          {childrenData.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-10 text-center flex flex-col items-center justify-center shadow-sm">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                <AlertCircle className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-extrabold text-[#0a1128] mb-1">No Students Linked</h3>
              <p className="text-gray-500 text-sm font-medium mb-6 max-w-sm mx-auto">Connect your child to a verified partner school to manage fee payments.</p>
              
              <Link href="/parent/add-student" className="flex items-center justify-center gap-2 px-6 py-3 bg-[#0a1128] hover:bg-blue-600 text-white rounded-xl font-bold text-sm transition-all active:scale-95">
                <span>Register Your Child</span>
                <ChevronRight className="w-4 h-4" />
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