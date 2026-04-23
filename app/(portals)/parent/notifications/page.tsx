'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  const fetchNotifications = async (uid: string) => {
    try {
      // NOTE: If your database uses 'user_id' instead of 'parent_id', change it here!
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('parent_id', uid)
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setNotifications(data)
    } catch (err: any) {
      // FIX: Extracts the actual Postgres error message instead of an empty {}
      console.error("Error fetching notifications:", err.message || JSON.stringify(err, null, 2))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let channel: any;

    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      
      await fetchNotifications(user.id)

      // THE FIX: Uniquely name the channel and strictly chain .on() BEFORE .subscribe()
      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          'postgres_changes',
          { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'notifications',
            filter: `parent_id=eq.${user.id}` // Filters so parents only see their own alerts
          },
          (payload) => {
            console.log('New notification received:', payload)
            fetchNotifications(user.id) // Refreshes the list silently
          }
        )
        .subscribe()
    }

    initialize()

    // THE FIX: Proper cleanup. This destroys the channel when the component unmounts,
    // preventing the "callbacks after subscribe" crash in React Strict Mode.
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

      if (error) throw error
      // Update local state to feel instant
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err: any) {
      console.error("Error marking as read:", err.message)
    }
  }

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-full flex items-center justify-center animate-pulse">Loading Alerts...</div>

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-4xl mx-auto animate-in fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0a1128] tracking-tight mb-2">Notifications</h1>
        <p className="text-gray-500 text-sm">Updates regarding your child's 60/40 payment plans and school verifications.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center">
            <div className="bg-gray-50 p-4 rounded-full text-gray-400 mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
            </div>
            <p className="text-[#0a1128] font-bold">You're all caught up!</p>
            <p className="text-sm text-gray-500 mt-1">No new alerts at this time.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {notifications.map((note) => (
              <li 
                key={note.id} 
                className={`p-5 transition-colors flex gap-4 ${note.is_read ? 'bg-white opacity-70' : 'bg-blue-50/30'}`}
              >
                <div className="mt-1">
                  {!note.is_read ? (
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                    </span>
                  ) : (
                    <span className="flex h-3 w-3 rounded-full bg-gray-300"></span>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`text-sm mb-1 ${note.is_read ? 'font-medium text-gray-700' : 'font-bold text-[#0a1128]'}`}>
                    {note.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2 leading-relaxed">{note.message}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                      {new Date(note.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {!note.is_read && (
                      <button 
                        onClick={() => markAsRead(note.id)}
                        className="text-[10px] font-bold text-blue-600 uppercase tracking-wider hover:text-blue-800 transition-colors"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}