'use client'

import React from 'react'
import { Building2, GraduationCap, Calendar, ChevronRight, ChevronDown, CheckCircle2, RotateCw, Wallet, ReceiptText, AlertCircle } from 'lucide-react'

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
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm flex flex-col justify-center items-center text-center h-full min-h-[250px] group hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300">
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
            nextSession: "2025/2026", // Default fallback
            nextTerm: "First Term"    // Default fallback
          })} 
          className="mt-4 px-6 py-2.5 bg-[#0a1128] text-white text-xs font-bold rounded-full hover:bg-blue-600 transition-colors active:scale-95 shadow-sm"
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
    <div className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 hover:-translate-y-1 transition-all duration-300 overflow-hidden group flex flex-col">
      
      {/* CARD HEADER */}
      <div className="p-6 pb-5 border-b border-gray-50 flex justify-between items-start bg-gradient-to-b from-white to-gray-50/30">
        <div className="flex gap-4 items-center">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg border border-blue-100 shadow-inner">
            {child.full_name.charAt(0)}
          </div>
          <div>
            <h3 className="font-extrabold text-[#0a1128] text-lg tracking-tight mb-0.5">{child.full_name}</h3>
            <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1 border ${
              plan.status === 'Active' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
              plan.status === 'Completed' ? 'bg-green-50 text-green-700 border-green-200' : 
              'bg-orange-50 text-orange-700 border-orange-200'
            }`}>
              {plan.status === 'Completed' && <CheckCircle2 className="w-3 h-3" />}
              {plan.status}
            </span>
          </div>
        </div>
      </div>

      {/* CARD BODY */}
      <div className="p-6 space-y-5 flex-grow">
        
        {/* Context Tags */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs font-medium text-gray-600">
            <Building2 className="w-3.5 h-3.5 text-gray-400" />
            <span className="truncate max-w-[150px] sm:max-w-xs">{child.display_school_name}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs font-medium text-gray-600">
            <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
            {child.student_class}
          </div>
        </div>

        {/* Financial Progress Box */}
        <div className="bg-blue-50/40 rounded-2xl p-4 border border-blue-100/50 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-blue-100/50 rounded-full blur-2xl"></div>
          
          <div className="flex justify-between items-end mb-3 relative z-10">
            <div>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Remaining Balance</p>
              <p className="text-2xl font-black text-[#0a1128] tracking-tight">₦{outstanding.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Total Plan</p>
              <p className="text-sm font-bold text-gray-600">₦{totalFee.toLocaleString()}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="relative z-10">
            <div className="flex justify-between text-[10px] font-bold mb-1">
              <span className="text-blue-600">{progressPercent}% Cleared</span>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-out" 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Next Due Date */}
        {!isFullyPaid && plan.next_payment_date && (
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 bg-orange-50 px-3 py-2 rounded-xl border border-orange-100">
            <Calendar className="w-4 h-4" />
            Next payment due: {new Date(plan.next_payment_date).toLocaleDateString('en-GB')}
          </div>
        )}
      </div>

      {/* CARD ACTIONS */}
      <div className="p-4 bg-gray-50/80 border-t border-gray-100 flex flex-col sm:flex-row gap-2">
        {!isFullyPaid ? (
          <button 
            onClick={() => onPay(plan, child)}
            className="flex-1 bg-gradient-to-r from-blue-600 to-blue-500 text-white py-3 px-4 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2 group/btn"
          >
            Make Payment
            <ChevronRight className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform" />
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
            className="flex-1 bg-[#0a1128] text-white py-3 px-4 rounded-xl font-bold text-sm hover:bg-blue-600 hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 group/btn"
          >
            <RotateCw className="w-4 h-4" />
            Renew for Next Term
          </button>
        )}

        <button 
          onClick={() => onToggleHistory(child.id)}
          className="flex-1 bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl font-bold text-sm hover:bg-gray-50 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          History
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* EXPANDABLE PAYMENT HISTORY */}
      {isExpanded && (
        <div className="bg-white border-t border-gray-100 animate-in slide-in-from-top-2 duration-300">
          <div className="p-4 px-6 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2 text-gray-900">
            <Wallet className="w-4 h-4 text-gray-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider">Transaction Ledger</h4>
          </div>
          
          <div className="p-2">
            {!plan.payment_history || plan.payment_history.length === 0 ? (
              <p className="text-xs text-gray-500 font-medium text-center py-6">No payments recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-50">
                {plan.payment_history.map((tx: any) => (
                  <li key={tx.id} className="p-4 flex items-center justify-between hover:bg-gray-50 rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
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