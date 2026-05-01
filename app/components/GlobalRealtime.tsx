'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function GlobalRealtime() {
  useEffect(() => {
    // 1. GLOBALLY OVERRIDE WINDOW.ALERT
    const originalAlert = window.alert
    window.alert = (message) => {
      // Use toast instead of the ugly browser popup
      toast(message, {
        icon: '🔔',
        style: { background: '#0a1128', color: '#fff' }
      })
    }

    // 2. GLOBAL SUPABASE LISTENER
    const channel = supabase
      .channel('global-db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' },
        (payload) => {
          console.log('Global Sync: Database updated!', payload)
          window.dispatchEvent(new CustomEvent('payterm-db-update', { detail: payload }))
        }
      )
      .subscribe()

    // Cleanup
    return () => {
      window.alert = originalAlert // Restore original alert on unmount
      supabase.removeChannel(channel)
    }
  }, [])

  return null
}