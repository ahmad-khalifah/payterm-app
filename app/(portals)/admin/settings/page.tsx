'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

import { 
  Settings, SlidersHorizontal, Percent, Mail,
  AlertTriangle, Save, UserPlus, ShieldAlert, 
  Trash2, ChevronDown, Send, Shield
} from 'lucide-react'

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [config, setConfig] = useState({ margin: 5, maintenance: false })
  const [hqUsers, setHqUsers] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ email: '', role: 'Support Agent' })

  const fetchSettings = async () => {
    try {
      const { data: configData } = await supabase.from('platform_settings').select('*').eq('id', 1).single()
      if (configData) setConfig({ margin: Number(configData.escrow_fee_percentage || 0.05) * 100, maintenance: configData.maintenance_mode || false })
      const { data: usersData } = await supabase.from('hq_users').select('*').order('created_at', { ascending: true })
      if (usersData) setHqUsers(usersData)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchSettings() }, [])

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!window.confirm("WARNING: Changing the escrow fee percentage will affect all future parent installment calculations. Proceed?")) return
    setIsSaving(true)
    try {
      const { error } = await supabase.from('platform_settings').update({ escrow_fee_percentage: Number(config.margin) / 100, maintenance_mode: config.maintenance }).eq('id', 1)
      if (error) throw error
      alert("Settings updated successfully.")
    } catch (err: any) { alert(err.message) } finally { setIsSaving(false) }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { error } = await supabase.from('hq_users').insert({ user_email: newUser.email, role: newUser.role })
      if (error) throw error
      setNewUser({ email: '', role: 'Support Agent' }); fetchSettings()
    } catch (err: any) { alert(err.message) }
  }

  const handleRevokeStaff = async (id: string) => {
    if (!window.confirm(`Revoke HQ access?`)) return
    try {
      const { error } = await supabase.from('hq_users').delete().eq('id', id)
      if (error) throw error
      fetchSettings()
    } catch (err: any) { alert(err.message) }
  }

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase h-screen flex items-center justify-center animate-pulse">Loading HQ...</div>

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in pb-20 relative">
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
            <Settings className="w-8 h-8 text-blue-600" /> System Settings
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm h-fit relative overflow-hidden group">
          <div className="p-6 md:p-8 border-b border-gray-50 bg-white relative z-10">
            <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-blue-600" /> Platform Configuration
            </h3>
          </div>
          
          <form onSubmit={handleSaveConfig} className="p-6 md:p-8 space-y-6 relative z-10 bg-white">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Escrow Fee Percentage (%)</label>
              <div className="relative group/input">
                <Percent className="absolute left-4 top-4 w-4 h-4 text-gray-400 group-focus-within/input:text-blue-600 transition-colors" />
                <input 
                  type="number" step="0.1" value={Number.isNaN(Number(config.margin)) ? '' : config.margin} onChange={e => setConfig({...config, margin: e.target.value === '' ? '' : Number(e.target.value) as any})}
                  className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-gray-50 font-mono text-[#0a1128] font-bold shadow-sm transition-all"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-5 bg-red-50/50 border border-red-100 rounded-2xl mt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div><p className="text-sm font-bold text-red-800 tracking-tight">Maintenance Mode</p></div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input type="checkbox" checked={config.maintenance} onChange={e => setConfig({...config, maintenance: e.target.checked})} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
              </label>
            </div>

            <button type="submit" disabled={isSaving} className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-4 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 active:scale-95 flex justify-center gap-2">
              <Save className="w-4 h-4" /> {isSaving ? 'Syncing...' : 'Lock Global Settings'}
            </button>
          </form>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
            <div className="p-6 border-b border-gray-50 bg-white">
              <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2"><UserPlus className="w-5 h-5 text-blue-600" /> Provision HQ Staff</h3>
            </div>
            
            <form onSubmit={handleAddStaff} className="p-6 md:p-8">
              <div className="flex flex-col sm:flex-row gap-4 mb-5">
                <div className="flex-1 relative group/input">
                  <Mail className="absolute left-4 top-4 w-4 h-4 text-gray-400 group-focus-within/input:text-blue-600" />
                  <input required type="email" placeholder="staff@payterm.ng" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}
                    className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 text-[#0a1128] font-bold shadow-sm"
                  />
                </div>
                <div className="sm:w-48 shrink-0 relative">
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full border border-gray-200 pl-4 pr-10 py-3.5 rounded-xl text-sm font-bold text-[#0a1128] outline-none focus:ring-2 focus:ring-blue-600 shadow-sm appearance-none"
                  >
                    <option value="Super Admin">Super Admin</option><option value="Finance">Finance</option><option value="Support Agent">Support Agent</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <button type="submit" className="w-full bg-[#0a1128] text-white py-4 rounded-xl text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm active:scale-95 flex items-center justify-center gap-2">
                Provision Access <Send className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit">
            <div className="p-6 border-b border-gray-50 bg-white">
              <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2"><ShieldAlert className="w-5 h-5 text-blue-600" /> Active Roster</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <tbody className="divide-y divide-gray-50">
                  {hqUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-5 md:p-6">
                        <div className="flex items-center gap-2.5 mb-1.5">
                          <Shield className="w-4 h-4 text-gray-400" />
                          <p className="font-extrabold text-[#0a1128]">{user.user_email}</p>
                        </div>
                        <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase border inline-block ${
                          user.role === 'Super Admin' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>{user.role}</span>
                      </td>
                      <td className="p-5 md:p-6 text-right">
                        <button onClick={() => handleRevokeStaff(user.id)} className="text-red-600 bg-white hover:bg-red-50 border border-red-100 px-4 py-2 rounded-xl font-bold text-[11px] uppercase transition-all shadow-sm active:scale-95 inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100">
                          <Trash2 className="w-3.5 h-3.5" /> Revoke
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