'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation' 
import { supabase } from '../../../../lib/supabase'

import { Wallet, ArrowDownCircle } from 'lucide-react'

import WithdrawalForm from './Components/WithdrawalForm'
import PayoutLedger from './Components/PayoutLedger'

// --- UNIVERSAL PRICING ENGINE ---
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
            const { base: baseTuition } = getFeeBreakdown(Number(plan.total_fee))
            const progress = Number(plan.amount_paid) / Number(plan.total_fee)
            
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
        const { data: { session } } = await supabase.auth.getSession()
        let activeUserId = session?.user?.id

        if (!activeUserId) {
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (userError || !user) {
            router.push('/school-login')
            return
          }
          activeUserId = user.id
        }

        const { data: schoolProfile, error: profileError } = await supabase
          .from('partner_schools')
          .select('*')
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
          
          const fetchedTier = (schoolProfile as any).tier || 'Tier 1'
          setSchoolTier(fetchedTier)
          
          await fetchPayoutData(activeUserId, schoolProfile.name as string, fetchedTier, isMounted) 
        }
      } catch (err) {
        console.error("Initialization Error:", err)
        if (isMounted) setLoading(false) 
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

  if (loading || !targetSchool) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-screen flex items-center justify-center animate-pulse">Calculating cleared tranches...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
          <Wallet className="w-8 h-8 text-blue-600" />
          Payouts & Withdrawals
        </h1>
        <p className="text-gray-500 font-medium text-sm">Request operational funds from cleared parent installments.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: AVAILABLE BALANCE & FORM */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Wallet Card */}
          <div className="bg-gradient-to-br from-[#0a1128] to-blue-950 p-8 rounded-3xl shadow-xl shadow-blue-900/10 text-white relative overflow-hidden border border-[#0a1128] group">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 -mr-12 -mt-12 w-40 h-40 rounded-full bg-green-500/20 blur-3xl transition-transform group-hover:scale-110 pointer-events-none"></div>
            
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ArrowDownCircle className="w-4 h-4 text-green-400" /> 
                Available to Withdraw
              </p>
              <p className="text-4xl font-black text-white mb-2 tracking-tight break-words">
                ₦{totalAvailable.toLocaleString()}
              </p>
              <p className="text-[10px] text-gray-400 font-medium">Calculated from verified parent tranches.</p>
            </div>
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

        {/* RIGHT COLUMN: LEDGER */}
        <div className="xl:col-span-8">
          <PayoutLedger withdrawalHistory={withdrawalHistory} />
        </div>
        
      </div>
    </div>
  )
}