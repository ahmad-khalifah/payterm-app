'use client'

export default function ReceiptModal({ receipt, onClose }: { receipt: any, onClose: () => void }) {
  if (!receipt) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a1128]/80 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-[300px] sm:max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 mx-auto">
        <div className="bg-[#0a1128] p-4 text-center text-white border-b-4 border-blue-600">
          <h2 className="text-base sm:text-lg font-bold tracking-widest uppercase">PayTerm</h2>
          <p className="text-[9px] text-blue-200 mt-0.5 uppercase tracking-wider">Official Receipt</p>
        </div>
        <div className="p-4 sm:p-5 space-y-3 bg-gray-50/50">
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-xs font-medium">Receipt No.</span>
            <span className="font-bold font-mono text-gray-900 text-xs">{receipt.receipt_number}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-xs font-medium">Date</span>
            <span className="font-bold text-gray-900 text-xs">{new Date(receipt.payment_date).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500 text-xs font-medium">Amount Paid</span>
            <span className="font-bold text-green-600 text-sm sm:text-base tracking-tight">₦{Number(receipt.amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-xs font-medium">Status</span>
            <span className="font-bold text-green-700 uppercase text-[9px] tracking-wider px-2 py-1 bg-green-100 rounded border border-green-200">{receipt.status || 'Cleared'}</span>
          </div>
        </div>
        <div className="p-3 bg-white border-t border-gray-200 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 text-xs font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Close</button>
          <button onClick={() => window.print()} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">Print PDF</button>
        </div>
      </div>
    </div>
  )
}