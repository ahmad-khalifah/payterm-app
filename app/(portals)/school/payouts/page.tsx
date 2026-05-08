'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation' 
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import { Wallet, ArrowDownCircle, AlertCircle } from 'lucide-react'

import WithdrawalForm from './Components/WithdrawalForm'
import PayoutLedger from './Components/PayoutLedger'

// --- UPDATED UNIVERSAL PRICING ENGINE ---
const getFeeBreakdown = (parentTotalFee: number, isInstallment: boolean = true) => {
  if (!parentTotalFee || parentTotalFee <= 0) return { fee: 0, base: 0 };
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

export default function PayoutsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) 
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  const [totalAvailable, setTotalAvailable] = useState(0)
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([])
  
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null) 

  // 1. Extract the fetch function purely, matching the Dashboard logic exactly
  const fetchPayoutData = useCallback(async (uuid: string, name: string, isMounted: boolean = true, isSilent: boolean = false) => {
    try {
      if (isMounted && !isSilent) {
        setLoading(true)
        setFetchError(null)
      }

      const [
        { data: studentData, error: studentError },
        { data: planData, error: planError },
        { data: withdrawalData, error: withdrawalError }
      ] = await Promise.all([
        supabase.from('students').select('*').eq('school_id', uuid),
        supabase.from('active_plans').select('*').eq('school_id', uuid),
        supabase.from('withdrawal_requests').select('*').eq('school_name', name).order('created_at', { ascending: false })
      ])

      if (studentError) throw new Error(`Student Fetch: ${studentError.message}`)
      if (planError) throw new Error(`Plan Fetch: ${planError.message}`)
      if (withdrawalError) throw new Error(`Withdrawal Fetch: ${withdrawalError.message}`)

        const safeStudents: any[] = studentData || []
        const safePlans: any[] = planData || []
        const safeWithdrawals: any[] = withdrawalData || []

      let totalEarned = 0
      let totalWithdrawn = 0

      safeStudents.forEach((student: any) => {
        // Find the active or completed plan for this student
        const studentPlan = safePlans.find((p: any) => p.student_id === student.id)
        if (!studentPlan) return

        const isVerified = student.enrollment_status === 'Verified' || studentPlan.status === 'Active' || studentPlan.status === 'Completed'
        if (!isVerified) return

        const isInstallment = studentPlan.plan_type !== 'full'
        const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(Number(studentPlan.total_fee), isInstallment)
        
        const rawAmountPaid = Number(studentPlan.amount_paid) || 0
        const schoolAmountPaid = rawAmountPaid > 0 ? Math.max(0, rawAmountPaid - serviceFee) : 0
        
        if (schoolAmountPaid > 0) {
          const progress = schoolAmountPaid / baseTuition
          
          if (!isInstallment) {
            // Full payment clears 100%
            if (progress >= 0.99) totalEarned += baseTuition
          } else {
            // Installment clears 100% upfront (60% from parent + 40% from bank)
            if (progress >= 0.59) {
              totalEarned += baseTuition 
            }
          }
        }
      })

      if (isMounted) setWithdrawalHistory(safeWithdrawals)
      
      safeWithdrawals.forEach(w => {
        if (w.status === 'Paid' || w.status === 'Pending' || w.status === 'Approved') {
          totalWithdrawn += Number(w.amount)
        }
      })

      if (isMounted) {
        // The exact cleared balance available for the school to withdraw
        setTotalAvailable(totalEarned - totalWithdrawn)
        setFetchError(null)
      }

    } catch (err: any) {
      console.error("Fetch Error:", err)
      if (isMounted && !isSilent) setFetchError(err.message)
      if (isMounted && !isSilent) toast.error("Failed to sync payout ledger.")
    } finally {
      if (isMounted && !isSilent) setLoading(false)
    }
  }, [])

  // 2. THE HOOK GOES HERE
  useRealtimeSync(() => {
    if (schoolId && targetSchool) {
      fetchPayoutData(schoolId, targetSchool, true, true)
    }
  })

  // 3. Normal Component Initialization
  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/school-login')
          return
        }
        
        const activeUserId = session.user.id

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
          setTargetSchool(schoolProfile.name as string)
          setSchoolId(activeUserId) 
          
          // Initial non-silent load
          await fetchPayoutData(activeUserId, schoolProfile.name as string, isMounted, false) 
        }
      } catch (err) {
        console.error("Initialization Error:", err)
        toast.error("Session authentication failed.")
        if (isMounted) setLoading(false) 
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    initializePage()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/school-login')
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router, fetchPayoutData])

  if (isInitializing || loading || (!targetSchool && !fetchError)) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest text-sm uppercase h-screen flex items-center justify-center animate-pulse">Loading...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      
      {fetchError && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-bold text-red-800">Connection Error</h3>
            <p className="text-xs text-red-600 mt-1">{fetchError}</p>
          </div>
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
            <Wallet className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
            Payouts & Withdrawals
          </h1>
          <p className="text-gray-500 font-medium text-xs sm:text-sm">Request operational funds from cleared parent installments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 sm:gap-8">
        
        <div className="xl:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-[#0a1128] to-[#15234b] p-6 sm:p-8 rounded-3xl shadow-xl shadow-blue-900/10 text-white relative overflow-hidden border border-[#0a1128] group">
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 sm:w-40 sm:h-40 rounded-full bg-blue-500/20 blur-3xl transition-transform group-hover:scale-110 pointer-events-none"></div>
            
            <div className="relative z-10">
              <p className="text-[9px] sm:text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-green-400" /> 
                Available to Withdraw
              </p>
              <p className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight break-words font-mono">
                ₦{totalAvailable.toLocaleString()}
              </p>
              <p className="text-[9px] sm:text-[10px] text-gray-400 font-medium">Calculated from verified parent tranches.</p>
            </div>
          </div>

          <WithdrawalForm 
            totalAvailable={totalAvailable}
            targetSchool={targetSchool}
            schoolId={schoolId}
            onSuccess={() => {
              if (schoolId && targetSchool) {
                // When they submit a form, fetch fresh data silently right away
                fetchPayoutData(schoolId, targetSchool, true, true)
              }
            }}
          />
        </div>

        <div className="xl:col-span-8">
          <PayoutLedger withdrawalHistory={withdrawalHistory} />
        </div>
        
      </div>
    </div>
  )
}