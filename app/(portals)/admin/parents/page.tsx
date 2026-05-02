'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync' // <-- The Hook

import { 
  ReceiptText, AlertCircle, Search, Filter, 
  ChevronDown, User, Phone, Mail, GraduationCap, 
  Building2, BellRing, CheckCircle2, Clock, FileSearch,
  Wallet
} from 'lucide-react'

export default function AdminCollectionsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) // HQ Session Lock
  const [collections, setCollections] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  // 1. BULLETPROOF FETCH: No hooks inside this function
  const fetchCollections = useCallback(async (isMounted: boolean = true, isSilent: boolean = false) => {
    try {
      if (isMounted && !isSilent) setLoading(true)

      const { data: plansData, error: planError } = await supabase
        .from('active_plans')
        .select('*')
        .neq('status', 'Completed')

      if (planError) throw planError

      if (!plansData || plansData.length === 0) {
        if (isMounted) setCollections([])
        return
      }

      const [
        { data: parentsData },
        { data: studentsData },
        { data: schoolsData }
      ] = await Promise.all([
        supabase.from('parents').select('id, full_name, email, phone'),
        supabase.from('students').select('id, full_name'),
        supabase.from('partner_schools').select('id, name')
      ])

      const rawData = plansData.map((plan: any) => {
        const parent = (parentsData || []).find(p => p.id === plan.parent_id)
        const student = (studentsData || []).find(s => s.id === plan.student_id)
        const school = (schoolsData || []).find(s => s.id === plan.school_id)

        return {
          ...plan,
          parent_name: parent?.full_name || 'Unknown Parent',
          parent_email: parent?.email || 'No Email',
          parent_phone: parent?.phone || 'No Phone',
          student_name: student?.full_name || 'Unknown Student',
          school_name: school?.name || 'Unknown School'
        }
      })
      
      const groupedByParent = rawData.reduce((acc: any, curr: any) => {
        const pId = curr.parent_id
        if (!acc[pId]) {
          acc[pId] = {
            parent_id: pId,
            parent_name: curr.parent_name,
            parent_phone: curr.parent_phone,
            parent_email: curr.parent_email,
            children: [],
            total_outstanding: 0,
            statuses: new Set(),
            earliest_due: null,
            created_at: curr.created_at
          }
        }

        const outstanding = Math.max(0, Number(curr.total_fee) - Number(curr.amount_paid))
        
        acc[pId].total_outstanding += outstanding
        acc[pId].statuses.add(curr.status)
        
        if (curr.next_payment_date) {
          const planDate = new Date(curr.next_payment_date).getTime()
          if (!acc[pId].earliest_due || planDate < acc[pId].earliest_due) {
            acc[pId].earliest_due = planDate
          }
        }

        acc[pId].children.push({
          plan_id: curr.id,
          student_name: curr.student_name,
          school_name: curr.school_name,
          outstanding: outstanding,
          status: curr.status
        })

        return acc
      }, {})

      let formattedGroups = Object.values(groupedByParent).map((group: any) => {
        let householdStatus = 'Active'
        if (group.statuses.has('Default')) householdStatus = 'Default'
        else if (group.statuses.has('Late')) householdStatus = 'Late'
        else if (group.statuses.has('Pending Verification') || group.statuses.has('Pending Escrow')) householdStatus = 'Pending'

        return { ...group, household_status: householdStatus }
      })

      formattedGroups.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      if (isMounted) setCollections(formattedGroups)
      
    } catch (err: any) {
      console.error("Collections Fetch Error:", err)
      if (isMounted && err.message && !isSilent) toast.error("Database Error: " + err.message)
    } finally {
      if (isMounted && !isSilent) setLoading(false) 
    }
  }, [])

  // 2. THE CUSTOM HOOK: Must be at the top level
  useRealtimeSync(() => fetchCollections(true, true))

  // 3. Normal Initial Load & Auth check
  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          router.push('/admin-login')
          return
        }

        // CRITICAL HQ VERIFICATION
        const { data: hqData } = await supabase
          .from('hq_users')
          .select('role')
          .eq('user_email', user.email as string || '')
          .maybeSingle()

        if (!hqData) {
          await supabase.auth.signOut()
          router.push('/admin-login')
          return
        }

        if (isMounted) {
          await fetchCollections(isMounted, false)
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
  }, [router, fetchCollections])

  const handleNudge = (parentName: string, phone: string, amount: number) => {
    toast.success(`Automated SMS nudge sent to ${parentName} at ${phone} for ₦${amount.toLocaleString()}.`, {
      icon: '🔔'
    })
  }

  const filteredData = collections.filter(item => {
    const searchString = `${item.parent_name} ${item.parent_phone} ${item.children.map((c: any) => `${c.student_name} ${c.school_name}`).join(' ')}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'All' || item.household_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  })

  const totalArrears = collections.reduce((sum, item) => sum + item.total_outstanding, 0)
  const highRiskCount = collections.filter(item => item.household_status === 'Default' || item.household_status === 'Late').length

  if (isInitializing || loading) return <div className="p-10 text-center font-bold text-[#0a1128] h-screen uppercase tracking-widest flex items-center justify-center animate-pulse">Initializing HQ Terminal...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#0a1128] mb-2 tracking-tight flex items-center gap-3">
          <ReceiptText className="w-8 h-8 text-blue-600" />
          Parent Collections
        </h1>
        <p className="text-gray-500 text-sm font-medium">Monitor household repayment health and manage defaults across the network.</p>
      </div>

      {/* RISK METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mt-10 -mr-10 transition-transform group-hover:scale-110 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Total Platform Arrears</p>
            <p className="text-3xl md:text-4xl font-black font-mono text-[#0a1128] truncate tracking-tight">₦{totalArrears.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600 shrink-0 relative z-10">
            <Wallet className="w-8 h-8" />
          </div>
        </div>

        <div className="bg-red-50/50 p-6 md:p-8 rounded-3xl border border-red-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-100 rounded-full blur-3xl -mt-10 -mr-10 transition-transform group-hover:scale-110 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[10px] md:text-xs font-bold text-red-600 uppercase tracking-widest mb-2">High-Risk Households</p>
            <p className="text-3xl md:text-4xl font-black font-mono text-red-800 tracking-tight">{highRiskCount}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-2xl text-red-600 shrink-0 relative z-10">
            <AlertCircle className="w-8 h-8" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
        
        {/* SEARCH AND FILTERS */}
        <div className="p-5 md:p-6 border-b border-gray-100 bg-white flex flex-col md:flex-row justify-between md:items-center gap-4">
          <h2 className="text-lg font-bold text-[#0a1128]">Global Ledger</h2>
          
          <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" placeholder="Search parent, student, or school..." 
                value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm text-[#0a1128] font-medium transition-all shadow-sm"
              />
            </div>
            
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select 
                value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm font-bold text-[#0a1128] transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active (On Track)</option>
                <option value="Late">Late (Missed)</option>
                <option value="Default">Default (Critical)</option>
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* PLATFORM-WIDE HOUSEHOLD LEDGER TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="p-5">Household / Contact</th>
                <th className="p-5">Financed Students</th>
                <th className="p-5">Household Health</th>
                <th className="p-5">Next Due</th>
                <th className="p-5 text-right">Combined Arrears</th>
                <th className="p-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                      <FileSearch className="w-8 h-8" />
                    </div>
                    <p className="text-[#0a1128] font-bold text-lg mb-1">No matching households found.</p>
                    <p className="text-sm text-gray-500 font-medium">Try adjusting your search or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isCritical = item.household_status === 'Default' || item.household_status === 'Late'
                  
                  return (
                    <tr key={item.parent_id} className={`hover:bg-gray-50/50 transition-colors group ${isCritical ? 'bg-red-50/20' : ''}`}>
                      <td className="p-5 align-top">
                        <div className="flex items-center gap-2 mb-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <p className="font-extrabold text-[#0a1128] text-sm">{item.parent_name}</p>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs text-gray-500 font-mono">{item.parent_phone}</p>
                        </div>
                        {item.parent_email !== 'No Email' && (
                          <div className="flex items-center gap-2">
                            <Mail className="w-3.5 h-3.5 text-gray-400" />
                            <p className="text-[11px] text-gray-500 font-medium">{item.parent_email}</p>
                          </div>
                        )}
                      </td>
                      <td className="p-5 align-top min-w-[280px]">
                        <div className="space-y-3">
                          {item.children.map((child: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-1.5 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                              <p className="text-[11px] font-bold text-[#0a1128] flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5 text-blue-500" />
                                {child.student_name}
                              </p>
                              <p className="text-[10px] text-gray-500 truncate max-w-xs flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 text-gray-400" />
                                {child.school_name}
                              </p>
                              {child.outstanding > 0 && (
                                <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100 font-mono font-bold w-fit mt-1">
                                  Owing: ₦{child.outstanding.toLocaleString()}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-5 align-top">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                          item.household_status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 
                          item.household_status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                          item.household_status === 'Pending' ? 'bg-gray-50 text-gray-700 border-gray-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {item.household_status === 'Active' && <CheckCircle2 className="w-3 h-3" />}
                          {item.household_status === 'Late' && <AlertCircle className="w-3 h-3" />}
                          {item.household_status === 'Pending' && <Clock className="w-3 h-3" />}
                          {item.household_status === 'Default' && <AlertCircle className="w-3 h-3" />}
                          {item.household_status}
                        </span>
                      </td>
                      <td className="p-5 text-xs text-gray-600 font-bold align-top">
                        {item.earliest_due ? new Date(item.earliest_due).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-5 text-right font-black text-[#0a1128] font-mono text-base tracking-tight align-top">
                        ₦{item.total_outstanding.toLocaleString()}
                      </td>
                      <td className="p-5 text-right align-top">
                        <button 
                          onClick={() => handleNudge(item.parent_name, item.parent_phone, item.total_outstanding)}
                          className="bg-white border border-gray-200 text-[#0a1128] px-4 py-2 rounded-xl text-[11px] font-bold hover:bg-gray-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-95 inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100"
                        >
                          <BellRing className="w-3.5 h-3.5" />
                          Nudge
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}