'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase' 
import Link from 'next/link'
import PaymentPreviewBox from './components/PaymentPreviewBox'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync' // <-- The Hook

import { ArrowLeft, User, Building2, CreditCard, AlertCircle, ChevronDown } from 'lucide-react'

export default function AddStudentPage() {
  const router = useRouter()
  const [loadingSchools, setLoadingSchools] = useState(true)
  const [loadingClasses, setLoadingClasses] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [schools, setSchools] = useState<any[]>([])
  const [availableClasses, setAvailableClasses] = useState<any[]>([])

  const [form, setForm] = useState({
    fullName: '',
    state: '', 
    schoolName: '',
    session: '',
    term: '',
    className: ''
  })

  // 1. Pure fetch function for Schools
  const fetchSchools = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('partner_schools')
        .select('id, name, state') 
        .eq('status', 'Active')
        .order('name', { ascending: true })

      if (error) throw error
      if (data) setSchools(data)
    } catch (err: any) {
      console.error("Error fetching schools:", err.message)
      toast.error("Failed to load school directory.")
    } finally {
      setLoadingSchools(false)
    }
  }, [])

  // 2. Pure fetch function for Classes
  const fetchClasses = useCallback(async () => {
    if (!form.schoolName || !form.session || !form.term) {
      setAvailableClasses([])
      return
    }

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
      
    } catch (err: any) {
      console.error("Error fetching classes:", err.message)
    } finally {
      setLoadingClasses(false)
    }
  }, [form.schoolName, form.session, form.term])

  // 3. THE HOOKS GO HERE: At the top level!
  useRealtimeSync(() => fetchSchools())
  useRealtimeSync(() => fetchClasses())

  // 4. Normal Component Initialization (Initial Load)
  useEffect(() => {
    fetchSchools()
  }, [fetchSchools])

  // 5. Normal dependency-based fetching (When form values change)
  useEffect(() => {
    fetchClasses()
    // Reset class selection when parent variables change
    if (form.schoolName && form.session && form.term) {
       setForm(prev => ({ ...prev, className: '' }))
    }
  }, [fetchClasses, form.schoolName, form.session, form.term])

  // Handle strict submission
  const handleLinkStudent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Front-end validation to prevent null submission errors
    if (!form.fullName || !form.schoolName || !form.session || !form.term || !form.className) {
      return toast.error("Please fill in all required fields.")
    }

    setIsSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in to add a child.")

      const selectedFeeConfig = availableClasses.find(c => c.class_name === form.className)
      if (!selectedFeeConfig) throw new Error("Invalid class selection.")

      const selectedSchool = schools.find(s => s.name === form.schoolName && s.state === form.state)
      if (!selectedSchool || !selectedSchool.id) throw new Error("Could not verify the internal School ID.")

      // Insert Student
      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .insert({
          parent_id: user.id,
          school_id: selectedSchool.id,
          full_name: form.fullName,
          student_class: form.className,
          enrollment_status: 'Active' 
        })
        .select()
        .single()

      if (studentError) throw studentError

      const uniqueCode = `PT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      // Insert Plan using strict session/term data
      const { error: planError } = await supabase
        .from('active_plans')
        .insert({
          student_id: studentData.id,
          parent_id: user.id,
          school_id: selectedSchool.id,
          total_fee: selectedFeeConfig.parent_total_fee,
          amount_paid: 0,
          next_payment_date: selectedFeeConfig.mid_term_date || null,
          status: 'Active', 
          clearance_code: uniqueCode,
          mid_term_cleared: false, 
          payterm_advance: 0,
          academic_session: form.session, 
          term: form.term                
        } as any) 

      if (planError) throw planError

      toast.success("Student profile generated!")
      toast.success("Redirecting to fund the 60% downpayment...")
      
      // Give the toast 1.5s to be read before redirecting
      setTimeout(() => {
        router.push('/parent') 
      }, 1500)

    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const activeClassData = availableClasses.find(c => c.class_name === form.className)
  const availableStates = Array.from(new Set(schools.map(s => s.state).filter(Boolean))).sort()
  const filteredSchools = form.state ? schools.filter(s => s.state === form.state) : []

  return (
    <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 lg:p-10 animate-in fade-in pb-24">
      
      {/* HEADER */}
      <div className="mb-8">
        <Link href="/parent" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#0a1128] bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm transition-all mb-6 active:scale-95">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-extrabold text-[#0a1128] mb-2 tracking-tight">Add Your Child</h1>
        <p className="text-gray-500 font-medium">Select their school and instantly set up a flexible payment plan.</p>
      </div>
  
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mt-20 -mr-20"></div>

        <form onSubmit={handleLinkStudent} className="relative z-10">
          
          {/* STEP 1: Child Details */}
          <div className="p-6 md:p-8 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-3 uppercase tracking-wider">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <User className="w-4 h-4" />
              </div>
              Step 1: Child's Details
            </h2>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Child's Full Name</label>
              <input 
                required 
                type="text" 
                placeholder="e.g. John Doe" 
                value={form.fullName} 
                onChange={e => setForm({...form, fullName: e.target.value})} 
                className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 text-[#0a1128] font-bold transition-all shadow-sm" 
              />
            </div>
          </div>
  
          {/* STEP 2: School Info */}
          <div className="p-6 md:p-8 border-b border-gray-50">
            <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-3 uppercase tracking-wider">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <Building2 className="w-4 h-4" />
              </div>
              Step 2: School Information
            </h2>
            <div className="space-y-5">
              
              <div className="relative">
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide">School Location (State)</label>
                  {loadingSchools && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full animate-pulse border border-blue-100">Loading network...</span>}
                </div>
                <div className="relative">
                  <select 
                    required 
                    value={form.state} 
                    disabled={loadingSchools}
                    onChange={e => setForm({...form, state: e.target.value, schoolName: '', session: '', term: '', className: ''})} 
                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 text-[#0a1128] font-bold transition-all disabled:opacity-50 appearance-none shadow-sm cursor-pointer"
                  >
                    <option value="" disabled>Select state</option>
                    {availableStates.map(state => (<option key={state} value={state}>{state}</option>))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className={`transition-all duration-500 ${!form.state ? 'opacity-30 grayscale pointer-events-none translate-y-2' : 'opacity-100 translate-y-0'}`}>
                <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Select School</label>
                <div className="relative">
                  <select 
                    required 
                    value={form.schoolName} 
                    onChange={e => setForm({...form, schoolName: e.target.value, session: '', term: '', className: ''})} 
                    disabled={!form.state}
                    className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 text-[#0a1128] font-bold transition-all disabled:opacity-50 appearance-none shadow-sm cursor-pointer"
                  >
                    <option value="" disabled>Tap to select school</option>
                    {filteredSchools.map((school, idx) => (<option key={idx} value={school.name}>{school.name}</option>))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className={`flex flex-col md:flex-row gap-5 transition-all duration-500 delay-100 ${!form.schoolName ? 'opacity-30 grayscale pointer-events-none translate-y-2' : 'opacity-100 translate-y-0'}`}>
                <div className="flex-1 relative">
                  <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">School Year</label>
                  <div className="relative">
                    <select 
                      required 
                      value={form.session} 
                      onChange={e => setForm({...form, session: e.target.value})} 
                      disabled={!form.schoolName}
                      className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 text-[#0a1128] font-bold transition-all appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="" disabled>Select year</option>
                      {/* FIX: Values now perfectly match the Fee Setup strings */}
                      <option value="2026/2027">2026/2027</option>
                      <option value="2027/2028">2027/2028</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div className="flex-1 relative">
                  <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Term</label>
                  <div className="relative">
                    <select 
                      required 
                      value={form.term} 
                      onChange={e => setForm({...form, term: e.target.value})} 
                      disabled={!form.schoolName}
                      className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 text-[#0a1128] font-bold transition-all appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="" disabled>Select term</option>
                      <option value="First Term">First Term</option>
                      <option value="Second Term">Second Term</option>
                      <option value="Third Term">Third Term</option>
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          </div>
  
          {/* STEP 3: Payment Setup */}
          <div className={`p-6 md:p-8 bg-blue-50/20 transition-all duration-500 ${!form.schoolName || !form.session || !form.term ? 'opacity-30 grayscale pointer-events-none' : 'opacity-100'}`}>
            <h2 className="text-sm font-bold text-gray-900 mb-5 flex items-center gap-3 uppercase tracking-wider">
              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner">
                <CreditCard className="w-4 h-4" />
              </div>
              Step 3: Class & Payment Setup
            </h2>
            
            {form.schoolName && form.session && form.term && availableClasses.length === 0 && !loadingClasses ? (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl text-orange-800 text-sm font-bold flex gap-3 shadow-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-orange-500" />
                This school hasn't uploaded their fees for this term yet. Please contact the school administrator.
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Child's Class</label>
                  <div className="relative">
                    <select 
                      required 
                      value={form.className} 
                      onChange={e => setForm({...form, className: e.target.value})} 
                      disabled={loadingClasses || availableClasses.length === 0}
                      className="w-full bg-white border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 text-[#0a1128] font-bold shadow-sm transition-all appearance-none cursor-pointer"
                    >
                      <option value="" disabled>{loadingClasses ? 'Fetching classes...' : 'Tap to select class'}</option>
                      {availableClasses.map((cls, idx) => (<option key={idx} value={cls.class_name}>{cls.class_name}</option>))}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
  
                <PaymentPreviewBox activeClassData={activeClassData} />
              </div>
            )}
          </div>
  
          {/* Footer Submit */}
          <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50">
            <button 
              type="submit" 
              disabled={isSubmitting || !form.schoolName || !form.session || !form.term || !form.className} 
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-4 rounded-xl font-bold text-base transition-all disabled:from-gray-200 disabled:to-gray-200 disabled:text-gray-400 flex items-center justify-center gap-2 active:scale-[0.98] shadow-lg shadow-blue-500/20 disabled:shadow-none"
            >
              {isSubmitting ? 'Generating Payment Plan...' : 'Continue to Payment Plan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}