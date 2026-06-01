'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, ArrowRight, ShieldCheck, Building2 } from 'lucide-react'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)

  // Auto-redirect if already logged in as HQ
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: hqData } = await supabase
            .from('hq_users')
            .select('role')
            .eq('user_email', user.email as string)
            .maybeSingle()
            
          if (hqData) {
            router.push('/admin')
          } else {
            await supabase.auth.signOut() // Kills cross-portal infinite loops
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
      // 1. Authenticate via Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      // 2. CRITICAL: Verify they are an authorized HQ user
      if (authData.user) {
        const { data: hqData, error: dbError } = await supabase
          .from('hq_users')
          .select('role')
          .eq('user_email', email)
          .maybeSingle()

        if (dbError || !hqData) {
          await supabase.auth.signOut()
          throw new Error('Access Denied: Unrecognized HQ connection.')
        }
      }
      
      toast.success("HQ Access Granted")
      router.push('/admin')
    } catch (err: any) {
      toast.error(err.message || 'Invalid login credentials.')
    } finally {
      setLoading(false)
    }
  }

  if (isInitializing) return <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center font-bold text-[#0a1128] uppercase tracking-widest text-sm animate-pulse">Authenticating...</div>

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans relative overflow-hidden text-[#0a1128]">
      
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] mx-auto text-center mt-6 md:mt-0 relative z-10">
        <div className="flex justify-center mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <span className="text-[#0a1128]">Pay</span><span className="text-blue-600">Term</span>
            <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-widest ml-1 border border-blue-100">HQ</span>
          </h1>
        </div>
        <h2 className="text-2xl font-bold text-[#0a1128] tracking-tight mb-3">Admin Portal</h2>
        <div className="flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-gray-200">
            <ShieldCheck className="w-3.5 h-3.5" />
            Restricted Administrative Access
          </span>
        </div>
      </div>
  
      <div className="mt-8 w-full max-w-[420px] mx-auto mb-10 relative z-10">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5">

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Official Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-[#0a1128] font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium" 
                  placeholder="admin@payterm.ng" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-2">Password</label>
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
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl text-sm font-bold text-white bg-[#0a1128] hover:bg-blue-600 shadow-lg disabled:shadow-none disabled:bg-gray-300 transition-all active:scale-[0.98] group"
              >
                {loading ? 'Authenticating...' : 'Secure Login'}
                {!loading && <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>
          
        </div>
      </div>
    </div>
  )
}