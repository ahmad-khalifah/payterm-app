'use client'

import { useState } from 'react'
import { LifeBuoy, ChevronDown, FileText, Mail, Send, Bot, User, MessageCircle } from 'lucide-react'

export default function Support() {
  const [activeFaq, setActiveFaq] = useState<number | null>(null)
  const [chatMessage, setChatMessage] = useState('')
  const [chatHistory, setChatHistory] = useState([
    { sender: 'agent', text: 'Hello! I am the PayTerm Support Bot. How can I help you today?', time: '12:20 PM' }
  ])

  const faqs = [
    { id: 1, question: "How do I update my debit card?", answer: "Go to your Profile settings and select 'Update Mandate'. You will be charged a temporary ₦50 pre-authorization to verify the new card." },
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
    <div className="w-full max-w-6xl mx-auto md:p-4 lg:p-8 animate-in fade-in pb-20">
      
      {/* HEADER */}
      <div className="p-4 md:p-0 mb-8">
        <h1 className="text-3xl font-extrabold text-[#0a1128] tracking-tight mb-2 flex items-center gap-3">
          <LifeBuoy className="w-7 h-7 text-blue-600" />
          Support
        </h1>
        <p className="text-gray-500 font-medium text-sm">Find answers quickly or chat live with our billing team.</p>
      </div>
  
      <div className="flex flex-col lg:flex-row gap-6 px-0 md:px-0">
        
        {/* LEFT COLUMN: FAQs & Links */}
        <div className="flex-1 space-y-6 px-4 md:px-0">
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-gray-100 shadow-sm">
            <h2 className="text-lg font-bold text-[#0a1128] mb-5 flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-gray-400" />
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq) => (
                <div key={faq.id} className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                  <button 
                    onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)} 
                    className="w-full text-left p-4 md:p-5 bg-gray-50 hover:bg-gray-100/50 text-sm font-bold text-[#0a1128] flex justify-between items-center transition-colors"
                  >
                    {faq.question} 
                    <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${activeFaq === faq.id ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${activeFaq === faq.id ? 'max-h-40' : 'max-h-0'}`}>
                    <div className="p-4 md:p-5 bg-white text-sm text-gray-500 border-t border-gray-100 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button className="bg-[#0a1128] text-white p-6 rounded-3xl text-center shadow-lg shadow-[#0a1128]/10 hover:shadow-[#0a1128]/20 transition-all active:scale-95 group flex flex-col items-center justify-center gap-3 border border-[#0a1128]">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm tracking-wide">Read Terms</h3>
            </button>
            <button className="bg-white border border-gray-200 text-[#0a1128] p-6 rounded-3xl text-center shadow-sm hover:shadow-md hover:border-gray-300 transition-all active:scale-95 group flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm tracking-wide">Email Us</h3>
            </button>
          </div>
        </div>
  
        {/* RIGHT COLUMN: Live Chat Widget */}
        <div className="w-full lg:w-[380px] bg-white lg:rounded-3xl border-y lg:border border-gray-200 lg:shadow-xl lg:shadow-blue-900/5 flex flex-col h-[600px] overflow-hidden">
          
          <div className="p-5 bg-gradient-to-r from-[#0a1128] to-blue-900 text-white flex justify-between items-center shadow-md z-10 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="font-bold text-sm">PayTerm Support</div>
                <div className="text-[10px] text-blue-200 uppercase tracking-wider font-bold">Billing Team</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold bg-white/10 px-2.5 py-1.5 rounded-full border border-white/10">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
              Online
            </div>
          </div>

          <div className="flex-1 p-5 overflow-y-auto bg-gray-50 space-y-5">
            <div className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest my-4">Today</div>
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatars */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${msg.sender === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-500'}`}>
                  {msg.sender === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                </div>
                
                {/* Bubble */}
                <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} max-w-[75%]`}>
                  <div className={`p-3.5 text-xs leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-white border border-gray-200 text-gray-800 rounded-2xl rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[9px] font-bold text-gray-400 mt-1.5 px-1">{msg.time}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-white border-t border-gray-100 z-10">
            <form onSubmit={handleSendMessage} className="flex gap-2 bg-gray-50 border border-gray-200 rounded-2xl p-1.5 focus-within:ring-2 focus-within:ring-blue-600 focus-within:border-blue-600 transition-all shadow-sm">
              <input 
                type="text" 
                value={chatMessage} 
                onChange={(e) => setChatMessage(e.target.value)} 
                placeholder="Type your message..." 
                className="flex-1 bg-transparent px-4 py-2 text-sm outline-none text-[#0a1128] font-medium placeholder:text-gray-400" 
              />
              <button 
                type="submit" 
                disabled={!chatMessage.trim()} 
                className="bg-blue-600 text-white w-10 h-10 rounded-xl flex items-center justify-center disabled:bg-blue-300 disabled:opacity-50 active:scale-95 transition-transform shrink-0"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  )
}