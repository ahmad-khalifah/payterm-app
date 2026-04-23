'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function PaymentHistory() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('parent_id', user.id)
          .order('created_at', { ascending: false }) 

        if (error) throw error
        if (data) setTransactions(data)
      } catch (err: any) {
        // THE FIX: Unmask the silent Supabase error!
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
    
    const refNumber = `PT-${tx.id.substring(0, 8).toUpperCase()}`

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
              <div class="row"><span class="label">Description</span><span class="value">${tx.description}</span></div>
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
    <div className="p-4 sm:p-6 lg:p-10 max-w-5xl mx-auto animate-in fade-in">
      
      {/* HEADER */}
      <div className="mb-8 md:mb-10 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0a1128] mb-2 tracking-tight">Payment History</h1>
          <p className="text-gray-500 text-sm sm:text-base">Official ledger of all successful mandate debits and transfers.</p>
        </div>
        <button onClick={() => window.location.href = '/parent'} className="text-sm font-bold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1.5">
          &larr; Back to Dashboard
        </button>
      </div>

      {/* LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium">No payment history found. Pay an installment to generate a receipt.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-200 text-[#0a1128]">
                <tr>
                  <th className="p-5 font-bold uppercase tracking-wide text-xs">Date & Time</th>
                  <th className="p-5 font-bold uppercase tracking-wide text-xs">Student / Class</th>
                  <th className="p-5 font-bold uppercase tracking-wide text-xs">Description</th>
                  <th className="p-5 font-bold uppercase tracking-wide text-xs text-right">Amount</th>
                  <th className="p-5 font-bold uppercase tracking-wide text-xs text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {transactions.map((tx) => {
                  const timeString = new Date(tx.created_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: 'numeric', minute: '2-digit', hour12: true
                  });

                  return (
                    <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-5 text-gray-600 font-medium whitespace-nowrap">
                        {timeString}
                      </td>
                      <td className="p-5">
                        <div className="font-bold text-[#0a1128]">{tx.student_name}</div>
                        {tx.student_class && tx.student_class !== 'N/A' && (
                          <div className="text-xs text-gray-500 mt-1">{tx.student_class}</div>
                        )}
                      </td>
                      <td className="p-5">
                        <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-md bg-green-50 text-green-700 font-bold text-[10px] uppercase tracking-wider border border-green-200 shadow-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          {tx.description}
                        </span>
                      </td>
                      <td className="p-5 font-bold text-[#0a1128] text-right font-mono text-base">
                        ₦{Number(tx.amount).toLocaleString()}.00
                      </td>
                      <td className="p-5 text-center">
                        <button 
                          onClick={() => handleDownloadReceipt(tx)}
                          className="bg-[#0a1128] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#15234b] shadow-sm transition-colors uppercase tracking-wider"
                        >
                          Download PDF
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}