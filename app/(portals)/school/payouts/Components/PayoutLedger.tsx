'use client'

import { jsPDF } from 'jspdf'

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

    } catch (err) {
      alert("Failed to generate PDF. Please try on a desktop browser.")
      console.error(err)
    }
  }

  return (
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
  )
}