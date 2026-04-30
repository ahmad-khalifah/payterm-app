'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { LogOut, User, Mail, Phone, ShieldCheck } from 'lucide-react'

export default function ParentProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [parentData, setParentData] = useState<any>(null)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) throw new Error("Not logged in")

        const { data: profile, error: dbError } = await supabase
          .from('parents')
          .select('*')
          .eq('id', user.id)
          .single()

        if (dbError) throw dbError
        
        setParentData(profile)
        setLoading(false)

      } catch (err: any) {
        console.error("Profile Error:", err)
        if (err.message === "Not logged in") {
          router.push('/parent-login')
        } else {
          alert("We found your login, but your Parent Profile data is missing. Please create a brand new account to sync the database.")
          router.push('/parent') 
        }
      }
    }

    fetchSession()
  }, [router])

  // Global Logout Action
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/parent-login')
  }

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase animate-pulse h-full flex items-center justify-center">Securing Session...</div>
  if (!parentData) return null

  return (
    <div className="w-full max-w-3xl mx-auto md:p-4 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="p-4 md:p-0 mb-8 flex justify-between items-end gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0a1128] mb-2 tracking-tight flex items-center gap-3">
            <User className="w-7 h-7 text-blue-600" />
            My Profile
          </h1>
          <p className="text-gray-500 font-medium text-sm">Manage your personal details and account security.</p>
        </div>
        <button onClick={handleLogout} className="hidden sm:flex bg-white text-red-600 border border-red-100 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-50 hover:border-red-200 transition-all items-center gap-2 active:scale-95 shadow-sm">
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
  
      <div className="bg-white md:rounded-3xl border-y md:border border-gray-100 shadow-sm overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mt-20 -mr-20"></div>

        <div className="p-6 md:p-8 relative z-10">
          <div className="flex items-center gap-5 mb-8 border-b border-gray-50 pb-8">
            <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-3xl shrink-0 shadow-inner">
              {parentData.full_name.charAt(0)}
            </div>
            <div className="min-w-0 pr-2">
              <h3 className="text-2xl font-extrabold text-[#0a1128] tracking-tight truncate mb-1.5">{parentData.full_name}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-mono font-bold bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200 truncate max-w-full flex items-center gap-1.5 uppercase tracking-wider">
                  <ShieldCheck className="w-3 h-3 text-green-500" />
                  ID: {parentData.id.split('-')[0]}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                  disabled 
                  type="text" 
                  value={parentData.email} 
                  className="w-full border border-gray-200 bg-gray-50 pl-11 pr-4 py-4 rounded-xl text-sm font-bold text-gray-600 cursor-not-allowed shadow-sm" 
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Phone className="w-4 h-4 text-gray-400" />
                </div>
                <input 
                  disabled 
                  type="text" 
                  value={parentData.phone} 
                  className="w-full border border-gray-200 bg-gray-50 pl-11 pr-4 py-4 rounded-xl text-sm font-mono font-bold text-gray-600 cursor-not-allowed shadow-sm" 
                />
              </div>
            </div>
          </div>
  
          <button onClick={handleLogout} className="sm:hidden w-full mt-8 bg-white text-red-600 border border-red-100 py-4 rounded-xl text-sm font-bold active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm hover:bg-red-50 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}