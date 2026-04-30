'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { Building2, MapPin, Mail, Phone, Lock, ArrowRight, ChevronDown } from 'lucide-react'

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara"
]

export default function SchoolSignup() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ schoolName: '', email: '', phone: '', state: '', password: '' })

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email, password: form.password,
        options: { data: { role: 'school', full_name: form.schoolName } }
      })

      if (authError) throw authError

      if (authData.user) {
        const { error: insertError } = await supabase.from('partner_schools').insert({
          id: authData.user.id, name: form.schoolName, finance_email: form.email,
          contact_phone: form.phone, state: form.state, status: 'Pending Verification'
        })

        if (insertError) throw insertError
        
        alert('Application submitted! Pending Admin approval.')
        router.push('/school-login')
      }
    } catch (err: any) {
      alert(`Error Details: ${JSON.stringify(err)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans relative overflow-hidden pb-20">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="w-full max-w-[420px] mx-auto text-center mt-6 md:mt-0 mb-6 relative z-10">
        <div className="flex justify-center mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-[#0a1128]">PayTerm</span> <span className="text-blue-600">Schools</span>
          </h1>
        </div>
        <h2 className="text-2xl font-bold text-[#0a1128] tracking-tight mb-2">Partner Setup</h2>
        <p className="text-sm text-gray-500 font-medium">Register your institution to join the network.</p>
      </div>
  
      <div className="w-full max-w-[420px] mx-auto mb-10 relative z-10">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xl shadow-blue-900/5 border border-gray-100">
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">School Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Building2 className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  required type="text" value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-[#0a1128] font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium" placeholder="e.g. Standard Academy" 
                />
              </div>
            </div>
  
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Location (State)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <MapPin className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <select 
                  required value={form.state} onChange={e => setForm({...form, state: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-10 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-[#0a1128] font-bold shadow-sm transition-all appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- Select a State --</option>
                  {NIGERIAN_STATES.map((state) => <option key={state} value={state}>{state}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
  
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Official Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-[#0a1128] font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium" placeholder="admin@school.edu.ng" 
                />
              </div>
            </div>
  
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Contact Phone</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-[#0a1128] font-bold font-mono shadow-sm placeholder:text-gray-400 placeholder:font-medium placeholder:font-sans" placeholder="08012345678" 
                />
              </div>
            </div>
  
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-[#0a1128] font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium" placeholder="••••••••" 
                />
              </div>
            </div>
  
            <div className="pt-2">
              <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-[#0a1128] hover:bg-blue-600 disabled:shadow-none disabled:bg-gray-300 transition-all active:scale-[0.98] group">
                {isSubmitting ? 'Loading...' : 'Submit Application'}
                {!isSubmitting && <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>
  
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Already a partner? <Link href="/school-login" className="font-bold text-[#0a1128] hover:text-blue-600 transition-colors ml-1">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}