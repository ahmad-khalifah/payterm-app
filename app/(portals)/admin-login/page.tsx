'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react'

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
          throw new Error('Access Denied: Unrecognized HQ terminal connection.')
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

  if (isInitializing) return <div className="min-h-screen bg-[#0a1128] flex items-center justify-center font-bold text-white uppercase tracking-widest animate-pulse">Initializing Terminal...</div>

  return (
    <div className="min-h-screen bg-[#0a1128] flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans relative overflow-hidden text-white">
      
      {/* Background Noise & Deep Space Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: "url('/noise.png')" }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] mx-auto text-center mt-6 md:mt-0 relative z-10">
        <div className="flex justify-center mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <span className="text-white">PayTerm</span> <span className="text-blue-500">HQ</span>
          </h1>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Master Control</h2>
        <p className="text-sm text-blue-300/70 font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-blue-500" />
          Restricted administrative access
        </p>
      </div>
  
      <div className="mt-8 w-full max-w-[420px] mx-auto mb-10 relative z-10">
        {/* Dark Mode Glass Card */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Official Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-black/20 border border-white/10 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all text-white font-bold shadow-inner placeholder:text-slate-600 placeholder:font-medium" 
                  placeholder="admin@payterm.ng" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
                </div>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-black/20 border border-white/10 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm outline-none transition-all text-white font-bold shadow-inner placeholder:text-slate-600 placeholder:font-medium" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 shadow-lg shadow-blue-900/50 disabled:shadow-none disabled:opacity-50 transition-all active:scale-[0.98] group"
              >
                {loading ? 'Decrypting...' : 'Initialize Session'}
                {!loading && <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>
          
        </div>
      </div>
    </div>
  )
}