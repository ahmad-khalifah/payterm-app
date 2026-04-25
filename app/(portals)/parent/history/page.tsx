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
    <div className="w-full max-w-5xl mx-auto md:p-6 lg:p-10 animate-in fade-in pb-24">
      
      {/* HEADER */}
      <div className="p-5 md:p-0 mb-4 md:mb-8 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <button onClick={() => window.location.href = '/parent'} className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm transition-all mb-4 md:hidden">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Back to Home
          </button>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">Payment History</h1>
          <p className="text-gray-500 text-base">A record of your past school fee payments.</p>
        </div>
        <button onClick={() => window.location.href = '/parent'} className="hidden md:flex text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors items-center gap-1.5">
          &larr; Back to Dashboard
        </button>
      </div>
  
      {transactions.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-200 text-center text-gray-500 font-medium mx-5 md:mx-0 shadow-sm">
          No payment history found. Make a payment to generate a receipt.
        </div>
      ) : (
        <>
          {/* MOBILE VIEW: Stacked Cards */}
          <div className="md:hidden flex flex-col gap-4 px-5">
            {transactions.map((tx) => {
              const timeString = new Date(tx.created_at).toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric'
              });
  
              return (
                <div key={tx.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-bold text-gray-900 text-base">{tx.student_name}</h3>
                      <p className="text-sm text-gray-500">{tx.student_class || 'General Payment'}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-lg text-gray-900">₦{Number(tx.amount).toLocaleString()}</p>
                      <span className="inline-block mt-1 py-1 px-2.5 rounded-full bg-green-50 text-green-700 font-bold text-[10px] uppercase tracking-wider">
                        Successful
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                    <span className="text-sm font-medium text-gray-400">{timeString}</span>
                    <button 
                      onClick={() => handleDownloadReceipt(tx)}
                      className="text-blue-600 font-bold text-sm bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-colors active:scale-95"
                    >
                      Receipt
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
  
          {/* DESKTOP VIEW: Clean Table */}
          <div className="hidden md:block bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-gray-50/50 border-b border-gray-100 text-gray-500">
                  <tr>
                    <th className="p-6 font-bold uppercase tracking-wider text-xs">Date</th>
                    <th className="p-6 font-bold uppercase tracking-wider text-xs">Student details</th>
                    <th className="p-6 font-bold uppercase tracking-wider text-xs">Status</th>
                    <th className="p-6 font-bold uppercase tracking-wider text-xs text-right">Amount paid</th>
                    <th className="p-6 font-bold uppercase tracking-wider text-xs text-center">Action</th>
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
                        <td className="p-6 text-gray-600 font-medium whitespace-nowrap">
                          {timeString}
                        </td>
                        <td className="p-6">
                          <div className="font-bold text-gray-900 text-base">{tx.student_name}</div>
                          {tx.student_class && tx.student_class !== 'N/A' && (
                            <div className="text-sm text-gray-500 mt-1">{tx.student_class}</div>
                          )}
                        </td>
                        <td className="p-6">
                          <span className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-green-50 text-green-700 font-bold text-[11px] uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Success
                          </span>
                        </td>
                        <td className="p-6 font-black text-gray-900 text-right text-lg">
                          ₦{Number(tx.amount).toLocaleString()}
                        </td>
                        <td className="p-6 text-center">
                          <button 
                            onClick={() => handleDownloadReceipt(tx)}
                            className="bg-gray-100 text-gray-900 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-200 transition-colors"
                          >
                            Download
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )}