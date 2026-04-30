'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

// --- NEW LUCIDE ICONS ---
import { 
  Settings, CalendarRange, ChevronDown, Building2, 
  Mail, Phone, MapPin, UserPlus, ShieldAlert, 
  Trash2, Send, Save, Users
} from 'lucide-react'

export default function SettingsPage() {
  const [loading, setLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingCalendar, setIsSavingCalendar] = useState(false)
  const [isInviting, setIsInviting] = useState(false)
  
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const [profile, setProfile] = useState({ finance_email: '', phone: '', address: '' })
  const [calendar, setCalendar] = useState({ session: '2026/2027', term: 'First Term' })
  
  const [users, setUsers] = useState<any[]>([])
  const [newUser, setNewUser] = useState({ email: '', role: 'Read-Only' })

  const sessionList = ["2024/2025", "2025/2026", "2026/2027", "2027/2028"]
  const termList = ["First Term", "Second Term", "Third Term"]

  useEffect(() => {
    const initializePage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: schoolProfile } = await supabase
          .from('partner_schools')
          .select('name')
          .eq('id', user.id)
          .single()

        if (schoolProfile) {
          setTargetSchool(schoolProfile.name)
          setSchoolId(user.id)
        }
      } catch (err) {
        console.error("Auth Error:", err)
      } finally {
        setIsInitializing(false)
      }
    }
    initializePage()
  }, [])

  useEffect(() => {
    if (!schoolId || !targetSchool) return

    const fetchSettingsData = async () => {
      setLoading(true)
      try {
        const { data: schoolData, error: schoolError } = await supabase
          .from('partner_schools')
          .select('finance_email, contact_phone, current_session, current_term')
          .eq('id', schoolId) 
          .single()
        
        if (schoolError) console.warn("Error fetching school data:", schoolError.message)
        
        if (schoolData) {
          setProfile({
            finance_email: schoolData.finance_email || '',
            phone: schoolData.contact_phone || '',
            address: '' // Change to: schoolData.address || '' (once you add the column)
          })
          setCalendar({
            session: schoolData.current_session || '2026/2027',
            term: schoolData.current_term || 'First Term'
          })
        }

        const { data: userData } = await supabase
          .from('school_users')
          .select('*')
          .eq('school_name', targetSchool)
          .order('created_at', { ascending: true })
        
        if (userData) setUsers(userData)

      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }

    fetchSettingsData()
  }, [schoolId, targetSchool])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolId) return
    setIsSavingProfile(true)
    try {
      const { error } = await supabase.from('partner_schools').update({
        finance_email: profile.finance_email,
        contact_phone: profile.phone,
        // address: profile.address  <-- UNCOMMENT THIS AFTER ADDING THE COLUMN IN SUPABASE
      }).eq('id', schoolId) 

      if (error) throw error
      alert("School profile updated successfully.")
    } catch (err: any) {
      alert(`Update failed: ${err.message}`)
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleUpdateCalendar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!schoolId) return
    if (!window.confirm(`Are you sure you want to change the active term to ${calendar.term} (${calendar.session})? This will update your entire dashboard view.`)) return
    
    setIsSavingCalendar(true)
    try {
      const { error } = await supabase.from('partner_schools').update({
        current_session: calendar.session,
        current_term: calendar.term
      }).eq('id', schoolId)

      if (error) throw error
      alert("Academic calendar updated globally!")
    } catch (err: any) {
      alert(`Update failed: ${err.message}`)
    } finally {
      setIsSavingCalendar(false)
    }
  }

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetSchool) return
    setIsInviting(true)
    try {
      const { error } = await supabase.from('school_users').insert({
        school_name: targetSchool, user_email: newUser.email, role: newUser.role
      })
      if (error) throw error
      alert(`Invitation sent to ${newUser.email}`)
      setNewUser({ email: '', role: 'Read-Only' })
      const { data: userData } = await supabase.from('school_users').select('*').eq('school_name', targetSchool).order('created_at', { ascending: true })
      if (userData) setUsers(userData)
    } catch (err: any) {
      alert(`Invitation failed: ${err.message}`)
    } finally {
      setIsInviting(false)
    }
  }

  const handleRemoveUser = async (id: string, email: string) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${email}?`)) return
    try {
      const { error } = await supabase.from('school_users').delete().eq('id', id)
      if (error) throw error
      setUsers(users.filter(u => u.id !== id))
    } catch (err: any) {
      alert(`Could not remove user: ${err.message}`)
    }
  }

  if (isInitializing || loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-full flex items-center justify-center animate-pulse">Loading Configuration...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
          <Settings className="w-8 h-8 text-blue-600" />
          School Settings
        </h1>
        <p className="text-gray-500 font-medium text-sm">Manage your institution's profile, academic calendar, and staff access.</p>
      </div>
  
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* LEFT COLUMN: Configuration */}
        <div className="space-y-8">
          
          {/* Global Academic Calendar */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-10 -mt-10 z-0"></div>
            
            <div className="p-6 md:p-8 border-b border-gray-50 bg-white relative z-10">
              <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
                <CalendarRange className="w-5 h-5 text-blue-600" />
                Global Academic Calendar
              </h3>
              <p className="text-xs text-gray-500 mt-1 font-medium">Changing this sets the active dashboard view for your entire school.</p>
            </div>
            
            <form onSubmit={handleUpdateCalendar} className="p-6 md:p-8 space-y-5 relative z-10 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="relative">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Active Session</label>
                  <div className="relative">
                    <select 
                      value={calendar.session} 
                      onChange={e => setCalendar({...calendar, session: e.target.value})}
                      className="w-full border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] font-bold bg-gray-50 focus:bg-white shadow-sm transition-all appearance-none cursor-pointer"
                    >
                      {sessionList.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                
                <div className="relative">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Active Term</label>
                  <div className="relative">
                    <select 
                      value={calendar.term} 
                      onChange={e => setCalendar({...calendar, term: e.target.value})}
                      className="w-full border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] font-bold bg-gray-50 focus:bg-white shadow-sm transition-all appearance-none cursor-pointer"
                    >
                      {termList.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <button 
                type="submit" 
                disabled={isSavingCalendar || !schoolId} 
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-4 rounded-xl text-sm font-bold hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/20 disabled:shadow-none disabled:from-blue-300 disabled:to-blue-300 active:scale-95 transition-all flex items-center justify-center gap-2 group"
              >
                <Save className="w-4 h-4" />
                {isSavingCalendar ? 'Syncing Calendar...' : 'Set Active Calendar'}
              </button>
            </form>
          </div>
  
          {/* Profile Form */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit relative">
            <div className="p-6 md:p-8 border-b border-gray-50 bg-white">
              <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Institution Profile
              </h3>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="p-6 md:p-8 space-y-5">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Official Finance Email</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    required type="email" 
                    value={profile.finance_email} 
                    onChange={e => setProfile({...profile, finance_email: e.target.value})} 
                    className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] bg-gray-50 focus:bg-white font-medium shadow-sm transition-all" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Support Contact Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    type="tel" 
                    value={profile.phone} 
                    onChange={e => setProfile({...profile, phone: e.target.value})} 
                    className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] bg-gray-50 focus:bg-white font-mono shadow-sm transition-all" 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Registered Address</label>
                <div className="relative">
                  <div className="absolute top-3.5 left-4 pointer-events-none">
                    <MapPin className="h-4 w-4 text-gray-400" />
                  </div>
                  <textarea 
                    rows={3} 
                    value={profile.address} 
                    onChange={e => setProfile({...profile, address: e.target.value})} 
                    className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] bg-gray-50 focus:bg-white font-medium resize-none shadow-sm transition-all leading-relaxed"
                  ></textarea>
                </div>
              </div>
              
              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={isSavingProfile || !schoolId} 
                  className="w-full bg-[#0a1128] text-white px-5 py-4 rounded-xl text-sm font-bold hover:bg-blue-600 shadow-sm disabled:bg-gray-300 active:scale-95 transition-colors flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
  
        {/* RIGHT COLUMN: User Management */}
        <div className="space-y-8">
          
          {/* Invite Staff */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit">
            <div className="p-6 md:p-8 border-b border-gray-50 bg-white">
              <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Invite Staff
              </h3>
            </div>
            
            <form onSubmit={handleInviteUser} className="p-6 md:p-8">
              <div className="flex flex-col sm:flex-row gap-4 mb-4">
                <div className="flex-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-400" />
                  </div>
                  <input 
                    required 
                    type="email" 
                    placeholder="staff@school.edu.ng" 
                    value={newUser.email} 
                    onChange={e => setNewUser({...newUser, email: e.target.value})} 
                    className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] bg-gray-50 focus:bg-white font-medium shadow-sm transition-all" 
                  />
                </div>
                <div className="sm:w-48 shrink-0 relative">
                  <select 
                    value={newUser.role} 
                    onChange={e => setNewUser({...newUser, role: e.target.value})} 
                    className="w-full border border-gray-200 pl-4 pr-10 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] font-bold bg-white appearance-none shadow-sm transition-all cursor-pointer"
                  >
                    <option value="Read-Only">Read-Only</option>
                    <option value="Finance Admin">Finance Admin</option>
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              
              <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mb-5">
                <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
                  <strong className="font-extrabold text-[#0a1128]">Finance Admins</strong> can request withdrawals. <strong className="font-extrabold text-[#0a1128]">Read-Only</strong> users can only view dashboards and reports.
                </p>
              </div>
              
              <button 
                type="submit" 
                disabled={isInviting || !targetSchool} 
                className="w-full bg-[#0a1128] text-white px-5 py-4 rounded-xl text-sm font-bold hover:bg-blue-600 disabled:bg-gray-300 shadow-sm active:scale-95 transition-colors flex items-center justify-center gap-2 group"
              >
                {isInviting ? 'Sending...' : 'Send Invitation Link'}
                {!isInviting && <Send className="w-4 h-4 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
              </button>
            </form>
          </div>
  
          {/* Active Administrators */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit">
            <div className="p-6 md:p-8 border-b border-gray-50 bg-white">
              <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-blue-600" />
                Active Administrators
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
                <tbody className="divide-y divide-gray-50">
                  {users.length === 0 ? (
                    <tr>
                      <td className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-gray-400 mb-3">
                          <Users className="w-6 h-6" />
                        </div>
                        <p className="text-[#0a1128] font-bold text-sm">No additional users.</p>
                        <p className="text-xs text-gray-500 mt-1">Invite staff members above to grant access.</p>
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50 transition-colors group">
                        <td className="p-5 md:p-6">
                          <p className="font-bold text-sm text-[#0a1128] mb-1.5">{user.user_email}</p>
                          <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border inline-flex ${
                            user.role === 'Finance Admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-5 md:p-6 text-right">
                          <button 
                            onClick={() => handleRemoveUser(user.id, user.user_email)} 
                            className="text-red-600 hover:text-red-700 font-bold text-[11px] bg-white px-4 py-2 rounded-xl border border-red-100 shadow-sm hover:bg-red-50 hover:border-red-200 active:scale-95 transition-all inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100"
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