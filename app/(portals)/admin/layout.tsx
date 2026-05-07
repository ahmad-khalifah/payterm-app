'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import '../../globals.css'
import { useRealtimeSync } from '@/lib/useRealtimeSync'

import { 
  LayoutDashboard, Building2, Wallet, 
  ReceiptText, Users, Settings, Menu, X, Shield
} from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Schools & Verification', href: '/admin/schools', icon: Building2 },
    { name: 'Parents Ledger', href: '/admin/parents', icon: ReceiptText },
    { name: 'Registered Users', href: '/admin/directory', icon: Users }, 
    { name: 'Payouts & Withdrawals', href: '/admin/payouts', icon: Wallet },
    { name: 'Reports', href: '/admin/reports', icon: Shield },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ]

  useRealtimeSync(() => {
    console.log('Realtime sync triggered')
  })

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden text-[#0a1128] selection:bg-blue-100 selection:text-blue-900 relative">
      
      {/* GLOBAL NOISE LAYER */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] mix-blend-overlay print:hidden"
        style={{ backgroundImage: "url('/noise.png')" }}
      ></div>
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a1128] text-white flex items-center justify-between px-6 z-50 shadow-md border-b border-white/5 print:hidden">
        <h2 className="text-xl font-extrabold tracking-tight flex items-center gap-2">
          <span className="text-white">PayTerm</span> <span className="text-blue-500">Admin</span>
        </h2>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors active:scale-95">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-[#0a1128]/80 backdrop-blur-sm z-40 md:hidden transition-opacity print:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* SIDEBAR */}
      <div className={`
        fixed md:relative z-50 w-72 md:w-64 bg-[#0a1128] text-white flex flex-col h-full 
        transition-transform duration-300 ease-in-out border-r border-white/5 shadow-2xl md:shadow-none print:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* LOGO */}
        <div className="p-6 hidden md:block border-b border-white/5">
          <h2 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            <span className="text-white">PayTerm</span> <span className="text-blue-500">Admin</span>
          </h2>
          <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mt-1">
            Master Control
          </div>
        </div>
        
        {/* NAVIGATION */}
        <nav className="flex-1 px-4 py-8 space-y-2 mt-16 md:mt-0 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                  isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto h-full pt-16 md:pt-0 relative z-10 print:pt-0">
        {children}
      </main>
      
    </div>
  )
}