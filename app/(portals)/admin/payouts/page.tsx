'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

// --- NEW LUCIDE ICONS ---
import { 
  Banknote, ShieldCheck, X, Building2, Landmark, 
  CheckCircle2, AlertCircle, Clock, Check, XCircle
} from 'lucide-react'

export default function AdminPayoutsPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<any[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  // --- DUAL-VERIFICATION MODAL STATE ---
  const [activeRequest, setActiveRequest] = useState<any>(null)
  const [refNumber, setRefNumber] = useState('')
  const [confirmAmount, setConfirmAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data) setRequests(data)
    } catch (err) {
      console.error("Fetch Error:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 1. Initial Fetch
    fetchRequests()

    // 2. Establish Realtime Connection
    const channel = supabase
      .channel('admin-payouts-live')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'withdrawal_requests' 
        },
        (payload) => {
          console.log('Live payout activity detected!', payload)
          fetchRequests() 
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setIsLive(true)
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setIsLive(false)
      })

    // 3. Cleanup
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleApproveRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRequest) return

    // THE SAFETY LOCK
    if (Number(confirmAmount) !== Number(activeRequest.amount)) {
      return alert("SECURITY HALT: The amount you typed does not match the requested amount. Please check your bank transfer logs again.")
    }

    if (!refNumber.trim()) return alert("Bank Reference Number is required.")

    setIsSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase
        .from('withdrawal_requests')
        .update({
          status: 'Approved',
          bank_reference: refNumber,
          approved_at: new Date().toISOString(),
          processed_by: user?.id || null
        })
        .eq('id', activeRequest.id)

      if (error) throw error

      alert(`Success! Withdrawal for ₦${activeRequest.amount.toLocaleString()} is marked as Approved.`)
      closeModal()
    } catch (err: any) {
      alert(`Approval Error: ${err.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openModal = (request: any) => {
    setActiveRequest(request)
    setRefNumber('')
    setConfirmAmount('')
  }

  const closeModal = () => {
    setActiveRequest(null)
    setRefNumber('')
    setConfirmAmount('')
  }

  const handleReject = async (id: string, schoolName: string) => {
    const reason = window.prompt(`Enter reason for rejecting ${schoolName}'s withdrawal request:`)
    if (!reason) return

    setProcessingId(id)
    try {
      const { error } = await supabase.from('withdrawal_requests').update({ status: 'Rejected' }).eq('id', id)
      if (error) throw error
      fetchRequests()
    } catch (err: any) {
      alert(`Rejection Failed: ${err.message}`)
    } finally {
      setProcessingId(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'Pending')
  const totalPendingVolume = pendingRequests.reduce((sum, r) => sum + Number(r.amount), 0)
  const totalPaidVolume = requests.filter(r => r.status === 'Paid' || r.status === 'Approved').reduce((sum, r) => sum + Number(r.amount), 0)

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] h-screen flex items-center justify-center uppercase tracking-widest animate-pulse">Loading Payout Ledger...</div>

  return (
    <div className="p-4 sm:p-6 md:p-10 max-w-7xl mx-auto animate-in fade-in pb-20 relative">
      
      {/* THE DUAL-VERIFICATION MODAL */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050a15]/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 border border-gray-100 relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full blur-3xl -mt-10 -mr-10 pointer-events-none"></div>
            
            <div className="p-6 border-b border-gray-100 bg-white/50 flex justify-between items-center relative z-10">
              <h3 className="font-bold text-[#0a1128] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Authorize Disbursement
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors active:scale-95">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 relative z-10">
              <div className="mb-6 bg-purple-50/50 p-5 rounded-2xl border border-purple-100 text-center shadow-sm">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Target School</p>
                <p className="font-bold text-[#0a1128] mb-4 flex items-center justify-center gap-1.5">
                  <Building2 className="w-4 h-4 text-purple-400" />
                  {activeRequest.school_name}
                </p>
                
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Requested Amount</p>
                <p className="text-4xl font-black font-mono text-purple-700 tracking-tight">₦{Number(activeRequest.amount).toLocaleString()}</p>
                
                <div className="mt-4 pt-4 border-t border-purple-100/50 text-xs font-medium text-gray-600 flex flex-col items-center gap-1">
                  <p className="flex items-center gap-1.5"><Landmark className="w-3.5 h-3.5 text-gray-400"/> {activeRequest.bank_name}</p>
                  <p className="font-mono font-bold text-[#0a1128]">{activeRequest.account_number}</p>
                </div>
              </div>

              <form onSubmit={handleApproveRequest} className="space-y-5">
                <div>
                  <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-2">1. Bank Transfer Reference</label>
                  <input 
                    type="text" required placeholder="Paste exact ID from bank portal"
                    value={refNumber} onChange={e => setRefNumber(e.target.value)}
                    className="w-full border border-gray-200 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 bg-gray-50 focus:bg-white font-mono shadow-sm transition-all"
                  />
                  <p className="text-[10px] text-gray-500 mt-2 font-medium">This will be permanently printed on the school's PDF receipt.</p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-2 flex items-center justify-between">
                    <span>2. Confirm Transferred Amount</span>
                    {confirmAmount && Number(confirmAmount) === Number(activeRequest.amount) && (
                      <span className="text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Match</span>
                    )}
                  </label>
                  <input 
                    type="number" required placeholder={`Type ${activeRequest.amount}`}
                    value={confirmAmount} onChange={e => setConfirmAmount(e.target.value)}
                    className={`w-full border p-3.5 rounded-xl text-sm outline-none focus:ring-2 font-mono shadow-sm transition-all font-bold ${
                      confirmAmount && Number(confirmAmount) !== Number(activeRequest.amount) 
                        ? 'border-red-300 focus:ring-red-600 bg-red-50/50 text-red-700' 
                        : 'border-gray-200 focus:ring-purple-600 focus:border-purple-600 bg-gray-50 focus:bg-white text-[#0a1128]'
                    }`}
                  />
                  {confirmAmount && Number(confirmAmount) !== Number(activeRequest.amount) && (
                    <p className="text-[10px] text-red-600 font-bold mt-2 flex items-center gap-1 animate-pulse">
                      <XCircle className="w-3.5 h-3.5" /> Mismatch! Must be exactly ₦{activeRequest.amount}
                    </p>
                  )}
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    disabled={isSubmitting || Number(confirmAmount) !== Number(activeRequest.amount) || !refNumber.trim()}
                    className="w-full bg-gradient-to-r from-purple-600 to-purple-500 text-white px-5 py-4 rounded-xl font-bold hover:from-purple-700 hover:to-purple-600 disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? 'Recording Ledger...' : 'Log & Approve Transfer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* END MODAL */}

      {/* HEADER */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-2">
            <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight flex items-center gap-3">
              <Banknote className="w-8 h-8 text-purple-600" />
              Withdrawal Approvals
            </h1>
            <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-md border border-green-200 w-fit shadow-sm">
              <span className={`relative flex h-2 w-2 ${isLive ? '' : 'hidden'}`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-green-700">
                {isLive ? 'Live Sync' : 'Connecting...'}
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-sm font-medium">Review and authorize school payout requests across the platform.</p>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-orange-50/50 p-6 md:p-8 rounded-3xl border border-orange-100 shadow-sm flex justify-between items-center transition-shadow hover:shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-orange-100 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-orange-700 uppercase tracking-widest mb-2">Action Required</p>
            <p className="text-3xl font-black text-orange-800 tracking-tight">{pendingRequests.length}</p>
          </div>
          <div className="text-right relative z-10">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mb-2">Pending Volume</p>
            <p className="text-xl font-black text-orange-800 font-mono tracking-tight">₦{totalPendingVolume.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-green-50/50 p-6 md:p-8 rounded-3xl border border-green-100 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-100 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-2">Total Disbursed Volume</p>
            <p className="text-3xl font-black text-green-800 font-mono tracking-tight">₦{totalPaidVolume.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gray-50 rounded-full blur-2xl -mt-8 -mr-8 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Total Processed Logs</p>
            <p className="text-3xl font-black text-[#0a1128] tracking-tight">{requests.length}</p>
          </div>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden h-fit">
        <div className="p-6 border-b border-gray-100 bg-white">
          <h2 className="text-lg font-bold text-[#0a1128]">Master Settlement Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          {requests.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-[#0a1128] font-bold text-lg mb-1">No requests generated yet.</p>
              <p className="text-sm text-gray-500 font-medium">When schools request payouts, they will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                <tr>
                  <th className="p-5">Generated</th>
                  <th className="p-5">Partner School</th>
                  <th className="p-5">Amount</th>
                  <th className="p-5">Banking Details</th>
                  <th className="p-5">Status</th>
                  <th className="p-5 text-right">HQ Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-5 text-gray-500 font-medium text-xs">
                      {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-5 font-bold text-[#0a1128] flex items-center gap-2 mt-1">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      {req.school_name}
                    </td>
                    <td className="p-5 font-black text-[#0a1128] font-mono text-base tracking-tight">
                      ₦{Number(req.amount).toLocaleString()}
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Landmark className="w-3.5 h-3.5 text-gray-400" />
                        <p className="text-[#0a1128] font-bold text-sm">{req.bank_name}</p>
                      </div>
                      <p className="text-xs text-gray-500 font-mono pl-5">{req.account_number}</p>
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                        req.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                        req.status === 'Paid' || req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {req.status === 'Pending' && <Clock className="w-3 h-3" />}
                        {(req.status === 'Paid' || req.status === 'Approved') && <CheckCircle2 className="w-3 h-3" />}
                        {(req.status === 'Rejected' || req.status === 'Failed') && <AlertCircle className="w-3 h-3" />}
                        {req.status}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleReject(req.id, req.school_name)}
                            disabled={processingId === req.id}
                            className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-xl text-[11px] font-bold hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50 shadow-sm active:scale-95"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => openModal(req)}
                            className="bg-gradient-to-r from-purple-600 to-purple-500 text-white px-5 py-2 rounded-xl text-[11px] font-bold hover:from-purple-700 hover:to-purple-600 transition-all shadow-md shadow-purple-500/20 active:scale-95 flex items-center gap-1.5"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Review
                          </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-green-600 font-bold text-xs flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                          </p>
                          {req.bank_reference && (
                            <p className="text-[10px] text-gray-400 font-mono mt-1 font-medium bg-gray-50 px-2 py-0.5 rounded border border-gray-100 w-fit ml-auto" title={req.bank_reference}>
                              Ref: {req.bank_reference.substring(0, 8)}...
                            </p>
                          )}
                        </div>
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