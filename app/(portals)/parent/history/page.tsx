'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase' // FIX: Used standard alias

export default function PaymentHistory() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Step 1: Fetch students for this parent
        const { data: studentsData, error: studentError } = await supabase
          .from('students')
          .select('id, full_name, student_class')
          .eq('parent_id', user.id)

        if (studentError) throw studentError
        if (!studentsData || studentsData.length === 0) {
          setTransactions([])
          return
        }

        const studentIds = studentsData.map(s => s.id)

        // Step 2: Fetch plans for these students
        const { data: plansData, error: plansError } = await supabase
          .from('active_plans')
          .select('id, student_id')
          .in('student_id', studentIds)

        if (plansError) throw plansError
        if (!plansData || plansData.length === 0) {
          setTransactions([])
          return
        }

        const planIds = plansData.map(p => p.id)

        // Step 3: Fetch the ACTUAL payment history table
        const { data: historyData, error: historyError } = await supabase
          .from('payment_history')
          .select('*')
          .in('plan_id', planIds)
          .order('payment_date', { ascending: false })

        if (historyError) throw historyError

        // Step 4: Map the student details back onto the transaction
        const formattedTransactions = (historyData || []).map((tx: any) => {
          const plan = plansData.find((p: any) => p.id === tx.plan_id)
          const student = plan ? studentsData.find((s: any) => s.id === plan.student_id) : null

          return {
            ...tx,
            student_name: student ? student.full_name : 'Unknown Student',
            student_class: student ? student.student_class : 'N/A',
            // Standardize the date field for your UI
            created_at: tx.payment_date || tx.created_at || new Date().toISOString()
          }
        })

        setTransactions(formattedTransactions)

      } catch (err: any) {
        console.error("Error fetching history:", err.message || JSON.stringify(err, null, 2))
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [])

  const handleDownloadReceipt = (tx: any) => {
    const receiptWindow = window.open('', '_blank', 'width=600,height=800')
    if (!receiptWindow) {
      alert("Please allow pop-ups to download your receipt.")
      return
    }

    const dateFormatted = new Date(tx.created_at).toLocaleString('en-US', { 
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: 'numeric', minute: '2-digit', hour12: true 
    })
    
    // Fallback to ID if receipt_number is missing
    const rawRef = tx.receipt_number || tx.id || '00000000'
    const refNumber = `PT-${rawRef.substring(0, 8).toUpperCase()}`

    const studentDisplay = tx.student_class && tx.student_class !== 'N/A' 
      ? `${tx.student_name} (${tx.student_class})` 
      : tx.student_name

    receiptWindow.document.write(`
      <html>
        <head>
          <title>PayTerm Receipt - ${refNumber}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #1e293b; background-color: #f8fafc; }
            .receipt-box { background: white; max-width: 450px; margin: 0 auto; border: 1px solid #e2e8f0; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
            .header { text-align: center; border-bottom: 2px dashed #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
            .logo { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; }
            .logo span { color: #2563eb; }
            .amount { font-size: 36px; font-weight: 800; margin: 15px 0 5px 0; color: #0f172a; }
            .status { color: #16a34a; font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; background: #dcfce3; padding: 4px 12px; border-radius: 9999px; display: inline-block; }
            .row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 15px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
            .row:last-child { border-bottom: none; }
            .label { color: #64748b; font-weight: 500; }
            .value { font-weight: 700; text-align: right; color: #334155; }
            .footer { text-align: center; margin-top: 30px; font-size: 13px; color: #94a3b8; border-top: 2px dashed #e2e8f0; padding-top: 20px; line-height: 1.5; }
            @media print { 
              body { padding: 0; background-color: white; } 
              .receipt-box { border: none; box-shadow: none; max-width: 100%; padding: 20px; } 
            }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <div class="logo">PayTerm <span>Receipt</span></div>
              <div class="amount">₦${Number(tx.amount).toLocaleString()}.00</div>
              <div class="status">Payment Successful</div>
            </div>
            
            <div class="details">
              <div class="row"><span class="label">Date & Time</span><span class="value">${dateFormatted}</span></div>
              <div class="row"><span class="label">Transaction Ref</span><span class="value">${refNumber}</span></div>
              <div class="row"><span class="label">Student</span><span class="value">${studentDisplay}</span></div>
              <div class="row"><span class="label">Description</span><span class="value">${tx.description || 'School Fee Payment'}</span></div>
              <div class="row"><span class="label">Payment Method</span><span class="value">Virtual Account Transfer</span></div>
            </div>

            <div class="footer">
              <strong>Official Digital Receipt</strong><br>
              Generated securely by the PayTerm Platform.<br>
              Please present this at the school's finance office for clearance.
            </div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `)
    receiptWindow.document.close()
  }

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-screen flex items-center justify-center animate-pulse">Loading Ledger...</div>

  return (
    <div className="w-full max-w-4xl mx-auto md:p-4 lg:p-8 animate-in fade-in pb-20">
      <div className="p-4 md:p-0 mb-4 flex flex-col md:flex-row md:justify-between md:items-end gap-3">
        <div>
          <button onClick={() => window.location.href = '/parent'} className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 px-3 py-1.5 rounded-full shadow-sm mb-3 md:hidden active:scale-95 transition-transform">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back
          </button>
          <h1 className="text-2xl font-extrabold text-[#0a1128] mb-1 tracking-tight">Payment History</h1>
          <p className="text-gray-500 text-sm">A record of your past school fee payments.</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-500 text-sm mx-4 md:mx-0 shadow-sm">
          No payment history found. Make a payment to generate a receipt.
        </div>
      ) : (
        <>
          {/* MOBILE CARDS */}
          <div className="md:hidden flex flex-col gap-3 px-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="min-w-0 pr-3">
                    <h3 className="font-bold text-[#0a1128] text-sm truncate">{tx.student_name}</h3>
                    <p className="text-xs text-gray-500 truncate">{tx.student_class || 'General Payment'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-base text-[#0a1128]">₦{Number(tx.amount).toLocaleString()}</p>
                    <span className="inline-block mt-1 py-0.5 px-2 rounded-md bg-green-50 text-green-700 font-bold text-[9px] uppercase tracking-wider border border-green-100">Success</span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-50">
                  <span className="text-xs font-medium text-gray-400">{new Date(tx.created_at).toLocaleDateString()}</span>
                  <button onClick={() => handleDownloadReceipt(tx)} className="text-[#0a1128] font-bold text-xs bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg active:scale-95 transition-transform shadow-sm">
                    Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="p-4 font-bold uppercase tracking-wider text-xs">Date</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-xs">Student</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-xs">Status</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-xs text-right">Amount</th>
                  <th className="p-4 font-bold uppercase tracking-wider text-xs text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-gray-600 text-xs whitespace-nowrap font-medium">{new Date(tx.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="p-4">
                      <div className="font-bold text-[#0a1128] text-sm">{tx.student_name}</div>
                      <div className="text-xs text-gray-500 font-medium">{tx.student_class}</div>
                    </td>
                    <td className="p-4"><span className="py-1.5 px-2.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-green-50 text-green-700 border-green-200 inline-block">Success</span></td>
                    <td className="p-4 font-black text-[#0a1128] font-mono text-right text-base">₦{Number(tx.amount).toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleDownloadReceipt(tx)} className="bg-white border border-gray-200 text-[#0a1128] px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-50 transition-colors shadow-sm active:scale-95">
                        Download
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}