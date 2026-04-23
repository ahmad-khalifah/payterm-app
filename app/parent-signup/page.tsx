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

    // NEW: Manually insert the parent profile since the database trigger is gone
    if (authData.user) {
        const { error: insertError } = await supabase
          .from('parents')
          .insert({
            id: authData.user.id,
            full_name: form.fullName,
            email: form.email,
            phone: form.phone // <-- CHANGE THIS FROM phone_number TO phone
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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-in fade-in font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-[#0a1128] tracking-tight">
          Parent Registration
        </h2>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Create an account to manage your child's school fees.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 sm:px-10 rounded-2xl border border-gray-200 shadow-xl">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleSignup}>
            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">
                Full Name
              </label>
              <input
                type="text" required
                value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})}
                className="w-full border border-gray-300 px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-[#0a1128] font-medium shadow-sm"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">
                Email Address
              </label>
              <input
                type="email" required
                value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                className="w-full border border-gray-300 px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-[#0a1128] font-medium shadow-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">
                Phone Number
              </label>
              <input
                type="tel" required
                value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}
                className="w-full border border-gray-300 px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-[#0a1128] font-medium font-mono shadow-sm"
                placeholder="08012345678"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">
                Create Password
              </label>
              <input
                type="password" required
                value={form.password} onChange={(e) => setForm({...form, password: e.target.value})}
                className="w-full border border-gray-300 px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-[#0a1128] font-medium shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit" disabled={loading}
                className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Loading...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">
              Already have an account?{' '}
              <Link href="/parent-login" className="font-bold text-[#0a1128] hover:text-blue-600 transition-colors">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}