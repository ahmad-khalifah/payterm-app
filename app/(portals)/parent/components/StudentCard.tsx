'use client'

const calculateNextTerm = (currentSession: string, currentTerm: string) => {
  if (!currentSession || !currentTerm) return { nextSession: '', nextTerm: '' }

  if (currentTerm === 'First Term') return { nextSession: currentSession, nextTerm: 'Second Term' }
  if (currentTerm === 'Second Term') return { nextSession: currentSession, nextTerm: 'Third Term' }
  
  if (currentTerm === 'Third Term') {
    const years = currentSession.split('/')
    if (years.length === 2) {
      const nextYear1 = parseInt(years[0]) + 1
      const nextYear2 = parseInt(years[1]) + 1
      return { nextSession: `${nextYear1}/${nextYear2}`, nextTerm: 'First Term' }
    }
  }
  return { nextSession: currentSession, nextTerm: 'First Term' }
}

export default function StudentCard({ child, expandedHistoryId, onToggleHistory, onPay, onRenew, onViewReceipt }: any) {
  const plan = child.active_plans?.[0] 
  const isPending = child.enrollment_status === 'Pending Verification'
  const isEscrowFunded = isPending && plan && plan.amount_paid > 0
  
  const isFirstPayment = plan?.amount_paid === 0
  const isFullyPaid = plan && plan.total_fee > 0 && plan.amount_paid >= plan.total_fee
  
  const progressPercentage = plan && plan.total_fee > 0 
    ? Math.min(100, Math.round((Number(plan.amount_paid) / Number(plan.total_fee)) * 100)) 
    : 0

  const allHistory = child.active_plans?.flatMap((p: any) => p.payment_history || []) || []
  const sortedHistory = allHistory.sort((a: any, b: any) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())
  const isHistoryExpanded = expandedHistoryId === child.id

  const handleStartNewTerm = () => {
    const { nextSession, nextTerm } = calculateNextTerm(plan.academic_session, plan.term)
    onRenew({
      studentId: child.id,
      schoolId: child.school_id,
      schoolName: child.display_school_name,
      currentClass: child.student_class,
      nextSession,
      nextTerm
    })
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 md:p-6 flex flex-col transition-all">
      <div className="flex justify-between items-start mb-1">
        <h3 className="text-lg font-bold text-[#0a1128] tracking-tight truncate pr-4">{child.full_name}</h3>
        <div className="shrink-0">
          {isFullyPaid ? (
            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2.5 py-1 border border-green-100 rounded uppercase tracking-wider">Cleared</span>
          ) : isEscrowFunded ? (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 border border-blue-100 rounded uppercase tracking-wider">Verifying</span>
          ) : (
            <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2.5 py-1 border border-orange-100 rounded uppercase tracking-wider">Active</span>
          )}
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-500 truncate">
          {child.student_class ? `${child.student_class} • ` : ''} {child.display_school_name}
        </p>
        
        {plan?.academic_session ? (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-[10px] font-bold text-gray-600 uppercase tracking-wider">
              {plan.term} • {plan.academic_session}
            </span>
          </div>
        ) : (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-md opacity-50">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Legacy Plan</span>
          </div>
        )}
      </div>

      {plan && (
        <div className="mt-auto">
          <div className="flex justify-between text-[11px] font-bold mb-2">
            <span className="text-blue-600 uppercase tracking-widest">Paid: ₦{Number(plan.amount_paid).toLocaleString()}</span>
            <span className="text-gray-500 uppercase tracking-widest">Total: ₦{Number(plan.total_fee).toLocaleString()}</span>
          </div>
          
          <div className="w-full h-1.5 bg-gray-100 rounded-full mb-5 overflow-hidden">
            <div className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out" style={{ width: `${progressPercentage}%` }}></div>
          </div>

          {isFullyPaid ? (
            <div className="flex gap-2">
              <div className="flex-1 bg-green-50 text-green-700 py-2.5 rounded-xl text-sm font-bold text-center border border-green-100 flex items-center justify-center">
                Fully Paid
              </div>
              <button 
                onClick={handleStartNewTerm}
                className="flex-1 bg-[#0a1128] text-white py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-blue-600 transition-colors active:scale-[0.98]"
              >
                Start New Term
              </button>
            </div>
          ) : isEscrowFunded ? (
            <div className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl text-sm font-bold text-center border border-blue-100">
              Awaiting School Approval
            </div>
          ) : (
            <button 
              onClick={() => onPay(plan, child)}
              className="w-full bg-white border-2 border-blue-600 text-blue-600 hover:bg-blue-50 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]"
            >
              {isFirstPayment ? 'Pay 60% Initial Deposit' : 'Pay 40% Balance'}
            </button>
          )}

          {sortedHistory && sortedHistory.length > 0 && (
            <div className="pt-3 border-t border-gray-100 mt-4">
              <button onClick={() => onToggleHistory(child.id)} className="w-full flex items-center justify-between text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                <span>{isHistoryExpanded ? 'Hide All Transactions' : 'View Transaction History'}</span>
                <svg className={`w-4 h-4 transition-transform ${isHistoryExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
              </button>
              
              {isHistoryExpanded && (
                <div className="mt-3 space-y-2 animate-in slide-in-from-top-2 duration-200 max-h-48 overflow-y-auto pr-1">
                  {sortedHistory.map((tx: any) => (
                    <div key={tx.id} className="flex justify-between items-center p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <div>
                        <p className="text-xs font-bold text-gray-900">₦{Number(tx.amount).toLocaleString()}</p>
                        <p className="text-[9px] font-medium text-gray-500 uppercase">{new Date(tx.payment_date).toLocaleDateString()}</p>
                      </div>
                      <button onClick={() => onViewReceipt(tx)} className="text-[10px] font-bold text-blue-600 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm hover:bg-gray-50 active:scale-95">
                        Receipt
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}