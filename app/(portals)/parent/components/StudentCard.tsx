'use client'

import React from 'react'
import { Building2, GraduationCap, Calendar, ChevronDown, ChevronUp, CheckCircle2, RotateCw, Wallet, ReceiptText, AlertCircle, Clock } from 'lucide-react'

export default function StudentCard({ child, expandedHistoryId, onToggleHistory, onPay, onRenew, onViewReceipt }: any) {
  const plan = child.active_plans?.[0]
  const isExpanded = expandedHistoryId === child.id

  // --- SMART TERM CALCULATOR ---
  const getNextTermData = () => {
    const currentSession = plan?.academic_session || "2025/2026"
    const currentTerm = plan?.term || "First Term"
    
    let nextTerm = "Second Term"
    let nextSession = currentSession

    if (currentTerm === "First Term") nextTerm = "Second Term"
    else if (currentTerm === "Second Term") nextTerm = "Third Term"
    else if (currentTerm === "Third Term") {
      nextTerm = "First Term"
      // Automatically roll over the year (e.g., 2025/2026 -> 2026/2027)
      const years = currentSession.split('/')
      if (years.length === 2) {
        nextSession = `${parseInt(years[0]) + 1}/${parseInt(years[1]) + 1}`
      }
    }

    return { nextTerm, nextSession }
  }

  // Safety check: No active plan found
  if (!plan) {
    return (
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col justify-center items-center text-center h-full min-h-[220px] group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
        <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-[#0a1128] mb-1">{child.full_name}</h3>
        <p className="text-xs text-gray-500 max-w-[200px]">No active payment plan found for this session.</p>
        <button 
          onClick={() => onRenew({ 
            studentId: child.id, 
            schoolId: child.school_id, 
            schoolName: child.display_school_name,
            studentName: child.full_name,
            currentClass: child.student_class,
            nextSession: "2025/2026", 
            nextTerm: "First Term" 
          })} 
          className="mt-4 px-6 py-2.5 bg-[#0a1128] text-white text-xs font-bold rounded-full hover:bg-blue-900 transition-colors active:scale-95 shadow-sm"
        >
          Set Up Plan
        </button>
      </div>
    )
  }

  const amountPaid = Number(plan.amount_paid || 0)
  const totalFee = Number(plan.total_fee || 0)
  const outstanding = Math.max(0, totalFee - amountPaid)
  const progressPercent = totalFee > 0 ? Math.min(100, Math.round((amountPaid / totalFee) * 100)) : 0
  const isFullyPaid = progressPercent >= 100

  return (
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col">
      
      {/* 1. COMPACT HEADER: Avatar, Name, Tags */}
      <div className="p-4 sm:px-5 sm:pt-5 pb-3">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100 shrink-0">
            {child.full_name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <h3 className="font-extrabold text-[#0a1128] text-base sm:text-lg tracking-tight leading-tight mb-1">{child.full_name}</h3>
            <div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border ${
                plan.status === 'Active' ? 'bg-blue-50 text-blue-600 border-blue-200' : 
                plan.status === 'Completed' ? 'bg-green-50 text-green-600 border-green-200' : 
                'bg-orange-50 text-orange-600 border-orange-200'
              }`}>
                {plan.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
                {plan.status}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100 text-[10px] sm:text-xs font-medium text-gray-600">
            <Building2 className="w-3 h-3 text-gray-400" />
            <span className="truncate max-w-[150px] sm:max-w-[180px]">{child.display_school_name}</span>
          </div>
          <div className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-100 text-[10px] sm:text-xs font-medium text-gray-600">
            <GraduationCap className="w-3 h-3 text-gray-400" />
            {child.student_class}
          </div>
        </div>
      </div>

      {/* 2. COMPACT FINANCIAL PROGRESS BOX */}
      <div className="px-4 sm:px-5 pb-3">
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Remaining Balance</p>
              <p className="text-xl sm:text-2xl font-black text-[#0a1128] tracking-tight leading-none">₦{outstanding.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Plan</p>
              <p className="text-xs sm:text-sm font-bold text-gray-600">₦{totalFee.toLocaleString()}</p>
            </div>
          </div>

          <div className="relative">
            <div className="flex justify-between text-[10px] font-bold mb-1.5">
              <span className="text-blue-600">{progressPercent}% Cleared</span>
            </div>
            <div className="w-full bg-blue-100/50 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>
        
        {/* Next Due Date (Slimline) */}
        {!isFullyPaid && plan.next_payment_date && (
          <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] sm:text-xs font-bold text-orange-600 bg-orange-50 py-1.5 rounded-xl border border-orange-100">
            <Calendar className="w-3.5 h-3.5" />
            Next payment due: {new Date(plan.next_payment_date).toLocaleDateString('en-GB')}
          </div>
        )}
      </div>

      {/* 3. SIDE-BY-SIDE ACTIONS */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 flex gap-2">
        {!isFullyPaid ? (
          <button 
            onClick={() => onPay(plan, child)}
            className="flex-[3] bg-[#0a1128] text-white py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-blue-900 transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
          >
            Make Payment
          </button>
        ) : (
          <button 
            onClick={() => {
              const { nextSession, nextTerm } = getNextTermData();
              onRenew({ 
                studentId: child.id, 
                schoolId: child.school_id, 
                schoolName: child.display_school_name,
                studentName: child.full_name,
                currentClass: child.student_class,
                nextSession,
                nextTerm
              });
            }}
            className="flex-[3] bg-[#0a1128] text-white py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-blue-900 transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Renew Term
          </button>
        )}

        <button 
          onClick={() => onToggleHistory(child.id)}
          className="flex-[2] bg-white border border-gray-200 text-[#0a1128] py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-1.5 shadow-sm"
        >
          History
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* 4. EXPANDABLE PAYMENT HISTORY */}
      {isExpanded && (
        <div className="bg-white border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
          <div className="p-3 sm:p-4 px-5 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2 text-gray-900">
            <Wallet className="w-4 h-4 text-gray-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Transaction Ledger</h4>
          </div>
          
          <div className="p-2">
            {!plan.payment_history || plan.payment_history.length === 0 ? (
              <p className="text-xs text-gray-500 font-medium text-center py-6">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {plan.payment_history.map((tx: any) => (
                  <li key={tx.id} className="p-3 flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#0a1128]">₦{Number(tx.amount).toLocaleString()}</p>
                        <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">{new Date(tx.payment_date).toLocaleDateString('en-GB')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => onViewReceipt(tx)}
                      className="text-[10px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100/50 flex items-center gap-1.5"
                    >
                      <ReceiptText className="w-3 h-3" />
                      Receipt
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}