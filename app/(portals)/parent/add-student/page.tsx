'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'

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

  // 1. Fetch all ACTIVE partner schools AND their Mid-Term Dates
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('partner_schools')
          .select('id, name') // <-- NEW: Pulling the anchor date for the 40% balance
          .eq('status', 'Active')
          .order('name', { ascending: true })

        if (error) throw error
        if (data) setSchools(data)
      } catch (err: any) {
        console.error("Error fetching schools:", JSON.stringify(err, null, 2) || err.message)
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
          .select('class_name, parent_total_fee, mid_term_date') // <-- We added mid_term_date here
          .eq('school_name', form.schoolName)
          .eq('academic_session', form.session)
          .eq('term', form.term)
          .order('class_name', { ascending: true })

        if (error) throw error
        if (data) setAvailableClasses(data)
        
        setForm(prev => ({ ...prev, className: '' }))
      } catch (err: any) {
        console.error("Error fetching classes:", JSON.stringify(err, null, 2) || err.message)
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
          next_payment_date: selectedFeeConfig.mid_term_date || null, // <-- LOCKED to Mid-Term
          status: 'Pending Verification',
          clearance_code: uniqueCode,
          mid_term_cleared: false, // <-- Prepping the lending architecture
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

  return (
    <div className="p-6 md:p-10 max-w-3xl mx-auto animate-in fade-in">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] mb-2 tracking-tight">Link a Student</h1>
        <p className="text-gray-500 text-sm sm:text-base">Connect your child to a partner school, select the enrollment period, and fund their 60% Day 1 requirement.</p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
        <form onSubmit={handleLinkStudent} className="space-y-6">
          
          <div>
            <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2.5">
              Student's Full Name
            </label>
            <input 
              required 
              type="text" 
              placeholder="First and Last Name"
              value={form.fullName} 
              onChange={e => setForm({...form, fullName: e.target.value})} 
              className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] font-medium shadow-sm transition-all"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2.5">
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide">
                Select Partner School
              </label>
              {loadingSchools && <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider animate-pulse">Loading...</span>}
            </div>
            <select 
              required 
              value={form.schoolName} 
              onChange={e => setForm({...form, schoolName: e.target.value})} 
              className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white text-[#0a1128] font-bold appearance-none shadow-sm transition-all disabled:bg-gray-50"
              disabled={loadingSchools}
            >
              <option value="" disabled>-- Select an institution --</option>
              {schools.map((school, idx) => (
                <option key={idx} value={school.name}>{school.name}</option>
              ))}
            </select>
          </div>

          <div className={`grid grid-cols-2 gap-4 transition-all duration-300 ${!form.schoolName ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2.5">
                Academic Session
              </label>
              <select 
                required 
                value={form.session} 
                onChange={e => setForm({...form, session: e.target.value})} 
                className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white text-[#0a1128] font-bold appearance-none shadow-sm transition-all"
                disabled={!form.schoolName}
              >
                <option value="" disabled>-- Session --</option>
                <option value="2024/2025">2024/2025</option>
                <option value="2025/2026">2025/2026</option>
                <option value="2026/2027">2026/2027</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2.5">
                Term
              </label>
              <select 
                required 
                value={form.term} 
                onChange={e => setForm({...form, term: e.target.value})} 
                className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white text-[#0a1128] font-bold appearance-none shadow-sm transition-all"
                disabled={!form.schoolName}
              >
                <option value="" disabled>-- Term --</option>
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          </div>

          <div className={`transition-all duration-300 ${!form.schoolName || !form.session || !form.term ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex justify-between items-center mb-2.5">
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide">
                Enrolled Class
              </label>
            </div>
            
            {form.schoolName && form.session && form.term && availableClasses.length === 0 && !loadingClasses ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm font-bold">
                This school has not locked in any fees for the selected term. Please try another term or contact the administrator.
              </div>
            ) : (
              <select 
                required 
                value={form.className} 
                onChange={e => setForm({...form, className: e.target.value})} 
                className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white text-[#0a1128] font-bold appearance-none shadow-sm transition-all disabled:bg-gray-50"
                disabled={!form.schoolName || !form.session || !form.term || loadingClasses || availableClasses.length === 0}
              >
                <option value="" disabled>
                  {loadingClasses ? 'Fetching fees...' : '-- Select specific class --'}
                </option>
                {availableClasses.map((cls, idx) => (
                  <option key={idx} value={cls.class_name}>
                    {cls.class_name} (Plan: ₦{Number(cls.parent_total_fee).toLocaleString()})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            <button 
              type="submit" 
              disabled={isSubmitting || !form.schoolName || !form.session || !form.term || !form.className} 
              className="w-full bg-blue-600 text-white px-5 py-3.5 rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm text-sm"
            >
              {isSubmitting ? 'Generating Secure Plan...' : 'Generate 60/40 Plan & Proceed'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}