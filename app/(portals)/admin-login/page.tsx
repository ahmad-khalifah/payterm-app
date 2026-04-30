'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

import { Mail, Lock, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react'

export default function AdminLogin() {
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
      
      // Successfully logged in and verified, push to the dashboard
      router.push('/admin')
    } catch (err: any) {
      setError(err.message || 'Invalid login credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#050a15] flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans relative overflow-hidden text-white">
      
      {/* Background Noise & Deep Space Glow */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: "url('/noise.png')" }}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] mx-auto text-center mt-6 md:mt-0 relative z-10">
        <div className="flex justify-center mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-2">
            <span className="text-white">PayTerm</span> <span className="text-purple-500">HQ</span>
          </h1>
        </div>
        <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Master Control</h2>
        <p className="text-sm text-purple-300/70 font-medium flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-purple-500" />
          Restricted administrative access
        </p>
      </div>
  
      <div className="mt-8 w-full max-w-[420px] mx-auto mb-10 relative z-10">
        {/* Dark Mode Glass Card */}
        <div className="bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
          
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-2xl text-center flex items-center justify-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form className="space-y-5" onSubmit={handleLogin}>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Official Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                </div>
                <input 
                  type="email" required value={email} onChange={(e) => setEmail(e.target.value)} 
                  className="w-full bg-black/20 border border-white/10 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm outline-none transition-all text-white font-bold shadow-inner placeholder:text-slate-600 placeholder:font-medium" 
                  placeholder="admin@payterm.ng" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                </div>
                <input 
                  type="password" required value={password} onChange={(e) => setPassword(e.target.value)} 
                  className="w-full bg-black/20 border border-white/10 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm outline-none transition-all text-white font-bold shadow-inner placeholder:text-slate-600 placeholder:font-medium" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={loading} 
                className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-lg shadow-purple-900/50 disabled:shadow-none disabled:opacity-50 transition-all active:scale-[0.98] group"
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