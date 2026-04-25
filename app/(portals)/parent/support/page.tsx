'use client'

import { useState } from 'react'

export default function Support() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([
    { sender: 'agent', text: 'Hello! I am the PayTerm Support Bot. How can I help you today?', time: '12:20 PM' }
  ])

  const faqs = [
    { id: 1, question: "How do I update my debit card?", answer: "Go to your Dashboard, click 'Quick Actions', and select 'Update Mandate'. You will be charged a temporary ₦50 pre-authorization to verify the new card." },
    { id: 2, question: "What happens if my child changes schools?", answer: "Please submit a Restructuring Request from the menu. We will pause your active mandate and recalculate your balance based on the new school's fee structure." },
    { id: 3, question: "Why was a late fee applied?", answer: "A 2% administrative late fee is applied if an auto-debit fails and your wallet remains unfunded for more than 48 hours past the due date." }
  ]

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatMessage.trim()) return

    const newMsg = { sender: 'user', text: chatMessage, time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }
    setChatHistory([...chatHistory, newMsg])
    setChatMessage('')

    // MVP PITCH BYPASS: Simulate an automated reply
    setTimeout(() => {
      setChatHistory(prev => [...prev, { 
        sender: 'agent', 
        text: 'I understand you need help with that. Let me connect you to a human billing specialist. You are currently #1 in the queue.', 
        time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
      }])
    }, 1000)
  }

  return (
    <div className="w-full max-w-5xl mx-auto md:p-4 lg:p-8 animate-in fade-in pb-20">
      <div className="p-4 md:p-0 mb-4">
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-1">Support</h1>
        <p className="text-gray-500 text-sm">Find answers or chat with our team.</p>
      </div>
  
      <div className="flex flex-col lg:flex-row gap-5 px-0 md:px-0">
        <div className="flex-1 space-y-5 px-4 md:px-0">
          <div className="bg-white p-5 md:p-6 rounded-2xl border border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">FAQs</h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div key={faq.id} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)} className="w-full text-left p-4 bg-gray-50 text-sm font-bold text-gray-900 flex justify-between items-center">
                    {faq.question} <span className="text-blue-600 text-lg leading-none">{activeFaq === faq.id ? '−' : '+'}</span>
                  </button>
                  {activeFaq === faq.id && <div className="p-4 bg-white text-xs text-gray-600 border-t border-gray-100">{faq.answer}</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#0a1128] text-white p-4 rounded-xl text-center shadow-sm active:scale-95"><div className="text-2xl mb-1">📄</div><h3 className="font-bold text-xs">Read Terms</h3></div>
            <div className="bg-white border border-gray-200 text-gray-900 p-4 rounded-xl text-center shadow-sm active:scale-95"><div className="text-2xl mb-1">✉️</div><h3 className="font-bold text-xs">Email Us</h3></div>
          </div>
        </div>
  
        <div className="w-full lg:w-[350px] bg-white lg:rounded-2xl border-y lg:border border-gray-200 lg:shadow-sm flex flex-col h-[500px]">
          <div className="p-4 bg-[#0a1128] text-white lg:rounded-t-2xl flex justify-between items-center">
            <div className="font-bold text-sm">Live Support</div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-2.5 py-1 rounded-full"><div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>Online</div>
          </div>
          <div className="flex-1 p-4 overflow-y-auto bg-gray-50 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-3 text-xs leading-relaxed ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-xl rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-xl rounded-tl-sm'}`}>{msg.text}</div>
                <span className="text-[9px] font-medium text-gray-400 mt-1 px-1">{msg.time}</span>
              </div>
            ))}
          </div>
          <div className="p-3 bg-white border-t border-gray-100 lg:rounded-b-2xl">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input type="text" value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-600" />
              <button type="submit" disabled={!chatMessage.trim()} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:bg-blue-300 active:scale-95">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}