'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function AddStudentPage() {
  const router = useRouter()
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [schools, setSchools] = useState<any[]>([])
  const [availableClasses, setAvailableClasses] = useState<any[]>([])

  const [form, setForm] = useState({
    fullName: '',
    schoolName: '',
    session: '',
    term: '',
    className: ''
  })

  // 1. Fetch all ACTIVE partner schools
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('partner_schools')
          .select('id, name') 
          .eq('status', 'Active')
          .order('name', { ascending: true })

        if (error) throw error
        if (data) setSchools(data)
      } catch (err: any) {
        console.error("Error fetching schools:", err.message)
      } finally {
        setLoadingSchools(false)
      }
    }
    fetchSchools()
  }, [])

  // 2. Fetch specific classes based on School + Session + Term
  useEffect(() => {
    if (!form.schoolName || !form.session || !form.term) {
      setAvailableClasses([])
      return
    }

    const fetchClasses = async () => {
      setLoadingClasses(true)
      try {
        const { data, error } = await supabase
          .from('class_fees')
          .select('class_name, parent_total_fee, mid_term_date') 
          .eq('school_name', form.schoolName)
          .eq('academic_session', form.session)
          .eq('term', form.term)
          .order('class_name', { ascending: true })

        if (error) throw error
        if (data) setAvailableClasses(data)
        
        setForm(prev => ({ ...prev, className: '' }))
      } catch (err: any) {
        console.error("Error fetching classes:", err.message)
      } finally {
        setLoadingClasses(false)
      }
    }

    fetchClasses()
  }, [form.schoolName, form.session, form.term])

  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in.")

      const selectedFeeConfig = availableClasses.find(c => c.class_name === form.className)
      if (!selectedFeeConfig) throw new Error("Invalid class selection.")

      const selectedSchool = schools.find(s => s.name === form.schoolName)
      if (!selectedSchool || !selectedSchool.id) throw new Error("Could not verify the internal School ID.")

      // 1. Insert the Student Profile
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
          parent_id: user.id,
          school_id: selectedSchool.id,
          full_name: form.fullName,
          student_class: form.className,
          enrollment_status: 'Pending Verification'
        })
        .select()
        .single()

      if (studentError) throw studentError

      // 2. Generate the 60/40 Financial Plan
      const uniqueCode = `PT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      const { error: planError } = await supabase
        .from('active_plans')
        .insert({
          student_id: studentData.id,
          parent_id: user.id,
          school_id: selectedSchool.id,
          total_fee: selectedFeeConfig.parent_total_fee,
          amount_paid: 0,
          next_payment_date: selectedFeeConfig.mid_term_date || null,
          status: 'Pending Verification',
          clearance_code: uniqueCode,
          mid_term_cleared: false, 
          payterm_advance: 0
        })

      if (planError) throw planError

      alert("Student profile generated! Redirecting to your dashboard to fund the 60% Escrow downpayment.")
      router.push('/parent') 

    } catch (err: any) {
      alert(`Error linking student: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeClassData = availableClasses.find(c => c.class_name === form.className)

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-3xl mx-auto animate-in fade-in pb-24">
      
      {/* HEADER WITH BACK BUTTON */}
      <div className="mb-8">
        <Link href="/parent" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#0a1128] transition-colors mb-6 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-[#0a1128] mb-2 tracking-tight">Link a Student</h1>
        <p className="text-gray-500 text-sm">Securely connect your child to a partner institution and generate their custom 60/40 financing plan.</p>
      </div>

      {/* MAIN FORM CARD */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
        <form onSubmit={handleLinkStudent}>
          
          {/* SECTION 1: Personal Details */}
          <div className="p-6 sm:p-8 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-sm font-bold text-[#0a1128] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">1</span>
              Personal Details
            </h2>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Student's Full Name</label>
              <input 
                required 
                type="text" 
                placeholder="First and Last Name"
                value={form.fullName} 
                onChange={e => setForm({...form, fullName: e.target.value})} 
                className="w-full bg-white border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-[#0a1128] font-medium shadow-sm transition-all"
              />
            </div>
          </div>

          {/* SECTION 2: Institutional Routing */}
          <div className="p-6 sm:p-8 border-b border-gray-100">
            <h2 className="text-sm font-bold text-[#0a1128] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">2</span>
              Institution
            </h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Select Partner School</label>
                  {loadingSchools && <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider animate-pulse bg-blue-50 px-2 py-1 rounded">Loading Network...</span>}
                </div>
                <select 
                  required 
                  value={form.schoolName} 
                  onChange={e => setForm({...form, schoolName: e.target.value, className: ''})} 
                  className="w-full border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-[#0a1128] font-bold shadow-sm transition-all disabled:opacity-50"
                  disabled={loadingSchools}
                >
                  <option value="" disabled>-- Select verified institution --</option>
                  {schools.map((school, idx) => (
                    <option key={idx} value={school.name}>{school.name}</option>
                  ))}
                </select>
              </div>

              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-300 ${!form.schoolName ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Academic Session</label>
                  <select 
                    required 
                    value={form.session} 
                    onChange={e => setForm({...form, session: e.target.value})} 
                    className="w-full border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-[#0a1128] font-bold shadow-sm transition-all"
                    disabled={!form.schoolName}
                  >
                    <option value="" disabled>-- Session --</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                    <option value="2026/2027">2026/2027</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Term</label>
                  <select 
                    required 
                    value={form.term} 
                    onChange={e => setForm({...form, term: e.target.value})} 
                    className="w-full border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-[#0a1128] font-bold shadow-sm transition-all"
                    disabled={!form.schoolName}
                  >
                    <option value="" disabled>-- Term --</option>
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: Financial Configuration */}
          <div className={`p-6 sm:p-8 bg-blue-50/30 transition-all duration-300 ${!form.schoolName || !form.session || !form.term ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
            <h2 className="text-sm font-bold text-[#0a1128] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs">3</span>
              Class & Fee Selection
            </h2>
            
            {form.schoolName && form.session && form.term && availableClasses.length === 0 && !loadingClasses ? (
              <div className="p-5 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm font-bold flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 text-orange-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                This school has not locked in any fee configurations for the selected term. Please adjust the timeline or contact the administrator.
              </div>
            ) : (
              <div className="space-y-6">
                <select 
                  required 
                  value={form.className} 
                  onChange={e => setForm({...form, className: e.target.value})} 
                  className="w-full border border-blue-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white text-[#0a1128] font-bold shadow-sm transition-all"
                  disabled={loadingClasses || availableClasses.length === 0}
                >
                  <option value="" disabled>
                    {loadingClasses ? 'Synchronizing school fees...' : '-- Select student class --'}
                  </option>
                  {availableClasses.map((cls, idx) => (
                    <option key={idx} value={cls.class_name}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>

                {/* DYNAMIC FEE PREVIEW */}
                {activeClassData && (
                  <div className="bg-white p-5 rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Plan Overview</p>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-sm text-gray-600 mb-1">Total Verified Invoice</p>
                        <p className="text-2xl font-bold font-mono text-[#0a1128]">₦{Number(activeClassData.parent_total_fee).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600 mb-1">Required Today (60%)</p>
                        <p className="text-lg font-bold font-mono text-blue-600">₦{(Number(activeClassData.parent_total_fee) * 0.6).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FOOTER ACTIONS */}
          <div className="p-6 sm:p-8 border-t border-gray-100 bg-white flex justify-end">
            <button 
              type="submit" 
              disabled={isSubmitting || !form.schoolName || !form.session || !form.term || !form.className} 
              className="w-full sm:w-auto bg-[#0a1128] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#15234b] disabled:bg-gray-300 disabled:text-gray-500 transition-all shadow-sm text-sm flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Generating Secure Plan...
                </>
              ) : (
                'Generate 60/40 Plan & Proceed'
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}