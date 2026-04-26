'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../lib/supabase'

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

  // Fetches all saved fees for the table
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

  // Refetches fees & date whenever the Class, Session, or Term changes
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

  // REBUILT 60/40 MATH
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
          mid_term_date: midTermDate // Pushing the critical date to the DB
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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in pb-20">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0a1128] mb-1 tracking-tight">Fee Configuration</h1>
        <p className="text-gray-500 text-sm">Define term fees per class and lock your academic calendar.</p>
      </div>
  
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* FEE SETUP FORM */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm h-fit">
          <div className="flex justify-between items-center mb-5 border-b border-gray-100 pb-4">
            <h3 className="text-base font-bold text-[#0a1128]">Termly Base Fees</h3>
            {isLoadingFees && <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider animate-pulse bg-blue-50 px-2 py-0.5 rounded-full">Syncing...</span>}
          </div>
          
          <form onSubmit={handleSaveFees} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 bg-gray-50/80 p-3.5 rounded-xl border border-gray-100 mb-1">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Academic Session</label>
                <select 
                  value={selectedSession} 
                  onChange={(e) => setSelectedSession(e.target.value)} 
                  className="w-full border border-gray-300 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white font-bold text-[#0a1128] text-sm shadow-sm transition-all"
                >
                  {sessionList.map(session => (
                    <option key={session} value={session}>{session}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Current Term</label>
                <select 
                  value={selectedTerm} 
                  onChange={(e) => setSelectedTerm(e.target.value)} 
                  className="w-full border border-gray-300 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white font-bold text-[#0a1128] text-sm shadow-sm transition-all"
                >
                  {termList.map(term => (
                    <option key={term} value={term}>{term}</option>
                  ))}
                </select>
              </div>
            </div>
  
            <div className="bg-blue-50/50 p-3.5 rounded-xl border border-blue-100 mb-3">
              <label className="block text-[11px] font-bold text-blue-800 uppercase tracking-wide mb-1.5">Select Class</label>
              <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)} 
                className="w-full border border-blue-200 p-2.5 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 bg-white font-bold text-[#0a1128] text-sm shadow-sm transition-all"
              >
                {classList.map(cls => (
                  <option key={cls} value={cls}>{cls}</option>
                ))}
              </select>
            </div>
  
            <div>
              <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">Tuition Fee (₦)</label>
              <input 
                type="number" name="tuition" value={fees.tuition || ''} onChange={handleFeeChange}
                className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] text-sm font-bold shadow-sm transition-all"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">Books & Materials (₦)</label>
              <input 
                type="number" name="books" value={fees.books || ''} onChange={handleFeeChange}
                className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] text-sm font-bold shadow-sm transition-all"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">Uniform <span className="text-gray-400 font-medium">(Opt)</span></label>
                <input 
                  type="number" name="uniform" value={fees.uniform || ''} onChange={handleFeeChange}
                  className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] text-sm font-bold shadow-sm transition-all"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">Transport <span className="text-gray-400 font-medium">(Opt)</span></label>
                <input 
                  type="number" name="transport" value={fees.transport || ''} onChange={handleFeeChange}
                  className="w-full border border-gray-300 p-3 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 font-mono text-[#0a1128] text-sm font-bold shadow-sm transition-all"
                />
              </div>
            </div>
  
            <div className="border border-orange-200 bg-orange-50/30 p-4 rounded-xl relative overflow-hidden mt-3">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>
              <label className="block text-[11px] font-bold text-[#0a1128] uppercase tracking-wide mb-1.5">
                Mid-Term Resumption Date
              </label>
              <input 
                type="date" required value={midTermDate} onChange={e => setMidTermDate(e.target.value)}
                className="w-full border border-orange-300 p-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-600 font-bold bg-white text-[#0a1128] shadow-sm transition-all"
              />
              <p className="text-[10px] text-gray-500 mt-1.5 font-medium">
                This sets the deadline for the 40% balance for this term.
              </p>
            </div>
  
            <div className="pt-2 mt-5 border-t border-gray-100">
              <div className="flex justify-between items-center bg-green-50/50 p-4 rounded-xl border border-green-100 mb-3">
                <span className="text-[11px] font-bold text-green-800 uppercase tracking-wide">School Receives:</span>
                <span className="text-xl font-bold text-green-700 font-mono tracking-tight">₦{totalBaseFee.toLocaleString()}</span>
              </div>
  
              <button 
                type="submit" 
                disabled={isSaving || !midTermDate} 
                className={`w-full text-white px-4 py-3 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95 ${
                  isSaving || !midTermDate ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isSaving ? 'Syncing...' : `Lock ${selectedTerm} Fees`}
              </button>
            </div>
          </form>
        </div>
  
        {/* 60/40 PARENT PREVIEW ENGINE */}
        <div className="bg-[#0a1128] p-5 sm:p-6 rounded-2xl shadow-xl text-white h-fit relative overflow-hidden border border-[#0a1128]">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-600/20 blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-1.5">
              <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Live Parent Preview</h3>
              <span className="text-[9px] font-bold bg-white/10 px-2 py-0.5 rounded text-gray-300 border border-white/5 uppercase tracking-wider">
                {selectedSession} | {selectedTerm}
              </span>
            </div>
            
            <p className="text-[11px] text-gray-400 mb-6 font-medium">Showing final invoice for <strong className="text-white font-bold">{selectedClass}</strong> parents.</p>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center text-gray-300 text-xs font-medium">
                <span>School Base Fee</span>
                <span className="font-mono text-white text-sm">₦{totalBaseFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-gray-300 text-xs font-medium">
                <span>PayTerm Platform Fee (5%)</span>
                <span className="font-mono text-white text-sm">₦{paytermMargin.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-2">
                <span className="font-bold text-sm text-white tracking-wide">Total Parent Plan</span>
                <span className="text-xl font-bold font-mono text-blue-400 tracking-tight">₦{parentTotalFee.toLocaleString()}</span>
              </div>
            </div>
  
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-md">
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-2">PayTerm 60/40 Schedule</p>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-xs text-white">Day 1 Downpayment (60%)</p>
                    <p className="text-[9px] text-green-400 mt-0.5 font-bold uppercase tracking-wider">Required for enrollment</p>
                  </div>
                  <span className="font-bold font-mono text-white text-base">₦{downPayment.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-bold text-xs text-white">Mid-Term Balance (40%)</p>
                    <p className="text-[9px] text-orange-400 mt-0.5 font-bold uppercase tracking-wider">
                      Due: {midTermDate ? new Date(midTermDate).toLocaleDateString('en-GB') : 'Awaiting Date'}
                    </p>
                  </div>
                  <span className="font-bold font-mono text-white text-base">₦{midTermBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  
      {/* EXISTING FEES LEDGER TABLE */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-gray-50/50 p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-sm font-bold text-[#0a1128]">Active Fee Structures</h2>
          </div>
          {isLoadingTable && <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider animate-pulse">Syncing...</span>}
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] text-gray-500 uppercase tracking-wider bg-gray-50/20">
                <th className="p-4 font-bold">Session</th>
                <th className="p-4 font-bold">Term</th>
                <th className="p-4 font-bold">Enrolled Class</th>
                <th className="p-4 font-bold">Mid-Term Anchor</th>
                <th className="p-4 font-bold text-right">Parent Total Fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {existingFees.length === 0 && !isLoadingTable ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-xs text-gray-500 font-medium">
                    No fees configured yet. Lock your first class above.
                  </td>
                </tr>
              ) : (
                existingFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 text-xs font-bold text-[#0a1128]">
                      {fee.academic_session}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded border border-gray-200 bg-gray-50 text-gray-600 text-[9px] font-bold tracking-wider uppercase">
                        {fee.term}
                      </span>
                    </td>
                    <td className="p-4 text-xs font-medium text-gray-700">
                      {fee.class_name}
                    </td>
                    <td className="p-4 text-xs font-medium text-orange-600">
                      {fee.mid_term_date ? new Date(fee.mid_term_date).toLocaleDateString('en-GB') : 'Missing'}
                    </td>
                    <td className="p-4 text-right text-sm font-bold text-blue-600 font-mono">
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