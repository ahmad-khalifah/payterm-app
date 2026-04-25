'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

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
        // FIX: Removed 'address' from the select to clear TypeScript errors
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
      // FIX: Removed address from update payload to clear TypeScript errors
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
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0a1128] mb-1 tracking-tight">School Settings</h1>
        <p className="text-gray-500 text-sm">Manage your institution's profile, academic calendar, and staff access.</p>
      </div>
  
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: Configuration */}
        <div className="space-y-6">
          
          {/* Global Academic Calendar */}
          <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden h-fit relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-2xl -mr-8 -mt-8 z-0"></div>
            <div className="p-5 border-b border-gray-100 bg-white relative z-10">
              <h3 className="text-base font-bold text-[#0a1128] flex items-center gap-2">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Global Academic Calendar
              </h3>
              <p className="text-[11px] text-gray-500 mt-1 font-medium">Changing this sets the active dashboard view for your entire school.</p>
            </div>
            
            <form onSubmit={handleUpdateCalendar} className="p-5 space-y-4 relative z-10 bg-white">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0a1128] mb-1.5">Active Session</label>
                  <select value={calendar.session} onChange={e => setCalendar({...calendar, session: e.target.value})}
                    className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] font-bold bg-gray-50 shadow-sm transition-all">
                    {sessionList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0a1128] mb-1.5">Active Term</label>
                  <select value={calendar.term} onChange={e => setCalendar({...calendar, term: e.target.value})}
                    className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] font-bold bg-gray-50 shadow-sm transition-all">
                    {termList.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isSavingCalendar || !schoolId} className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm disabled:bg-gray-300 active:scale-95">
                {isSavingCalendar ? 'Syncing...' : 'Set Active Calendar'}
              </button>
            </form>
          </div>
  
          {/* Profile Form */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-[#0a1128]">Institution Profile</h3>
            </div>
            <form onSubmit={handleUpdateProfile} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#0a1128] mb-1.5">Official Finance Email</label>
                <input required type="email" value={profile.finance_email} onChange={e => setProfile({...profile, finance_email: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] bg-gray-50 focus:bg-white font-medium shadow-sm transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0a1128] mb-1.5">Support Contact Number</label>
                <input type="tel" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] bg-gray-50 focus:bg-white font-mono shadow-sm transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0a1128] mb-1.5">Registered Address</label>
                <textarea rows={3} value={profile.address} onChange={e => setProfile({...profile, address: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] bg-gray-50 focus:bg-white font-medium resize-none shadow-sm transition-all"></textarea>
              </div>
              <button type="submit" disabled={isSavingProfile || !schoolId} className="w-full bg-[#0a1128] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 shadow-sm disabled:bg-gray-300 active:scale-95 transition-colors">
                {isSavingProfile ? 'Saving...' : 'Save Profile Changes'}
              </button>
            </form>
          </div>
        </div>
  
        {/* RIGHT COLUMN: User Management */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit">
            <div className="p-5 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-base font-bold text-[#0a1128]">Invite Staff</h3>
            </div>
            <form onSubmit={handleInviteUser} className="p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <input required type="email" placeholder="staff@school.edu.ng" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] bg-gray-50 focus:bg-white font-medium shadow-sm transition-all" />
                </div>
                <div className="sm:w-40 shrink-0">
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})} className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] font-bold bg-white appearance-none shadow-sm transition-all">
                    <option value="Read-Only">Read-Only</option>
                    <option value="Finance Admin">Finance Admin</option>
                  </select>
                </div>
              </div>
              <p className="text-[11px] text-gray-500 mt-3 mb-4 leading-relaxed">
                <strong>Finance Admins</strong> can request withdrawals. <strong>Read-Only</strong> users can only view dashboards and reports.
              </p>
              <button type="submit" disabled={isInviting || !targetSchool} className="w-full bg-[#0a1128] text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-600 disabled:bg-gray-300 shadow-sm active:scale-95 transition-colors">
                {isInviting ? 'Sending...' : 'Send Invitation Link'}
              </button>
            </form>
          </div>
  
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Active Administrators</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 ? (
                    <tr><td className="p-6 text-center text-xs text-gray-500 font-medium">No additional users found.</td></tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-sm text-[#0a1128]">{user.user_email}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider border inline-block ${
                            user.role === 'Finance Admin' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-100 text-gray-600 border-gray-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleRemoveUser(user.id, user.user_email)} className="text-red-600 hover:text-red-700 font-bold text-[11px] bg-white px-3 py-1.5 rounded-lg border border-red-200 shadow-sm hover:bg-red-50 active:scale-95 transition-all">Revoke</button>
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