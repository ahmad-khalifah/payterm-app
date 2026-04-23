'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function AdminCollectionsPage() {
  const [loading, setLoading] = useState(true)
  const [collections, setCollections] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('All')

  const fetchCollections = async () => {
    try {
      const { data, error } = await supabase
        .from('active_plans')
        .select(`
          id,
          total_fee,
          amount_paid,
          status,
          next_payment_date,
          students ( 
            full_name,
            parents ( full_name, email, phone ),
            partner_schools ( name )
          )
        `)
        .neq('status', 'Completed')
        .order('status', { ascending: false })

      if (error) throw error

      if (data) {
        // Check your browser console (F12) to see exactly what Supabase is returning
        console.log("Raw Supabase Payload:", data)

        const formattedData = data.map((plan: any) => {
          // Safely extract nested data whether Supabase returns an Object or an Array
          const student = Array.isArray(plan.students) ? plan.students[0] : plan.students;
          const parent = student?.parents ? (Array.isArray(student.parents) ? student.parents[0] : student.parents) : null;
          const school = student?.partner_schools ? (Array.isArray(student.partner_schools) ? student.partner_schools[0] : student.partner_schools) : null;

          return {
            ...plan,
            parent_name: parent?.full_name || 'Unknown Parent',
            parent_email: parent?.email || 'No Email',
            parent_phone: parent?.phone || 'No Phone',
            student_name: student?.full_name || 'Unknown Student',
            school_name: school?.name || 'Unknown School'
          }
        })
        
        setCollections(formattedData)
      }
    } catch (err: any) {
      console.error("Collections Fetch Error:", JSON.stringify(err, null, 2) || err.message)
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

  // Updated search filter to easily find schools or students by text name
  const filteredData = collections.filter(item => {
    const matchesSearch = item.parent_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.school_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || item.status === filterStatus;
    return matchesSearch && matchesStatus;
  })

  const totalArrears = collections.reduce((sum, item) => {
    return sum + (Number(item.total_fee) - Number(item.amount_paid))
  }, 0)

  const highRiskCount = collections.filter(item => item.status === 'Default' || item.status === 'Late').length

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] h-full flex items-center justify-center animate-pulse">Loading platform-wide collections data...</div>

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0a1128] mb-2">Parent Collections</h1>
        <p className="text-gray-500 text-sm">Monitor repayment health and manage defaults across the partner network.</p>
      </div>

      {/* RISK METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Total Platform Arrears</p>
            <p className="text-3xl font-bold text-[#0a1128]">₦{totalArrears.toLocaleString()}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-xl text-blue-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        </div>

        <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm flex justify-between items-center hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-2">High-Risk Defaults</p>
            <p className="text-3xl font-bold text-red-800">{highRiskCount}</p>
          </div>
          <div className="bg-red-100 p-4 rounded-xl text-red-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
        </div>
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center">
        <input 
          type="text" placeholder="Search by parent, student, or school..." 
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm text-[#0a1128] transition-all"
        />
        <select 
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="w-full md:w-56 border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-[#0a1128] bg-white transition-all appearance-none"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active (On Track)</option>
          <option value="Late">Late (Missed)</option>
          <option value="Default">Default (Critical)</option>
        </select>
      </div>

      {/* PLATFORM-WIDE LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-200 text-xs text-[#0a1128] uppercase tracking-wide">
                <th className="p-5 font-bold">Parent & Student</th>
                <th className="p-5 font-bold">Partner School</th>
                <th className="p-5 font-bold">Payment Health</th>
                <th className="p-5 font-bold">Next Due</th>
                <th className="p-5 font-bold text-right">Arrears</th>
                <th className="p-5 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500">No matching collections records found.</td>
                </tr>
              ) : (
                filteredData.map((item) => {
                  const outstanding = Number(item.total_fee) - Number(item.amount_paid)
                  const isCritical = item.status === 'Default' || item.status === 'Late'
                  
                  return (
                    <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${isCritical ? 'bg-red-50/20' : ''}`}>
                      <td className="p-5">
                        <p className="font-bold text-[#0a1128] text-sm">{item.parent_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Student: {item.student_name}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5 font-mono">{item.parent_phone}</p>
                      </td>
                      <td className="p-5 font-bold text-[#0a1128]">
                        {item.school_name}
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          item.status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          item.status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                          item.status === 'Pending Verification' ? 'bg-gray-50 text-gray-700 border-gray-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-5 text-gray-600 font-medium">{item.next_payment_date || 'Awaiting'}</td>
                      <td className="p-5 text-right font-bold text-[#0a1128] font-mono">
                        ₦{outstanding.toLocaleString()}
                      </td>
                      <td className="p-5 text-right">
                        <button 
                          onClick={() => handleNudge(item.parent_name, item.parent_phone, outstanding)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                        >
                          Nudge Parent
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