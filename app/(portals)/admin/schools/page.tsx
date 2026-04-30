'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// --- NEW LUCIDE ICONS ---
import { 
  Building2, Search, Download, Settings, 
  MapPin, Mail, Phone, Wallet, Clock, 
  CheckCircle2, AlertCircle, ShieldCheck,
  TrendingUp, TrendingDown, Ban, FileSearch
} from 'lucide-react'

// --- UNIVERSAL PRICING ENGINE ---
const getFeeBreakdown = (totalInvoice: number) => {
  if (totalInvoice <= 52499) return { fee: 2500, base: totalInvoice - 2500 }
  if (totalInvoice <= 105000) return { fee: 5000, base: totalInvoice - 5000 }
  if (totalInvoice <= 208500) return { fee: 8500, base: totalInvoice - 8500 }
  return { fee: 10000, base: totalInvoice - 10000 }
}

export default function AdminSchoolsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [schools, setSchools] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [platformEscrow, setPlatformEscrow] = useState(0)

  // 1. BULLETPROOF FETCH: No nested Supabase joins to crash the app!
  const fetchSchoolsAndEscrow = async () => {
    try {
      // Step 1: Fetch ALL schools directly
      const { data: schoolsData, error: schoolError } = await supabase
        .from('partner_schools')
        .select('*')
        .order('created_at', { ascending: false })

      if (schoolError) throw schoolError

      // If no schools exist, stop here.
      if (!schoolsData || schoolsData.length === 0) {
        setSchools([])
        setPlatformEscrow(0)
        return
      }

      // Step 2: Fetch ALL active plans directly
      const { data: plansData, error: plansError } = await supabase
        .from('active_plans')
        .select('school_id, status, amount_paid, total_fee')

      if (plansError) throw plansError

      const safePlans = plansData || []
      let globalEscrow = 0

      // Step 3: Match the plans to their schools
      const augmentedSchools = schoolsData.map(school => {
        let schoolEscrow = 0
        
        const schoolPlans = safePlans.filter(p => p.school_id === school.id)

        // TIER LOGIC: Determine payout rate
        const isTier2 = (school as any).tier === 'Tier 2'
        const payoutRate = isTier2 ? 0.70 : 0.60

        schoolPlans.forEach(plan => {
          // Only count plans sitting in Escrow
          const isEscrow = plan.status === 'Pending Verification' || plan.status === 'Pending Escrow'
          if (isEscrow && Number(plan.amount_paid) > 0) {
            
            // APPLY FLAT-RATE PRICING ENGINE
            const { base: baseTuition } = getFeeBreakdown(Number(plan.total_fee))
            
            // Deploy dynamically based on school's tier
            const schoolTranche = baseTuition * payoutRate
            schoolEscrow += schoolTranche
            globalEscrow += schoolTranche
          }
        })

        return {
          ...school,
          unclaimed_escrow: schoolEscrow
        }
      })
        
      setPlatformEscrow(globalEscrow)
      setSchools(augmentedSchools)
      
    } catch (err: any) {
      console.error("HQ Fetch Error:", err)
      if (err.message) alert("Fetch Error: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSchoolsAndEscrow()
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/admin-login') 
    })
    return () => authListener.subscription.unsubscribe()
  }, [router])

  // 2. Accepts the school name, updates DB, and refreshes the list instantly
  const handleApproveSchool = async (schoolId: string, schoolName: string) => {
    if (!window.confirm(`Approve ${schoolName} to join the platform?`)) return
    setActionLoading(schoolId)

    try {
      const { error } = await supabase
        .from('partner_schools')
        .update({ status: 'Active' })
        .eq('id', schoolId)
  
      if (error) throw error
      
      fetchSchoolsAndEscrow()
    } catch (err: any) {
      alert(`Approval failed: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRevoke = async (schoolId: string, schoolName: string) => {
    if (!window.confirm(`Suspend ${schoolName}?`)) return
    setActionLoading(schoolId)
    try {
      const { error } = await supabase.from('partner_schools').update({ status: 'Suspended' }).eq('id', schoolId)
      if (error) throw error
      fetchSchoolsAndEscrow()
    } catch (err: any) { 
      alert(`Error: ${err.message}`) 
    } finally { 
      setActionLoading(null) 
    }
  }

  // 3. Toggles the school between Tier 1 and Tier 2
  const handleToggleTier = async (schoolId: string, schoolName: string, currentTier: string) => {
    const newTier = currentTier === 'Tier 1' ? 'Tier 2' : 'Tier 1'
    if (!window.confirm(`Upgrade ${schoolName} to ${newTier}? Ensure GSI mandates are signed.`)) return
    
    setActionLoading(schoolId)
    try {
      const { error } = await supabase
        .from('partner_schools')
        .update({ tier: newTier } as any) 
        .eq('id', schoolId)

      if (error) throw error
      fetchSchoolsAndEscrow() 
    } catch (err: any) {
      alert(`Tier update failed: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadCSV = () => {
    const headers = ['Institution', 'State', 'Contact Email', 'Contact Phone', 'Tier', 'Unclaimed Escrow (NGN)', 'Status', 'Date Joined']
    const csvRows = [headers.join(',')]
    filteredSchools.forEach(s => {
      const row = [`"${s.name}"`, `"${s.state || 'N/A'}"`, `"${s.finance_email || s.email}"`, `"${s.contact_phone}"`, `"${(s as any).tier || 'Tier 1'}"`, `"${s.unclaimed_escrow || 0}"`, `"${s.status}"`, `"${new Date(s.created_at).toLocaleDateString()}"`]
      csvRows.push(row.join(','))
    })
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `payterm_partner_schools_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredSchools = schools.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.finance_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.state?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const activeSchools = schools.filter(s => s.status === 'Active').length
  const pendingSchools = schools.filter(s => s.status === 'Pending Verification' || s.status === 'Pending').length

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-screen flex items-center justify-center animate-pulse">Loading Partner Network...</div>

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in pb-20 relative">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-purple-600" />
            Network Admin
          </h1>
          <p className="text-gray-500 font-medium text-sm">Review applications and manage platform liquidity.</p>
        </div>
        <button className="text-sm font-bold text-gray-500 hover:text-[#0a1128] transition-colors bg-white px-5 py-2.5 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 active:scale-95">
          <Settings className="w-4 h-4" />
          Global Settings
        </button>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        
        <div className="bg-gradient-to-br from-[#050a15] to-purple-950 p-6 md:p-8 rounded-3xl shadow-xl shadow-purple-900/10 relative overflow-hidden group col-span-1 md:col-span-2">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl transition-transform group-hover:scale-110 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] sm:text-xs font-bold text-purple-300 uppercase tracking-widest">Total Platform Escrow</p>
              <Wallet className="w-5 h-5 text-purple-400" />
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono text-white truncate tracking-tight">₦{platformEscrow.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-orange-50/50 p-6 md:p-8 rounded-3xl border border-orange-100 shadow-sm transition-shadow hover:shadow-md col-span-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] sm:text-xs font-bold text-orange-700 uppercase tracking-widest">Awaiting</p>
              <Clock className="w-5 h-5 text-orange-500" />
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono text-orange-800 tracking-tight">{pendingSchools}</p>
          </div>
        </div>
        
        <div className="bg-green-50/50 p-6 md:p-8 rounded-3xl border border-green-100 shadow-sm transition-shadow hover:shadow-md col-span-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-4">
              <p className="text-[10px] sm:text-xs font-bold text-green-700 uppercase tracking-widest">Active</p>
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-3xl sm:text-4xl font-black font-mono text-green-800 tracking-tight">{activeSchools}</p>
          </div>
        </div>
      </div>

      {/* DIRECTORY SECTION */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
        
        {/* Controls */}
        <div className="p-5 md:p-6 border-b border-gray-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg font-bold text-[#0a1128]">School Directory</h3>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" placeholder="Search school, email, or state..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white text-sm text-[#0a1128] transition-all shadow-sm font-medium"
              />
            </div>
            <button 
              onClick={handleDownloadCSV}
              className="w-full sm:w-auto flex justify-center items-center gap-2 bg-white border border-gray-200 text-[#0a1128] px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-purple-600" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Directory List */}
        <div>
          {filteredSchools.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                <FileSearch className="w-8 h-8" />
              </div>
              <p className="text-[#0a1128] font-bold text-lg mb-1">No schools found.</p>
              <p className="text-sm text-gray-500 font-medium">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredSchools.map((school) => (
                <div key={school.id} className={`flex flex-col lg:flex-row items-start lg:items-center justify-between p-6 lg:p-8 hover:bg-gray-50/50 transition-colors gap-6 ${school.unclaimed_escrow > 0 ? 'bg-purple-50/20' : ''}`}>
                  
                  {/* 1. Identity & Location */}
                  <div className="flex-1 min-w-[240px]">
                    <div className="flex flex-wrap items-center gap-3 mb-2">
                      <h3 className="font-extrabold text-[#0a1128] text-base md:text-lg tracking-tight flex items-center gap-2">
                        {school.name}
                      </h3>
                      {/* Tier Badge */}
                      <span className="px-2.5 py-1 rounded-md text-purple-700 bg-purple-50 border border-purple-200 text-[9px] font-bold tracking-wider uppercase">
                        {(school as any).tier || 'Tier 1'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-medium text-gray-500">
                      {school.state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" /> {school.state}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-gray-400" /> Joined {new Date(school.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* 2. Contact Information */}
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <p className="text-sm text-[#0a1128] font-medium flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      <span className="truncate">{school.finance_email || school.email || 'No email'}</span>
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-2 font-mono">
                      <Phone className="w-4 h-4 text-gray-400 shrink-0" />
                      {school.contact_phone || 'N/A'}
                    </p>
                  </div>

                  {/* 3. Financial Status */}
                  <div className="flex-1 min-w-[140px] w-full lg:w-auto border-t lg:border-t-0 border-gray-100 pt-4 lg:pt-0">
                    <p className={`text-lg md:text-xl font-black font-mono tracking-tight mb-1 ${school.unclaimed_escrow > 0 ? 'text-purple-600' : 'text-[#0a1128]'}`}>
                      ₦{school.unclaimed_escrow.toLocaleString()}
                    </p>
                    {school.unclaimed_escrow > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse shrink-0"></span>
                        <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Awaiting Claim</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Settled</p>
                      </div>
                    )}
                  </div>

                  {/* 4. Status & Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-4 flex-1 min-w-[280px] w-full lg:w-auto">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border shrink-0 inline-flex items-center gap-1.5 ${
                      school.status === 'Pending Verification' || school.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                      school.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {school.status === 'Pending Verification' || school.status === 'Pending' ? <Clock className="w-3 h-3" /> : 
                       school.status === 'Active' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {school.status}
                    </span>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                      {(school.status === 'Pending Verification' || school.status === 'Pending') && (
                        <button 
                          onClick={() => handleApproveSchool(school.id, school.name)} 
                          disabled={actionLoading === school.id} 
                          className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-purple-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:from-purple-700 hover:to-purple-600 transition-all shadow-md shadow-purple-500/20 disabled:shadow-none disabled:from-gray-300 disabled:to-gray-300 active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          {actionLoading === school.id ? '...' : <><ShieldCheck className="w-3.5 h-3.5" /> Approve</>}
                        </button>
                      )}
                      
                      {school.status === 'Active' && (
                        <>
                          <button 
                            onClick={() => handleToggleTier(school.id, school.name, (school as any).tier || 'Tier 1')} 
                            disabled={actionLoading === school.id} 
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            {actionLoading === school.id ? '...' : ((school as any).tier === 'Tier 2' ? <><TrendingDown className="w-3.5 h-3.5" /> Tier 1</> : <><TrendingUp className="w-3.5 h-3.5" /> Tier 2</>)}
                          </button>
                          
                          <button 
                            onClick={() => handleRevoke(school.id, school.name)} 
                            disabled={actionLoading === school.id} 
                            className="flex-1 sm:flex-none px-4 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            {actionLoading === school.id ? '...' : <><Ban className="w-3.5 h-3.5" /> Suspend</>}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}