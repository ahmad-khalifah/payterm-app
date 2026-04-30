'use client'

import { Printer, X, ReceiptText, CheckCircle2 } from 'lucide-react'

export default function ReceiptModal({ receipt, onClose }: { receipt: any, onClose: () => void }) {
  if (!receipt) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[#0a1128]/40 p-4 backdrop-blur-md transition-all">
      {/* Receipt Ticket Shape */}
      <div className="bg-white rounded-2xl w-full max-w-[320px] sm:max-w-sm overflow-hidden shadow-2xl shadow-blue-900/20 animate-in zoom-in-95 mx-auto relative">
        
        {/* Top Accent */}
        <div className="bg-[#0a1128] p-5 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/20 rounded-full blur-xl"></div>
          <ReceiptText className="w-8 h-8 text-blue-400 mx-auto mb-2 relative z-10" />
          <h2 className="text-lg sm:text-xl font-black tracking-widest uppercase relative z-10">PayTerm</h2>
          <p className="text-[10px] text-blue-200 mt-1 uppercase tracking-widest font-bold relative z-10">Official Receipt</p>
        </div>

        {/* Receipt Body */}
        <div className="p-6 space-y-4 bg-white relative">
          {/* Subtle Watermark */}
          <CheckCircle2 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 text-gray-50 opacity-50 pointer-events-none" />

          <div className="flex justify-between items-end border-b border-dashed border-gray-200 pb-3 relative z-10">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Receipt No.</span>
            <span className="font-bold font-mono text-[#0a1128] text-sm bg-gray-50 px-2 py-1 rounded">{receipt.receipt_number}</span>
          </div>
          
          <div className="flex justify-between items-end border-b border-dashed border-gray-200 pb-3 relative z-10">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Date</span>
            <span className="font-bold text-[#0a1128] text-sm">{new Date(receipt.payment_date).toLocaleDateString('en-GB')}</span>
          </div>
          
          <div className="flex justify-between items-end border-b border-dashed border-gray-200 pb-3 relative z-10">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Amount Paid</span>
            <span className="font-black text-blue-600 text-lg tracking-tight">₦{Number(receipt.amount).toLocaleString()}</span>
          </div>
          
          <div className="flex justify-between items-center pt-1 relative z-10">
            <span className="text-gray-500 text-xs font-bold uppercase tracking-wider">Status</span>
            <span className="font-bold text-green-700 uppercase text-[10px] tracking-widest px-2.5 py-1 bg-green-50 rounded-md border border-green-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              {receipt.status || 'Cleared'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors active:scale-95 flex items-center justify-center gap-1.5">
            <X className="w-4 h-4" />
            Close
          </button>
          <button onClick={() => window.print()} className="flex-1 py-3 text-xs font-bold text-white bg-[#0a1128] rounded-xl hover:bg-blue-600 transition-all shadow-md hover:shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-1.5">
            <Printer className="w-4 h-4" />
            Print PDF
          </button>
        </div>
      </div>
    </div>
  )
}