'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function AdminParentsDirectory() {
  const [loading, setLoading] = useState(true)
  const [parents, setParents] = useState<any[]>([])
  const [error, setError] = useState('')

  const fetchAllParents = async () => {
    try {
      // Fetching safely without strict database ordering to prevent crashes
      const { data, error } = await supabase
        .from('parents')
        .select('id, full_name, email, phone, created_at')
        
      if (error) throw error

      if (data) {
        // Safe JavaScript sorting (falls back gracefully if created_at is missing)
        const sortedData = data.sort((a, b) => {
          if (!a.created_at || !b.created_at) return 0;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setParents(sortedData)
      }
    } catch (err: any) {
      console.error("Error fetching parents:", err.message)
      setError("Failed to load parents directory. Check console for details.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllParents()
  }, [])

  if (loading) return <div className="p-10 text-center text-sm font-bold text-[#0a1128] uppercase tracking-widest h-full flex items-center justify-center animate-pulse">Loading Directory...</div>
  if (error) return <div className="p-10 text-center text-red-600 text-sm font-bold">{error}</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0a1128] mb-1 tracking-tight">Registered Parents</h1>
        <p className="text-gray-500 text-sm">A complete directory of all parent accounts on the platform.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-wider">
                <th className="p-4 font-bold">Full Name</th>
                <th className="p-4 font-bold">Email Address</th>
                <th className="p-4 font-bold">Phone Number</th>
                <th className="p-4 font-bold text-right">Account Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {parents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-sm font-medium text-gray-500">No registered parents found.</td>
                </tr>
              ) : (
                parents.map((parent) => (
                  <tr key={parent.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-[#0a1128] text-sm">{parent.full_name || 'Unnamed Parent'}</td>
                    <td className="p-4 text-xs text-gray-600 font-medium">{parent.email}</td>
                    <td className="p-4 text-xs text-gray-600 font-mono">{parent.phone || 'N/A'}</td>
                    <td className="p-4 text-right">
                      <span className="px-2.5 py-1 rounded text-[9px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200 inline-block">
                        Registered
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}