'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function StudentsPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)

  useEffect(() => {
    const initializePage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: schoolProfile } = await supabase
          .from('partner_schools')
          .select('name')
          .eq('id', user.id)
          .single()

        if (schoolProfile) {
          setTargetSchool(schoolProfile.name)
          setSchoolId(user.id)
          fetchStudents(user.id)
        }
      } catch (err) {
        console.error("Auth Error:", err)
      }
    }
    initializePage()
  }, [])

  const fetchStudents = async (idToFetch: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, full_name, student_class, enrollment_status, withdrawal_date,
          active_plans ( total_fee, amount_paid, status )
        `)
        .eq('school_id', idToFetch)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setStudents(data)
      } catch (err: any) {
        console.error("Fetch error:", JSON.stringify(err, null, 2) || err.message)
      } finally {
        setLoading(false)
      }
  }

  const handleVerify = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to verify ${studentName}? This will unlock their account and release any escrowed funds to your school.`)) return
    
    setActionLoading(studentId)
    try {
      const { error: studentError } = await supabase.from('students').update({ enrollment_status: 'Verified' }).eq('id', studentId)
      if (studentError) throw studentError

      const { error: planError } = await supabase.from('active_plans').update({ status: 'Active' }).eq('student_id', studentId)
      if (planError) throw planError

      if (schoolId) fetchStudents(schoolId) 
    } catch (err: any) {
      alert(`Verification Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRejectStudent = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to reject ${studentName}? If they have paid escrow, it will be automatically refunded.`)) return

    setActionLoading(studentId)
    try {
      const { error } = await supabase
        .from('students')
        .update({ enrollment_status: 'Rejected' })
        .eq('id', studentId)

      if (error) throw error
      
      alert('Student rejected. If escrow was paid, the refund has been triggered automatically.')
      if (schoolId) fetchStudents(schoolId) 
    } catch (err: any) {
      alert(`Rejection Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleWithdraw = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to mark ${studentName} as Withdrawn?`)) return
    setActionLoading(studentId)
    try {
      const { error } = await supabase.from('students').update({ enrollment_status: 'Withdrawn', withdrawal_date: new Date().toISOString().split('T')[0] }).eq('id', studentId)
      if (error) throw error
      if (schoolId) fetchStudents(schoolId) 
    } catch (err: any) { 
      alert(`Withdrawal Error: ${err.message}`) 
    } finally { 
      setActionLoading(null) 
    }
  }

  const filteredStudents = students.filter(s => s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading || !targetSchool) return <div className="p-10 text-center text-sm font-bold text-[#0a1128] uppercase tracking-widest h-full animate-pulse flex items-center justify-center">Loading Roster...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Student Verification</h1>
          <p className="text-gray-500 text-xs sm:text-sm">Verify enrollments to claim Escrow funds.</p>
        </div>
        <input 
          type="text" placeholder="Search roster..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-64 text-gray-900 shadow-sm transition-all"
        />
      </div>

      <div className="bg-white md:rounded-2xl border-y md:border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500">
              <tr>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Student Details</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Parent Escrow Status</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">School Status</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-sm font-medium">No students found.</td></tr>
              ) : (
                filteredStudents.map((student) => {
                  const plan = student.active_plans?.[0]
                  const status = student.enrollment_status
                  
                  // ESCROW LOGIC CHECK
                  const hasPaidEscrow = plan && Number(plan.amount_paid) > 0
                  const escrowClaimAmount = hasPaidEscrow ? (Number(plan.total_fee) / 1.05) * 0.80 : 0

                  return (
                    <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${status === 'Pending Verification' && hasPaidEscrow ? 'bg-blue-50/30' : ''}`}>
                      <td className="p-4">
                        <p className="font-bold text-gray-900 text-sm">{student.full_name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{student.student_class}</p>
                      </td>
                      <td className="p-4">
                        {status === 'Pending Verification' ? (
                          hasPaidEscrow ? (
                            <div className="flex items-center gap-1.5 text-blue-700 font-bold text-xs">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              Funded Escrow
                            </div>
                          ) : (
                            <span className="text-orange-600 font-medium text-xs">Awaiting Parent Payment</span>
                          )
                        ) : (
                          <span className="text-gray-400 font-medium text-xs">Active Ledger</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border inline-block ${
                          status === 'Pending Verification' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                          status === 'Verified' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-4">
                        {status === 'Pending Verification' && (
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => handleRejectStudent(student.id, student.full_name)}
                              disabled={actionLoading === student.id}
                              className="bg-white border border-red-200 text-red-600 px-3 py-2 rounded-xl text-xs font-bold hover:bg-red-50 shadow-sm transition-all disabled:opacity-50 active:scale-95"
                            >
                              {actionLoading === student.id ? '...' : 'Reject'}
                            </button>
                            <button 
                              onClick={() => handleVerify(student.id, student.full_name)}
                              disabled={actionLoading === student.id}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 active:scale-95 ${
                                hasPaidEscrow 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 border border-blue-700 shadow-blue-600/20' 
                                  : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50'
                              }`}
                            >
                              {actionLoading === student.id ? 'Processing...' : hasPaidEscrow ? `Claim ₦${escrowClaimAmount.toLocaleString()}` : 'Verify Student'}
                            </button>
                          </div>
                        )}
                        {status === 'Verified' && (
                          <div className="flex justify-end">
                            <button onClick={() => handleWithdraw(student.id, student.full_name)} className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 shadow-sm active:scale-95 transition-all">Mark Withdrawn</button>
                          </div>
                        )}
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