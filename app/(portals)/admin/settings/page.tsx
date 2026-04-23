'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  
  // Platform Config State
  const [config, setConfig] = useState({
    margin: 5,
    email: '',
    maintenance: false
  })

  // HQ Users State
  const [hqUsers, setHqUsers] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ email: '', role: 'Support Agent' })

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data: configData } = await supabase.from('platform_settings').select('*').eq('id', 1).single()
      if (configData) {
        setConfig({
          margin: Number(configData.platform_margin) * 100,
          email: configData.support_email,
          maintenance: configData.maintenance_mode
        })
      }

      const { data: usersData } = await supabase.from('hq_users').select('*').order('created_at', { ascending: true })
      if (usersData) setHqUsers(usersData)

    } catch (err) {
      console.error("Settings Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSettings() }, [])

  // Action: Update Global Config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.confirm("WARNING: Changing the platform margin will affect all future parent installment calculations. Proceed?")) return

    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('platform_settings')
        .update({
          platform_margin: Number(config.margin) / 100,
          support_email: config.email,
          maintenance_mode: config.maintenance
        })
        .eq('id', 1)

      if (error) throw error
      alert("Global platform settings updated successfully.")
    } catch (err: any) {
      alert(`Update Failed: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  // Action: Add HQ Staff
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('hq_users').insert({
        user_email: newUser.email,
        role: newUser.role
      })
      if (error) throw error
      alert(`${newUser.email} granted ${newUser.role} access.`)
      setNewUser({ email: '', role: 'Support Agent' })
      fetchSettings()
    } catch (err: any) {
      alert(`Failed to add staff: ${err.message}`)
    }
  }

  // Action: Revoke HQ Staff
  const handleRevokeStaff = async (id: string, email: string) => {
    if (!window.confirm(`CRITICAL: Revoke HQ access for ${email}?`)) return
    try {
      const { error } = await supabase.from('hq_users').delete().eq('id', id)
      if (error) throw error
      fetchSettings()
    } catch (err: any) {
      alert(`Failed to revoke access: ${err.message}`)
    }
  }

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] h-full flex items-center justify-center animate-pulse">Loading HQ Configuration...</div>

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0a1128] mb-2">System Settings</h1>
        <p className="text-gray-500 text-sm">Manage global platform variables and internal PayTerm HQ staff access.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GLOBAL CONFIGURATION */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm h-fit">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 rounded-t-2xl">
            <h3 className="text-lg font-bold text-[#0a1128]">Platform Configuration</h3>
          </div>
          <form onSubmit={handleSaveConfig} className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#0a1128] mb-1.5">Platform Margin (%)</label>
              <input 
                type="number" 
                step="0.1" 
                value={Number.isNaN(Number(config.margin)) ? '' : config.margin} 
                onChange={e => setConfig({...config, margin: e.target.value === '' ? '' : Number(e.target.value) as any})}
                className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] transition-all"
              />
              <p className="text-[10px] text-gray-400 mt-1.5 uppercase tracking-wider">Applies to new fee generation only.</p>
            </div>
            <div>
              <label className="block text-sm font-bold text-[#0a1128] mb-1.5">Global Support Email</label>
              <input 
                type="email" value={config.email} onChange={e => setConfig({...config, email: e.target.value})}
                className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm text-[#0a1128] transition-all"
              />
            </div>
            
            <div className="flex items-center justify-between p-4 bg-red-50 border border-red-100 rounded-xl mt-4">
              <div>
                <p className="text-sm font-bold text-red-800">Maintenance Mode</p>
                <p className="text-xs text-red-600 mt-0.5">Blocks new parent onboarding across all schools.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={config.maintenance} onChange={e => setConfig({...config, maintenance: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <button type="submit" disabled={isSaving} className="w-full bg-blue-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-colors shadow-sm mt-2">
              {isSaving ? 'Syncing...' : 'Lock Global Settings'}
            </button>
          </form>
        </div>

        {/* HQ STAFF MANAGEMENT */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-lg font-bold text-[#0a1128]">Provision HQ Staff</h3>
            </div>
            <form onSubmit={handleAddStaff} className="p-6 flex flex-col sm:flex-row gap-4">
              <input 
                required type="email" placeholder="staff@payterm.ng" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                className="flex-1 border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm text-[#0a1128] transition-all"
              />
              <select 
                value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                className="w-full sm:w-40 border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-sm font-semibold text-[#0a1128] bg-white transition-all appearance-none"
              >
                <option value="Super Admin">Super Admin</option>
                <option value="Finance">Finance</option>
                <option value="Support Agent">Support Agent</option>
              </select>
              <button type="submit" className="bg-[#0a1128] text-white px-6 py-3 rounded-xl text-sm font-bold hover:bg-[#15234b] transition-colors shadow-sm">
                Add
              </button>
            </form>
          </div>

          {/* ACTIVE Roster */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit">
            <div className="p-5 border-b border-gray-100 bg-white">
              <h3 className="text-sm font-bold text-[#0a1128] uppercase tracking-wide">Active HQ Roster</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <tbody className="divide-y divide-gray-100">
                  {hqUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-5 font-bold text-[#0a1128]">{user.user_email}</td>
                      <td className="p-5">
                        <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          user.role === 'Super Admin' ? 'bg-red-50 text-red-700 border-red-200' : 
                          user.role === 'Finance' ? 'bg-green-50 text-green-700 border-green-200' : 
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <button onClick={() => handleRevokeStaff(user.id, user.user_email)} className="text-gray-400 hover:text-red-600 font-bold text-xs transition-colors">
                          Revoke
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}