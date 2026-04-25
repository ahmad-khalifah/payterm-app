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
    state: '', // NEW: Added State to form tracking
    schoolName: '',
    session: '',
    term: '',
    className: ''
  })

  // 1. Fetch all ACTIVE partner schools and their states
  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const { data, error } = await supabase
          .from('partner_schools')
          .select('id, name, state') // NEW: Fetch state column
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

      const selectedSchool = schools.find(s => s.name === form.schoolName && s.state === form.state)
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

  // NEW: Compute unique available states and filter schools dynamically
  const availableStates = Array.from(new Set(schools.map(s => s.state).filter(Boolean))).sort()
  const filteredSchools = form.state ? schools.filter(s => s.state === form.state) : []

  return (
    <div className="w-full max-w-xl mx-auto md:p-4 lg:p-6 animate-in fade-in pb-20">
      
      <div className="p-4 md:p-0 mb-2 md:mb-5">
        <Link href="/parent" className="inline-flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm transition-all mb-4">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </Link>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-1 tracking-tight">Add Your Child</h1>
        <p className="text-gray-500 text-sm">Select their school and set up a flexible payment plan.</p>
      </div>
  
      <div className="bg-white md:rounded-2xl md:border md:border-gray-200 md:shadow-lg overflow-hidden border-y border-gray-200">
        <form onSubmit={handleLinkStudent}>
          
          {/* Child Details */}
          <div className="p-4 md:p-6 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs">1</span>
              Child's Details
            </h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Child's Full Name</label>
              <input required type="text" placeholder="e.g. John Doe" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} 
                className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-gray-900 font-medium transition-all" />
            </div>
          </div>
  
          {/* School Info */}
          <div className="p-4 md:p-6 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs">2</span>
              School Information
            </h2>
            <div className="space-y-4">
              
              {/* NEW: State Selection */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-gray-700">School Location (State)</label>
                  {loadingSchools && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full animate-pulse">Loading...</span>}
                </div>
                <select required value={form.state} disabled={loadingSchools}
                  onChange={e => setForm({...form, state: e.target.value, schoolName: '', session: '', term: '', className: ''})} 
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-gray-900 font-medium transition-all disabled:opacity-50">
                  <option value="" disabled>Select state</option>
                  {availableStates.map(state => (<option key={state} value={state}>{state}</option>))}
                </select>
              </div>

              {/* UPDATED: Filtered School Selection */}
              <div className={`transition-all duration-300 ${!form.state ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Select School</label>
                <select required value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value, session: '', term: '', className: ''})} disabled={!form.state}
                  className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-gray-900 font-medium transition-all disabled:opacity-50">
                  <option value="" disabled>Tap to select school</option>
                  {filteredSchools.map((school, idx) => (<option key={idx} value={school.name}>{school.name}</option>))}
                </select>
              </div>

              <div className={`flex flex-col md:flex-row gap-4 transition-all duration-300 ${!form.schoolName ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">School Year</label>
                  <select required value={form.session} onChange={e => setForm({...form, session: e.target.value})} disabled={!form.schoolName}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-gray-900 font-medium transition-all">
                    <option value="" disabled>Select year</option>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2025/2026">2025/2026</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Term</label>
                  <select required value={form.term} onChange={e => setForm({...form, term: e.target.value})} disabled={!form.schoolName}
                    className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-gray-900 font-medium transition-all">
                    <option value="" disabled>Select term</option>
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
  
          {/* Payment Setup */}
          <div className={`p-4 md:p-6 bg-gray-50/50 transition-all duration-300 ${!form.schoolName || !form.session || !form.term ? 'opacity-40 grayscale pointer-events-none' : 'opacity-100'}`}>
            <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs">3</span>
              Class & Payment Setup
            </h2>
            {form.schoolName && form.session && form.term && availableClasses.length === 0 && !loadingClasses ? (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-xs font-medium flex gap-2">
                <svg className="w-4 h-4 shrink-0 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                School hasn't added fees for this term yet. Contact them directly.
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Child's Class</label>
                  <select required value={form.className} onChange={e => setForm({...form, className: e.target.value})} disabled={loadingClasses || availableClasses.length === 0}
                    className="w-full bg-white border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-gray-900 font-medium shadow-sm transition-all">
                    <option value="" disabled>{loadingClasses ? 'Fetching classes...' : 'Tap to select class'}</option>
                    {availableClasses.map((cls, idx) => (<option key={idx} value={cls.class_name}>{cls.class_name}</option>))}
                  </select>
                </div>
  
                {activeClassData && (
                  <div className="bg-[#0a1128] p-4 rounded-xl shadow-md text-white animate-in zoom-in-95 duration-200">
                    <p className="text-blue-300 text-xs font-medium mb-3">Payment Summary</p>
                    <div className="flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <span className="text-gray-300 text-sm">Total Fees</span>
                        <span className="text-lg font-bold">₦{Number(activeClassData.parent_total_fee).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300 text-sm">Due Today (60%)</span>
                        <span className="text-xl font-black text-green-400">₦{(Number(activeClassData.parent_total_fee) * 0.6).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
  
          {/* Footer */}
          <div className="p-4 md:p-6 border-t border-gray-100 bg-white">
            <button type="submit" disabled={isSubmitting || !form.schoolName || !form.session || !form.term || !form.className} 
              className="w-full bg-[#0a1128] hover:bg-blue-600 text-white py-3 rounded-xl font-bold text-sm transition-all disabled:bg-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2 active:scale-[0.98]">
              {isSubmitting ? 'Setting up plan...' : 'Continue to Payment Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}