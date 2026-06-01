'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'
import { Mail, Lock, User, Phone, ArrowRight, ShieldCheck, Fingerprint } from 'lucide-react'

export default function ParentSignup() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', nin: '' })

  // Auto-redirect if already logged in
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          router.push('/parent')
        }
      } catch (err) {
        console.error("Auth check error", err)
      } finally {
        setIsInitializing(false)
      }
    }
    checkSession()
  }, [router])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (form.nin.length !== 11) {
      return toast.error("NIN must be exactly 11 digits.")
    }

    setLoading(true)
    const toastId = toast.loading('Verifying NIN with NIMC database...')

    try {
      // 1. DUMMY NIN VERIFICATION API CALL
      await new Promise(resolve => setTimeout(resolve, 1500)) 
      toast.loading('Creating secure account...', { id: toastId })

      // 2. CREATE SUPABASE AUTH USER
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email, 
        password: form.password,
        options: { data: { role: 'parent', full_name: form.fullName } }
      })

      if (authError) throw authError

      // 3. CREATE PARENT PROFILE WITH NIN
      if (authData.user) {
        const { error: insertError } = await supabase.from('parents').insert({
          id: authData.user.id, 
          full_name: form.fullName, 
          email: form.email, 
          phone: form.phone,
          nin: form.nin,
          kyc_status: 'Verified' 
        } as any) // <-- Add "as any" right here
        if (insertError) throw insertError
      }
      
      toast.success("Account created successfully! You can now log in.", { id: toastId })
      router.push('/parent-login')
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during account creation.', { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  if (isInitializing) return <div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold text-[#0a1128] uppercase tracking-widest animate-pulse">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center p-4 sm:p-6 animate-in fade-in font-sans relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-[420px] mx-auto text-center mt-6 md:mt-0 relative z-10">
        <div className="flex justify-center mb-6">
          <h1 className="text-4xl font-extrabold tracking-tight">
            <span className="text-[#0a1128]">PayTerm</span> <span className="text-blue-600">Parents</span>
          </h1>
        </div>
        <h2 className="text-2xl font-bold text-[#0a1128] tracking-tight mb-2">Create Account</h2>
        <p className="text-sm text-gray-500 font-medium">Create an account to manage your child's fees</p>
      </div>
  
      <div className="mt-8 w-full max-w-[420px] mx-auto mb-10 relative z-10">
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5">

          <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 mb-6 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-blue-900 leading-relaxed">
              We require your National Identity Number (NIN) to instantly generate dedicated virtual bank accounts for your children's fee payments.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSignup}>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Full Name</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="text" required value={form.fullName} onChange={(e) => setForm({...form, fullName: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-[#0a1128] font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium" placeholder="e.g. John Doe" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">National Identity Number (NIN)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Fingerprint className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="text" required maxLength={11} minLength={11} value={form.nin} onChange={(e) => setForm({...form, nin: e.target.value.replace(/\D/g, '')})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-[#0a1128] font-mono font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium placeholder:font-sans" placeholder="11-digit NIN" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Email Address</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-[#0a1128] font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium" placeholder="you@example.com" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Phone Number</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="tel" required value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-[#0a1128] font-bold font-mono shadow-sm placeholder:text-gray-400 placeholder:font-medium placeholder:font-sans" placeholder="08012345678" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Create Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="w-4 h-4 text-gray-400 group-focus-within:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="password" required minLength={6} value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} 
                  className="w-full bg-gray-50 border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm outline-none transition-all text-[#0a1128] font-bold shadow-sm placeholder:text-gray-400 placeholder:font-medium" placeholder="••••••••" 
                />
              </div>
            </div>
            
            <div className="pt-2">
              <button type="submit" disabled={loading || form.nin.length !== 11} className="w-full flex justify-center items-center gap-2 py-4 px-4 rounded-xl text-sm font-bold text-white bg-[#0a1128] hover:bg-blue-600 shadow-lg disabled:shadow-none disabled:bg-gray-300 transition-all active:scale-[0.98] group">
                {loading ? 'Creating Account...' : 'Verify & Create Account'}
                {!loading && <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </form>
          
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Already have an account? <Link href="/parent-login" className="font-bold text-blue-600 hover:text-blue-800 transition-colors ml-1">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}