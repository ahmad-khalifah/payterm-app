'use client'

import { useState } from 'react'
import { supabase } from '../../../../lib/supabase'

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

      if (feeError || !feeConfig) throw new Error(`School has not added fees for ${renewForm.term} ${renewForm.session} yet. Contact them.`)

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

      alert("Child successfully enrolled for the new term! You can now pay the initial deposit.")
      onSuccess() // Triggers the dashboard to refetch

    } catch (err: any) {
      alert(`Renewal Failed: ${err.message}`)
    } finally {
      setIsRenewing(false)
    }
  }

  if (!config) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1128]/80 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 mx-auto p-6">
        <h2 className="text-xl font-extrabold text-[#0a1128] mb-1 tracking-tight">Start New Term</h2>
        <p className="text-sm text-gray-500 mb-6">Enroll your child for the upcoming academic period.</p>
        
        <form onSubmit={handleRenewTerm} className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Next Session</label>
              <select disabled value={renewForm.session} className="w-full bg-gray-100 border border-gray-200 p-3 rounded-xl text-sm font-bold text-gray-600 outline-none opacity-80 cursor-not-allowed appearance-none">
                <option value={renewForm.session}>{renewForm.session}</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Next Term</label>
              <select disabled value={renewForm.term} className="w-full bg-gray-100 border border-gray-200 p-3 rounded-xl text-sm font-bold text-gray-600 outline-none opacity-80 cursor-not-allowed appearance-none">
                <option value={renewForm.term}>{renewForm.term}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Child's Class</label>
            <select required value={renewForm.className} onChange={e => setRenewForm({...renewForm, className: e.target.value})} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-600">
              <option value="" disabled>Select Class</option>
              {classList.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-[10px] text-gray-400 mt-1.5">* Change this only if your child has been promoted.</p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={isRenewing || !renewForm.session || !renewForm.term} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex justify-center items-center active:scale-95 transition-transform">
              {isRenewing ? 'Enrolling...' : 'Confirm Enrollment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}