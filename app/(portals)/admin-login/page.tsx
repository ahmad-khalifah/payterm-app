'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'

export default function AdminLogin() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error
      
      // Successfully logged in, push to the dashboard
      router.push('/admin/schools')
    } catch (err: any) {
      alert(`Login Failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-sm border border-gray-200">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-[#0a1128] tracking-tight mb-1">Admin Portal</h1>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">System Access</p>
      </div>
      
      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Official Email</label>
          <input 
            required 
            type="email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 focus:bg-white transition-colors" 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">Password</label>
          <input 
            required 
            type="password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 focus:bg-white transition-colors" 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading} 
          className="w-full bg-[#0a1128] text-white px-5 py-3.5 rounded-xl font-bold hover:bg-[#15234b] disabled:opacity-50 transition-colors mt-4 shadow-sm"
        >
          {loading ? 'Loading...' : 'Login'}
        </button>
      </form>
    </div>
  )
}