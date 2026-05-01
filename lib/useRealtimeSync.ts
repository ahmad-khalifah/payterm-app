'use client'

import { useEffect } from 'react'

/**
 * A global hook that listens to the PayTerm Realtime Engine.
 * Automatically runs your fetch function silently when the database updates.
 * 
 * @param syncAction The fetch function to run (e.g., fetchSchools, fetchParents)
 */
export function useRealtimeSync(syncAction: () => void) {
  useEffect(() => {
    const handleSilentRefresh = () => {
      syncAction()
    }

    // Start listening to the global engine
    window.addEventListener('payterm-db-update', handleSilentRefresh)

    // Clean up the listener when the user leaves the page
    return () => {
      window.removeEventListener('payterm-db-update', handleSilentRefresh)
    }
  }, [syncAction]) // Re-binds if the fetch function changes
}