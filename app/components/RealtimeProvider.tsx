'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function RealtimeProvider() {
  useEffect(() => {
    // Open a single, global connection to the Supabase Realtime engine
    const channel = supabase
      .channel('global-payterm-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public' }, // Listens to ALL INSERT/UPDATE/DELETE events on enabled tables
        (payload) => {
          // When the database changes, broadcast a custom event across the browser window
          window.dispatchEvent(
            new CustomEvent('payterm-db-update', { detail: payload })
          )
        }
      )
      .subscribe()

    // Cleanup the connection if the app is closed
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  return null // This component renders nothing visually
}