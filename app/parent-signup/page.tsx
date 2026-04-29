'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function ParentSignup() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: ''
  })

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            role: 'parent',
            full_name: form.fullName
          }
        }
      })

      if (authError) throw authError

      // Manually insert the parent profile since the database trigger is gone
      if (authData.user) {
        const { error: insertError } = await supabase
          .from('parents')
          .insert({
            id: authData.user.id,
            full_name: form.fullName,
            email: form.email,
            phone: form.phone 
          })

        if (insertError) throw insertError
      }

      router.push('/parent-login?success=true')
    } catch (err: any) {
      setError(err.message || 'An error occurred during account creation.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans">
      <div className="w-full max-w-[400px] mx-auto text-center mt-6 md:mt-0">
        <div className="flex justify-center mb-5">
          <h1 className="text-3xl font-extrabold tracking-tight"><span className="text-[#0a1128]">PayTerm</span> <span className="text-blue-600">Parents</span></h1>
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Parent Registration</h2>
        <p className="mt-1.5 text-xs text-gray-500 font-medium">Create an account to manage your child's fees.</p>
      </div>
  
      <div className="mt-6 w-full max-w-[400px] mx-auto mb-10">
        <div className="bg-white py-6 px-5 sm:px-6 rounded-2xl border border-gray-200 shadow-xl">
          {error && <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">{error}</div>}
          <form className="space-y-4" onSubmit={handleSignup}>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">Full Name</label>
              <input type="text" required value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-gray-900 font-medium" placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">Email Address</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-gray-900 font-medium" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">Phone Number</label>
              <input type="tel" required value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-gray-900 font-medium font-mono" placeholder="08012345678" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">Create Password</label>
              <input type="password" required value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-gray-900 font-medium" placeholder="••••••••" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors active:scale-[0.98]">{loading ? 'Loading...' : 'Create Account'}</button>
            </div>
          </form>
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">Already have an account? <Link href="/parent-login" className="font-bold text-[#0a1128] hover:text-blue-600 transition-colors">Sign in here</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}