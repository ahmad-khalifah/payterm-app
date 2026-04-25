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
    <div className="w-full max-w-2xl mx-auto md:p-6 lg:p-10 animate-in fade-in pb-24">
      
      {/* HEADER SECTION */}
      <div className="p-5 md:p-0 mb-2 md:mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Adjust Plan</h1>
        <p className="text-gray-500 text-base">Need to pause payments or change your child's school? Let us know.</p>
      </div>
  
      {/* FORM CARD */}
      <div className="bg-white md:rounded-3xl border-y md:border border-gray-200 md:shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-5 md:p-8 space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Child</label>
            <select 
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 focus:bg-white text-gray-900 font-medium transition-all appearance-none"
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
            <label className="block text-sm font-medium text-gray-700 mb-2">What do you need help with?</label>
            <textarea 
              required
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. My child is transferring to a new school next month, and I need to update my payment plan."
              className="w-full border border-gray-200 p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 focus:bg-white text-gray-900 transition-all resize-none text-base"
            ></textarea>
          </div>
  
          <button 
            type="submit" 
            disabled={loading || !selectedStudent || !reason}
            className="w-full bg-[#0a1128] hover:bg-blue-600 text-white py-4 rounded-2xl font-bold text-base transition-all disabled:bg-gray-200 disabled:text-gray-400 active:scale-[0.98] mt-4"
          >
            {loading ? 'Sending Request...' : 'Submit Request'}
          </button>
          
        </form>
      </div>
    </div>
  )
}