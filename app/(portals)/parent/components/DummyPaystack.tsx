'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

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
    
    // REDUCED: Simulate network delay (was 3500ms, now 1000ms)
    await new Promise(resolve => setTimeout(resolve, 1000))

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error("Your session expired. Please refresh the page.")
      }

      const reference = `PT-${Math.random().toString(36).substring(2, 10).toUpperCase()}`

      if (!studentId) {
        throw new Error("System error: Student ID is missing.")
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
      
      // REDUCED: Delay before closing the success screen (was 2000ms, now 1000ms)
      setTimeout(() => {
        onSuccess(reference)
        onClose()
      }, 1000)

    } catch (err: any) {
      console.error("Payment Simulation Error:", err)
      toast.error(err.message || "Transfer Failed.")
      setStep('transfer')
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-[#0a1128]/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[340px] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden relative mx-auto animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 duration-300">
        
        <div className="bg-gray-50 border-b border-gray-100 p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <span className="font-bold text-gray-900 text-xs tracking-tight">Secure Payment</span>
          </div>
          <button onClick={onClose} disabled={step !== 'transfer'} className="text-gray-400 hover:text-gray-900 bg-gray-200/50 p-1.5 rounded-full disabled:opacity-30 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
  
        <div className="p-5 pb-8">
          {step === 'transfer' && (
            <div className="text-center mb-5">
              <p className="text-gray-500 text-xs mb-1">{email}</p>
              <p className="text-3xl font-black text-gray-900 tracking-tight">₦{amount.toLocaleString()}</p>
              <p className="text-[10px] font-bold text-blue-700 bg-blue-50 inline-block px-3 py-1 rounded-full mt-2">
                Transfer exactly this amount
              </p>
            </div>
          )}
  
          {step === 'transfer' && (
            <div className="space-y-5 animate-in fade-in">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center shadow-sm">
                <p className="text-[10px] font-medium text-gray-500 mb-1">Bank Name</p>
                <p className="text-sm font-bold text-gray-900 mb-3">{dummyAccount.bank}</p>
                <p className="text-[10px] font-medium text-gray-500 mb-1">Account Number</p>
                <p className="text-2xl font-mono font-black text-blue-600 tracking-widest mb-3">{dummyAccount.accountNumber}</p>
                <p className="text-[10px] font-medium text-gray-500 mb-1">Account Name</p>
                <p className="text-xs font-bold text-gray-900">{dummyAccount.accountName}</p>
              </div>
              <p className="text-xs text-center text-gray-500 font-medium">
                Expires in <strong className="text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">30:00</strong>
              </p>
              <button onClick={handlePaymentConfirm} className="w-full bg-[#0a1128] text-white py-3 rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-md active:scale-[0.98]">
                I've sent the money
              </button>
            </div>
          )}
  
          {step === 'processing' && (
            <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in duration-300">
              <div className="w-12 h-12 relative flex items-center justify-center mb-4">
                <div className="absolute inset-0 border-4 border-gray-100 border-t-blue-600 rounded-full animate-spin"></div>
              </div>
              <p className="text-base font-bold text-gray-900">Confirming Payment...</p>
              <p className="text-xs text-gray-500 mt-1.5">Please don't close this screen.</p>
            </div>
          )}
  
          {step === 'success' && (
            <div className="py-10 flex flex-col items-center justify-center animate-in zoom-in duration-300">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 border-4 border-green-100">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-xl font-bold text-gray-900 tracking-tight">Payment Successful!</p>
              <p className="text-xs text-gray-500 mt-1">Updating dashboard...</p>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 py-2.5 text-center border-t border-gray-100">
          <p className="text-[9px] font-bold text-gray-400 flex items-center justify-center gap-1 uppercase tracking-widest">
            <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
            Secured by PayTerm
          </p>
        </div>
      </div>
    </div>
  )
}