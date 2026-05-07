'use client'

import { jsPDF } from 'jspdf'
import toast from 'react-hot-toast'
import { Download, CheckCircle2, Clock, AlertCircle, FileX, Landmark, ReceiptText } from 'lucide-react'

// NO HOOK NEEDED HERE: This component just renders UI and generates a PDF on click.
// Realtime sync is handled by the parent page that fetches the data.

export default function PayoutLedger({ withdrawalHistory }: { withdrawalHistory: any[] }) {
  
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
      
      toast.success("Receipt downloaded!")
    } catch (err) {
      console.error(err)
      toast.error("Failed to generate PDF. Please try on a desktop browser.")
    }
  }

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-6 border-b border-gray-100 bg-white flex justify-between items-center">
        <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
          <ReceiptText className="w-5 h-5 text-blue-600" />
          Payout History
        </h3>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
          {withdrawalHistory.length} Records
        </span>
      </div>
      
      <div className="overflow-x-auto flex-1">
        {withdrawalHistory.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center h-full">
            <div className="w-16 h-16 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mb-4">
              <FileX className="w-8 h-8" />
            </div>
            <p className="text-[#0a1128] font-bold text-lg mb-1">No withdrawals yet.</p>
            <p className="text-sm text-gray-500 font-medium max-w-xs">Your settlement request history and receipts will appear here.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
            <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
              <tr>
                <th className="p-5">Date</th>
                <th className="p-5">Amount</th>
                <th className="p-5">Destination</th>
                <th className="p-5">Status</th>
                <th className="p-5 text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {withdrawalHistory.map((req: any) => (
                <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="p-5 text-gray-500 font-bold text-xs uppercase tracking-wider">
                    {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="p-5 font-black text-[#0a1128] font-mono text-base tracking-tight">
                    ₦{Number(req.amount).toLocaleString()}
                  </td>
                  <td className="p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Landmark className="w-3.5 h-3.5 text-gray-400" />
                      <p className="text-[#0a1128] font-bold text-sm">{req.bank_name}</p>
                    </div>
                    <p className="text-xs text-gray-500 font-mono pl-5">{req.account_number}</p>
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                      req.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                      req.status === 'Paid' || req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                      {(req.status === 'Paid' || req.status === 'Approved') && <CheckCircle2 className="w-3 h-3" />}
                      {(req.status === 'Rejected' || req.status === 'Failed') && <AlertCircle className="w-3 h-3" />}
                      {req.status}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    {req.bank_reference || req.status === 'Paid' || req.status === 'Approved' ? (
                      <button 
                        onClick={() => handleDownloadReceipt(req)} 
                        className="bg-white border border-gray-200 text-[#0a1128] px-4 py-2 rounded-xl text-[11px] font-bold hover:bg-gray-50 hover:text-blue-600 transition-all shadow-sm active:scale-95 inline-flex items-center gap-1.5 opacity-80 group-hover:opacity-100"
                      >
                        <Download className="w-3.5 h-3.5" />
                        PDF
                      </button>
                    ) : (
                      <span className="text-gray-400 italic text-[11px] font-medium bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">Processing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}