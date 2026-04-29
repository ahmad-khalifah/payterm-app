'use client'

// --- NEW UNIVERSAL PRICING ENGINE ---
export const getFeeBreakdown = (totalInvoice: number) => {
  if (totalInvoice <= 52499) return { fee: 2500, base: totalInvoice - 2500 }
  if (totalInvoice <= 105000) return { fee: 5000, base: totalInvoice - 5000 }
  if (totalInvoice <= 208500) return { fee: 8500, base: totalInvoice - 8500 }
  return { fee: 10000, base: totalInvoice - 10000 }
}

export default function PaymentPreviewBox({ activeClassData }: { activeClassData: any }) {
  if (!activeClassData) return null

  const totalInvoice = Number(activeClassData.parent_total_fee)
  
  // Dynamic calculation for the new flat-rate tiers
  const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(totalInvoice)
  const depositAmount = baseTuition * 0.60
  const totalDueToday = depositAmount + serviceFee

  return (
    <div className="bg-[#0a1128] p-5 rounded-xl shadow-md text-white animate-in zoom-in-95 duration-200 mt-4">
      <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-4">Initial Payment Breakdown</p>
      
      <div className="flex flex-col gap-3">
        {/* FIX: Changed from 'Total Parent Invoice' to 'School Tuition' and displaying baseTuition */}
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <span className="text-gray-400 text-sm">School Tuition</span>
          <span className="text-sm font-bold">₦{baseTuition.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center pb-2 border-b border-white/10">
          <span className="text-gray-400 text-sm">60% Tuition Deposit</span>
          <span className="text-sm font-medium">₦{depositAmount.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <span className="text-gray-400 text-sm">Platform Service Fee</span>
          <span className="text-sm font-medium">₦{serviceFee.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center pt-1">
          <span className="text-white text-sm font-bold">Due Today</span>
          <span className="text-2xl font-black text-green-400">₦{totalDueToday.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}