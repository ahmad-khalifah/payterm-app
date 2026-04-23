'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
      // This will print the raw database error code to your screen if it fails
      alert(`Error Details: ${JSON.stringify(err)}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
      <h1 className="text-2xl font-bold text-[#0a1128] mb-6">Partner Institution Setup</h1>
      
      <form onSubmit={handleSignup} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">School Name</label>
          <input required type="text" value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value})} className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Location (State)</label>
          <select required value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white">
            <option value="" disabled>-- Select a State --</option>
            {NIGERIAN_STATES.map((state) => (
              <option key={state} value={state}>{state}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Official Email</label>
          <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Contact Phone</label>
          <input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Password</label>
          <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600" />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-[#0a1128] text-white px-5 py-3.5 rounded-xl font-bold hover:bg-[#15234b] disabled:opacity-50 transition-colors mt-4">
          {isSubmitting ? 'Loading...' : 'Sign Up'}
        </button>
      </form>
    </div>
  )
}