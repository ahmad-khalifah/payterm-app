'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState<any[]>([])
  
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null) // NEW: UUID state
  const [isInitializing, setIsInitializing] = useState(true)

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
          setSchoolId(user.id) // NEW: Store UUID for database queries
        }
      } catch (err) {
        console.error("Auth Error:", err)
      } finally {
        setIsInitializing(false)
      }
    }
    initializePage()
  }, [])

  useEffect(() => {
    if (!schoolId) return

    const fetchReportData = async () => {
      const { data, error } = await supabase
        .from('students')
        .select(`
          full_name, student_class, enrollment_status,
          parents ( full_name, phone ),
          active_plans ( total_fee, amount_paid, status, next_payment_date )
        `)
        .eq('school_id', schoolId) // FIX: Query by UUID, not text name
      
      if (error) console.error("Report Fetch Error:", error.message)
      if (data) setStudents(data)
      setLoading(false)
    }
    fetchReportData()
  }, [schoolId])

  const downloadCSV = () => {
    // Enhanced CSV headers to include vital Parent Contact info
    const headers = ["Student Name", "Class", "Parent Name", "Parent Phone", "Total Fee", "Amount Paid", "Outstanding 40% Balance", "Status", "Due Date"]
    
    const rows = students.map(s => {
      const plan = s.active_plans[0]
      // Safely extract parent data whether it's an object or array
      const parentData = Array.isArray(s.parents) ? s.parents[0] : s.parents
      const outstanding = plan ? (Number(plan.total_fee) - Number(plan.amount_paid)) : 0

      return [
        s.full_name,
        s.student_class,
        parentData?.full_name || 'N/A',
        parentData?.phone || 'N/A',
        plan?.total_fee || 0,
        plan?.amount_paid || 0,
        outstanding,
        plan?.status || 'N/A',
        plan?.next_payment_date || 'N/A'
      ]
    })

    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n")

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `PayTerm_Arrears_Report_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
  }

  if (isInitializing || loading) return (
    <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-full flex items-center justify-center animate-pulse">
      Compiling secure reports...
    </div>
  )

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in">
      <div className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] mb-2 tracking-tight">Reports & Monitoring</h1>
          <p className="text-gray-500 text-sm sm:text-base">Monitor parent collections and export arrears data.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={downloadCSV}
            className="bg-white border border-gray-200 text-[#0a1128] px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50 flex items-center gap-2 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Export Full CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-[#0a1128] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#15234b] flex items-center gap-2 transition-all shadow-sm"
          >
             <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            Print Ledger
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-lg font-bold text-[#0a1128]">Mid-Term Balance Monitor</h3>
          </div>
          <div className="overflow-x-auto">
            {students.length === 0 ? (
              <div className="p-10 text-center font-medium text-gray-500">No active student plans found.</div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white border-b border-gray-200 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                  <tr>
                    <th className="p-5">Student / Parent</th>
                    <th className="p-5">Class</th>
                    <th className="p-5">Plan Status</th>
                    <th className="p-5">Due Date</th>
                    <th className="p-5 text-right">Outstanding 40%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((student, idx) => {
                    const plan = student.active_plans[0]
                    const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents
                    const isLate = plan?.status === 'Late' || plan?.status === 'Default'
                    const outstanding = plan ? (Number(plan.total_fee) - Number(plan.amount_paid)) : 0

                    return (
                      <tr key={idx} className={`hover:bg-gray-50 transition-colors ${isLate ? 'bg-red-50/20' : ''}`}>
                        <td className="p-5">
                          <p className="font-bold text-[#0a1128]">{student.full_name}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Parent: {parentData?.full_name || 'N/A'} • {parentData?.phone || 'No Phone'}</p>
                        </td>
                        <td className="p-5 text-gray-600 font-medium">{student.student_class}</td>
                        <td className="p-5">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                            plan?.status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                            isLate ? 'bg-red-50 text-red-700 border-red-100' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}>
                            {plan?.status || 'No Plan'}
                          </span>
                        </td>
                        <td className="p-5 text-gray-600 font-medium">
                          {plan?.next_payment_date ? new Date(plan.next_payment_date).toLocaleDateString('en-GB') : 'N/A'}
                        </td>
                        <td className="p-5 text-right font-mono font-bold text-[#0a1128] text-base">
                          ₦{outstanding.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}