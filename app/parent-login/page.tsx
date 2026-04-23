'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

export default function ParentLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (authData.user) {
        const { data: parentData, error: dbError } = await supabase
          .from('parents')
          .select('id')
          .eq('id', authData.user.id)
          .single()

        if (dbError || !parentData) {
          await supabase.auth.signOut()
          throw new Error('Access Denied: This portal is for parents only.')
        }
      }
      
      router.push('/parent')
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 animate-in fade-in font-sans px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h2 className="text-3xl font-extrabold text-[#0a1128] tracking-tight">
          Welcome Back
        </h2>
        <p className="mt-2 text-sm text-gray-500 font-medium">
          Sign in to your parent dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 sm:px-10 rounded-2xl border border-gray-200 shadow-xl">
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-xl text-center">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">
                Email Address
              </label>
              <input
                type="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-[#0a1128] font-medium shadow-sm"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">
                Password
              </label>
              <input
                type="password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 px-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 outline-none transition-all text-[#0a1128] font-medium shadow-sm"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-[#0a1128] hover:bg-[#15234b] disabled:opacity-50 transition-colors"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500 font-medium">
              New to PayTerm?{' '}
              <Link href="/parent-signup" className="font-bold text-blue-600 hover:text-blue-500 transition-colors">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}