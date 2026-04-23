
export default function WithdrawalTab({ 
  totalAvailable, withdrawalHistory, 
  withdrawalForm, setWithdrawalForm, 
  handleRequestWithdrawal, isRequesting 
}: any) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in w-full max-w-6xl mx-auto">
      
      {/* Action Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow text-center">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Available to Withdraw</p>
          <p className="text-3xl lg:text-4xl font-bold text-green-600 mb-3 break-words tracking-tight">
            ₦{totalAvailable.toLocaleString()}.00
          </p>
          <p className="text-xs text-gray-400 font-medium">From cleared 80% & 20% payouts.</p>
        </div>

        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-lg font-bold text-[#0a1128] mb-5 border-b border-gray-100 pb-4">Request Payout</h3>
          <form onSubmit={handleRequestWithdrawal} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2.5">Bank Name</label>
              <input 
                required 
                type="text" 
                placeholder="e.g. GTBank" 
                value={withdrawalForm.bankName} 
                onChange={e => setWithdrawalForm({...withdrawalForm, bankName: e.target.value})} 
                className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] font-medium shadow-sm transition-all" 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2.5">Account Number</label>
              <input 
                required 
                type="text" 
                maxLength={10} 
                placeholder="10-digit number"
                value={withdrawalForm.accountNumber} 
                onChange={e => setWithdrawalForm({...withdrawalForm, accountNumber: e.target.value})} 
                className="w-full border border-gray-300 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] font-bold shadow-sm transition-all" 
              />
            </div>
            <button 
              type="submit" 
              disabled={isRequesting || totalAvailable <= 0} 
              className="w-full bg-blue-600 text-white px-5 py-3.5 rounded-xl font-bold hover:bg-blue-700 disabled:bg-blue-300 transition-colors mt-2 shadow-sm"
            >
              {isRequesting ? 'Processing...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>

      {/* Ledger Panel */}
      <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-fit w-full">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-[#0a1128]">Payout Ledger</h3>
        </div>
        
        <div className="overflow-x-auto">
          {withdrawalHistory.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <p className="text-[#0a1128] font-bold mb-1.5">No withdrawal requests found.</p>
              <p className="text-xs text-gray-500 font-medium">Your request history will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-200 text-[#0a1128]">
                <tr>
                  <th className="p-5 font-bold uppercase tracking-wide text-xs">Date</th>
                  <th className="p-5 font-bold uppercase tracking-wide text-xs">Amount</th>
                  <th className="p-5 font-bold uppercase tracking-wide text-xs">Status</th>
                  <th className="p-5 font-bold uppercase tracking-wide text-xs text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {withdrawalHistory.map((req: any) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-5 text-gray-600 font-medium">
                      {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-5 font-bold text-[#0a1128] font-mono text-base">
                      ₦{Number(req.amount).toLocaleString()}.00
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                        req.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                        req.status === 'Paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      {req.receipt_url ? (
                        <a href={req.receipt_url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:text-blue-700 text-xs transition-colors">
                          View Proof
                        </a>
                      ) : (
                        <span className="text-gray-400 italic text-xs font-medium">Awaiting</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
    </div>
  )
}