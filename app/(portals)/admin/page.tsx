'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync' 

import { 
  Building2, Users, Wallet, 
  CheckCircle2, Banknote, XCircle,
  Coins, Landmark, GraduationCap
} from 'lucide-react'

// --- FLAT FEE BaaS ENGINE ---
const PAYTERM_REVENUE_CUT = 1000;
const SCHOOL_COMMISSION_CUT = 500;

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) 
  const [fetchError, setFetchError] = useState<string | null>(null)
  
  const [stats, setStats] = useState({
    schools: 0,
    parents: 0,
    activePlans: 0,
    escrowVault: 0,    
    paytermRevenue: 0,        
    commissionLiability: 0 
  })

  const fetchLiveStats = useCallback(async (isMounted: boolean = true, isSilent: boolean = false) => {
    try {
      setFetchError(null)
      if (isMounted && !isSilent) setLoading(true)

      const schoolsResponse = await supabase.from('partner_schools').select('*')
      if (schoolsResponse.error) throw new Error(`Schools Table Error: ${schoolsResponse.error.message}`)

      const studentsResponse = await supabase.from('students').select('id, parent_id')
      if (studentsResponse.error) throw new Error(`Students Table Error: ${studentsResponse.error.message}`)

      const plansResponse = await supabase.from('active_plans').select('*')
      if (plansResponse.error) throw new Error(`Plans Table Error: ${plansResponse.error.message}`)

      const schoolsData = schoolsResponse.data || []
      const studentData = studentsResponse.data || []
      const planData: any[] = plansResponse.data || []

      let vault = 0
      let revenue = 0
      let liability = 0
      let totalPlans = 0
      
      const activeSchoolsCount = schoolsData.filter((s: any) => s.status === 'Active').length
      const uniqueParents = new Set(studentData.map((s: any) => s.parent_id).filter(Boolean)).size

      planData.forEach((plan: any) => {
        totalPlans++;
        const amountPaid = Number(plan.amount_paid) || 0

        vault += amountPaid
        
        // BaaS Logic: The moment a parent pays anything, the 1500 flat fee is realized.
        if (amountPaid > 0) {
          revenue += PAYTERM_REVENUE_CUT
          liability += SCHOOL_COMMISSION_CUT
        }
      })

      if (isMounted) {
        setStats({
          schools: activeSchoolsCount,
          parents: uniqueParents,
          activePlans: totalPlans,
          escrowVault: vault,
          paytermRevenue: revenue,
          commissionLiability: liability
        })
        setFetchError(null)
      }

    } catch (err: any) {
      console.error("Dashboard fetch error:", err)
      if (isMounted && !isSilent) setFetchError(err.message || "Failed to fetch data from Supabase.")
    } finally {
      if (isMounted && !isSilent) setLoading(false)
    }
  }, [])

  useRealtimeSync(() => fetchLiveStats(true, true))

  useEffect(() => {
    let isMounted = true;

    const initializePage = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          router.push('/admin-login')
          return
        }

        const activeUser = session.user

        const { data: hqData } = await supabase
          .from('hq_users')
          .select('role')
          .eq('user_email', activeUser.email as string)
          .maybeSingle()

        if (!hqData) {
          await supabase.auth.signOut()
          router.push('/admin-login')
          return
        }

        if (isMounted) {
           await fetchLiveStats(isMounted, false)
        }

      } catch (err) {
        console.error("Initialization Error:", err)
        toast.error("HQ Authentication failed.")
        if (isMounted) setLoading(false)
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    initializePage()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/admin-login')
    })

    return () => { 
      isMounted = false 
      authListener.subscription.unsubscribe()
    }
  }, [router, fetchLiveStats])

  if (isInitializing) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase text-sm h-screen flex items-center justify-center animate-pulse">Initializing HQ Terminal...</div>

  if (fetchError && !isInitializing) {
    return (
      <div className="w-full max-w-3xl mx-auto p-10 mt-20 bg-red-50 border border-red-200 rounded-3xl shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <XCircle className="w-8 h-8 text-red-500" />
          <h1 className="text-xl font-bold text-red-900">Dashboard Render Failure</h1>
        </div>
        <p className="text-red-700 font-mono text-sm bg-white p-4 rounded-xl border border-red-100">
          {fetchError}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-700 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  if (loading) {
    return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase text-sm h-screen flex items-center justify-center animate-pulse">Loading Ledger...</div>
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20 relative bg-[#FAFAFA] min-h-screen">
      
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0a1128] tracking-tight mb-1.5 flex items-center gap-2">
            <Landmark className="w-6 h-6 text-blue-600" />
            Admin Operations Center
          </h1>
          <p className="text-gray-500 font-medium text-xs">Real-time BaaS ledger, revenue tracking, and settlement overview.</p>
        </div>
      </div>

      {/* CORE FINANCIAL METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        
        <div className="bg-[#0a1128] p-6 rounded-2xl shadow-sm text-white relative overflow-hidden md:col-span-2 flex flex-col justify-between">
          <div>
            <p className="text-[11px] font-bold text-blue-300 uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Banknote className="w-4 h-4" /> Total Virtual Escrow Processed
            </p>
            <p className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-white mb-2">₦{stats.escrowVault.toLocaleString()}</p>
          </div>
          <p className="text-[10px] text-gray-400 font-medium border-t border-white/10 pt-3 mt-4">
            Gross volume securely processed across all parent virtual accounts.
          </p>
        </div>

        <div className="flex flex-col gap-5">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
            <h3 className="text-[11px] font-bold text-green-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Wallet className="w-4 h-4" /> PayTerm Net Revenue
            </h3>
            <div className="text-2xl font-black font-mono text-[#0a1128] tracking-tight">₦{stats.paytermRevenue.toLocaleString()}</div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
            <h3 className="text-[11px] font-bold text-blue-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Coins className="w-4 h-4" /> School Commission Liability
            </h3>
            <div className="text-2xl font-black font-mono text-[#0a1128] tracking-tight">₦{stats.commissionLiability.toLocaleString()}</div>
          </div>
        </div>

      </div>

      {/* SYSTEM METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Active Schools</p>
            <p className="text-2xl font-black text-[#0a1128] tracking-tight">{stats.schools}</p>
          </div>
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Parent Households</p>
            <p className="text-2xl font-black text-[#0a1128] tracking-tight">{stats.parents}</p>
          </div>
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
            <Users className="w-5 h-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Active Plans</p>
            <p className="text-2xl font-black text-[#0a1128] tracking-tight">{stats.activePlans}</p>
          </div>
          <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
            <GraduationCap className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* WITHDRAWAL QUEUE UI */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-white">
          <h2 className="text-base font-bold text-[#0a1128]">Action Required: Pending Payouts</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="p-4">Date</th>
                <th className="p-4">School</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Destination</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={5} className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-50 text-green-500 mb-3 border border-green-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <p className="text-[#0a1128] font-bold text-sm mb-0.5">Inbox Zero</p>
                  <p className="text-xs text-gray-500 font-medium">No pending withdrawal requests. All schools are settled.</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}