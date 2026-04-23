'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface DummyPaystackProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (reference: string) => void;
  amount: number;
  email: string;
  studentName: string;
  studentClass?: string;
  planId: string; 
  studentId: string;
}

export default function DummyPaystack({ 
  isOpen, onClose, onSuccess, amount, email, studentName, studentClass, planId, studentId 
}: DummyPaystackProps) {
  
  const [step, setStep] = useState<'transfer' | 'processing' | 'success'>('transfer')
  
  const dummyAccount = {
    bank: "PayTerm Simulated Bank",
    accountNumber: "8012345679",
    accountName: "PayTerm Escrow"
  }
  
  useEffect(() => {
    if (isOpen) setStep('transfer')
  }, [isOpen])

  if (!isOpen) return null

  const handlePaymentConfirm = async () => {
    setStep('processing')
    
    await new Promise(resolve => setTimeout(resolve, 3500))

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const reference = `PT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

      if (!studentId) {
        throw new Error("CRITICAL: studentId is missing. The Dashboard did not pass it correctly.");
      }

      const { error: txError } = await supabase
        .from('payment_history')
        .insert({
          parent_id: user.id,
          plan_id: planId,
          student_id: studentId,
          amount: amount,
          receipt_number: reference,
          status: 'Cleared'
        })

      if (txError) throw txError

      const { data: planData } = await supabase
        .from('active_plans')
        .select('amount_paid')
        .eq('id', planId)
        .single()

      if (planData) {
        await supabase
          .from('active_plans')
          .update({ 
            amount_paid: Number(planData.amount_paid) + amount,
            status: 'Active' 
          })
          .eq('id', planId)
      }

      setStep('success')
      
      setTimeout(() => {
        onSuccess(reference)
        onClose()
      }, 2000)

    } catch (err: any) {
      console.error("Payment Simulation Error:", err)
      alert(`Transfer Failed: ${err.message || JSON.stringify(err)}`)
      setStep('transfer')
    }
  }

  return (
    // FIX 1: Increased outer padding to p-6 to guarantee a thicker mobile margin
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#0a1128]/70 backdrop-blur-sm animate-in fade-in duration-200">
      
      {/* FIX 2: Replaced max-w-md with max-w-[360px] to force a compact, "widget" style box */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[360px] overflow-hidden relative mx-auto">
        
        <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-[#0ba4db] rounded-sm flex items-center justify-center">
              <div className="w-2.5 h-2.5 bg-white rounded-sm"></div>
            </div>
            <span className="font-bold text-[#0a1128] text-xs tracking-tight">TEST MODE</span>
          </div>
          <button onClick={onClose} disabled={step !== 'transfer'} className="text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-opacity">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* FIX 3: Unified padding inside the card so it doesn't inflate on bigger screens */}
        <div className="p-6">
          {step === 'transfer' && (
            <div className="text-center mb-6">
              <p className="text-gray-500 text-xs mb-1">{email}</p>
              <p className="text-2xl font-bold text-[#0a1128]">₦{amount.toLocaleString()}</p>
              <p className="text-[11px] font-bold text-orange-500 bg-orange-50 inline-block px-3 py-1 rounded-full mt-2">
                Transfer exactly this amount
              </p>
            </div>
          )}

          {step === 'transfer' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Bank Name</p>
                <p className="text-sm font-bold text-[#0a1128] mb-3">{dummyAccount.bank}</p>
                
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Account Number</p>
                <p className="text-2xl font-mono font-bold text-blue-600 tracking-wider mb-3">
                  {dummyAccount.accountNumber}
                </p>

                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Account Name</p>
                <p className="text-xs font-medium text-[#0a1128]">{dummyAccount.accountName}</p>
              </div>

              <p className="text-[11px] text-center text-gray-500 font-medium">
                This account expires in <strong className="text-[#0a1128]">30:00</strong>
              </p>

              <button 
                onClick={handlePaymentConfirm} 
                className="w-full bg-[#0ba4db] text-white p-3.5 rounded-xl text-sm font-bold hover:bg-[#0990c0] transition-colors shadow-md shadow-[#0ba4db]/20"
              >
                I have sent the money
              </button>
            </div>
          )}

          {step === 'processing' && (
            <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in duration-300">
              <div className="w-14 h-14 relative flex items-center justify-center mb-5">
                <div className="absolute inset-0 border-4 border-gray-100 border-t-[#0ba4db] rounded-full animate-spin"></div>
                <svg className="w-5 h-5 text-[#0ba4db] animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
              </div>
              <p className="text-sm font-bold text-[#0a1128]">Confirming Transfer...</p>
              <p className="text-[11px] text-gray-500 mt-2 text-center">Waiting for bank confirmation.</p>
            </div>
          )}

          {step === 'success' && (
            <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-5 border-4 border-green-100">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-lg font-bold text-[#0a1128]">Transfer Received!</p>
              <p className="text-[11px] text-gray-500 mt-2">Updating your dashboard...</p>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-2.5 text-center border-t border-gray-100">
          <p className="text-[9px] font-bold text-gray-400 flex items-center justify-center gap-1 uppercase tracking-widest">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            Secured by DummyStack
          </p>
        </div>
      </div>
    </div>
  )
}