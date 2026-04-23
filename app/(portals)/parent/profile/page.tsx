'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { useRouter } from 'next/navigation'

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
          router.push('/login')
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
    router.push('/login')
  }

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase animate-pulse h-full flex items-center justify-center">Securing Session...</div>
  if (!parentData) return null

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-3xl mx-auto animate-in fade-in">
      
      {/* HEADER SECTION */}
      <div className="mb-8 md:mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] mb-2 tracking-tight">Account Settings</h1>
          <p className="text-gray-500 text-sm sm:text-base">Manage your personal credentials and security.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="bg-red-50 text-red-600 border border-red-200 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors shadow-sm flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Secure Logout
        </button>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow h-fit">
        
        <div className="flex items-center gap-5 mb-8 border-b border-gray-100 pb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-700 font-extrabold text-2xl sm:text-3xl shrink-0">
            {parentData.full_name.charAt(0)}
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-[#0a1128]">{parentData.full_name}</h3>
            <p className="text-xs sm:text-sm text-gray-500 font-mono mt-1 sm:mt-1.5">ID: {parentData.id.split('-')[0]}...</p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Registered Email Address</label>
            <input 
              disabled 
              type="text" 
              value={parentData.email} 
              className="w-full border border-gray-200 bg-gray-50/50 p-3.5 rounded-xl text-sm font-bold text-[#0a1128] cursor-not-allowed shadow-sm" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Contact Phone Number</label>
            <input 
              disabled 
              type="text" 
              value={parentData.phone} 
              className="w-full border border-gray-200 bg-gray-50/50 p-3.5 rounded-xl text-sm font-mono font-bold text-[#0a1128] cursor-not-allowed shadow-sm" 
            />
          </div>
        </div>

      </div>
    </div>
  )
}