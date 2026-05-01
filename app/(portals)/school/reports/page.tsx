'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
// --- NEW LUCIDE ICONS ---
import { 
  BarChart3, Download, Printer, FileSearch, User, 
  Phone, GraduationCap, CheckCircle2, AlertCircle, Clock 
} from 'lucide-react'

export default function ReportsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) // Session lock
  const [students, setStudents] = useState<any[]>([])
  
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null) 

  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          router.push('/school-login')
          return
        }

        const { data: schoolProfile, error: profileError } = await supabase
          .from('partner_schools')
          .select('name')
          .eq('id', user.id)
          .single()

        if (profileError || !schoolProfile) {
          router.push('/school-login')
          return
        }

        if (isMounted) {
          setTargetSchool(schoolProfile.name)
          setSchoolId(user.id) 
        }
      } catch (err) {
        console.error("Auth Error:", err)
        toast.error("Could not authenticate session.")
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }
    
    initializePage()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/school-login')
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router])

  useEffect(() => {
    if (!schoolId) return
    let isMounted = true

    const fetchReportData = async () => {
      try {
        const { data, error } = await supabase
          .from('students')
          .select(`
            full_name, student_class, enrollment_status,
            parents ( full_name, phone ),
            active_plans ( total_fee, amount_paid, status, next_payment_date )
          `)
          .eq('school_id', schoolId) 
        
        if (error) throw error
        if (isMounted && data) setStudents(data)
      } catch (err: any) {
        console.error("Report Fetch Error:", err.message)
        toast.error("Failed to load report data.")
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    
    fetchReportData()
    useRealtimeSync(() => fetchReportData())
    return () => {
      isMounted = false
    }
  }, [schoolId])

  const downloadCSV = () => {
    try {
      const headers = ["Student Name", "Class", "Parent Name", "Parent Phone", "Total Fee", "Amount Paid", "Outstanding 40% Balance", "Status", "Due Date"]
      
      const rows = students.map(s => {
        const plan = s.active_plans[0]
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
      link.remove()
      
      toast.success("Report downloaded successfully!")
      useRealtimeSync(() => downloadCSV())
    } catch (err) {
      toast.error("Failed to generate CSV export.")
    }
  }

  if (isInitializing || loading) return (
    <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-screen flex items-center justify-center animate-pulse">
      Compiling secure reports...
    </div>
  )

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="mb-8 md:mb-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0a1128] mb-2 tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Reports & Monitoring
          </h1>
          <p className="text-gray-500 font-medium text-sm">Monitor parent collections and export arrears data for <strong className="text-[#0a1128]">{targetSchool}</strong>.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={downloadCSV}
            className="bg-white border border-gray-200 text-[#0a1128] px-6 py-3 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-300 flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95"
          >
            <Download className="w-4 h-4 text-blue-600" />
            Export Full CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="bg-[#0a1128] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-blue-600 flex items-center justify-center gap-2 transition-all shadow-sm shadow-[#0a1128]/10 active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Print Ledger
          </button>
        </div>
      </div>

      {/* REPORT TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden print:border-none print:shadow-none relative">
        <div className="p-6 border-b border-gray-100 bg-white print:border-b-2 print:border-gray-900">
          <h3 className="text-lg font-bold text-[#0a1128] print:text-xl">Mid-Term Balance Monitor</h3>
          <p className="text-xs text-gray-500 mt-1 font-medium hidden print:block">Generated on: {new Date().toLocaleDateString()}</p>
        </div>
        
        <div className="overflow-x-auto">
          {students.length === 0 ? (
            <div className="p-16 text-center flex flex-col items-center justify-center h-full">
              <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
                <FileSearch className="w-8 h-8" />
              </div>
              <p className="text-[#0a1128] font-bold text-lg mb-1">No active student plans found.</p>
              <p className="text-sm text-gray-500 font-medium">When parents enroll their children, their payment data will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold print:bg-gray-100 print:text-black">
                <tr>
                  <th className="p-5">Student / Parent</th>
                  <th className="p-5">Enrolled Class</th>
                  <th className="p-5">Plan Status</th>
                  <th className="p-5">Due Date</th>
                  <th className="p-5 text-right">Outstanding 40%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 print:divide-gray-300">
                {students.map((student, idx) => {
                  const plan = student.active_plans[0]
                  const parentData = Array.isArray(student.parents) ? student.parents[0] : student.parents
                  const isLate = plan?.status === 'Late' || plan?.status === 'Default'
                  const outstanding = plan ? (Number(plan.total_fee) - Number(plan.amount_paid)) : 0

                  return (
                    <tr key={idx} className={`hover:bg-gray-50/50 transition-colors group ${isLate ? 'bg-red-50/20' : ''}`}>
                      <td className="p-5 align-top">
                        <div className="flex items-center gap-2 mb-1.5">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <p className="font-extrabold text-[#0a1128] text-sm print:text-black">{student.full_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <p className="text-xs text-gray-500 font-mono print:text-gray-700">
                            {parentData?.full_name || 'N/A'} • {parentData?.phone || 'No Phone'}
                          </p>
                        </div>
                      </td>
                      
                      <td className="p-5 align-top">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 print:text-black">
                          <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                          {student.student_class}
                        </span>
                      </td>
                      
                      <td className="p-5 align-top">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                          plan?.status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200 print:border-none print:p-0 print:bg-transparent print:text-black' : 
                          isLate ? 'bg-red-50 text-red-700 border-red-200 print:border-none print:p-0 print:bg-transparent print:text-black' :
                          'bg-gray-50 text-gray-700 border-gray-200 print:border-none print:p-0 print:bg-transparent print:text-black'
                        }`}>
                          {plan?.status === 'Active' && <CheckCircle2 className="w-3 h-3" />}
                          {isLate && <AlertCircle className="w-3 h-3" />}
                          {!plan?.status && <Clock className="w-3 h-3" />}
                          {plan?.status || 'No Plan'}
                        </span>
                      </td>
                      
                      <td className="p-5 text-xs font-bold text-orange-600 align-top">
                        {plan?.next_payment_date ? new Date(plan.next_payment_date).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      
                      <td className="p-5 text-right font-mono font-black text-[#0a1128] text-base tracking-tight align-top print:text-black">
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
  )
}