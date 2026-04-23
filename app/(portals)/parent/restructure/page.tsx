'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function Restructure() {
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Securely fetch the actual logged-in parent
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
          .from('students')
          .select('id, first_name, last_name')
          .eq('parent_id', user.id)
        
        if (data) {
          setStudents(data)
          if (data.length > 0) setSelectedStudent(data[0].id)
        }
      } catch (error) {
        console.error("Fetch Error:", error)
      } finally {
        setPageLoading(false)
      }
    }
    
    fetchStudents()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase
        .from('restructuring_requests')
        .insert({
          student_id: selectedStudent,
          reason: reason
        })

      if (error) throw error
      alert("Restructuring request submitted to our billing team.")
      window.location.href = '/parent' // Redirects back to the parent dashboard
    } catch (err) {
      alert("Database Error. Check console.")
    } finally {
      setLoading(false)
    }
  }

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <div className="text-sm font-bold text-[#0a1128] tracking-widest uppercase animate-pulse">
          Loading students...
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-3xl mx-auto animate-in fade-in">
      
      {/* HEADER SECTION */}
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] mb-2 tracking-tight">Plan Restructuring</h1>
        <p className="text-gray-500 text-sm sm:text-base">Request a payment pause or school transfer adjustment.</p>
      </div>

      {/* RESTRUCTURING FORM */}
      <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm space-y-6">
        
        <div>
          <label className="block text-sm font-bold text-[#0a1128] mb-2.5">Select Child</label>
          <select 
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full border border-gray-300 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] transition-all bg-white font-medium appearance-none shadow-sm"
          >
            {students.length === 0 ? (
              <option value="" disabled>No students linked to your account</option>
            ) : (
              students.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-sm font-bold text-[#0a1128] mb-2.5">Reason for Restructuring</label>
          <textarea 
            required
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. My child is transferring to a new partner school next month."
            className="w-full border border-gray-300 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] transition-all resize-none text-sm shadow-sm"
          ></textarea>
        </div>

        <button 
          type="submit" 
          disabled={loading || !selectedStudent || !reason}
          className="w-full bg-blue-600 text-white p-3.5 rounded-xl font-bold disabled:bg-blue-300 hover:bg-blue-700 transition-colors shadow-sm mt-2"
        >
          {loading ? 'Submitting Request...' : 'Submit Request'}
        </button>
        
      </form>
    </div>
  )
}