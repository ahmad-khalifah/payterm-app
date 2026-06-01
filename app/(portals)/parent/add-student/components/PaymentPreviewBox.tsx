'use client'

import { Calculator, GraduationCap, ShieldCheck, Wallet } from 'lucide-react'

const PLATFORM_FEE = 1500;

export default function PaymentPreviewBox({ 
  activeClassData 
}: { 
  activeClassData: any 
}) {
  if (!activeClassData) return null

  const baseTuition = Number(activeClassData.parent_total_fee) || 0
  const totalPlanValue = baseTuition + PLATFORM_FEE

  return (
    <div className="bg-[#0a1128] p-6 rounded-2xl shadow-xl shadow-[#0a1128]/10 text-white animate-in zoom-in-95 duration-300 mt-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mt-10 -mr-10 pointer-events-none"></div>
      
      <div className="flex items-center gap-2 mb-5 relative z-10">
        <Calculator className="w-4 h-4 text-blue-400" />
        <p className="text-blue-300 text-xs font-bold uppercase tracking-widest">
          Term Fee Breakdown
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
        
        <div className="flex justify-between items-center pb-4 border-b border-white/10">
          <span className="text-gray-400 text-sm flex items-center gap-2">
            <ShieldCheck className="w-4 h-4" />
            Platform Service Fee
          </span>
          <span className="text-sm font-medium tracking-wide">₦{PLATFORM_FEE.toLocaleString()}</span>
        </div>
        
        <div className="flex justify-between items-center pt-2">
          <span className="text-white text-sm font-bold uppercase tracking-wider">Total Ledger Value</span>
          <span className="text-3xl font-black text-white tracking-tight">₦{totalPlanValue.toLocaleString()}</span>
        </div>

        <div className="mt-2 bg-blue-900/40 border border-blue-800/50 p-3 rounded-xl flex items-start gap-2.5">
          <Wallet className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <p className="text-[10px] leading-relaxed text-blue-200">
            You can pay down this balance at your own pace by transferring funds into your dedicated Family Virtual Account.
          </p>
        </div>
      </div>
    </div>
  )
}