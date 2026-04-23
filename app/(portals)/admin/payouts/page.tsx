'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

export default function AdminPayoutsPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<any[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  // --- NEW: DUAL-VERIFICATION MODAL STATE ---
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
          fetchRequests() // Refresh the ledger silently
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

  // --- NEW: DUAL VERIFICATION APPROVAL ENGINE ---
  const handleApproveRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRequest) return

    // THE SAFETY LOCK: Failsafe against typo/paste fatigue
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
      // Realtime listener will automatically refresh the table
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

  // PRESERVED: Your original reject logic
  const handleReject = async (id: string, schoolName: string) => {
    const reason = window.prompt(`Enter reason for rejecting ${schoolName}'s withdrawal request:`)
    if (!reason) return

    setProcessingId(id)
    try {
      const { error } = await supabase.from('withdrawal_requests').update({ status: 'Rejected' }).eq('id', id)
      if (error) throw error
    } catch (err: any) {
      alert(`Rejection Failed: ${err.message}`)
    } finally {
      setProcessingId(null)
    }
  }

  const pendingRequests = requests.filter(r => r.status === 'Pending')
  const totalPendingVolume = pendingRequests.reduce((sum, r) => sum + Number(r.amount), 0)
  const totalPaidVolume = requests.filter(r => r.status === 'Paid' || r.status === 'Approved').reduce((sum, r) => sum + Number(r.amount), 0)

  if (loading) return <div className="p-10 text-center font-bold text-[#0a1128] h-full flex items-center justify-center animate-pulse">Loading Payout Ledger...</div>

  return (
    <div className="p-6 md:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in">
      
      {/* THE DUAL-VERIFICATION MODAL */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-[#0a1128]">Approve Disbursement</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Target School</p>
                <p className="font-bold text-[#0a1128] mb-3">{activeRequest.school_name}</p>
                
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Requested Amount</p>
                <p className="text-3xl font-mono font-bold text-blue-700 tracking-tight">₦{Number(activeRequest.amount).toLocaleString()}</p>
                
                <div className="mt-3 pt-3 border-t border-blue-100 text-xs font-medium text-gray-600 flex justify-center gap-4">
                  <p>{activeRequest.bank_name}</p>
                  <p className="font-mono font-bold">{activeRequest.account_number}</p>
                </div>
              </div>

              <form onSubmit={handleApproveRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">1. Bank Transfer Reference</label>
                  <input 
                    type="text" required placeholder="Paste exact ID from bank portal"
                    value={refNumber} onChange={e => setRefNumber(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-600 font-mono shadow-sm"
                  />
                  <p className="text-[10px] text-gray-400 mt-1.5">This will be printed on the school's PDF receipt.</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0a1128] uppercase tracking-wide mb-2">2. Confirm Transferred Amount</label>
                  <input 
                    type="number" required placeholder={`Type ${activeRequest.amount}`}
                    value={confirmAmount} onChange={e => setConfirmAmount(e.target.value)}
                    className={`w-full border p-3 rounded-xl text-sm outline-none focus:ring-2 font-mono shadow-sm transition-colors ${
                      confirmAmount && Number(confirmAmount) !== Number(activeRequest.amount) 
                        ? 'border-red-400 focus:ring-red-600 bg-red-50 text-red-700' 
                        : 'border-gray-300 focus:ring-blue-600'
                    }`}
                  />
                  {confirmAmount && Number(confirmAmount) !== Number(activeRequest.amount) && (
                    <p className="text-[10px] text-red-500 font-bold mt-1.5 animate-pulse">Mismatch! Must be exactly ₦{activeRequest.amount}</p>
                  )}
                </div>

                <div className="pt-4">
                  <button 
                    type="submit" 
                    disabled={isSubmitting || Number(confirmAmount) !== Number(activeRequest.amount) || !refNumber.trim()}
                    className="w-full bg-[#0a1128] text-white px-5 py-3.5 rounded-xl font-bold hover:bg-[#15234b] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-sm"
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
      <div className="mb-8 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold text-[#0a1128]">Withdrawal Approvals</h1>
            <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              <span className={`relative flex h-2 w-2 ${isLive ? '' : 'hidden'}`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-green-700">
                {isLive ? 'Live Sync' : 'Connecting...'}
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-sm">Review and authorize school payout requests across the platform.</p>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-orange-50 p-6 rounded-2xl border border-orange-200 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
          <div>
            <p className="text-xs font-bold text-orange-700 uppercase tracking-wider mb-2">Action Required</p>
            <p className="text-3xl font-bold text-orange-800">{pendingRequests.length}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-wider mb-2">Pending Volume</p>
            <p className="text-xl font-bold text-orange-800 font-mono">₦{totalPendingVolume.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-green-50 p-6 rounded-2xl border border-green-200 shadow-sm transition-all hover:shadow-md">
          <p className="text-xs font-bold text-green-700 uppercase tracking-wider mb-2">Total Disbursed Volume</p>
          <p className="text-3xl font-bold text-green-800 font-mono">₦{totalPaidVolume.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total Processed Logs</p>
          <p className="text-3xl font-bold text-[#0a1128]">{requests.length}</p>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit">
        <div className="overflow-x-auto">
          {requests.length === 0 ? (
            <div className="p-10 text-center text-gray-500 font-medium">No requests generated yet.</div>
          ) : (
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-gray-50/50 border-b border-gray-200 text-[#0a1128]">
                <tr>
                  <th className="p-5 font-bold uppercase text-xs tracking-wide">Generated</th>
                  <th className="p-5 font-bold uppercase text-xs tracking-wide">Partner School</th>
                  <th className="p-5 font-bold uppercase text-xs tracking-wide">Amount</th>
                  <th className="p-5 font-bold uppercase text-xs tracking-wide">Banking Details</th>
                  <th className="p-5 font-bold uppercase text-xs tracking-wide">Status</th>
                  <th className="p-5 font-bold uppercase text-xs tracking-wide text-right">HQ Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-5 text-gray-600">
                      {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-5 font-bold text-[#0a1128]">{req.school_name}</td>
                    <td className="p-5 font-bold text-[#0a1128] font-mono">
                      ₦{Number(req.amount).toLocaleString()}.00
                    </td>
                    <td className="p-5">
                      <p className="text-[#0a1128] font-bold">{req.bank_name}</p>
                      <p className="text-xs text-gray-500 font-mono mt-0.5">{req.account_number}</p>
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        req.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                        req.status === 'Paid' || req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleReject(req.id, req.school_name)}
                            disabled={processingId === req.id}
                            className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-50 transition-colors disabled:opacity-50 shadow-sm"
                          >
                            Reject
                          </button>
                          <button 
                            onClick={() => openModal(req)}
                            className="bg-blue-600 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors shadow-sm"
                          >
                            Review & Approve
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs">
                          <p className="text-green-600 font-bold">Settled</p>
                          {req.bank_reference && (
                            <p className="text-[9px] text-gray-400 font-mono mt-0.5" title={req.bank_reference}>
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