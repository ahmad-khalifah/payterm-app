'use client'

import { useState } from 'react'
import { supabase } from '../../../../../lib/supabase'

export default function WithdrawalForm({ totalAvailable, targetSchool, schoolId, onSuccess }: any) {
  const [form, setForm] = useState({ bankName: '', accountNumber: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetSchool || !schoolId) return 
    if (totalAvailable <= 0) return alert("You do not have any cleared funds available to withdraw.")
    
    setIsSubmitting(true)
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
      alert("Withdrawal request submitted successfully.")
      setForm({ bankName: '', accountNumber: '' })
      
      onSuccess() // Triggers the page to refetch the ledger and balance
    } catch (err: any) {
      alert(`Error submitting request: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <h3 className="text-lg font-bold text-[#0a1128] mb-5 border-b border-gray-100 pb-4">Request Payout</h3>
      <form onSubmit={handleRequest} className="space-y-5">
        <div>
          <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2.5">Destination Bank</label>
          <select 
            required 
            value={form.bankName} 
            onChange={e => setForm({...form, bankName: e.target.value})} 
            className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 bg-white text-[#0a1128] font-bold appearance-none shadow-sm transition-all"
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
        </div>
        
        <div>
          <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2.5">Account Number</label>
          <input 
            required type="text" maxLength={10} placeholder="10-digit number"
            value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})} 
            className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] font-bold shadow-sm transition-all" 
          />
        </div>
        
        <div className="bg-blue-50/80 p-4 rounded-xl border border-blue-100 mt-2">
          <p className="text-xs text-blue-800 font-medium leading-relaxed">
            By clicking submit, you are requesting a bulk withdrawal of <strong className="font-bold">₦{totalAvailable.toLocaleString()}</strong>.
          </p>
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting || totalAvailable <= 0 || !targetSchool} 
          className="w-full bg-blue-600 text-white px-5 py-3.5 rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-colors mt-2 shadow-sm"
        >
          {isSubmitting ? 'Processing...' : 'Submit Withdrawal Request'}
        </button>
      </form>
    </div>
  )
}