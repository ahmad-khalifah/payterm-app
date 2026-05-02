'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync' // <-- The Hook

import { Users, Search, User, Mail, Phone, CheckCircle2, FileSearch, Calendar } from 'lucide-react'

export default function AdminParentsDirectory() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) // HQ Session Lock
  const [parents, setParents] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // 1. Pure Fetch Function
  const fetchAllParents = useCallback(async (isMounted: boolean = true, isSilent: boolean = false) => {
    try {
      if (isMounted && !isSilent) setLoading(true)
      const { data, error } = await supabase
        .from('parents')
        .select('id, full_name, email, phone, created_at')
        
      if (error) throw error

      if (data && isMounted) {
        const sortedData = data.sort((a, b) => {
          if (!a.created_at || !b.created_at) return 0;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setParents(sortedData)
      }
    } catch (err: any) {
      console.error("Error fetching parents:", err.message)
      if (isMounted && !isSilent) toast.error("Failed to load parents directory.")
    } finally {
      if (isMounted && !isSilent) setLoading(false)
    }
  }, [])

  // 2. THE HOOK GOES HERE: At the top level!
  useRealtimeSync(() => fetchAllParents(true, true))

  // 3. Normal Component Initialization
  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          router.push('/admin-login')
          return
        }

        // CRITICAL HQ VERIFICATION
        const { data: hqData } = await supabase
          .from('hq_users')
          .select('role')
          .eq('user_email', user.email as string || '')
          .maybeSingle()

        if (!hqData) {
          await supabase.auth.signOut()
          router.push('/admin-login')
          return
        }

        if (isMounted) {
          // Initial non-silent load
          await fetchAllParents(isMounted, false)
        }

      } catch (err) {
        console.error("Initialization Error:", err)
        toast.error("HQ Authentication failed.")
        if (isMounted) setLoading(false)
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    initializePage()

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/admin-login')
    })

    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [router, fetchAllParents])

  // Client-side search filtering
  const filteredParents = parents.filter(p => {
    const searchString = `${p.full_name} ${p.email} ${p.phone}`.toLowerCase()
    return searchString.includes(searchQuery.toLowerCase())
  })

  if (isInitializing || loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest text-sm h-screen flex items-center justify-center animate-pulse">Initializing HQ Terminal...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20 relative">
      
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Registered Users
          </h1>
          <p className="text-gray-500 font-medium text-sm">A complete directory of all parent accounts on the platform.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
        
        <div className="p-5 md:p-6 border-b border-gray-100 bg-white flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <h2 className="text-lg font-bold text-[#0a1128]">Global Directory</h2>
          
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Search by name, email, or phone..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-sm text-[#0a1128] font-medium transition-all shadow-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="p-5">Account Name</th>
                <th className="p-5">Contact Details</th>
                <th className="p-5">Date Joined</th>
                <th className="p-5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredParents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-16 text-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                      <FileSearch className="w-8 h-8" />
                    </div>
                    <p className="text-[#0a1128] font-bold text-lg mb-1">No parents found.</p>
                    <p className="text-sm text-gray-500 font-medium">Try adjusting your search criteria.</p>
                  </td>
                </tr>
              ) : (
                filteredParents.map((parent) => (
                  <tr key={parent.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-5 align-top">
                      <div className="flex items-center gap-2.5 mt-1">
                        <User className="w-4 h-4 text-gray-400" />
                        <p className="font-extrabold text-[#0a1128] text-sm">{parent.full_name || 'Unnamed Parent'}</p>
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      <div className="flex flex-col gap-2 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-medium text-xs">{parent.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <span className="font-mono text-xs">{parent.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-5 align-top">
                      <div className="flex items-center gap-2 text-gray-500 text-xs font-medium mt-1">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        {new Date(parent.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td className="p-5 text-right align-top">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 mt-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3" />
                        Registered
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}