'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

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
  const [form, setForm] = useState({
    schoolName: '',
    email: '',
    phone: '',
    state: '',
    password: ''
  })

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            role: 'school',
            full_name: form.schoolName
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        const { error: insertError } = await supabase
          .from('partner_schools')
          .insert({
            id: authData.user.id,
            name: form.schoolName,
            finance_email: form.email,
            contact_phone: form.phone,
            state: form.state,
            status: 'Pending Verification'
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans pb-20">
      
      <div className="w-full max-w-md mx-auto text-center mt-6 md:mt-0 mb-6">
        <h2 className="text-2xl font-extrabold text-[#0a1128] tracking-tight">
          Partner Setup
        </h2>
        <p className="mt-1.5 text-xs text-gray-500 font-medium">
          Register your institution to join the network.
        </p>
      </div>
  
      <div className="w-full max-w-md mx-auto mb-10">
        <div className="bg-white py-6 px-5 sm:px-6 rounded-2xl shadow-xl border border-gray-200">
          
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">School Name</label>
              <input required type="text" value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-[#0a1128] font-medium shadow-sm" placeholder="e.g. Standard Academy" />
            </div>
  
            <div>
              <label className="block text-[10px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">Location (State)</label>
              <select required value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-[#0a1128] font-medium shadow-sm">
                <option value="" disabled>-- Select a State --</option>
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
  
            <div>
              <label className="block text-[10px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">Official Email</label>
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-[#0a1128] font-medium shadow-sm" placeholder="admin@school.com" />
            </div>
  
            <div>
              <label className="block text-[10px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">Contact Phone</label>
              <input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-[#0a1128] font-medium font-mono shadow-sm" placeholder="08012345678" />
            </div>
  
            <div>
              <label className="block text-[10px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">Password</label>
              <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all text-[#0a1128] font-medium shadow-sm" placeholder="••••••••" />
            </div>
  
            <div className="pt-2">
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#0a1128] text-white px-4 py-3 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 disabled:opacity-50 transition-colors active:scale-[0.98]">
                {isSubmitting ? 'Loading...' : 'Submit Application'}
              </button>
            </div>
          </form>
  
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Already a partner?{' '}
              <Link href="/school-login" className="font-bold text-[#0a1128] hover:text-blue-600 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
  
        </div>
      </div>
    </div>
  )
}