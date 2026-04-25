'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function RestructurePage() {
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [students, setStudents] = useState<any[]>([])
  const [selectedStudent, setSelectedStudent] = useState('')
  const [reason, setReason] = useState('')

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // FIX: Changed first_name/last_name to full_name
        const { data, error } = await supabase
          .from('students')
          .select('id, full_name, student_class') 
          .eq('parent_id', user.id)

        if (error) throw error
        
        if (data) {
          setStudents(data)
          if (data.length > 0) setSelectedStudent(data[0].id)
        }
      } catch (err: any) {
        console.error("Error fetching students:", err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchStudents()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudent || !reason.trim()) return

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Sending the restructuring request to the database
      // Sending the restructuring request to the database
      // @ts-ignore: Temporary bypass until support_tickets table is added to Supabase
      const { error } = await supabase
        .from('support_tickets' as any) 
        .insert({
          parent_id: user.id,
          student_id: selectedStudent,
          subject: 'Plan Restructure Request',
          message: reason,
          status: 'Open'
        } as any)

      if (error) throw error
      
      alert("Your request has been submitted successfully. Our support team will contact you shortly.")
      setReason('')
    } catch (err: any) {
      alert(`Submission failed: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] uppercase tracking-widest h-full flex items-center justify-center animate-pulse">Loading...</div>

  return (
    <div className="w-full max-w-xl mx-auto md:p-4 lg:p-8 animate-in fade-in pb-20">
      <div className="p-4 md:p-0 mb-4">
        <h1 className="text-2xl font-extrabold text-[#0a1128] mb-1 tracking-tight">Adjust Plan</h1>
        <p className="text-gray-500 text-sm">Need to pause or change schools? Let us know.</p>
      </div>

      <div className="bg-white md:rounded-2xl border-y md:border border-gray-200 md:shadow-sm overflow-hidden">
        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#0a1128] mb-1.5 uppercase tracking-wide">Select Child</label>
            <select 
              value={selectedStudent} 
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 focus:bg-white text-[#0a1128] font-bold transition-all shadow-sm"
            >
              {students.length === 0 ? (
                <option value="" disabled>No students linked</option>
              ) : (
                students.map(s => (
                  <option key={s.id} value={s.id}>
                    {/* FIX: Now uses s.full_name safely */}
                    {s.full_name} {s.student_class ? `(${s.student_class})` : ''}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-[#0a1128] mb-1.5 uppercase tracking-wide">What do you need help with?</label>
            <textarea 
              required 
              rows={4} 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="e.g. My child is transferring schools next term and I need to pause the payment plan."
              className="w-full border border-gray-200 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 focus:bg-white text-[#0a1128] font-medium resize-none shadow-sm transition-all"
            ></textarea>
          </div>
          
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting || !selectedStudent || !reason.trim()}
              className="w-full bg-[#0a1128] text-white py-3 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600"
            >
              {isSubmitting ? 'Sending Request...' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}