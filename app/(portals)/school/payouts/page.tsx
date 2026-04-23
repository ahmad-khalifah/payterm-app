'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation' // Needed for redirecting unauthorized users
import { supabase } from '../../../../lib/supabase'
import { jsPDF } from 'jspdf'

export default function PayoutsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [totalAvailable, setTotalAvailable] = useState(0)
  const [withdrawalHistory, setWithdrawalHistory] = useState<any[]>([])
  
  const [form, setForm] = useState({ bankName: '', accountNumber: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [schoolId, setSchoolId] = useState<string | null>(null) 

  // THE FIX: Combined fetch logic that respects component mounting
  const fetchPayoutData = async (uuid: string, name: string, isMounted: boolean = true) => {
    try {
      if (isMounted) setLoading(true)

      const { data: studentData, error: studentError } = await supabase
        .from('students')
        .select(`
          id, enrollment_status,
          active_plans ( total_fee, amount_paid )
        `)
        .eq('school_id', uuid) 
        .eq('enrollment_status', 'Verified')

      if (studentError) throw studentError

      let totalEarned = 0

      if (studentData) {
        studentData.forEach(student => {
          const plan = student.active_plans[0]
          if (plan) {
            const baseTuition = Number(plan.total_fee) / 1.05
            const progress = Number(plan.amount_paid) / Number(plan.total_fee)
            
            if (progress >= 0.59) totalEarned += (baseTuition * 0.80) 
            if (progress >= 0.99) totalEarned += (baseTuition * 0.20)
          }
        })
      }

      const { data: withdrawals, error: withdrawalError } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .eq('school_name', name)
        .order('created_at', { ascending: false })

      if (withdrawalError) throw withdrawalError

      let totalWithdrawn = 0
      if (withdrawals) {
        if (isMounted) setWithdrawalHistory(withdrawals)
        withdrawals.forEach(w => {
          if (w.status === 'Paid' || w.status === 'Pending' || w.status === 'Approved') {
            totalWithdrawn += Number(w.amount)
          }
        })
      }

      if (isMounted) setTotalAvailable(totalEarned - totalWithdrawn)

    } catch (err: any) {
      console.error("Fetch Error:", err.message)
    } finally {
      if (isMounted) setLoading(false)
    }
  }

 // THE FIX: Unified Initialization block using getSession
 useEffect(() => {
  let isMounted = true

  const initializePage = async () => {
    try {
      // 1. Securely await session FIRST
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session?.user) {
        router.push('/school-login')
        return
      }

      // 2. Fetch School Profile
      const { data: schoolProfile, error: profileError } = await supabase
        .from('partner_schools')
        .select('name')
        .eq('id', session.user.id)
        .single()

      if (profileError) throw profileError

      if (isMounted && schoolProfile) {
        setTargetSchool(schoolProfile.name)
        setSchoolId(session.user.id)
        
        // 3. Immediately fetch payouts using guaranteed data
        await fetchPayoutData(session.user.id, schoolProfile.name, isMounted)
      }
    } catch (err) {
      console.error("Initialization Error:", err)
      // FIX: Force the loading state to turn off even if the profile fetch fails!
      if (isMounted) setLoading(false) 
    }
  }

  initializePage()

  // 4. Secure Auth Listener
  const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      router.push('/school-login')
    }
  })

  return () => {
    isMounted = false
    authListener.subscription.unsubscribe()
  }
}, [router])

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetSchool || !schoolId) return // Enforce safety check
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
      
      // Refresh the data instantly
      fetchPayoutData(schoolId, targetSchool, true) 
    } catch (err: any) {
      alert(`Error submitting request: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Phase 4 Dynamic PDF Generator (Preserved)
  const handleDownloadReceipt = (requestRow: any) => {
    try {
      const doc = new jsPDF({ format: 'a4', unit: 'mm' })

      doc.setFontSize(24)
      doc.setTextColor(10, 17, 40) 
      doc.setFont('helvetica', 'bold')
      doc.text('PayTerm', 20, 30)

      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.setFont('helvetica', 'normal')
      doc.text('OFFICIAL SETTLEMENT RECEIPT', 20, 38)

      doc.setDrawColor(220, 220, 220)
      doc.line(20, 45, 190, 45)

      let yPos = 65
      const lineSpacing = 14

      const addRow = (label: string, value: string) => {
        doc.setFontSize(11)
        doc.setTextColor(100, 100, 100)
        doc.setFont('helvetica', 'bold')
        doc.text(label, 20, yPos)
        
        doc.setTextColor(10, 17, 40)
        doc.setFont('helvetica', 'normal')
        doc.text(value, 65, yPos)
        yPos += lineSpacing
      }

      addRow('School Name:', requestRow.school_name)
      addRow('Amount Settled:', `NGN ${Number(requestRow.amount).toLocaleString()}.00`)
      addRow('Destination Bank:', requestRow.bank_name)
      addRow('Account Number:', requestRow.account_number)
      addRow('Bank Reference:', requestRow.bank_reference || 'Awaiting Sync')
      
      const approvalDate = requestRow.approved_at 
        ? new Date(requestRow.approved_at).toLocaleString('en-GB') 
        : 'Pending'
      addRow('Approval Date:', approvalDate)

      doc.setFillColor(240, 253, 244) 
      doc.setDrawColor(187, 247, 208) 
      doc.roundedRect(20, yPos + 5, 45, 12, 2, 2, 'FD')
      
      doc.setFontSize(10)
      doc.setTextColor(21, 128, 61) 
      doc.setFont('helvetica', 'bold')
      doc.text('STATUS: CLEARED', 26, yPos + 13)

      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.setFont('helvetica', 'normal')
      doc.text('This is a system-generated document reflecting verified manual banking operations.', 105, 280, { align: 'center' })

      doc.save(`PayTerm_Settlement_${requestRow.bank_reference || requestRow.id.substring(0,6)}.pdf`)

    } catch (err) {
      alert("Failed to generate PDF. Please try on a desktop browser.")
      console.error(err)
    }
  }

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-full flex items-center justify-center animate-pulse">Calculating cleared tranches...</div>

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in">
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] mb-2 tracking-tight">Payouts & Withdrawals</h1>
        <p className="text-gray-500 text-sm sm:text-base">Request operational funds from cleared parent installments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Available to Withdraw</p>
            <p className="text-4xl font-bold text-green-600 mb-3 break-words tracking-tight">
              ₦{totalAvailable.toLocaleString()}.00
            </p>
            <p className="text-xs text-gray-400 font-medium">Calculated from verified student tranches.</p>
          </div>

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
                    "Access Bank", "First Bank", "GTBank", "United Bank for Africa (UBA)", 
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
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-fit">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
            <h3 className="text-lg font-bold text-[#0a1128]">Payout Ledger</h3>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
              {withdrawalHistory.length} Records
            </span>
          </div>
          
          <div className="overflow-x-auto">
            {withdrawalHistory.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <p className="text-[#0a1128] font-bold mb-1.5">No withdrawals yet.</p>
                <p className="text-xs text-gray-500 font-medium">Your request history will appear here.</p>
              </div>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50/50 border-b border-gray-200 text-[#0a1128]">
                  <tr>
                    <th className="p-5 font-bold uppercase tracking-wide text-xs">Date</th>
                    <th className="p-5 font-bold uppercase tracking-wide text-xs">Amount</th>
                    <th className="p-5 font-bold uppercase tracking-wide text-xs">Destination</th>
                    <th className="p-5 font-bold uppercase tracking-wide text-xs">Status</th>
                    <th className="p-5 font-bold uppercase tracking-wide text-xs text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {withdrawalHistory.map((req: any) => (
                    <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-5 text-gray-600 font-medium">
                        {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="p-5 font-bold text-[#0a1128] font-mono text-base">
                        ₦{Number(req.amount).toLocaleString()}.00
                      </td>
                      <td className="p-5">
                        <p className="text-[#0a1128] font-bold">{req.bank_name}</p>
                        <p className="text-xs text-gray-500 font-mono mt-0.5">{req.account_number}</p>
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                          req.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                          req.status === 'Paid' || req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                          'bg-red-50 text-red-700 border-red-200'
                        }`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        {req.bank_reference ? (
                          <button 
                            onClick={() => handleDownloadReceipt(req)} 
                            className="text-blue-600 font-bold hover:text-blue-700 text-xs transition-colors bg-blue-50 px-3 py-1.5 rounded-md border border-blue-100 shadow-sm"
                          >
                            Download PDF
                          </button>
                        ) : (
                          <span className="text-gray-400 italic text-xs font-medium">Awaiting processing</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}