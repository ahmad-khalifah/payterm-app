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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans">
      <div className="w-full max-w-[400px] mx-auto text-center mt-6 md:mt-0">
        <div className="flex justify-center mb-5">
          <h1 className="text-3xl font-extrabold tracking-tight"><span className="text-[#0a1128]">PayTerm</span> <span className="text-blue-600">Parents</span></h1>
        </div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Welcome Back</h2>
        <p className="mt-1.5 text-xs text-gray-500 font-medium">Sign in to your parent dashboard</p>
      </div>
  
      <div className="mt-6 w-full max-w-[400px] mx-auto mb-10">
        <div className="bg-white py-6 px-5 sm:px-6 rounded-2xl border border-gray-200 shadow-xl">
          {error && <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">{error}</div>}
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">Email Address</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-gray-900 font-medium" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-700 uppercase tracking-wide mb-1.5">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-gray-900 font-medium" placeholder="••••••••" />
            </div>
            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full flex justify-center py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-[#0a1128] hover:bg-blue-600 disabled:opacity-50 transition-colors active:scale-[0.98]">{loading ? 'Loading...' : 'Login'}</button>
            </div>
          </form>
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">New to PayTerm? <Link href="/parent-signup" className="font-bold text-blue-600 hover:text-blue-800 transition-colors">Create an account</Link></p>
          </div>
        </div>
      </div>
    </div>
  )
}