'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { CalendarClock, BookOpen, ChevronRight, X } from 'lucide-react'

export default function RenewalModal({ config, currentUserId, onClose, onSuccess }: any) {
  const [isRenewing, setIsRenewing] = useState(false)
  const [renewForm, setRenewForm] = useState({ 
    session: config.nextSession, 
    term: config.nextTerm, 
    className: config.currentClass 
  })

  const classList = ["JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3", "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6"]

  const handleRenewTerm = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsRenewing(true)

    try {
      const { data: feeConfig, error: feeError } = await supabase
        .from('class_fees')
        .select('parent_total_fee, mid_term_date')
        .eq('school_name', config.schoolName)
        .eq('class_name', renewForm.className)
        .eq('academic_session', renewForm.session)
        .eq('term', renewForm.term)
        .single()

      if (feeError || !feeConfig) {
        throw new Error(`School has not added fees for ${renewForm.term} ${renewForm.session} yet.`)
      }

      await supabase
        .from('active_plans')
        .update({ status: 'Completed' })
        .eq('student_id', config.studentId)
        .neq('status', 'Completed')

      if (renewForm.className !== config.currentClass) {
        await supabase.from('students').update({ student_class: renewForm.className }).eq('id', config.studentId)
      }

      const uniqueCode = `PT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      
      const { error: newPlanError } = await supabase
        .from('active_plans')
        .insert({
          student_id: config.studentId,
          parent_id: currentUserId,
          school_id: config.schoolId,
          total_fee: Number(feeConfig.parent_total_fee) || 0,
          amount_paid: 0,
          next_payment_date: feeConfig.mid_term_date || null,
          status: 'Pending Verification',
          clearance_code: uniqueCode,
          mid_term_cleared: false,
          payterm_advance: 0,
          academic_session: renewForm.session,
          term: renewForm.term
        } as any)

      if (newPlanError) throw newPlanError

      toast.success("Child successfully enrolled! You can now pay the initial deposit.")
      onSuccess() 

    } catch (err: any) {
      toast.error(err.message || "Failed to renew term.")
    } finally {
      setIsRenewing(false)
    }
  }

  if (!config) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1128]/40 backdrop-blur-md p-4 transition-all">
      <div className="bg-white/95 backdrop-blur-xl rounded-3xl w-full max-w-md overflow-hidden shadow-2xl shadow-blue-900/20 border border-white/50 animate-in zoom-in-95 mx-auto">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 p-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0a1128] tracking-tight leading-tight">Start New Term</h2>
              <p className="text-xs text-gray-500 mt-0.5 max-w-[200px]">Enroll {config.studentName} for the upcoming academic period.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors active:scale-95">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* FORM BODY */}
        <form onSubmit={handleRenewTerm} className="p-6 space-y-5">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Next Session</label>
              <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-sm font-bold text-gray-400 cursor-not-allowed">
                {renewForm.session}
              </div>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Next Term</label>
              <div className="bg-gray-50 border border-gray-200 p-3.5 rounded-xl text-sm font-bold text-gray-400 cursor-not-allowed">
                {renewForm.term}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Child's Class
            </label>
            <div className="relative">
              <select 
                required 
                value={renewForm.className} 
                onChange={e => setRenewForm({...renewForm, className: e.target.value})} 
                className="w-full bg-white border border-gray-200 p-3.5 rounded-xl text-sm font-bold text-[#0a1128] outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 transition-all appearance-none shadow-sm cursor-pointer"
              >
                <option value="" disabled>Select Class</option>
                {classList.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 font-medium">* Change this only if your child has been promoted.</p>
          </div>

          {/* ACTIONS */}
          <div className="flex gap-3 pt-2">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3.5 bg-gray-50 border border-gray-200 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-100 transition-all active:scale-95"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isRenewing || !renewForm.session || !renewForm.term} 
              className="flex-[2] py-3.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 flex justify-center items-center gap-2 group transition-all active:scale-95"
            >
              {isRenewing ? 'Enrolling...' : 'Confirm Enrollment'}
              {!isRenewing && <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}