'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'

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
      // 1. Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // 2. CRITICAL: Check their approval status in the database safely
      if (authData.user) {
        const { data: schoolData, error: dbError } = await supabase
          .from('partner_schools')
          .select('status')
          .eq('id', authData.user.id)
          .maybeSingle()

        if (dbError) throw dbError

        // 3. Block access if profile is missing entirely
        if (!schoolData) {
          await supabase.auth.signOut()
          throw new Error('Access Denied: Institution profile not found.')
        }

        // 4. Block access if they are not active
        if (schoolData.status !== 'Active') {
          await supabase.auth.signOut() 
          throw new Error(`Access Denied: Your application is currently ${schoolData.status}.`)
        }
      }
      
      // On success, route to the school dashboard
      router.push('/school')
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans">
      
      <div className="w-full max-w-md mx-auto text-center mt-6 md:mt-0">
        <h2 className="text-2xl font-extrabold text-[#0a1128] tracking-tight">
          PayTerm <span className="text-blue-600">Schools</span>
        </h2>
        <p className="mt-1.5 text-xs text-gray-500 font-medium">
          Sign in to your institution's portal
        </p>
      </div>
  
      <div className="mt-6 w-full max-w-md mx-auto mb-10">
        <div className="bg-white py-6 px-5 sm:px-6 rounded-2xl border border-gray-200 shadow-xl">
          
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl text-center">
              {error}
            </div>
          )}
  
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-[10px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">
                Official Finance Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all text-[#0a1128] font-medium shadow-sm text-sm"
                placeholder="admin@school.edu.ng"
              />
            </div>
  
            <div>
              <label className="block text-[10px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white outline-none transition-all text-[#0a1128] font-medium shadow-sm text-sm"
                placeholder="••••••••"
              />
            </div>
  
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input id="remember-me" name="remember-me" type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                <label htmlFor="remember-me" className="ml-2 block text-xs text-gray-600 font-medium">
                  Remember me
                </label>
              </div>
              <div className="text-xs">
                <a href="#" className="font-bold text-blue-600 hover:text-blue-800 transition-colors">
                  Forgot password?
                </a>
              </div>
            </div>
  
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 rounded-xl shadow-sm text-sm font-bold text-white bg-[#0a1128] hover:bg-blue-600 disabled:opacity-50 transition-colors active:scale-[0.98]"
              >
                {loading ? 'Loading...' : 'Sign In'}
              </button>
            </div>
          </form>
  
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Not a partner school yet?{' '}
              <Link href="/school-signup" className="font-bold text-blue-600 hover:text-blue-800 transition-colors">
                Apply for Partnership
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}