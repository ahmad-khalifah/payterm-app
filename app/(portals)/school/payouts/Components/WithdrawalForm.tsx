'use client'

import { useState } from 'react'
import { supabase } from '../../../../../lib/supabase'
import toast from 'react-hot-toast'
import { Landmark, Hash, ChevronDown, Info, Send } from 'lucide-react'

// NO HOOK NEEDED HERE: This is a form. When it submits, it pushes to the DB.
// The parent page (PayoutsPage) handles the realtime syncing.

export default function WithdrawalForm({ totalAvailable, targetSchool, schoolId, onSuccess }: any) {
  const [form, setForm] = useState({ bankName: '', accountNumber: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetSchool || !schoolId) return 
    if (totalAvailable <= 0) {
      toast.error("You do not have any cleared funds available to withdraw.")
      return
    }
    
    setIsSubmitting(true)
    const loadingToast = toast.loading("Submitting request...")

    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .insert({ 
          school_name: targetSchool, 
          amount: totalAvailable, 
          bank_name: form.bankName, 
          account_number: form.accountNumber, 
          status: 'Pending' 
        })

      if (error) throw error
      
      toast.success("Withdrawal request submitted successfully.", { id: loadingToast })
      setForm({ bankName: '', accountNumber: '' })
      
      onSuccess() 
    } catch (err: any) {
      toast.error(`Error submitting request: ${err.message}`, { id: loadingToast })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <h3 className="text-lg font-bold text-[#0a1128] mb-6 border-b border-gray-50 pb-5 flex items-center gap-2 relative z-10">
        <Landmark className="w-5 h-5 text-blue-600" />
        Request Payout
      </h3>
      
      <form onSubmit={handleRequest} className="space-y-5 relative z-10">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Destination Bank</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Landmark className="h-4 w-4 text-gray-400" />
            </div>
            <select 
              required 
              value={form.bankName} 
              onChange={e => setForm({...form, bankName: e.target.value})} 
              className="w-full border border-gray-200 pl-11 pr-10 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 focus:bg-white text-[#0a1128] font-bold appearance-none shadow-sm transition-all cursor-pointer"
            >
              <option value="" disabled>Select Bank</option>
              {[
                "Taj Bank", "First Bank", "GTBank", "United Bank for Africa (UBA)", 
                "Zenith Bank", "Stanbic IBTC", "Kuda Bank", "Opay", "Moniepoint",
                "Sterling Bank", "Wema Bank", "Fidelity Bank", "Union Bank"
              ].sort().map(bank => (
                <option key={bank} value={bank}>{bank}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        <div>
          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Account Number</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Hash className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              required type="text" maxLength={10} placeholder="10-digit number"
              value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} 
              className="w-full border border-gray-200 pl-11 pr-4 py-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-gray-50 focus:bg-white font-mono text-[#0a1128] font-bold shadow-sm transition-all" 
            />
          </div>
        </div>
        
        <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 mt-4 flex gap-3 items-start">
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900 font-medium leading-relaxed">
            By clicking submit, you are requesting a bulk withdrawal of <strong className="font-extrabold">₦{totalAvailable.toLocaleString()}</strong> to the account above.
          </p>
        </div>

        <div className="pt-2">
          <button 
            type="submit" 
            disabled={isSubmitting || totalAvailable <= 0 || !targetSchool} 
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-4 rounded-xl text-sm font-bold hover:from-blue-700 hover:to-blue-600 disabled:from-blue-300 disabled:to-blue-300 transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none active:scale-95 flex items-center justify-center gap-2 group"
          >
            {isSubmitting ? 'Processing...' : 'Submit Withdrawal Request'}
            {!isSubmitting && <Send className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />}
          </button>
        </div>
      </form>
    </div>
  )
}