'use client'

import { Calculator, GraduationCap, PieChart, ShieldCheck } from 'lucide-react'

// --- UNIVERSAL PRICING ENGINE ---
export const getFeeBreakdown = (totalInvoice: number) => {
  if (totalInvoice <= 52499) return { fee: 2500, base: totalInvoice - 2500 }
  if (totalInvoice <= 105000) return { fee: 5000, base: totalInvoice - 5000 }
  if (totalInvoice <= 208500) return { fee: 8500, base: totalInvoice - 8500 }
  return { fee: 10000, base: totalInvoice - 10000 }
}

export default function PaymentPreviewBox({ activeClassData }: { activeClassData: any }) {
  if (!activeClassData) return null

  const totalInvoice = Number(activeClassData.parent_total_fee)
  const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(totalInvoice)
  const depositAmount = baseTuition * 0.60
  const totalDueToday = depositAmount + serviceFee

  return (
    <div className="bg-[#0a1128] p-6 rounded-2xl shadow-xl shadow-[#0a1128]/10 text-white animate-in zoom-in-95 duration-300 mt-6 relative overflow-hidden">
      {/* Decorative Background Element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mt-10 -mr-10"></div>
      
      <div className="flex items-center gap-2 mb-5 relative z-10">
        <Calculator className="w-4 h-4 text-blue-400" />
        <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">Initial Payment Breakdown</p>
      </div>
      
      <div className="flex flex-col gap-4 relative z-10">
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <span className="text-gray-400 text-sm flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            School Tuition
          </span>
          <span className="text-sm font-bold tracking-wide">₦{baseTuition.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <span className="text-gray-400 text-sm flex items-center gap-2">
            <PieChart className="w-4 h-4" />
            60% Tuition Deposit
          </span>
          <span className="text-sm font-medium tracking-wide">₦{depositAmount.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <span className="text-gray-400 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Platform Service Fee
          </span>
          <span className="text-sm font-medium tracking-wide">₦{serviceFee.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <span className="text-white text-sm font-bold uppercase tracking-wider">Due Today</span>
          <span className="text-3xl font-black text-green-400 tracking-tight">₦{totalDueToday.toLocaleString()}</span>
        </div>
      </div>
    </div>
  )
}