'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'
import { RefreshCcw, User, MessageSquare, ChevronDown, Send } from 'lucide-react'

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
    <div className="w-full max-w-2xl mx-auto md:p-4 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="p-4 md:p-0 mb-8">
        <h1 className="text-3xl font-extrabold text-[#0a1128] mb-2 tracking-tight flex items-center gap-3">
          <RefreshCcw className="w-7 h-7 text-blue-600" />
          Adjust Plan
        </h1>
        <p className="text-gray-500 font-medium text-sm">Need to pause a payment or register a school transfer? Let us know.</p>
      </div>

      <div className="bg-white md:rounded-3xl border-y md:border border-gray-100 shadow-xl shadow-blue-900/5 overflow-hidden relative">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mt-20 -mr-20"></div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6 relative z-10">
          
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <User className="w-3.5 h-3.5" /> Select Child
            </label>
            <div className="relative">
              <select 
                value={selectedStudent} 
                onChange={(e) => setSelectedStudent(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 text-[#0a1128] font-bold transition-all appearance-none shadow-sm cursor-pointer"
              >
                {students.length === 0 ? (
                  <option value="" disabled>No students linked</option>
                ) : (
                  students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.full_name} {s.student_class ? `(${s.student_class})` : ''}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-[11px] font-bold text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> What do you need help with?
            </label>
            <textarea 
              required 
              rows={5} 
              value={reason} 
              onChange={(e) => setReason(e.target.value)} 
              placeholder="e.g. My child is transferring schools next term and I need to pause the auto-debit on my active payment plan."
              className="w-full bg-gray-50 border border-gray-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white focus:border-blue-600 text-[#0a1128] font-medium resize-none shadow-sm transition-all leading-relaxed"
            ></textarea>
          </div>
          
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSubmitting || !selectedStudent || !reason.trim()}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white py-4 rounded-xl text-sm font-bold active:scale-95 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? 'Sending Request...' : 'Submit Request'}
              {!isSubmitting && <Send className="w-4 h-4 transform group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}