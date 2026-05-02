'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync' // <-- The Hook
import { 
  Banknote, ShieldCheck, X, Building2, Landmark, 
  CheckCircle2, AlertCircle, Clock, Check, XCircle
} from 'lucide-react'

export default function AdminPayoutsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true) // HQ Session Lock
  const [requests, setRequests] = useState<any[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [isLive, setIsLive] = useState(false)

  // --- DUAL-VERIFICATION MODAL STATE ---
  const [activeRequest, setActiveRequest] = useState<any>(null)
  const [refNumber, setRefNumber] = useState('')
  const [confirmAmount, setConfirmAmount] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 1. Pure Fetch Function
  const fetchRequests = useCallback(async (isMounted: boolean = true, isSilent: boolean = false) => {
    try {
      if (isMounted && !isSilent) setLoading(true)
      const { data, error } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (data && isMounted) setRequests(data)
    } catch (err) {
      console.error("Fetch Error:", err)
      if (isMounted && !isSilent) toast.error("Failed to sync payout ledger.")
    } finally {
      if (isMounted && !isSilent) setLoading(false)
    }
  }, [])

  // 2. THE HOOK GOES HERE: At the top level!
  useRealtimeSync(() => fetchRequests(true, true))

  // 3. Normal Component Initialization
  useEffect(() => {
    let isMounted = true

    const initializePage = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError || !user) {
          router.push('/admin-login')
          return
        }

        // CRITICAL HQ VERIFICATION
        const { data: hqData } = await supabase
          .from('hq_users')
          .select('role')
          .eq('user_email', user.email as string || '')
          .maybeSingle()

        if (!hqData) {
          await supabase.auth.signOut()
          router.push('/admin-login')
          return
        }

        if (isMounted) {
          // Initial non-silent load
          await fetchRequests(isMounted, false)
        }

      } catch (err) {
        console.error("Initialization Error:", err)
        toast.error("HQ Authentication failed.")
        if (isMounted) setLoading(false)
      } finally {
        if (isMounted) setIsInitializing(false)
      }
    }

    initializePage()

    const channel = supabase
      .channel('admin-payouts-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawal_requests' }, () => {
         // This is a direct supabase table listener that we kept from before. 
         // Since the hook handles the global sync, you could actually remove this block, 
         // but it doesn't hurt to keep it specifically for the live green light UI indicator.
         if (isMounted) fetchRequests(isMounted, true) 
      })
      .subscribe((status) => {
        if (isMounted) {
          if (status === 'SUBSCRIBED') setIsLive(true)
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setIsLive(false)
        }
      })

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/admin-login')
    })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
      authListener.subscription.unsubscribe()
    }
    
  }, [router, fetchRequests])

  const handleApproveRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeRequest) return

    if (Number(confirmAmount) !== Number(activeRequest.amount)) {
      toast.error("SECURITY HALT: The amount you typed does not match the requested amount.")
      return
    }
    if (!refNumber.trim()) {
      toast.error("Bank Reference Number is required.")
      return
    }

    setIsSubmitting(true)
    const loadingToast = toast.loading("Authorizing disbursement...")
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const { error } = await supabase.from('withdrawal_requests').update({
          status: 'Approved', bank_reference: refNumber, approved_at: new Date().toISOString(), processed_by: user?.id || null
        }).eq('id', activeRequest.id)

      if (error) throw error
      toast.success("Success! Withdrawal is marked as Approved.", { id: loadingToast })
      closeModal()
      
      // Re-fetch after approval
      fetchRequests(true, true)

    } catch (err: any) { 
      toast.error(`Approval Error: ${err.message}`, { id: loadingToast }) 
    } finally { 
      setIsSubmitting(false) 
    }
  }

  const openModal = (request: any) => { setActiveRequest(request); setRefNumber(''); setConfirmAmount(''); }
  const closeModal = () => { setActiveRequest(null); setRefNumber(''); setConfirmAmount(''); }

  const handleReject = (id: string, schoolName: string) => {
    toast(
      (t) => (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-bold text-[#0a1128]">Reject {schoolName}'s Payout?</p>
          <p className="text-xs text-gray-500">This will decline the withdrawal request.</p>
          <div className="flex gap-2 mt-1">
            <button 
              onClick={async () => {
                toast.dismiss(t.id)
                setProcessingId(id)
                const loadingToast = toast.loading(`Rejecting request...`)
                try {
                  const { error } = await supabase.from('withdrawal_requests').update({ status: 'Rejected' }).eq('id', id)
                  if (error) throw error
                  toast.success("Request rejected.", { id: loadingToast })
                  
                  // Re-fetch after rejection
                  fetchRequests(true, true)

                } catch (err: any) { 
                  toast.error(`Rejection failed: ${err.message}`, { id: loadingToast }) 
                } finally { setProcessingId(null) }
              }}
              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
            >
              Yes, Reject
            </button>
            <button onClick={() => toast.dismiss(t.id)} className="bg-gray-100 text-[#0a1128] px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      ), { duration: Infinity }
    )
  }

  const pendingRequests = requests.filter(r => r.status === 'Pending')
  const totalPendingVolume = pendingRequests.reduce((sum, r) => sum + Number(r.amount), 0)
  const totalPaidVolume = requests.filter(r => r.status === 'Paid' || r.status === 'Approved').reduce((sum, r) => sum + Number(r.amount), 0)

  if (isInitializing || loading) return <div className="p-10 text-center font-bold text-[#0a1128] text-sm h-screen flex items-center justify-center uppercase tracking-widest animate-pulse">Initializing HQ Terminal...</div>

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto animate-in fade-in pb-20 relative">
      
      {/* THE DUAL-VERIFICATION MODAL */}
      {activeRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0a1128]/80 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 border border-gray-100 relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full blur-3xl -mt-8 -mr-8 pointer-events-none"></div>
            
            <div className="p-5 border-b border-gray-100 bg-white/50 flex justify-between items-center relative z-10">
              <h3 className="font-bold text-[#0a1128] text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Authorize Disbursement
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition-colors active:scale-95">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-5 relative z-10">
              <div className="mb-5 bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center shadow-sm">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Target School</p>
                <p className="font-bold text-[#0a1128] text-sm mb-3 flex items-center justify-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" /> {activeRequest.school_name}
                </p>
                
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Requested Amount</p>
                <p className="text-3xl font-black font-mono text-blue-700 tracking-tight">₦{Number(activeRequest.amount).toLocaleString()}</p>
                
                <div className="mt-3 pt-3 border-t border-blue-100/50 text-[11px] font-medium text-gray-600 flex flex-col items-center gap-0.5">
                  <p className="flex items-center gap-1"><Landmark className="w-3 h-3 text-gray-400"/> {activeRequest.bank_name}</p>
                  <p className="font-mono font-bold text-[#0a1128]">{activeRequest.account_number}</p>
                </div>
              </div>

              <form onSubmit={handleApproveRequest} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">1. Bank Transfer Ref</label>
                  <input type="text" required placeholder="Paste exact ID" value={refNumber} onChange={e => setRefNumber(e.target.value)}
                    className="w-full border border-gray-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-gray-50 focus:bg-white font-mono shadow-sm transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>2. Confirm Transferred Amount</span>
                    {confirmAmount && Number(confirmAmount) === Number(activeRequest.amount) && (
                      <span className="text-green-600 flex items-center gap-1"><Check className="w-3 h-3" /> Match</span>
                    )}
                  </label>
                  <input type="number" required placeholder={`Type ${activeRequest.amount}`} value={confirmAmount} onChange={e => setConfirmAmount(e.target.value)}
                    className={`w-full border p-2.5 rounded-lg text-xs outline-none focus:ring-2 font-mono shadow-sm transition-all font-bold ${
                      confirmAmount && Number(confirmAmount) !== Number(activeRequest.amount) 
                        ? 'border-red-300 focus:ring-red-600 bg-red-50/50 text-red-700' 
                        : 'border-gray-200 focus:ring-blue-600 bg-gray-50 focus:bg-white text-[#0a1128]'
                    }`}
                  />
                </div>
                <div className="pt-2">
                  <button type="submit" disabled={isSubmitting || Number(confirmAmount) !== Number(activeRequest.amount) || !refNumber.trim()}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white px-4 py-3 rounded-lg text-xs font-bold hover:from-blue-700 hover:to-blue-600 disabled:from-gray-300 disabled:shadow-none transition-all shadow-lg shadow-blue-500/20 active:scale-95 flex justify-center gap-1.5"
                  >
                    {isSubmitting ? 'Recording Ledger...' : 'Log & Approve Transfer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-1.5">
            <h1 className="text-2xl font-extrabold text-[#0a1128] tracking-tight flex items-center gap-2">
              <Banknote className="w-6 h-6 text-blue-600" /> Withdrawal Approvals
            </h1>
            <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-200 w-fit shadow-sm">
              <span className={`relative flex h-1.5 w-1.5 ${isLive ? '' : 'hidden'}`}>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-green-700">
                {isLive ? 'Live Sync' : 'Connecting...'}
              </span>
            </div>
          </div>
          <p className="text-gray-500 text-xs font-medium">Review and authorize school payout requests across the platform.</p>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 shadow-sm flex justify-between items-center transition-shadow hover:shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-100 rounded-full blur-2xl -mt-6 -mr-6 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[9px] font-bold text-orange-700 uppercase tracking-widest mb-1.5">Action Required</p>
            <p className="text-2xl font-black text-orange-800 tracking-tight">{pendingRequests.length}</p>
          </div>
          <div className="text-right relative z-10">
            <p className="text-[9px] font-bold text-orange-600 uppercase tracking-widest mb-1.5">Pending Volume</p>
            <p className="text-lg font-black text-orange-800 font-mono tracking-tight">₦{totalPendingVolume.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100 shadow-sm transition-shadow hover:shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full blur-2xl -mt-6 -mr-6 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[9px] font-bold text-green-700 uppercase tracking-widest mb-1.5">Total Disbursed Volume</p>
            <p className="text-2xl font-black text-green-800 font-mono tracking-tight">₦{totalPaidVolume.toLocaleString()}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gray-50 rounded-full blur-2xl -mt-6 -mr-6 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Total Processed Logs</p>
            <p className="text-2xl font-black text-[#0a1128] tracking-tight">{requests.length}</p>
          </div>
        </div>
      </div>

      {/* LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-fit">
        <div className="p-5 border-b border-gray-100 bg-white">
          <h2 className="text-base font-bold text-[#0a1128]">Master Settlement Ledger</h2>
        </div>
        <div className="overflow-x-auto">
          {requests.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-[#0a1128] font-bold text-sm mb-0.5">No requests generated yet.</p>
              <p className="text-xs text-gray-500 font-medium">When schools request payouts, they will appear here.</p>
            </div>
          ) : (
            <table className="w-full text-left text-sm border-collapse whitespace-nowrap">
              <thead className="bg-gray-50/80 border-b border-gray-100 text-[9px] text-gray-500 uppercase tracking-widest font-bold">
                <tr>
                  <th className="p-4">Generated</th>
                  <th className="p-4">Partner School</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Banking Details</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">HQ Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map((req) => (
                  <tr key={req.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-4 text-gray-500 font-medium text-[11px]">
                      {new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-4 font-bold text-[#0a1128] text-xs flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" /> {req.school_name}
                    </td>
                    <td className="p-4 font-black text-[#0a1128] font-mono text-sm tracking-tight">
                      ₦{Number(req.amount).toLocaleString()}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1 mb-1">
                        <Landmark className="w-3 h-3 text-gray-400" />
                        <p className="text-[#0a1128] font-bold text-[11px]">{req.bank_name}</p>
                      </div>
                      <p className="text-[10px] text-gray-500 font-mono pl-4">{req.account_number}</p>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${
                        req.status === 'Pending' ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                        req.status === 'Paid' || req.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-200' : 
                        'bg-red-50 text-red-700 border-red-200'
                      }`}>
                        {req.status === 'Pending' && <Clock className="w-2.5 h-2.5" />}
                        {(req.status === 'Paid' || req.status === 'Approved') && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {(req.status === 'Rejected' || req.status === 'Failed') && <AlertCircle className="w-2.5 h-2.5" />}
                        {req.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {req.status === 'Pending' ? (
                        <div className="flex justify-end gap-1.5">
                          <button onClick={() => handleReject(req.id, req.school_name)} disabled={processingId === req.id}
                            className="bg-white border border-red-200 text-red-600 px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-red-50 transition-colors disabled:opacity-50 shadow-sm active:scale-95"
                          > Reject </button>
                          <button onClick={() => openModal(req)}
                            className="bg-gradient-to-r from-blue-600 to-blue-500 text-white px-3.5 py-1.5 rounded-lg text-[10px] font-bold hover:from-blue-700 hover:to-blue-600 transition-all shadow-sm shadow-blue-500/20 active:scale-95 flex items-center gap-1"
                          > <ShieldCheck className="w-3 h-3" /> Review </button>
                        </div>
                      ) : (
                        <div className="text-right">
                          <p className="text-green-600 font-bold text-[11px] flex items-center justify-end gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Settled
                          </p>
                          {req.bank_reference && (
                            <p className="text-[9px] text-gray-400 font-mono mt-0.5 font-medium bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 w-fit ml-auto" title={req.bank_reference}>
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