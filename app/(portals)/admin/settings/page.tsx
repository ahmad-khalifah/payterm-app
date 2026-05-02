'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync' // <-- The Hook
import { 
  Settings, SlidersHorizontal, Percent, Mail,
  AlertTriangle, Save, UserPlus, ShieldAlert, 
  Trash2, ChevronDown, Send, Shield
} from 'lucide-react'

export default function AdminSettingsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) // Session Lock
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState(false)
  
  // Platform Config State
  const [config, setConfig] = useState({
    margin: 5,
    maintenance: false
  })

  // HQ Users State
  const [hqUsers, setHqUsers] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ email: '', role: 'Support Agent' })

  // 1. Pure Fetch Function
  const fetchSettings = useCallback(async (isMounted: boolean = true, isSilent: boolean = false) => {
    try {
      if (isMounted && !isSilent) setLoading(true)
      
      const { data: configData } = await supabase.from('platform_settings').select('*').eq('id', 1).single()
      
      if (configData && isMounted) {
        setConfig({
          margin: Number(configData.escrow_fee_percentage || 0.05) * 100,
          maintenance: configData.maintenance_mode || false
        })
      }

      const { data: usersData } = await supabase.from('hq_users').select('*').order('created_at', { ascending: true })
      if (usersData && isMounted) setHqUsers(usersData)

    } catch (err: any) {
      console.error("Settings Fetch Error:", err)
      if (isMounted && !isSilent) toast.error("Failed to load platform configuration.")
    } finally {
      if (isMounted && !isSilent) setLoading(false)
    }
  }, [])

  // 2. THE HOOK GOES HERE: At the top level!
  useRealtimeSync(() => fetchSettings(true, true))

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
          await fetchSettings(isMounted, false)
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
  }, [router, fetchSettings])

  // --- CUSTOM INTERACTIVE TOASTS ---
  const confirmSaveConfig = (e: React.FormEvent) => {
    e.preventDefault()
    toast((t) => (
      <div className="flex flex-col gap-3 max-w-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-[#0a1128] text-sm">Modify Global Settings?</h3>
            <p className="text-xs text-gray-500 mt-1">WARNING: Changing the escrow fee percentage or maintenance mode will affect the platform globally. Proceed?</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={() => { toast.dismiss(t.id); executeSaveConfig(); }} className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors shadow-sm">
            Yes, Apply Changes
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const executeSaveConfig = async () => {
    setIsSaving(true)
    const loadingToast = toast.loading("Syncing platform variables...")
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          escrow_fee_percentage: Number(config.margin) / 100,
          maintenance_mode: config.maintenance
        })
        .eq('id', 1)

      if (error) throw error
      toast.success("Global platform settings updated successfully.", { id: loadingToast })
      
      // Re-fetch to confirm update
      fetchSettings(true, true)

    } catch (err: any) {
      toast.error(`Update Failed: ${err.message}`, { id: loadingToast })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAddingUser(true)
    const loadingToast = toast.loading("Provisioning access...")
    try {
      const { error } = await supabase.from('hq_users').insert({
        user_email: newUser.email,
        role: newUser.role
      })
      if (error) throw error
      
      toast.success(`${newUser.email} granted ${newUser.role} access.`, { id: loadingToast })
      setNewUser({ email: '', role: 'Support Agent' })
      
      // Re-fetch table silently
      fetchSettings(true, true)
    } catch (err: any) {
      toast.error(`Failed to add staff: ${err.message}`, { id: loadingToast })
    } finally {
      setIsAddingUser(false)
    }
  }

  const confirmRevokeStaff = (id: string, email: string) => {
    toast((t) => (
      <div className="flex flex-col gap-3 max-w-sm">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-[#0a1128] text-sm">Revoke HQ Access?</h3>
            <p className="text-xs text-gray-500 mt-1">Are you sure you want to completely revoke HQ access for <strong>{email}</strong>?</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-2">
          <button onClick={() => toast.dismiss(t.id)} className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-md transition-colors">
            Cancel
          </button>
          <button onClick={() => { toast.dismiss(t.id); executeRevokeStaff(id); }} className="px-3 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-sm">
            Yes, Revoke
          </button>
        </div>
      </div>
    ), { duration: Infinity })
  }

  const executeRevokeStaff = async (id: string) => {
    const loadingToast = toast.loading("Revoking access...")
    try {
      const { error } = await supabase.from('hq_users').delete().eq('id', id)
      if (error) throw error
      
      toast.success("HQ staff access revoked.", { id: loadingToast })
      
      // Re-fetch table silently
      fetchSettings(true, true)
    } catch (err: any) {
      toast.error(`Failed to revoke access: ${err.message}`, { id: loadingToast })
    }
  }

  if (isInitializing || loading) return <div className="p-10 text-center font-bold text-[#0a1128] h-screen flex items-center justify-center uppercase tracking-widest animate-pulse">Loading HQ Configuration...</div>

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in pb-20 relative">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" />
            System Settings
          </h1>
          <p className="text-gray-500 font-medium text-sm">Manage global platform variables and internal PayTerm HQ staff access.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        {/* GLOBAL CONFIGURATION */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm h-fit relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/80 rounded-full blur-3xl -mt-10 -mr-10 transition-transform group-hover:scale-110 pointer-events-none"></div>
          
          <div className="p-6 md:p-8 border-b border-gray-50 bg-white relative z-10">
            <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" />
              Platform Configuration
            </h3>
          </div>
          
          <form onSubmit={confirmSaveConfig} className="p-6 md:p-8 space-y-6 relative z-10 bg-white">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Escrow Fee Percentage (%)</label>
              <div className="relative group/input">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Percent className="w-4 h-4 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                </div>
                <input 
                  type="number" step="0.1" 
                  value={Number.isNaN(Number(config.margin)) ? '' : config.margin} 
                  onChange={e => setConfig({...config, margin: e.target.value === '' ? '' : Number(e.target.value) as any})}
                  className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-gray-50 focus:bg-white font-mono text-[#0a1128] font-bold shadow-sm transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400 mt-2 font-medium">Applies to new fee generation only. Existing plans remain unaffected.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-red-50/50 border border-red-100 rounded-2xl mt-6 transition-colors hover:bg-red-50">
              <div className="flex items-start gap-3 mb-4 sm:mb-0">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-800 tracking-tight">Maintenance Mode</p>
                  <p className="text-xs text-red-600 mt-0.5 font-medium">Blocks new parent onboarding across all schools.</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={config.maintenance} onChange={e => setConfig({...config, maintenance: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600 shadow-inner"></div>
              </label>
            </div>

            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isSaving} 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-4 rounded-xl text-sm font-bold hover:from-blue-700 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-300 transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none active:scale-95 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Syncing...' : 'Lock Global Settings'}
              </button>
            </div>
          </form>
        </div>

        {/* HQ STAFF MANAGEMENT */}
        <div className="space-y-8">
          
          {/* Provision HQ Staff */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
            <div className="p-6 md:p-8 border-b border-gray-50 bg-white">
              <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Provision HQ Staff
              </h3>
            </div>
            
            <form onSubmit={handleAddStaff} className="p-6 md:p-8">
              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                <div className="flex-1 relative group/input">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="w-4 h-4 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                  </div>
                  <input 
                    required type="email" placeholder="staff@payterm.ng" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-gray-50 focus:bg-white text-[#0a1128] font-bold shadow-sm transition-all"
                  />
                </div>
                
                <div className="sm:w-48 shrink-0 relative">
                  <select 
                    value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full border border-gray-200 pl-4 pr-10 py-3.5 rounded-xl text-sm font-bold text-[#0a1128] bg-white outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm transition-all appearance-none cursor-pointer"
                  >
                    <option value="Super Admin">Super Admin</option>
                    <option value="Finance">Finance</option>
                    <option value="Support Agent">Support Agent</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isAddingUser}
                className="w-full bg-[#0a1128] text-white px-5 py-4 rounded-xl text-sm font-bold hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm active:scale-95 flex items-center justify-center gap-2 group"
              >
                {isAddingUser ? 'Provisioning...' : 'Provision Access'}
                {!isAddingUser && <Send className="w-4 h-4 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </button>
            </form>
          </div>

          {/* ACTIVE Roster */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit">
            <div className="p-6 border-b border-gray-50 bg-white">
              <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                Active HQ Roster
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <tbody className="divide-y divide-gray-50">
                  {hqUsers.length === 0 ? (
                    <tr>
                      <td className="p-10 text-center text-sm font-medium text-gray-500">No HQ staff provisioned.</td>
                    </tr>
                  ) : (
                    hqUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-5 md:p-6">
                          <div className="flex items-center gap-2.5 mb-1.5">
                            <Shield className="w-4 h-4 text-gray-400" />
                            <p className="font-extrabold text-[#0a1128]">{user.user_email}</p>
                          </div>
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border inline-block ${
                            user.role === 'Super Admin' ? 'bg-red-50 text-red-700 border-red-200' : 
                            user.role === 'Finance' ? 'bg-green-50 text-green-700 border-green-200' : 
                            'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-5 md:p-6 text-right">
                          <button 
                            onClick={() => confirmRevokeStaff(user.id, user.user_email)} 
                            className="text-red-600 bg-white hover:bg-red-50 border border-red-100 hover:border-red-200 px-4 py-2 rounded-xl font-bold text-[11px] uppercase tracking-wider transition-all shadow-sm active:scale-95 inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Revoke
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}