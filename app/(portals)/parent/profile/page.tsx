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
    <div className="w-full max-w-2xl mx-auto md:p-6 lg:p-10 animate-in fade-in pb-24">
      
      {/* HEADER SECTION */}
      <div className="p-5 md:p-0 mb-2 md:mb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">My Profile</h1>
          <p className="text-gray-500 text-base">Manage your personal details and account security.</p>
        </div>
        <button 
          onClick={handleLogout}
          className="hidden sm:flex bg-red-50 text-red-600 border border-red-100 px-5 py-3 rounded-2xl text-sm font-bold hover:bg-red-100 transition-colors active:scale-95 items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
      </div>
  
      {/* PROFILE CARD - Edge to edge on mobile */}
      <div className="bg-white md:rounded-3xl border-y md:border border-gray-200 md:shadow-sm overflow-hidden p-5 md:p-8">
        
        <div className="flex items-center gap-5 mb-8 border-b border-gray-100 pb-8">
          <div className="w-20 h-20 bg-blue-50 border border-blue-100 rounded-full flex items-center justify-center text-blue-600 font-black text-3xl shrink-0">
            {parentData.full_name.charAt(0)}
          </div>
          <div>
            <h3 className="text-2xl font-bold text-gray-900 tracking-tight">{parentData.full_name}</h3>
            <p className="text-sm text-gray-500 font-mono mt-1 bg-gray-50 inline-block px-2 py-0.5 rounded-md border border-gray-100">
              ID: {parentData.id.split('-')[0]}
            </p>
          </div>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Registered Email Address</label>
            <input 
              disabled 
              type="text" 
              value={parentData.email} 
              className="w-full border border-gray-200 bg-gray-50 p-4 rounded-2xl text-base font-medium text-gray-600 cursor-not-allowed" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone Number</label>
            <input 
              disabled 
              type="text" 
              value={parentData.phone} 
              className="w-full border border-gray-200 bg-gray-50 p-4 rounded-2xl text-base font-mono font-medium text-gray-600 cursor-not-allowed" 
            />
          </div>
        </div>
  
        <button 
          onClick={handleLogout}
          className="sm:hidden w-full mt-8 bg-red-50 text-red-600 border border-red-100 py-4 rounded-2xl font-bold active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Sign Out
        </button>
  
      </div>
    </div>
  )
}