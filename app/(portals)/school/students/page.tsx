'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

// --- NEW LUCIDE ICONS ---
import { 
  Users, Search, Filter, Printer, GraduationCap, 
  CalendarDays, CheckCircle2, XCircle, UserMinus, 
  ChevronDown, FileSearch 
} from 'lucide-react'

export default function StudentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  
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
        const { data: { session } } = await supabase.auth.getSession()
        let activeUserId = session?.user?.id

        if (!activeUserId) {
          const { data: { user }, error: userError } = await supabase.auth.getUser()
          if (userError || !user) {
            window.location.href = '/school-login'
            return
          }
          activeUserId = user.id
        }

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

  const uniqueClasses = Array.from(new Set(students.map(s => s.student_class).filter(Boolean))).sort()
  
  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesClass = classFilter === 'All' || s.student_class === classFilter
    return matchesSearch && matchesClass
  })

  if (loading || !targetSchool) return <div className="p-10 text-center text-sm font-bold text-[#0a1128] uppercase tracking-widest h-screen animate-pulse flex items-center justify-center">Loading Roster...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20 relative">
      
      {/* HEADER SECTION - Hidden on Print */}
      <div className="mb-8 flex flex-col xl:flex-row justify-between xl:items-end gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Student Roster
          </h1>
          <p className="text-gray-500 font-medium text-sm">Manage enrolled students across your institution.</p>
        </div>
      </div>

      {/* TABLE CONTAINER */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden print:border-none print:shadow-none relative">
        
        {/* CONTROL BAR */}
        <div className="bg-white p-5 md:p-6 border-b border-gray-100 flex flex-col lg:flex-row justify-between lg:items-center gap-4 print:border-b-2 print:border-gray-900 print:mb-4">
          <div>
            <h2 className="text-lg font-bold text-[#0a1128] print:text-xl">{targetSchool} Directory</h2>
            <p className="hidden print:block text-xs text-gray-500 mt-1">
              Generated on: {new Date().toLocaleDateString()} | Filter: {classFilter}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row w-full lg:w-auto items-center gap-3 print:hidden">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input 
                type="text" placeholder="Search students..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm text-[#0a1128] shadow-sm transition-all font-medium"
              />
            </div>
            
            {/* Class Filter */}
            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Filter className="h-4 w-4 text-gray-400" />
              </div>
              <select 
                value={classFilter} 
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm font-bold text-[#0a1128] transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="All">All Classes</option>
                {uniqueClasses.map(c => (
                  <option key={c as string} value={c as string}>{c as string}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            
            {/* Print Button */}
            <button 
              onClick={() => window.print()}
              className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-gray-50 hover:text-[#0a1128] transition-all active:scale-95 flex justify-center items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold print:bg-gray-100 print:text-black">
              <tr>
                <th className="p-5">Student Details</th>
                <th className="p-5">Enrollment Date</th>
                <th className="p-5">Status</th>
                {/* Hide Actions Column on Print */}
                <th className="p-5 text-right print:hidden">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 print:divide-gray-300">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                      <FileSearch className="w-8 h-8" />
                    </div>
                    <p className="text-[#0a1128] font-bold text-lg mb-1">No students found.</p>
                    <p className="text-sm text-gray-500 font-medium">Adjust your search or filter criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const status = student.enrollment_status === 'Pending Verification' ? 'Active' : student.enrollment_status 
                  const isWithdrawn = status === 'Withdrawn'
                  
                  return (
                    <tr key={student.id} className={`hover:bg-gray-50/50 transition-colors group ${isWithdrawn ? 'opacity-60 bg-gray-50/30' : ''}`}>
                      <td className="p-5 align-top">
                        <p className="font-extrabold text-[#0a1128] text-sm mb-1 print:text-black">{student.full_name}</p>
                        <div className="flex items-center gap-1.5">
                          <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs text-gray-500 font-medium print:text-gray-700">{student.student_class}</p>
                        </div>
                      </td>
                      <td className="p-5 align-top">
                        <span className="inline-flex items-center gap-2 text-gray-600 font-medium text-xs print:text-black">
                          <CalendarDays className="w-3.5 h-3.5 text-gray-400" />
                          {new Date(student.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="p-5 align-top">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                          status === 'Active' || status === 'Verified' 
                            ? 'bg-green-50 text-green-700 border-green-200 print:border-none print:p-0 print:bg-transparent print:text-black' 
                            : 'bg-red-50 text-red-700 border-red-200 print:border-none print:p-0 print:bg-transparent print:text-black'
                        }`}>
                          {(status === 'Active' || status === 'Verified') ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {status === 'Pending Verification' ? 'Active' : status}
                        </span>
                      </td>
                      {/* Hide Actions Column on Print */}
                      <td className="p-5 text-right align-top print:hidden">
                        {(status === 'Active' || status === 'Verified') ? (
                          <button 
                            onClick={() => handleWithdraw(student.id, student.full_name)}
                            disabled={actionLoading === student.id}
                            className="bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-[11px] font-bold hover:border-red-200 hover:bg-red-50 hover:text-red-600 shadow-sm active:scale-95 transition-all disabled:opacity-50 inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100"
                          >
                            <UserMinus className="w-3.5 h-3.5" />
                            {actionLoading === student.id ? 'Processing...' : 'Withdraw'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium italic bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
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