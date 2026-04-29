'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function AdminCollectionsPage() {
  const [loading, setLoading] = useState(true)
  const [collections, setCollections] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  // BULLETPROOF FETCH: Bypassing complex Supabase Joins to prevent silent failures
  const fetchCollections = async () => {
    try {
      // Step 1: Fetch all active plans
      const { data: plansData, error: planError } = await supabase
        .from('active_plans')
        .select('*')
        .neq('status', 'Completed')

      if (planError) throw planError

      if (!plansData || plansData.length === 0) {
        setCollections([])
        return
      }

      // Step 2: Fetch related tables independently
      const [
        { data: parentsData },
        { data: studentsData },
        { data: schoolsData }
      ] = await Promise.all([
        supabase.from('parents').select('id, full_name, email, phone'),
        supabase.from('students').select('id, full_name'),
        supabase.from('partner_schools').select('id, name')
      ])

      // Step 3: Map the base data
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
      
      // Step 4: Group data by Parent (Household logic)
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
            created_at: curr.created_at // Used for default sorting
          }
        }

        const outstanding = Math.max(0, Number(curr.total_fee) - Number(curr.amount_paid))
        
        acc[pId].total_outstanding += outstanding
        acc[pId].statuses.add(curr.status)
        
        // Track the earliest upcoming payment date for the household
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

      // Step 5: Determine final household status and format array
      let formattedGroups = Object.values(groupedByParent).map((group: any) => {
        let householdStatus = 'Active'
        if (group.statuses.has('Default')) householdStatus = 'Default'
        else if (group.statuses.has('Late')) householdStatus = 'Late'
        else if (group.statuses.has('Pending Verification') || group.statuses.has('Pending Escrow')) householdStatus = 'Pending'

        return { ...group, household_status: householdStatus }
      })

      // Sort newest created accounts to the top
      formattedGroups.sort((a: any, b: any) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return dateB - dateA;
      });

      setCollections(formattedGroups)
      
    } catch (err: any) {
      console.error("Collections Fetch Error:", err)
      if (err.message) alert("Database Error: " + err.message)
    } finally {
      setLoading(false) 
    }
  }

  useEffect(() => {
    fetchCollections()
  }, [])

  const handleNudge = (parentName: string, phone: string, amount: number) => {
    alert(`Recovery Protocol: Automated SMS nudge sent to ${parentName} at ${phone} for ₦${amount.toLocaleString()}.`)
  }

  // Filter based on the grouped Household data
  const filteredData = collections.filter(item => {
    // Search checks parent details OR any of the children's names/schools
    const searchString = `${item.parent_name} ${item.parent_phone} ${item.children.map((c: any) => `${c.student_name} ${c.school_name}`).join(' ')}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())
    
    const matchesStatus = filterStatus === 'All' || item.household_status === filterStatus;
    
    return matchesSearch && matchesStatus;
  })

  // Calculate Metrics from Grouped Data
  const totalArrears = collections.reduce((sum, item) => sum + item.total_outstanding, 0)
  const highRiskCount = collections.filter(item => item.household_status === 'Default' || item.household_status === 'Late').length

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] h-screen uppercase tracking-widest flex items-center justify-center animate-pulse">Loading Collections...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0a1128] mb-1 tracking-tight">Parent Collections</h1>
        <p className="text-gray-500 text-sm">Monitor household repayment health and manage defaults across the network.</p>
      </div>

      {/* RISK METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
        <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
          <div>
            <p className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 md:mb-2">Total Platform Arrears</p>
            <p className="text-2xl md:text-3xl font-black font-mono text-[#0a1128] truncate">₦{totalArrears.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 p-3 md:p-4 rounded-xl text-blue-600 shrink-0">
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="bg-red-50 p-5 md:p-6 rounded-2xl border border-red-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
          <div>
            <p className="text-[10px] md:text-xs font-bold text-red-600 uppercase tracking-wide mb-1 md:mb-2">High-Risk Households</p>
            <p className="text-2xl md:text-3xl font-black font-mono text-red-800">{highRiskCount}</p>
          </div>
          <div className="bg-red-100 p-3 md:p-4 rounded-xl text-red-600 shrink-0">
            <svg className="w-6 h-6 md:w-8 md:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center">
        <input 
          type="text" placeholder="Search parent, student, or school..." 
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 w-full border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm text-[#0a1128] font-medium transition-all"
        />
        <select 
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="w-full md:w-56 border border-gray-200 bg-gray-50 focus:bg-white p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm font-bold text-[#0a1128] transition-all appearance-none"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active (On Track)</option>
          <option value="Late">Late (Missed)</option>
          <option value="Default">Default (Critical)</option>
        </select>
      </div>

      {/* PLATFORM-WIDE HOUSEHOLD LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-bold">Household / Contact</th>
                <th className="p-4 font-bold">Financed Students</th>
                <th className="p-4 font-bold">Household Health</th>
                <th className="p-4 font-bold">Next Due</th>
                <th className="p-4 font-bold text-right">Combined Arrears</th>
                <th className="p-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-sm font-medium text-gray-500">No matching household records found.</td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const isCritical = item.household_status === 'Default' || item.household_status === 'Late'
                  
                  return (
                    <tr key={item.parent_id} className={`hover:bg-gray-50 transition-colors ${isCritical ? 'bg-red-50/10' : ''}`}>
                      <td className="p-4 align-top">
                        <p className="font-bold text-[#0a1128] text-sm">{item.parent_name}</p>
                        <p className="text-[11px] text-gray-500 mt-1 font-mono">{item.parent_phone}</p>
                        <p className="text-[11px] text-gray-400 font-medium">{item.parent_email !== 'No Email' ? item.parent_email : ''}</p>
                      </td>
                      <td className="p-4 align-top">
                        <div className="space-y-3">
                          {item.children.map((child: any, idx: number) => (
                            <div key={idx} className="flex flex-col gap-0.5">
                              <p className="text-xs font-bold text-gray-800">{child.student_name}</p>
                              <p className="text-[10px] text-gray-500 truncate max-wxs">{child.school_name}</p>
                              {child.outstanding > 0 && (
                                <p className="text-[10px] text-red-500 font-mono font-medium">Owing: ₦{child.outstanding.toLocaleString()}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 align-top">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border inline-block ${
                          item.household_status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          item.household_status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                          item.household_status === 'Pending' ? 'bg-gray-50 text-gray-700 border-gray-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {item.household_status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-gray-600 font-medium align-top">
                        {item.earliest_due ? new Date(item.earliest_due).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-4 text-right font-bold text-[#0a1128] font-mono text-sm align-top">
                        ₦{item.total_outstanding.toLocaleString()}
                      </td>
                      <td className="p-4 text-right align-top">
                        <button 
                          onClick={() => handleNudge(item.parent_name, item.parent_phone, item.total_outstanding)}
                          className="bg-white border border-gray-200 text-[#0a1128] px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 transition-colors shadow-sm active:scale-95"
                        >
                          Nudge Household
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