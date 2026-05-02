'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, ArrowRight } from 'lucide-react'

export default function ParentLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // Auto-redirect if already logged in as a parent
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: parentData } = await supabase
            .from('parents')
            .select('id')
            .eq('id', user.id)
            .maybeSingle()
            
          if (parentData) {
            router.push('/parent')
          } else {
            await supabase.auth.signOut() // Kills the infinite loop
          }
        }
      } catch (err) {
        console.error("Auth check error", err)
      } finally {
        setIsInitializing(false)
      }
    }
    checkSession()
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      if (authData.user) {
        const { data: parentData, error: dbError } = await supabase
          .from('parents').select('id').eq('id', authData.user.id).single()

        if (dbError || !parentData) {
          await supabase.auth.signOut()
          throw new Error('Access Denied: This portal is for parents only.')
        }
      }
      
      toast.success("Welcome back!")
      router.push('/parent')
    } catch (err: any) {
      toast.error(err.message || 'Invalid login credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (isInitializing) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-[#0a1128] uppercase tracking-widest animate-pulse">Checking Session...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] mx-auto text-center mt-6 md:mt-0 relative z-10">
        <div className="flex justify-center mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-[#0a1128]">PayTerm</span> <span className="text-blue-600">Parents</span>
          </h1>
        </div>
        <h2 className="text-2xl font-bold text-[#0a1128] tracking-tight mb-2">Welcome Back</h2>
        <p className="text-sm text-gray-500 font-medium">Sign in to your parent dashboard</p>
      </div>
  
      <div className="mt-8 w-full max-w-[420px] mx-auto mb-10 relative z-10">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5">

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-[#0a1128] font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium" 
                  placeholder="you@example.com" 
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
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-[#0a1128] font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
            
            <div className="pt-2">
              <button type="submit" disabled={loading} className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/20 disabled:shadow-none disabled:from-blue-300 disabled:to-blue-300 transition-all active:scale-[0.98] group">
                {loading ? 'Loading...' : 'Sign In'}
                {!loading && <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              New to PayTerm? <Link href="/parent-signup" className="font-bold text-blue-600 hover:text-blue-800 transition-colors ml-1">Create an account</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}