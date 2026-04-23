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
    <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto animate-in fade-in">
      
      {/* HEADER SECTION */}
      <div className="mb-8 md:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0a1128] tracking-tight">Support Center</h1>
        <p className="text-gray-500 mt-1.5 text-sm sm:text-base">Find quick answers or chat with our billing team.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: Help Center & FAQs */}
        <div className="flex-1 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-bold text-[#0a1128] mb-6">Frequently Asked Questions</h2>
            <div className="space-y-4">
              {faqs.map((faq) => (
                <div key={faq.id} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}
                    className="w-full text-left p-5 bg-gray-50/50 hover:bg-gray-50 font-bold text-[#0a1128] flex justify-between items-center transition-colors text-sm sm:text-base"
                  >
                    {faq.question}
                    <span className="text-gray-400 font-medium text-lg">{activeFaq === faq.id ? '−' : '+'}</span>
                  </button>
                  {activeFaq === faq.id && (
                    <div className="p-5 bg-white text-sm text-gray-600 border-t border-gray-100 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#0a1128] text-white p-6 rounded-2xl shadow-sm text-center cursor-pointer hover:bg-[#15234b] transition-colors">
              <div className="text-2xl mb-3">📄</div>
              <h3 className="font-bold text-sm">Download Policy</h3>
            </div>
            <div className="bg-white border border-gray-200 text-[#0a1128] p-6 rounded-2xl shadow-sm text-center cursor-pointer hover:bg-gray-50 transition-colors">
              <div className="text-2xl mb-3">✉️</div>
              <h3 className="font-bold text-sm">Email Support</h3>
            </div>
          </div>
        </div>

        {/* Right Column: Live Chat Interface */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[500px] lg:h-[600px]">
          <div className="p-5 bg-[#0a1128] text-white rounded-t-2xl flex justify-between items-center">
            <div className="font-bold">Live Chat</div>
            <div className="flex items-center gap-2 text-xs font-semibold bg-white/10 px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Agents Online
            </div>
          </div>
          
          <div className="flex-1 p-5 overflow-y-auto bg-gray-50 space-y-4">
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`max-w-[85%] p-3.5 rounded-xl text-sm ${
                  msg.sender === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-sm' 
                    : 'bg-white border border-gray-200 text-[#0a1128] font-medium rounded-tl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
                <span className="text-[10px] font-medium text-gray-400 mt-1.5 px-1">{msg.time}</span>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-gray-200 rounded-b-2xl">
            <form onSubmit={handleSendMessage} className="flex gap-3">
              <input 
                type="text" 
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type your message..." 
                className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-600 text-[#0a1128] transition-all"
              />
              <button 
                type="submit"
                disabled={!chatMessage.trim()}
                className="bg-blue-600 text-white px-5 py-3 rounded-xl text-sm font-bold disabled:bg-blue-300 transition-colors shadow-sm"
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