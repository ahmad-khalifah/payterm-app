'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

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

      // If no schools exist (like right after a TRUNCATE), stop here.
      if (!schoolsData || schoolsData.length === 0) {
        setSchools([])
        setPlatformEscrow(0)
        return
      }

      // Step 2: Fetch ALL active plans directly
      const { data: plansData, error: plansError } = await supabase
        .from('active_plans')
        .select('school_id, status, amount_paid, total_fee')

      // If plans fail to fetch (e.g., table is empty), default to an empty array
      const safePlans = plansData || []

      let globalEscrow = 0

      // Step 3: Match the plans to their schools using standard JavaScript
      const augmentedSchools = schoolsData.map(school => {
        let schoolEscrow = 0
        
        // Find plans that belong to this specific school
        const schoolPlans = safePlans.filter(p => p.school_id === school.id)

        schoolPlans.forEach(plan => {
          // Only count plans sitting in Escrow
          const isEscrow = plan.status === 'Pending Verification' || plan.status === 'Pending Escrow'
          if (isEscrow && Number(plan.amount_paid) > 0) {
            const baseTuition = Number(plan.total_fee) / 1.05
            const schoolTranche = baseTuition * 0.70
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
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) router.push('/admin-login') 
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
      
      // Refresh the data so the UI updates automatically
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

  const handleDownloadCSV = () => {
    const headers = ['Institution', 'State', 'Contact Email', 'Contact Phone', 'Unclaimed Escrow (NGN)', 'Status', 'Date Joined']
    const csvRows = [headers.join(',')]
    filteredSchools.forEach(s => {
      const row = [`"${s.name}"`, `"${s.state || 'N/A'}"`, `"${s.finance_email || s.email}"`, `"${s.contact_phone}"`, `"${s.unclaimed_escrow || 0}"`, `"${s.status}"`, `"${new Date(s.created_at).toLocaleDateString()}"`]
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
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in pb-20">
      
      {/* Header */}
      <div className="mb-6 md:mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] mb-1 tracking-tight">Network Admin</h1>
          <p className="text-gray-500 text-sm">Review applications and manage platform liquidity.</p>
        </div>
        <button className="text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
          Admin Settings
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        <div className="bg-[#0a1128] p-5 md:p-6 rounded-2xl shadow-lg relative overflow-hidden col-span-2 md:col-span-2">
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl"></div>
          <p className="text-[10px] sm:text-xs font-bold text-blue-200 uppercase tracking-wide mb-1 md:mb-2">Total Platform Escrow</p>
          <p className="text-2xl sm:text-4xl font-bold font-mono text-white truncate">₦{platformEscrow.toLocaleString()}</p>
        </div>

        <div className="bg-orange-50 p-5 md:p-6 rounded-2xl border border-orange-100 shadow-sm col-span-1">
          <p className="text-[10px] sm:text-xs font-bold text-orange-700 uppercase tracking-wide mb-1 md:mb-2">Awaiting</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-orange-800">{pendingSchools}</p>
        </div>
        
        <div className="bg-green-50 p-5 md:p-6 rounded-2xl border border-green-100 shadow-sm col-span-1">
          <p className="text-[10px] sm:text-xs font-bold text-green-700 uppercase tracking-wide mb-1 md:mb-2">Active</p>
          <p className="text-2xl sm:text-3xl font-bold font-mono text-green-800">{activeSchools}</p>
        </div>
      </div>

      {/* Directory Section */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        
        {/* Controls */}
        <div className="p-4 sm:p-6 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-lg font-bold text-[#0a1128]">School Directory</h3>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <input 
              type="text" placeholder="Search school, email, or state..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-64 text-[#0a1128] transition-all shadow-sm font-medium bg-white"
            />
            <button 
              onClick={handleDownloadCSV}
              className="w-full sm:w-auto flex justify-center items-center gap-2 bg-white border border-gray-300 text-[#0a1128] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Directory List */}
        <div>
          {filteredSchools.length === 0 ? (
            <div className="p-12 text-center text-gray-500 font-medium">No schools found matching your search.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSchools.map((school) => (
                <div key={school.id} className={`flex flex-col md:flex-row items-start md:items-center justify-between p-5 md:p-6 hover:bg-gray-50 transition-colors gap-4 md:gap-6 ${school.unclaimed_escrow > 0 ? 'bg-blue-50/10' : ''}`}>
                  
                  {/* 1. Identity & Location */}
                  <div className="flex-1 min-w-[220px]">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1.5">
                      <h3 className="font-bold text-[#0a1128] text-base md:text-lg tracking-tight">{school.name}</h3>
                      {school.state && (
                        <span className="px-2 py-0.5 rounded text-gray-600 bg-gray-100 border border-gray-200 text-[10px] font-bold tracking-wider uppercase">
                          {school.state}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-medium">Joined {new Date(school.created_at).toLocaleDateString()}</p>
                  </div>

                  {/* 2. Contact Information */}
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-sm text-[#0a1128] font-medium mb-1.5 flex items-center gap-2">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      <span className="truncate">{school.finance_email || school.email || 'No email'}</span>
                    </p>
                    <p className="text-xs text-gray-500 flex items-center gap-2 font-mono">
                      <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                      {school.contact_phone || 'N/A'}
                    </p>
                  </div>

                  {/* 3. Financial Status */}
                  <div className="flex-1 min-w-[120px] w-full md:w-auto border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                    <p className={`text-base md:text-lg font-bold font-mono mb-0.5 ${school.unclaimed_escrow > 0 ? 'text-blue-600' : 'text-[#0a1128]'}`}>
                      ₦{school.unclaimed_escrow.toLocaleString()}
                    </p>
                    {school.unclaimed_escrow > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Awaiting Claim</p>
                      </div>
                    ) : (
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Settled</p>
                    )}
                  </div>

                  {/* 4. Status & Actions */}
                  <div className="flex flex-row items-center justify-between md:justify-end gap-4 flex-1 min-w-[180px] w-full md:w-auto">
                    <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border shrink-0 ${
                      school.status === 'Pending Verification' || school.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                      school.status === 'Active' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {school.status}
                    </span>

                    <div className="flex items-center gap-2">
                      {(school.status === 'Pending Verification' || school.status === 'Pending') && (
                        <button onClick={() => handleApproveSchool(school.id, school.name)} disabled={actionLoading === school.id} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:bg-blue-300">
                          {actionLoading === school.id ? '...' : 'Approve'}
                        </button>
                      )}
                      {school.status === 'Active' && (
                        <button onClick={() => handleRevoke(school.id, school.name)} disabled={actionLoading === school.id} className="px-4 py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50">
                          {actionLoading === school.id ? '...' : 'Suspend'}
                        </button>
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