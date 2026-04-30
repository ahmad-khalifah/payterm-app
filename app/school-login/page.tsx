'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import { Mail, Lock, ArrowRight } from 'lucide-react'

export default function SchoolLogin() {
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
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      if (authData.user) {
        const { data: schoolData, error: dbError } = await supabase
          .from('partner_schools').select('status').eq('id', authData.user.id).maybeSingle()

        if (dbError) throw dbError
        if (!schoolData) {
          await supabase.auth.signOut()
          throw new Error('Access Denied: Institution profile not found.')
        }
        if (schoolData.status !== 'Active') {
          await supabase.auth.signOut() 
          throw new Error(`Access Denied: Your application is currently ${schoolData.status}.`)
        }
      }
      
      router.push('/school')
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] mx-auto text-center mt-6 md:mt-0 relative z-10">
        <div className="flex justify-center mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-[#0a1128]">PayTerm</span> <span className="text-blue-600">Schools</span>
          </h1>
        </div>
        <h2 className="text-2xl font-bold text-[#0a1128] tracking-tight mb-2">Partner Portal</h2>
        <p className="text-sm text-gray-500 font-medium">Sign in to your institution's dashboard</p>
      </div>
  
      <div className="mt-8 w-full max-w-[420px] mx-auto mb-10 relative z-10">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl text-center flex items-center justify-center gap-2">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}
  
          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Official Finance Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all text-[#0a1128] font-bold shadow-sm text-sm placeholder:text-gray-400 placeholder:font-medium"
                  placeholder="admin@school.edu.ng"
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
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all text-[#0a1128] font-bold shadow-sm text-sm placeholder:text-gray-400 placeholder:font-medium"
                  placeholder="••••••••"
                />
              </div>
            </div>
  
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-gray-600 font-medium">Remember me</label>
              </div>
              <div className="text-xs">
                <a href="#" className="font-bold text-blue-600 hover:text-blue-800 transition-colors">Forgot password?</a>
              </div>
            </div>
  
            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 disabled:shadow-none disabled:from-blue-300 disabled:to-blue-300 transition-all active:scale-[0.98] group">
                {loading ? 'Authenticating...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>
  
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Not a partner school yet? <Link href="/school-signup" className="font-bold text-blue-600 hover:text-blue-800 transition-colors ml-1">Apply for Partnership</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}