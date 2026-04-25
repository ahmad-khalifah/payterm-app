'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function AdminParentsDirectory() {
  const [loading, setLoading] = useState(true)
  const [parents, setParents] = useState<any[]>([])
  const [error, setError] = useState('')

  const fetchAllParents = async () => {
    try {
      const { data, error } = await supabase
        .from('parents')
        .select(`
          id,
          full_name,
          email,
          phone
        `)
        // This puts the newest signups at the very top of the list
        // Note: You must have a 'created_at' column in your parents table for this to work
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        setParents(data)
      }
    } catch (err: any) {
      console.error("Error fetching parents:", err.message)
      setError("Failed to load parents directory.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAllParents()
  }, [])

  if (loading) return <div className="p-10 text-center font-bold animate-pulse">Loading directory...</div>
  if (error) return <div className="p-10 text-center text-red-600 font-bold">{error}</div>

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#0a1128] mb-2">Registered Parents</h1>
        <p className="text-gray-500 text-sm">A complete directory of all parent accounts on the platform.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200 text-xs text-[#0a1128] uppercase tracking-wide">
              <th className="p-5 font-bold">Full Name</th>
              <th className="p-5 font-bold">Email Address</th>
              <th className="p-5 font-bold">Phone Number</th>
              <th className="p-5 font-bold text-right">Account Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {parents.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-10 text-center text-gray-500">No registered parents found.</td>
              </tr>
            ) : (
              parents.map((parent) => (
                <tr key={parent.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-5 font-bold text-[#0a1128]">{parent.full_name}</td>
                  <td className="p-5 text-gray-600">{parent.email}</td>
                  <td className="p-5 text-gray-600 font-mono">{parent.phone || 'N/A'}</td>
                  <td className="p-5 text-right">
                    <span className="px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
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
  )
}