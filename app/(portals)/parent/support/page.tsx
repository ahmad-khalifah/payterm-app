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
    <div className="w-full max-w-6xl mx-auto md:p-6 lg:p-10 animate-in fade-in pb-24">
      
      <div className="p-5 md:p-0 mb-4 md:mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Support Center</h1>
        <p className="text-gray-500 text-base">Find quick answers or chat with our team.</p>
      </div>
  
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 px-0 md:px-0">
        
        {/* Left Column: Help Center & FAQs */}
        <div className="flex-1 space-y-6 px-5 md:px-0">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-200 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                    className="w-full text-left p-5 bg-gray-50 hover:bg-gray-100 font-bold text-gray-900 flex justify-between items-center transition-colors text-sm md:text-base"
                  >
                    {faq.question}
                    <span className="text-blue-600 font-medium text-xl leading-none">
                      {activeFaq === faq.id ? '−' : '+'}
                    </span>
                  </button>
                  {activeFaq === faq.id && (
                    <div className="p-5 bg-white text-sm md:text-base text-gray-600 border-t border-gray-100 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
  
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0a1128] text-white p-6 rounded-3xl shadow-sm text-center cursor-pointer hover:bg-blue-900 transition-colors active:scale-95">
              <div className="text-3xl mb-3">📄</div>
              <h3 className="font-bold text-sm">Read Terms</h3>
            </div>
            <div className="bg-white border border-gray-200 text-gray-900 p-6 rounded-3xl shadow-sm text-center cursor-pointer hover:bg-gray-50 transition-colors active:scale-95">
              <div className="text-3xl mb-3">✉️</div>
              <h3 className="font-bold text-sm">Email Us</h3>
            </div>
          </div>
        </div>
  
        {/* Right Column: Mobile-Friendly Live Chat */}
        <div className="w-full lg:w-[400px] bg-white lg:rounded-3xl border-y lg:border border-gray-200 lg:shadow-sm flex flex-col h-[600px] mt-4 lg:mt-0">
          <div className="p-5 bg-[#0a1128] text-white lg:rounded-t-3xl flex justify-between items-center">
            <div className="font-bold">Live Support</div>
            <div className="flex items-center gap-2 text-xs font-bold bg-white/10 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Online
            </div>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto bg-gray-50 space-y-5">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-4 text-sm md:text-base leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm shadow-sm' 
                    : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm shadow-sm'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[11px] font-medium text-gray-400 mt-2 px-1">{msg.time}</span>
              </div>
            ))}
          </div>
  
          <div className="p-4 bg-white border-t border-gray-100 lg:rounded-b-3xl">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input 
                type="text" 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..." 
                className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-5 py-3 text-base outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white text-gray-900 transition-all"
              />
              <button 
                type="submit"
                disabled={!chatMessage.trim()}
                className="bg-blue-600 text-white px-5 py-3 rounded-2xl text-sm font-bold disabled:bg-blue-300 transition-colors shadow-sm active:scale-95"
              >
                Send
              </button>
            </form>
          </div>
        </div>
  
      </div>
    </div>
  )
}