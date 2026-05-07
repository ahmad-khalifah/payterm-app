'use client'

import { Calculator, GraduationCap, PieChart, ShieldCheck } from 'lucide-react'

// --- UPDATED UNIVERSAL PRICING ENGINE ---
export const getFeeBreakdown = (parentTotalFee: number, isInstallment: boolean = true) => {
  if (!parentTotalFee || parentTotalFee <= 0) return { fee: 0, base: 0 };
  let fee = 0;
  if (parentTotalFee <= 103500) { 
    fee = isInstallment ? 3500 : 1500;
  } else if (parentTotalFee <= 207500) {
    fee = isInstallment ? 5500 : 2500;
  } else {
    fee = isInstallment ? 7500 : 3500;
  }
  return { fee, base: parentTotalFee - fee }
}

export default function PaymentPreviewBox({ 
  activeClassData,
  paymentMode,
  onModeChange 
}: { 
  activeClassData: any,
  paymentMode: 'full' | 'installment',
  onModeChange: (mode: 'full' | 'installment') => void
}) {
  if (!activeClassData) return null

  const totalInvoice = Number(activeClassData.parent_total_fee)
  const isInstallment = paymentMode === 'installment'
  
  // Use the new smart breakdown
  const { fee: serviceFee, base: baseTuition } = getFeeBreakdown(totalInvoice, isInstallment)
  
  // Dynamically calculate the deposit based on the mode
  const depositAmount = isInstallment ? (baseTuition * 0.60) : baseTuition
  const totalDueToday = depositAmount + serviceFee

  return (
    <div className="bg-[#0a1128] p-6 rounded-2xl shadow-xl shadow-[#0a1128]/10 text-white animate-in zoom-in-95 duration-300 mt-6 relative overflow-hidden">
      {/* Decorative Background Element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mt-10 -mr-10 pointer-events-none"></div>
      
      {/* PLAN SELECTOR TOGGLE */}
      <div className="flex bg-[#15234b] p-1.5 rounded-xl mb-6 relative z-10">
        <button
          type="button"
          onClick={() => onModeChange('installment')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
            isInstallment ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Pay in Installments
        </button>
        <button
          type="button"
          onClick={() => onModeChange('full')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all ${
            !isInstallment ? 'bg-blue-600 text-white shadow-md' : 'text-blue-200/60 hover:text-white hover:bg-white/5'
          }`}
        >
          Pay in Full
        </button>
      </div>

      <div className="flex items-center gap-2 mb-5 relative z-10">
        <Calculator className="w-4 h-4 text-blue-400" />
        <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">
          {isInstallment ? 'Initial Payment Breakdown' : 'Full Payment Breakdown'}
        </p>
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
            {isInstallment ? '60% Tuition Deposit' : '100% Full Tuition'}
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