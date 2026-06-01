'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation' 
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
import { Wallet, ArrowDownCircle, AlertCircle } from 'lucide-react'

import WithdrawalForm from './Components/WithdrawalForm'
import PayoutLedger from './Components/PayoutLedger'

// --- NEW FLAT FEE ENGINE ---
const PLATFORM_FEE = 1500;

export default function PayoutsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) 
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  const [totalAvailable, setTotalAvailable] = useState(0)
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([])
  
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null) 

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
        const studentPlan = safePlans.find((p: any) => p.student_id === student.id)
        if (!studentPlan) return

        const isVerified = student.enrollment_status === 'Verified' || studentPlan.status === 'Active' || studentPlan.status === 'Completed'
        if (!isVerified) return

        // Flat Fee BaaS Math
        const baseTuition = Number(studentPlan.total_fee) - PLATFORM_FEE
        const rawAmountPaid = Number(studentPlan.amount_paid) || 0
        const schoolAmountPaid = rawAmountPaid > 0 ? Math.max(0, rawAmountPaid - PLATFORM_FEE) : 0
        
        if (schoolAmountPaid > 0) {
          const progress = schoolAmountPaid / baseTuition
          
          const isInstallment = studentPlan.plan_type !== 'full'

          if (!isInstallment) {
            // Full payment clears 100%
            if (progress >= 0.99) totalEarned += baseTuition
          } else {
            // Installment clears 100% upfront if they hit the 59% (60% approx) threshold
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
        setTotalAvailable(Math.max(0, totalEarned - totalWithdrawn))
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

  useRealtimeSync(() => {
    if (schoolId && targetSchool) {
      fetchPayoutData(schoolId, targetSchool, true, true)
    }
  })

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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20 bg-[#FAFAFA] min-h-screen">
      
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
          {/* SOLID METRICS BOX - No Gradients */}
          <div className="bg-[#0a1128] p-6 sm:p-8 rounded-3xl shadow-sm text-white border border-[#15234b]">
            <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2">
              <ArrowDownCircle className="w-4 h-4 text-green-400" /> 
              Available to Withdraw
            </p>
            <p className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight break-words font-mono">
              ₦{totalAvailable.toLocaleString()}
            </p>
            <p className="text-[10px] text-gray-400 font-medium mt-4 border-t border-white/10 pt-4">
              Calculated from verified parent tranches.
            </p>
          </div>

          <WithdrawalForm 
            totalAvailable={totalAvailable}
            targetSchool={targetSchool}
            schoolId={schoolId}
            onSuccess={() => {
              if (schoolId && targetSchool) {
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