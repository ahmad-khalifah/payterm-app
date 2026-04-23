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
    // OUTER WRAPPER: Forces the gray background and absolute mobile padding (p-4)
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-4 sm:p-6 lg:p-8 animate-in fade-in font-sans">
      
      {/* HEADER SECTION */}
      <div className="w-full max-w-md mx-auto text-center mb-8">
        <h2 className="text-3xl font-extrabold text-[#0a1128] tracking-tight">
          Partner Setup
        </h2>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Register your institution to join the network.
        </p>
      </div>

      {/* CARD CONTAINER: Constrained width, allowing margins to exist */}
      <div className="w-full max-w-md mx-auto">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl shadow-xl border border-gray-200">
          
          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">School Name</label>
              <input required type="text" value={form.schoolName} onChange={e => setForm({...form, schoolName: e.target.value})} className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all text-[#0a1128] font-medium shadow-sm" placeholder="e.g. Standard Academy" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Location (State)</label>
              <select required value={form.state} onChange={e => setForm({...form, state: e.target.value})} className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white text-[#0a1128] font-medium shadow-sm">
                <option value="" disabled>-- Select a State --</option>
                {NIGERIAN_STATES.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Official Email</label>
              <input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all text-[#0a1128] font-medium shadow-sm" placeholder="admin@school.com" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Contact Phone</label>
              <input required type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all text-[#0a1128] font-medium font-mono shadow-sm" placeholder="08012345678" />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Password</label>
              <input required type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 transition-all text-[#0a1128] font-medium shadow-sm" placeholder="••••••••" />
            </div>

            <div className="pt-2">
              <button type="submit" disabled={isSubmitting} className="w-full bg-[#0a1128] text-white px-5 py-3.5 rounded-xl text-sm font-bold shadow-sm hover:bg-[#15234b] disabled:opacity-50 transition-colors">
                {isSubmitting ? 'Loading...' : 'Submit Application'}
              </button>
            </div>
          </form>

          {/* ADDED LOGIN LINK FOR CONSISTENCY */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">
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