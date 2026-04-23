'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function StudentsPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null) // NEW: Store the UUID

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
          setSchoolId(user.id) // Save the UUID
          fetchStudents(user.id) // Pass the UUID instead of the text name
        }
      } catch (err) {
        console.error("Auth Error:", err)
      }
    }
    initializePage()
  }, [])

  // UPDATED: Now expects the UUID, not the name
  const fetchStudents = async (idToFetch: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, full_name, student_class, enrollment_status, withdrawal_date,
          active_plans ( total_fee, amount_paid, status )
        `)
        .eq('school_id', idToFetch) // Filters perfectly by UUID now
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setStudents(data)
      } catch (err: any) {
        console.error("Fetch error:", JSON.stringify(err, null, 2) || err.message)
      } finally {
        setLoading(false)
      }
  }

  // UPDATED VERIFY FUNCTION: Approves student AND unlocks plan
  const handleVerify = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to verify ${studentName}? This will unlock their account and release any escrowed funds to your school.`)) return
    
    setActionLoading(studentId)
    try {
      const { error: studentError } = await supabase.from('students').update({ enrollment_status: 'Verified' }).eq('id', studentId)
      if (studentError) throw studentError

      const { error: planError } = await supabase.from('active_plans').update({ status: 'Active' }).eq('student_id', studentId)
      if (planError) throw planError

      if (schoolId) fetchStudents(schoolId) // Refresh using UUID
    } catch (err: any) {
      alert(`Verification Error: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  // NEW REJECT FUNCTION: Declines student and triggers database refund
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
      if (schoolId) fetchStudents(schoolId) // Refresh using UUID
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
      if (schoolId) fetchStudents(schoolId) // Refresh using UUID
    } catch (err: any) { alert(`Withdrawal Error: ${err.message}`) } finally { setActionLoading(null) }
  }

  const filteredStudents = students.filter(s => s.full_name.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading || !targetSchool) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-full animate-pulse flex items-center justify-center">Loading Secure Roster...</div>

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in">
      <div className="mb-8 md:mb-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] mb-2 tracking-tight">Student Verification</h1>
          <p className="text-gray-500 text-sm sm:text-base">Verify enrollments to claim Escrow funds and unlock parent portals.</p>
        </div>
        <input 
          type="text" placeholder="Search roster..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-64 text-[#0a1128] shadow-sm"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-gray-50/50 border-b border-gray-200 text-[#0a1128]">
              <tr>
                <th className="p-5 font-bold uppercase tracking-wide text-xs">Student Details</th>
                <th className="p-5 font-bold uppercase tracking-wide text-xs">Parent Escrow Status</th>
                <th className="p-5 font-bold uppercase tracking-wide text-xs">School Status</th>
                <th className="p-5 font-bold uppercase tracking-wide text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="p-12 text-center text-gray-500 font-medium">No students found.</td></tr>
              ) : (
                filteredStudents.map((student) => {
                  const plan = student.active_plans[0]
                  const status = student.enrollment_status
                  
                  // ESCROW LOGIC CHECK
                  const hasPaidEscrow = plan && Number(plan.amount_paid) > 0
                  const escrowClaimAmount = hasPaidEscrow ? (Number(plan.total_fee) / 1.05) * 0.80 : 0

                  return (
                    <tr key={student.id} className={`hover:bg-gray-50 transition-colors ${status === 'Pending Verification' && hasPaidEscrow ? 'bg-blue-50/20' : ''}`}>
                      <td className="p-5">
                        <p className="font-bold text-[#0a1128] text-sm">{student.full_name}</p>
                        <p className="text-xs text-gray-500 mt-0.5 font-medium">{student.student_class}</p>
                      </td>
                      <td className="p-5">
                        {status === 'Pending Verification' ? (
                          hasPaidEscrow ? (
                            <div className="flex items-center gap-2 text-blue-700 font-bold text-xs">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                              Parent Funded Escrow
                            </div>
                          ) : (
                            <span className="text-orange-600 font-medium text-xs">Awaiting Parent Payment</span>
                          )
                        ) : (
                          <span className="text-gray-400 font-medium text-xs">Active Ledger</span>
                        )}
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          status === 'Pending Verification' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                          status === 'Verified' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-5">
                        {status === 'Pending Verification' && (
                          <div className="flex items-center justify-end gap-3">
                            <button 
                              onClick={() => handleRejectStudent(student.id, student.full_name)}
                              disabled={actionLoading === student.id}
                              className="bg-white border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 shadow-sm transition-all disabled:opacity-50"
                            >
                              {actionLoading === student.id ? '...' : 'Reject'}
                            </button>
                            <button 
                              onClick={() => handleVerify(student.id, student.full_name)}
                              disabled={actionLoading === student.id}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 ${
                                hasPaidEscrow 
                                  ? 'bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-600 animate-pulse' 
                                  : 'bg-white border border-gray-300 text-[#0a1128] hover:bg-gray-50'
                              }`}
                            >
                              {actionLoading === student.id ? 'Processing...' : hasPaidEscrow ? `Verify & Claim ₦${escrowClaimAmount.toLocaleString()}` : 'Verify Student'}
                            </button>
                          </div>
                        )}
                        {status === 'Verified' && (
                          <div className="flex justify-end">
                            <button onClick={() => handleWithdraw(student.id, student.full_name)} className="bg-white border border-red-200 text-red-600 px-5 py-2 rounded-lg text-xs font-bold hover:bg-red-50 shadow-sm">Mark Withdrawn</button>
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