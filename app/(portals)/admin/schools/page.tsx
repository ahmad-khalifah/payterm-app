'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { approveSchoolAction, suspendSchoolAction, toggleSchoolTierAction } from '@/app/actions/admin'

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

  // 1. BULLETPROOF FETCH
  const fetchSchoolsAndEscrow = async () => {
    try {
      const { data: schoolsData, error: schoolError } = await supabase
        .from('partner_schools')
        .select('*')
        .order('created_at', { ascending: false })

      if (schoolError) throw schoolError

      if (!schoolsData || schoolsData.length === 0) {
        setSchools([])
        setPlatformEscrow(0)
        return
      }

      const { data: plansData, error: plansError } = await supabase
        .from('active_plans')
        .select('school_id, status, amount_paid, total_fee')

      if (plansError) throw plansError

      const safePlans = plansData || []
      let globalEscrow = 0

      const augmentedSchools = schoolsData.map(school => {
        let schoolEscrow = 0
        const schoolPlans = safePlans.filter(p => p.school_id === school.id)

        const isTier2 = (school as any).tier === 'Tier 2'
        const payoutRate = isTier2 ? 0.70 : 0.60

        schoolPlans.forEach(plan => {
          const isEscrow = plan.status === 'Pending Verification' || plan.status === 'Pending Escrow'
          if (isEscrow && Number(plan.amount_paid) > 0) {
            const { base: baseTuition } = getFeeBreakdown(Number(plan.total_fee))
            const schoolTranche = baseTuition * payoutRate
            schoolEscrow += schoolTranche
            globalEscrow += schoolTranche
          }
        })

        return { ...school, unclaimed_escrow: schoolEscrow }
      })
        
      setPlatformEscrow(globalEscrow)
      setSchools(augmentedSchools)
      
    } catch (err: any) {
      console.error("HQ Fetch Error:", err)
      if (err.message) toast.error("Fetch Error: " + err.message)
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

  const handleApproveSchool = (schoolId: string, schoolName: string, schoolEmail: string) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-[#0a1128]">Approve {schoolName}?</p>
          <div className="flex gap-2 mt-1">
            <button 
              onClick={async () => {
                toast.dismiss(t.id)
                setActionLoading(schoolId)
                try {
                  await approveSchoolAction(schoolId, schoolName, schoolEmail)
                  toast.success("School approved successfully.")
                  fetchSchoolsAndEscrow()
                } catch (err: any) { 
                  toast.error(`Approval failed: ${err.message}`) 
                  console.error(err)
                } finally { setActionLoading(null) }
              }}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              Yes, Approve
            </button>
            <button onClick={() => toast.dismiss(t.id)} className="bg-gray-100 text-[#0a1128] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      ), { duration: Infinity }
    )
  }

  const handleRevoke = (schoolId: string, schoolName: string) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-[#0a1128]">Suspend {schoolName}?</p>
          <div className="flex gap-2 mt-1">
            <button 
              onClick={async () => {
                toast.dismiss(t.id)
                setActionLoading(schoolId)
                try {
                  await suspendSchoolAction(schoolId)
                  toast.success("School suspended.")
                  fetchSchoolsAndEscrow()
                } catch (err: any) { 
                  toast.error(`Suspension failed: ${err.message}`) 
                } finally { setActionLoading(null) }
              }}
              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
            >
              Yes, Suspend
            </button>
            <button onClick={() => toast.dismiss(t.id)} className="bg-gray-100 text-[#0a1128] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      ), { duration: Infinity }
    )
  }

  const handleToggleTier = (schoolId: string, schoolName: string, currentTier: string) => {
    const newTier = currentTier === 'Tier 1' ? 'Tier 2' : 'Tier 1'
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-[#0a1128]">Upgrade {schoolName} to {newTier}?</p>
          <p className="text-xs text-gray-500">Ensure GSI mandates are signed.</p>
          <div className="flex gap-2 mt-1">
            <button 
              onClick={async () => {
                toast.dismiss(t.id)
                setActionLoading(schoolId)
                try {
                  await toggleSchoolTierAction(schoolId, newTier)
                  toast.success(`Upgraded to ${newTier}.`)
                  fetchSchoolsAndEscrow()
                } catch (err: any) { 
                  toast.error(`Tier update failed: ${err.message}`) 
                } finally { setActionLoading(null) }
              }}
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              Confirm Upgrade
            </button>
            <button onClick={() => toast.dismiss(t.id)} className="bg-gray-100 text-[#0a1128] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      ), { duration: Infinity }
    )
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

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase text-sm h-screen flex items-center justify-center animate-pulse">Loading Partner Network...</div>

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in pb-20 relative">
      
      {/* HEADER */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0a1128] tracking-tight mb-1.5 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-600" />
            Network Admin
          </h1>
          <p className="text-gray-500 font-medium text-xs">Review applications and manage platform liquidity.</p>
        </div>
        <button className="text-xs font-bold text-gray-500 hover:text-[#0a1128] transition-colors bg-white px-4 py-2 rounded-xl shadow-sm border border-gray-200 flex items-center gap-2 active:scale-95">
          <Settings className="w-3.5 h-3.5" /> Global Settings
        </button>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-[#0a1128] to-[#15234b] p-5 md:p-6 rounded-2xl shadow-xl shadow-blue-900/10 relative overflow-hidden group col-span-1 md:col-span-2">
          <div className="absolute top-0 right-0 -mr-12 -mt-12 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl transition-transform group-hover:scale-110 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[9px] sm:text-[10px] font-bold text-blue-300 uppercase tracking-widest">Total Platform Escrow</p>
              <Wallet className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-white truncate tracking-tight">₦{platformEscrow.toLocaleString()}</p>
          </div>
        </div>

        <div className="bg-orange-50/50 p-5 md:p-6 rounded-2xl border border-orange-100 shadow-sm transition-shadow hover:shadow-md col-span-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full blur-2xl -mt-6 -mr-6 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[9px] sm:text-[10px] font-bold text-orange-700 uppercase tracking-widest">Awaiting</p>
              <Clock className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-orange-800 tracking-tight">{pendingSchools}</p>
          </div>
        </div>
        
        <div className="bg-green-50/50 p-5 md:p-6 rounded-2xl border border-green-100 shadow-sm transition-shadow hover:shadow-md col-span-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full blur-2xl -mt-6 -mr-6 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <p className="text-[9px] sm:text-[10px] font-bold text-green-700 uppercase tracking-widest">Active</p>
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-2xl sm:text-3xl font-black font-mono text-green-800 tracking-tight">{activeSchools}</p>
          </div>
        </div>
      </div>

      {/* DIRECTORY SECTION */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="p-4 md:p-5 border-b border-gray-100 bg-white flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-base font-bold text-[#0a1128]">School Directory</h3>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-gray-400" />
              </div>
              <input 
                type="text" placeholder="Search school, email, or state..." 
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-xs text-[#0a1128] transition-all shadow-sm font-medium"
              />
            </div>
            <button 
              onClick={handleDownloadCSV}
              className="w-full sm:w-auto flex justify-center items-center gap-1.5 bg-white border border-gray-200 text-[#0a1128] px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" /> Export CSV
            </button>
          </div>
        </div>

        <div>
          {filteredSchools.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400 mb-3">
                <FileSearch className="w-6 h-6" />
              </div>
              <p className="text-[#0a1128] font-bold text-sm mb-0.5">No schools found.</p>
              <p className="text-xs text-gray-500 font-medium">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {filteredSchools.map((school) => (
                <div key={school.id} className={`flex flex-col lg:flex-row items-start lg:items-center justify-between p-5 hover:bg-gray-50/50 transition-colors gap-4 ${school.unclaimed_escrow > 0 ? 'bg-blue-50/20' : ''}`}>
                  
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <h3 className="font-extrabold text-[#0a1128] text-sm tracking-tight flex items-center gap-1.5">
                        {school.name}
                      </h3>
                      <span className="px-2 py-0.5 rounded text-blue-700 bg-blue-50 border border-blue-200 text-[8px] font-bold tracking-wider uppercase">
                        {(school as any).tier || 'Tier 1'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-gray-500">
                      {school.state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-gray-400" /> {school.state}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-gray-400" /> Joined {new Date(school.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 min-w-[180px] space-y-1.5">
                    <p className="text-xs text-[#0a1128] font-medium flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{school.finance_email || school.email || 'No email'}</span>
                    </p>
                    <p className="text-[11px] text-gray-500 flex items-center gap-1.5 font-mono">
                      <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      {school.contact_phone || 'N/A'}
                    </p>
                  </div>

                  <div className="flex-1 min-w-[120px] w-full lg:w-auto border-t lg:border-t-0 border-gray-100 pt-3 lg:pt-0">
                    <p className={`text-base font-black font-mono tracking-tight mb-0.5 ${school.unclaimed_escrow > 0 ? 'text-blue-600' : 'text-[#0a1128]'}`}>
                      ₦{school.unclaimed_escrow.toLocaleString()}
                    </p>
                    {school.unclaimed_escrow > 0 ? (
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Awaiting Claim</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-gray-400" />
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Settled</p>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-3 flex-1 min-w-[240px] w-full lg:w-auto">
                    <span className={`px-2 py-1 rounded md text-[9px] font-bold uppercase tracking-wider border shrink-0 inline-flex items-center gap-1 ${
                      school.status === 'Pending Verification' || school.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                      school.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {school.status === 'Pending Verification' || school.status === 'Pending' ? <Clock className="w-2.5 h-2.5" /> : 
                       school.status === 'Active' ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                      {school.status}
                    </span>

                    <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                      {(school.status === 'Pending Verification' || school.status === 'Pending') && (
                        <button 
                          onClick={() => handleApproveSchool(school.id, school.name, school.finance_email || school.email)} 
                          disabled={actionLoading === school.id} 
                          className="w-full sm:w-auto bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-2 rounded-xl text-[11px] font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-md shadow-blue-500/20 disabled:shadow-none disabled:from-gray-300 disabled:to-gray-300 active:scale-95 flex items-center justify-center gap-1"
                        >
                          {actionLoading === school.id ? '...' : <><ShieldCheck className="w-3 h-3" /> Approve</>}
                        </button>
                      )}
                      
                      {school.status === 'Active' && (
                        <>
                          <button 
                            onClick={() => handleToggleTier(school.id, school.name, (school as any).tier || 'Tier 1')} 
                            disabled={actionLoading === school.id} 
                            className="flex-1 sm:flex-none px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-[11px] font-bold transition-all shadow-sm disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1"
                          >
                            {actionLoading === school.id ? '...' : ((school as any).tier === 'Tier 2' ? <><TrendingDown className="w-3 h-3" /> Tier 1</> : <><TrendingUp className="w-3 h-3" /> Tier 2</>)}
                          </button>
                          
                          <button 
                            onClick={() => handleRevoke(school.id, school.name)} 
                            disabled={actionLoading === school.id} 
                            className="flex-1 sm:flex-none px-3 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl text-[11px] font-bold transition-all shadow-sm disabled:opacity-50 active:scale-95 flex items-center justify-center gap-1"
                          >
                            {actionLoading === school.id ? '...' : <><Ban className="w-3 h-3" /> Suspend</>}
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