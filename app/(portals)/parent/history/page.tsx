'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../../../lib/supabase'
import { ArrowLeft, ReceiptText, Download, CheckCircle2, History as HistoryIcon, SearchX } from 'lucide-react'
import Link from 'next/link'
import { useRealtimeSync } from '@/lib/useRealtimeSync'

export default function PaymentHistory() {
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<any[]>([])

  // 1. Pure Fetch Function
  const fetchHistory = useCallback(async (isMounted: boolean = true) => {
    try {
      if (isMounted) setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: studentsData, error: studentError } = await supabase
        .from('students')
        .select('id, full_name, student_class')
        .eq('parent_id', user.id)

      if (studentError) throw studentError
      if (!studentsData || studentsData.length === 0) {
        if (isMounted) setTransactions([])
        return
      }

      const studentIds = studentsData.map(s => s.id)

      const { data: plansData, error: plansError } = await supabase
        .from('active_plans')
        .select('id, student_id')
        .in('student_id', studentIds)

      if (plansError) throw plansError
      if (!plansData || plansData.length === 0) {
        if (isMounted) setTransactions([])
        return
      }

      const planIds = plansData.map(p => p.id)

      const { data: historyData, error: historyError } = await supabase
        .from('payment_history')
        .select('*')
        .in('plan_id', planIds)
        .order('payment_date', { ascending: false })

      if (historyError) throw historyError

      const formattedTransactions = (historyData || []).map((tx: any) => {
        const plan = plansData.find((p: any) => p.id === tx.plan_id)
        const student = plan ? studentsData.find((s: any) => s.id === plan.student_id) : null

        return {
          ...tx,
          student_name: student ? student.full_name : 'Unknown Student',
          student_class: student ? student.student_class : 'N/A',
          created_at: tx.payment_date || tx.created_at || new Date().toISOString()
        }
      })

      if (isMounted) setTransactions(formattedTransactions)

    } catch (err: any) {
      console.error("Error fetching history:", err.message || JSON.stringify(err, null, 2))
    } finally {
      if (isMounted) setLoading(false)
    }
  }, [])

  // 2. THE HOOK GOES HERE: At the top level!
  useRealtimeSync(() => fetchHistory(true))

  // 3. Normal Component Initialization
  useEffect(() => {
    let isMounted = true
    fetchHistory(isMounted)
    
    return () => {
      isMounted = false
    }
  }, [fetchHistory])

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
    <div className="w-full max-w-5xl mx-auto md:p-4 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="p-4 md:p-0 mb-8 flex flex-col gap-3">
        <Link href="/parent" className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#0a1128] bg-white border border-gray-200 px-4 py-2 rounded-full shadow-sm transition-all self-start active:scale-95 md:hidden">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div>
          <h1 className="text-3xl font-extrabold text-[#0a1128] mb-2 tracking-tight flex items-center gap-3">
            <HistoryIcon className="w-7 h-7 text-blue-600" />
            Payment History
          </h1>
          <p className="text-gray-500 font-medium">A complete, verifiable record of your past school fee payments.</p>
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-gray-100 shadow-sm text-center flex flex-col items-center mx-4 md:mx-0">
          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 text-gray-400">
            <SearchX className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-[#0a1128] mb-2">No Transactions Yet</h3>
          <p className="text-gray-500 text-sm max-w-sm">When you make your first tuition payment, your official digital receipts will appear here.</p>
        </div>
      ) : (
        <>
          {/* MOBILE CARDS */}
          <div className="md:hidden flex flex-col gap-4 px-4">
            {transactions.map((tx) => (
              <div key={tx.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
                <div className="flex justify-between items-start mb-4 pl-2">
                  <div className="min-w-0 pr-3">
                    <h3 className="font-extrabold text-[#0a1128] text-sm truncate">{tx.student_name}</h3>
                    <p className="text-xs text-gray-500 font-medium truncate">{tx.student_class || 'General Payment'}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-lg text-[#0a1128] tracking-tight">₦{Number(tx.amount).toLocaleString()}</p>
                    <span className="inline-flex items-center gap-1 mt-1 py-1 px-2 rounded-md bg-green-50 text-green-700 font-bold text-[9px] uppercase tracking-wider border border-green-100">
                      <CheckCircle2 className="w-3 h-3" />
                      Success
                    </span>
                  </div>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-50 pl-2">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{new Date(tx.created_at).toLocaleDateString('en-GB')}</span>
                  <button onClick={() => handleDownloadReceipt(tx)} className="text-[#0a1128] font-bold text-xs bg-gray-50 border border-gray-200 px-4 py-2 rounded-lg active:scale-95 transition-all shadow-sm hover:bg-gray-100 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-gray-500">
                <tr>
                  <th className="p-5 font-bold uppercase tracking-wider text-[11px]">Date</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-[11px]">Student & Class</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-[11px]">Status</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-[11px] text-right">Amount</th>
                  <th className="p-5 font-bold uppercase tracking-wider text-[11px] text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-5 text-gray-500 text-xs whitespace-nowrap font-bold uppercase tracking-wider">{new Date(tx.created_at).toLocaleDateString('en-GB')}</td>
                    <td className="p-5">
                      <div className="font-extrabold text-[#0a1128] text-sm mb-0.5">{tx.student_name}</div>
                      <div className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                        <ReceiptText className="w-3 h-3 text-gray-400" />
                        {tx.student_class}
                      </div>
                    </td>
                    <td className="p-5">
                      <span className="py-1.5 px-2.5 rounded text-[10px] font-bold uppercase tracking-wider border bg-green-50 text-green-700 border-green-200 inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        Cleared
                      </span>
                    </td>
                    <td className="p-5 font-black text-[#0a1128] font-mono text-right text-base tracking-tight">₦{Number(tx.amount).toLocaleString()}</td>
                    <td className="p-5 text-center">
                      <button onClick={() => handleDownloadReceipt(tx)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-gray-50 hover:text-[#0a1128] transition-all shadow-sm active:scale-95 inline-flex items-center gap-2 opacity-80 group-hover:opacity-100">
                        <Download className="w-3.5 h-3.5" />
                        PDF
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