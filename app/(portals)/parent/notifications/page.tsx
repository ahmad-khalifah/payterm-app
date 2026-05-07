'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase' // Adjust path if needed
import toast from 'react-hot-toast'
import { Bell, BellRing, CheckCircle2, Check } from 'lucide-react'
import { useRealtimeSync } from '@/lib/useRealtimeSync'

export default function NotificationsPage() {
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) // Session lock
  const [notifications, setNotifications] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  // 1. Pure Fetch Function
  const fetchNotifications = useCallback(async (uid?: string, isMounted: boolean = true) => {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('parent_id', uid || '')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data && isMounted) setNotifications(data)
    } catch (err: any) {
      console.error("Fetch error:", err.message)
      if (isMounted) toast.error("Failed to sync notifications.")
    } finally {
      if (isMounted) setLoading(false)
    }
  }, [])

  // 2. THE HOOK GOES HERE: At the top level!
  useRealtimeSync(() => {
    if (userId) fetchNotifications(userId, true)
  })

  // 3. Normal Component Initialization
  useEffect(() => {
    let channel: any;
    let isMounted = true;

    const initialize = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError || !session) {
          return // Handled by layout or middleware routing
        }
        const activeUser = session.user
        
        if (isMounted) {
          setUserId(activeUser.id)
          await fetchNotifications(activeUser.id, isMounted)

          // Set up Realtime listener specifically for notifications
          channel = supabase
            .channel(`notifications-${activeUser.id}`)
            .on(
              'postgres_changes',
              { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'notifications',
                filter: `parent_id=eq.${activeUser.id}` 
              },
              () => {
                if (isMounted) fetchNotifications(activeUser.id, isMounted) 
              }
            )
            .subscribe()
        }
      } catch (err) {
        console.error("Initialization Error:", err)
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    initialize()

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel)
    }
  }, [fetchNotifications])

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id)

      if (error) throw error
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: true } : n))
      toast.success("Notification marked as read")
    } catch (err: any) {
      toast.error("Failed to mark notification as read")
    }
  }

  if (isInitializing || loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-screen flex items-center justify-center animate-pulse">Loading Alerts...</div>

  return (
    <div className="w-full max-w-3xl mx-auto md:p-4 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="p-4 md:p-0 mb-8">
        <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
          <Bell className="w-7 h-7 text-blue-600" />
          Notifications
        </h1>
        <p className="text-gray-500 font-medium text-sm">Stay updated on your child's payment plans and school announcements.</p>
      </div>
  
      <div className="bg-white md:rounded-3xl border-y md:border border-gray-100 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center text-gray-300 mb-5 shadow-inner">
              <BellRing className="w-10 h-10" />
            </div>
            <h3 className="text-lg font-extrabold text-[#0a1128] mb-2">You're all caught up!</h3>
            <p className="text-gray-500 text-sm max-w-xs">We will notify you here when your next payment is due or when a receipt is generated.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {notifications.map((note) => (
              <li 
                key={note.id} 
                className={`p-5 md:p-6 transition-all duration-300 flex gap-4 items-start relative ${
                  note.is_read ? 'bg-white hover:bg-gray-50/50' : 'bg-blue-50/30'
                }`}
              >
                {!note.is_read && <div className="absolute left-0 top-0 w-1 h-full bg-blue-600"></div>}

                <div className="shrink-0 mt-1">
                  {!note.is_read ? (
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shadow-inner">
                      <BellRing className="w-5 h-5 animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center border border-gray-100">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 mb-1.5">
                    <h4 className={`text-base truncate tracking-tight ${note.is_read ? 'font-bold text-[#0a1128]/80' : 'font-extrabold text-[#0a1128]'}`}>
                      {note.title}
                    </h4>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
                      {new Date(note.created_at).toLocaleDateString('en-GB')}
                    </span>
                  </div>
                  
                  <p className={`text-sm mb-3 leading-relaxed ${note.is_read ? 'text-gray-500' : 'text-gray-700 font-medium'}`}>
                    {note.message}
                  </p>
                  
                  {!note.is_read && (
                    <button 
                      onClick={() => markAsRead(note.id)} 
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 hover:border-blue-300 px-3 py-1.5 rounded-lg active:scale-95 transition-all shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Mark as Read
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}