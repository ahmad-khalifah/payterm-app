'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

// --- NEW LUCIDE ICONS ---
import { 
  Landmark, ChevronDown, Calendar, Lock, 
  Receipt, GraduationCap, CheckCircle2, FileQuestion
} from 'lucide-react'

export default function FeeSetupPage() {
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingFees, setIsLoadingFees] = useState(false)
  const [targetSchool, setTargetSchool] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  
  // LEDGER TABLE STATE
  const [existingFees, setExistingFees] = useState<any[]>([])
  const [isLoadingTable, setIsLoadingTable] = useState(true)
  
  // DYNAMIC SESSION & TERM DATA
  const sessionList = ["2025/2026", "2026/2027", "2027/2028"]
  const termList = ["First Term", "Second Term", "Third Term"]
  
  const classList = [
    "Primary 1", "Primary 2", "Primary 3", "Primary 4", "Primary 5", "Primary 6",
    "JSS 1", "JSS 2", "JSS 3", "SS 1", "SS 2", "SS 3"
  ]

  const [selectedSession, setSelectedSession] = useState(sessionList[1]) 
  const [selectedTerm, setSelectedTerm] = useState(termList[0]) 
  const [selectedClass, setSelectedClass] = useState(classList[0])
  
  // FEES & ANCHOR DATE STATE
  const [fees, setFees] = useState({ tuition: 0, books: 0, uniform: 0, transport: 0 })
  const [midTermDate, setMidTermDate] = useState('')

  const fetchExistingFees = async (schoolName: string) => {
    setIsLoadingTable(true)
    try {
      const { data, error } = await supabase
        .from('class_fees')
        .select('*')
        .eq('school_name', schoolName)
        .order('academic_session', { ascending: false })
        .order('term', { ascending: true })
        .order('class_name', { ascending: true })

      if (error) throw error
      if (data) setExistingFees(data)
    } catch (err: any) {
      console.error("Error fetching fees for table:", err.message)
    } finally {
      setIsLoadingTable(false)
    }
  }

  useEffect(() => {
    const initializePage = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: schoolProfile } = await supabase
          .from('partner_schools')
          .select('name')
          .eq('id', user.id)
          .single()

        if (schoolProfile) {
          setTargetSchool(schoolProfile.name)
          fetchExistingFees(schoolProfile.name as string)
        }
      } catch (err) {
        console.error("Auth Error:", err)
      } finally {
        setIsInitializing(false)
      }
    }
    initializePage()
  }, [])

  useEffect(() => {
    if (!targetSchool) return

    const fetchClassFees = async () => {
      setIsLoadingFees(true)
      try {
        const { data, error } = await supabase
          .from('class_fees')
          .select('*')
          .eq('school_name', targetSchool)
          .eq('class_name', selectedClass)
          .eq('academic_session', selectedSession)
          .eq('term', selectedTerm)
          .single()

        if (data) {
          setFees({
            tuition: Number(data.tuition) || 0,
            books: Number(data.books) || 0,
            uniform: Number(data.uniform) || 0,
            transport: Number(data.transport) || 0,
          })
          setMidTermDate(data.mid_term_date || '')
        } else {
          setFees({ tuition: 0, books: 0, uniform: 0, transport: 0 })
          setMidTermDate('')
        }
      } catch (err) {
        setFees({ tuition: 0, books: 0, uniform: 0, transport: 0 })
        setMidTermDate('')
      } finally {
        setIsLoadingFees(false)
      }
    }

    fetchClassFees()
  }, [selectedClass, selectedSession, selectedTerm, targetSchool])

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFees(prev => ({ ...prev, [name]: Number(value) || 0 }))
  }

  const totalBaseFee = fees.tuition + fees.books + fees.uniform + fees.transport
  const paytermMargin = totalBaseFee * 0.05
  const parentTotalFee = totalBaseFee + paytermMargin

  const downPayment = parentTotalFee * 0.60
  const midTermBalance = parentTotalFee * 0.40

  const handleSaveFees = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetSchool) return alert("Security Error: The system cannot verify which school is logged in.")
    if (totalBaseFee <= 0) return alert("Please enter a Tuition amount greater than zero before saving.")
    if (!midTermDate) return alert("You must select a Mid-Term Resumption Date.")
    
    setIsSaving(true)
    try {
      const { error } = await supabase
        .from('class_fees')
        .upsert({ 
          school_name: targetSchool,
          class_name: selectedClass,
          academic_session: selectedSession,
          term: selectedTerm,
          tuition: fees.tuition,
          books: fees.books,
          uniform: fees.uniform,
          transport: fees.transport,
          total_base_fee: totalBaseFee,
          parent_total_fee: parentTotalFee,
          mid_term_date: midTermDate 
        }, { onConflict: 'school_name, class_name, academic_session, term' })

      if (error) throw error
      alert(`${selectedClass} fees and calendar locked successfully for ${selectedTerm}.`)
      
      fetchExistingFees(targetSchool)
      
    } catch (err: any) {
      alert(`Error saving fees: ${err.message}`)
    } finally {
      setIsSaving(false)
    }
  }

  if (isInitializing) return <div className="p-10 text-center font-bold text-[#0a1128] tracking-widest uppercase h-full flex items-center justify-center animate-pulse">Loading Secure Configuration...</div>

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20 relative">
      
      {/* HEADER */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-[#0a1128] mb-2 tracking-tight flex items-center gap-3">
          <Landmark className="w-8 h-8 text-blue-600" />
          Fee Configuration
        </h1>
        <p className="text-gray-500 font-medium text-sm">Define term fees per class and lock your academic calendar.</p>
      </div>
  
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: FEE SETUP FORM */}
        <div className="xl:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm h-fit relative overflow-hidden">
          {/* Background subtle glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl pointer-events-none -mt-10 -mr-10"></div>

          <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-5 relative z-10">
            <h3 className="text-lg font-bold text-[#0a1128] flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              Termly Base Fees
            </h3>
            {isLoadingFees && <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider animate-pulse bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">Syncing...</span>}
          </div>
          
          <form onSubmit={handleSaveFees} className="space-y-6 relative z-10">
            {/* Session & Term */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
              <div className="relative">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Academic Session</label>
                <div className="relative">
                  <select 
                    value={selectedSession} 
                    onChange={(e) => setSelectedSession(e.target.value)} 
                    className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white font-bold text-[#0a1128] text-sm shadow-sm transition-all appearance-none cursor-pointer"
                  >
                    {sessionList.map(session => (
                      <option key={session} value={session}>{session}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="relative">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Current Term</label>
                <div className="relative">
                  <select 
                    value={selectedTerm} 
                    onChange={(e) => setSelectedTerm(e.target.value)} 
                    className="w-full border border-gray-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white font-bold text-[#0a1128] text-sm shadow-sm transition-all appearance-none cursor-pointer"
                  >
                    {termList.map(term => (
                      <option key={term} value={term}>{term}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
  
            {/* Class Selection */}
            <div className="bg-blue-50/30 p-4 rounded-2xl border border-blue-100">
              <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" /> Select Class
              </label>
              <div className="relative">
                <select 
                  value={selectedClass} 
                  onChange={(e) => setSelectedClass(e.target.value)} 
                  className="w-full border border-blue-200 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white font-extrabold text-[#0a1128] text-base shadow-sm transition-all appearance-none cursor-pointer"
                >
                  {classList.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-400 pointer-events-none" />
              </div>
            </div>
  
            {/* Line Items */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-2">Tuition Fee (₦)</label>
                  <input 
                    type="number" name="tuition" value={fees.tuition || ''} onChange={handleFeeChange}
                    className="w-full border border-gray-200 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] text-sm font-bold shadow-sm transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-2">Books & Materials (₦)</label>
                  <input 
                    type="number" name="books" value={fees.books || ''} onChange={handleFeeChange}
                    className="w-full border border-gray-200 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] text-sm font-bold shadow-sm transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-2">Uniform <span className="text-gray-400 font-medium normal-case tracking-normal">(Optional)</span></label>
                  <input 
                    type="number" name="uniform" value={fees.uniform || ''} onChange={handleFeeChange}
                    className="w-full border border-gray-200 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] text-sm font-bold shadow-sm transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-2">Transport <span className="text-gray-400 font-medium normal-case tracking-normal">(Optional)</span></label>
                  <input 
                    type="number" name="transport" value={fees.transport || ''} onChange={handleFeeChange}
                    className="w-full border border-gray-200 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] text-sm font-bold shadow-sm transition-all bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>
  
            {/* Deadline Anchor */}
            <div className="border border-orange-200 bg-orange-50/40 p-5 rounded-2xl relative overflow-hidden mt-4 shadow-sm">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>
              <label className="block text-[11px] font-bold text-orange-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                Mid-Term Resumption Date
              </label>
              <input 
                type="date" required value={midTermDate} onChange={e => setMidTermDate(e.target.value)}
                className="w-full border border-orange-200 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 font-bold bg-white text-[#0a1128] shadow-sm transition-all cursor-pointer"
              />
              <p className="text-[10px] text-orange-700/80 mt-2 font-medium">
                This dictates the hard deadline for the 40% balance for this term.
              </p>
            </div>
  
            {/* Submit Area */}
            <div className="pt-4 mt-6 border-t border-gray-100 space-y-4">
              <div className="flex justify-between items-center bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
                <span className="text-[11px] font-bold text-green-800 uppercase tracking-wide flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  School Receives:
                </span>
                <span className="text-2xl font-black text-green-700 font-mono tracking-tight">₦{totalBaseFee.toLocaleString()}</span>
              </div>
  
              <button 
                type="submit" 
                disabled={isSaving || !midTermDate} 
                className={`w-full flex items-center justify-center gap-2 text-white px-4 py-4 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 ${
                  isSaving || !midTermDate 
                    ? 'bg-blue-300 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 hover:shadow-lg hover:shadow-blue-500/20'
                }`}
              >
                <Lock className="w-4 h-4" />
                {isSaving ? 'Syncing...' : `Lock ${selectedTerm} Fees`}
              </button>
            </div>
          </form>
        </div>
  
        {/* RIGHT COLUMN: 60/40 PARENT PREVIEW ENGINE */}
        <div className="xl:col-span-5 space-y-6">
          <div className="bg-gradient-to-br from-[#0a1128] to-blue-950 p-6 sm:p-8 rounded-3xl shadow-xl shadow-blue-900/10 text-white relative overflow-hidden border border-[#0a1128]">
            {/* Decorative Glow */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/20 blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                  Live Parent Preview
                </h3>
                <span className="text-[9px] font-bold bg-white/10 px-2.5 py-1 rounded border border-white/10 uppercase tracking-wider">
                  {selectedSession}
                </span>
              </div>
              
              <p className="text-xs text-gray-300 mb-8 font-medium">Showing final invoice presentation for <strong className="text-white font-bold">{selectedClass}</strong> parents.</p>
              
              <div className="space-y-4 mb-8 bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm">
                <div className="flex justify-between items-center text-gray-300 text-xs font-medium">
                  <span>School Base Fee</span>
                  <span className="font-mono text-white text-sm font-bold">₦{totalBaseFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-gray-300 text-xs font-medium">
                  <span>PayTerm Platform Fee (5%)</span>
                  <span className="font-mono text-white text-sm font-bold">₦{paytermMargin.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                  <span className="font-bold text-sm text-white tracking-wide uppercase">Total Parent Plan</span>
                  <span className="text-2xl font-black font-mono text-blue-400 tracking-tight">₦{parentTotalFee.toLocaleString()}</span>
                </div>
              </div>
    
              <div className="bg-[#0a1128] border border-blue-900/50 rounded-2xl p-5 shadow-inner">
                <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-4 border-b border-gray-800 pb-3">PayTerm 60/40 Schedule</p>
                
                <div className="space-y-5">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-xs text-white">Day 1 Downpayment (60%)</p>
                      <p className="text-[9px] text-green-400 mt-1 font-bold uppercase tracking-wider flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Required for enrollment
                      </p>
                    </div>
                    <span className="font-black font-mono text-white text-lg tracking-tight">₦{downPayment.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-bold text-xs text-white">Mid-Term Balance (40%)</p>
                      <p className="text-[9px] text-orange-400 mt-1 font-bold uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due: {midTermDate ? new Date(midTermDate).toLocaleDateString('en-GB') : 'Awaiting Date'}
                      </p>
                    </div>
                    <span className="font-black font-mono text-white text-lg tracking-tight">₦{midTermBalance.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      {/* EXISTING FEES LEDGER TABLE */}
      <div className="mt-8 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="bg-white p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
          <div>
            <h2 className="text-base font-bold text-[#0a1128]">Active Fee Structures</h2>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">A historical ledger of all locked class fees.</p>
          </div>
          {isLoadingTable && <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider animate-pulse bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100">Syncing Ledger...</span>}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] text-gray-500 uppercase tracking-widest bg-gray-50/80 font-bold">
                <th className="p-5">Session</th>
                <th className="p-5">Term</th>
                <th className="p-5">Enrolled Class</th>
                <th className="p-5">Mid-Term Anchor</th>
                <th className="p-5 text-right">Parent Total Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {existingFees.length === 0 && !isLoadingTable ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-50 text-gray-400 mb-3">
                      <FileQuestion className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-bold text-[#0a1128]">No fees configured yet.</p>
                    <p className="text-xs text-gray-500 mt-1">Lock your first class above to populate the ledger.</p>
                  </td>
                </tr>
              ) : (
                existingFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="p-5 text-xs font-bold text-[#0a1128]">
                      {fee.academic_session}
                    </td>
                    <td className="p-5">
                      <span className="px-2.5 py-1 rounded-md border border-gray-200 bg-white text-gray-600 text-[9px] font-bold tracking-wider uppercase shadow-sm">
                        {fee.term}
                      </span>
                    </td>
                    <td className="p-5 text-xs font-bold text-gray-700 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-gray-400" />
                      {fee.class_name}
                    </td>
                    <td className="p-5 text-xs font-bold text-orange-600">
                      {fee.mid_term_date ? new Date(fee.mid_term_date).toLocaleDateString('en-GB') : 'Missing'}
                    </td>
                    <td className="p-5 text-right text-base font-black text-[#0a1128] font-mono tracking-tight">
                      ₦{Number(fee.parent_total_fee).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}