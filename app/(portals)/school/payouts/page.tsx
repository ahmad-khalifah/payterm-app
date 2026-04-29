'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation' 
import { supabase } from '../../../../lib/supabase'

import WithdrawalForm from './Components/WithdrawalForm'
import PayoutLedger from './Components/PayoutLedger'

// --- NEW UNIVERSAL PRICING ENGINE ---
const getFeeBreakdown = (totalInvoice: number) => {
  if (totalInvoice <= 52499) return { fee: 2500, base: totalInvoice - 2500 }
  if (totalInvoice <= 105000) return { fee: 5000, base: totalInvoice - 5000 }
  if (totalInvoice <= 208500) return { fee: 8500, base: totalInvoice - 8500 }
  return { fee: 10000, base: totalInvoice - 10000 }
}

export default function PayoutsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [totalAvailable, setTotalAvailable] = useState(0)
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([])
  
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null) 
  const [schoolTier, setSchoolTier] = useState<string>('Tier 1')

  const fetchPayoutData = useCallback(async (uuid: string, name: string, tier: string, isMounted: boolean = true) => {
    try {
      if (isMounted) setLoading(true)

      const payoutRate = tier === 'Tier 2' ? 0.70 : 0.60
      const remainderRate = tier === 'Tier 2' ? 0.30 : 0.40

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id, enrollment_status,
          active_plans ( total_fee, amount_paid )
        `)
        .eq('school_id', uuid) 
        .eq('enrollment_status', 'Verified')

      if (studentError) throw studentError

      let totalEarned = 0

      if (studentData) {
        studentData.forEach(student => {
          const plan = student.active_plans[0]
          if (plan) {
            // APPLY FLAT-RATE PRICING ENGINE
            const { base: baseTuition } = getFeeBreakdown(Number(plan.total_fee))
            const progress = Number(plan.amount_paid) / Number(plan.total_fee)
            
            // Apply dynamic tier rates against the clean base tuition
            if (progress >= 0.59) totalEarned += (baseTuition * payoutRate) 
            if (progress >= 0.99) totalEarned += (baseTuition * remainderRate)
          }
        })
      }

      const { data: withdrawals, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('school_name', name)
        .order('created_at', { ascending: false })

      if (withdrawalError) throw withdrawalError

      let totalWithdrawn = 0
      if (withdrawals) {
        if (isMounted) setWithdrawalHistory(withdrawals)
        withdrawals.forEach(w => {
          if (w.status === 'Paid' || w.status === 'Pending' || w.status === 'Approved') {
            totalWithdrawn += Number(w.amount)
          }
        })
      }

      if (isMounted) setTotalAvailable(totalEarned - totalWithdrawn)

    } catch (err: any) {
      console.error("Fetch Error:", err.message)
    } finally {
      if (isMounted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      try {
        // 1. Fast Check: Reads local storage (Handles page refreshes perfectly)
        const { data: { session } } = await supabase.auth.getSession()
        let activeUserId = session?.user?.id

        // 2. Secure Safety Net: If local storage lags (Tab-switching), ping the server
        if (!activeUserId) {
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (userError || !user) {
            router.push('/school-login')
            return
          }
          activeUserId = user.id
        }

        // 3. Graceful Database Fetch (No crashing if profile is missing)
        const { data: schoolProfile, error: profileError } = await supabase
          .from('partner_schools')
          .select('*')
          .eq('id', activeUserId) 
          .maybeSingle() // Prevents the red error screen if user is missing

        if (profileError) throw profileError

        // If no school profile exists for this user, safely boot them to login
        if (!schoolProfile) {
          router.push('/school-login')
          return
        }

        if (isMounted) {
          setTargetSchool(schoolProfile.name as string)
          setSchoolId(activeUserId) 
          
          const fetchedTier = (schoolProfile as any).tier || 'Tier 1'
          setSchoolTier(fetchedTier)
          
          await fetchPayoutData(activeUserId, schoolProfile.name as string, fetchedTier, isMounted) 

          // 4. THE EMPTY PAGE FIX: Block the page from rendering until targetSchool is fully loaded
          if (loading || !targetSchool) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-screen flex items-center justify-center animate-pulse">Authenticating Secure Session...</div>
        }
      } catch (err) {
        console.error("Initialization Error:", err)
        if (isMounted) setLoading(false) 
      }
    }

    initializePage()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') router.push('/school-login')
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router, fetchPayoutData])

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-full flex items-center justify-center animate-pulse">Calculating cleared tranches...</div>

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in">
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] mb-2 tracking-tight">Payouts & Withdrawals</h1>
        <p className="text-gray-500 text-sm sm:text-base">Request operational funds from cleared parent installments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Available to Withdraw</p>
            <p className="text-4xl font-bold text-green-600 mb-3 break-words tracking-tight">
              ₦{totalAvailable.toLocaleString()}.00
            </p>
            <p className="text-xs text-gray-400 font-medium">Calculated from verified student tranches.</p>
          </div>

          <WithdrawalForm 
            totalAvailable={totalAvailable}
            targetSchool={targetSchool}
            schoolId={schoolId}
            onSuccess={() => {
              if (schoolId && targetSchool) {
                fetchPayoutData(schoolId, targetSchool, schoolTier, true)
              }
            }}
          />
        </div>

        <PayoutLedger withdrawalHistory={withdrawalHistory} />
        
      </div>
    </div>
  )
}