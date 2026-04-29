'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

export default function StudentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  
  // NEW: Class filter state
  const [classFilter, setClassFilter] = useState<string>('All')

  const fetchStudents = async (idToFetch: string) => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select(`
          id, full_name, student_class, enrollment_status, withdrawal_date, created_at
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

  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      try {
        // 1. Fast Check: Reads local storage
        const { data: { session } } = await supabase.auth.getSession()
        let activeUserId = session?.user?.id

        // 2. Secure Safety Net: Ping server
        if (!activeUserId) {
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (userError || !user) {
            window.location.href = '/school-login'
            return
          }
          activeUserId = user.id
        }

        // 3. Graceful Database Fetch
        const { data: schoolProfile, error: profileError } = await supabase
          .from('partner_schools')
          .select('name')
          .eq('id', activeUserId)
          .maybeSingle()

        if (profileError) throw profileError

        if (!schoolProfile) {
          window.location.href = '/school-login'
          return
        }

        if (isMounted) {
          setTargetSchool(schoolProfile.name)
          setSchoolId(activeUserId)
          fetchStudents(activeUserId)
        }
      } catch (err) {
        console.error("Auth Error:", err)
        if (isMounted) setLoading(false)
      }
    }

    initializePage()

    // 4. Tab-Switching Security
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          window.location.href = '/school-login'
        }
      }
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router])

  const handleWithdraw = async (studentId: string, studentName: string) => {
    if (!window.confirm(`Are you sure you want to mark ${studentName} as Withdrawn? They will no longer appear on active payment ledgers.`)) return
    
    setActionLoading(studentId)
    try {
      const { error } = await supabase
        .from('students')
        .update({ 
          enrollment_status: 'Withdrawn', 
          withdrawal_date: new Date().toISOString().split('T')[0] 
        })
        .eq('id', studentId)
        
      if (error) throw error
      
      await supabase
        .from('active_plans')
        .update({ status: 'Withdrawn' })
        .eq('student_id', studentId)

      if (schoolId) fetchStudents(schoolId) 
    } catch (err: any) { 
      alert(`Withdrawal Error: ${err.message}`) 
    } finally { 
      setActionLoading(null) 
    }
  }

  // Filter Logic: Includes both text search and dropdown class selection
  const uniqueClasses = Array.from(new Set(students.map(s => s.student_class).filter(Boolean))).sort()
  
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClass = classFilter === 'All' || s.student_class === classFilter
    return matchesSearch && matchesClass
  })

  if (loading || !targetSchool) return <div className="p-10 text-center text-sm font-bold text-[#0a1128] uppercase tracking-widest h-screen animate-pulse flex items-center justify-center">Loading Roster...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER SECTION - Hidden on Print */}
      <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0a1128] mb-1 tracking-tight">Student Roster</h1>
          <p className="text-gray-500 text-xs sm:text-sm">Manage enrolled students across your institution.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row w-full md:w-auto items-center gap-3">
          <input 
            type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600 w-full sm:w-56 text-[#0a1128] shadow-sm transition-all font-medium"
          />
          
          <select 
            value={classFilter} 
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full sm:w-auto bg-white border border-gray-300 text-sm rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-600 font-medium text-gray-700 shadow-sm"
          >
            <option value="All">All Classes</option>
            {uniqueClasses.map(c => (
              <option key={c as string} value={c as string}>{c as string}</option>
            ))}
          </select>
          
          <button 
            onClick={() => window.print()}
            className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors flex justify-center items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print
          </button>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white md:rounded-2xl border-y md:border border-gray-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
        
        <div className="bg-gray-50/50 p-4 sm:p-5 border-b border-gray-200 flex justify-between items-center print:bg-white print:border-b-2 print:border-gray-900 print:mb-4">
          <div>
            <h2 className="text-base font-bold text-[#0a1128] print:text-xl">{targetSchool} - Registered Directory</h2>
            <p className="hidden print:block text-xs text-gray-500 mt-1">
              Generated on: {new Date().toLocaleDateString()} | Filter: {classFilter}
            </p>
          </div>
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm print:hidden">
            {filteredStudents.length} Students
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500 print:bg-gray-100 print:text-black">
              <tr>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Student Details</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Enrollment Date</th>
                <th className="p-4 font-bold uppercase tracking-wider text-[10px]">Status</th>
                {/* Hide Actions Column on Print */}
                <th className="p-4 font-bold uppercase tracking-wider text-[10px] text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 print:divide-gray-300">
              {filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="p-8 text-center text-gray-500 text-sm font-medium">No students found.</td></tr>
              ) : (
                filteredStudents.map((student) => {
                  const status = student.enrollment_status === 'Pending Verification' ? 'Active' : student.enrollment_status 
                  
                  return (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-[#0a1128] text-sm print:text-black">{student.full_name}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5 font-medium print:text-gray-700">{student.student_class}</p>
                      </td>
                      <td className="p-4">
                        <span className="text-gray-600 font-medium text-xs print:text-black">
                          {new Date(student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border inline-block ${
                          status === 'Active' || status === 'Verified' 
                            ? 'bg-green-50 text-green-700 border-green-200 print:border-none print:p-0 print:bg-transparent print:text-black' 
                            : 'bg-red-50 text-red-700 border-red-200 print:border-none print:p-0 print:bg-transparent print:text-black'
                        }`}>
                          {status === 'Pending Verification' ? 'Active' : status}
                        </span>
                      </td>
                      {/* Hide Actions Column on Print */}
                      <td className="p-4 text-right print:hidden">
                        {(status === 'Active' || status === 'Verified') ? (
                          <button 
                            onClick={() => handleWithdraw(student.id, student.full_name)}
                            disabled={actionLoading === student.id}
                            className="bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-gray-50 shadow-sm active:scale-95 transition-all disabled:opacity-50"
                          >
                            {actionLoading === student.id ? 'Processing...' : 'Mark Withdrawn'}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400 font-medium italic">
                            Left {new Date(student.withdrawal_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                          </span>
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