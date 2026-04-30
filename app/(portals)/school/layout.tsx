'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import '../../globals.css'

import { 
  LayoutDashboard, Users, Landmark, Wallet, 
  BarChart3, Settings, LogOut, Menu, X 
} from 'lucide-react'

export default function SchoolLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { name: 'Dashboard', href: '/school', icon: LayoutDashboard },
    { name: 'Students & Verification', href: '/school/students', icon: Users },
    { name: 'Fee Setup', href: '/school/fees', icon: Landmark },
    { name: 'Payouts & Withdrawals', href: '/school/payouts', icon: Wallet },
    { name: 'Reports', href: '/school/reports', icon: BarChart3 },
    { name: 'Settings', href: '/school/settings', icon: Settings },
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      window.location.href = '/school-login'
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden text-[#0a1128] selection:bg-blue-100 selection:text-blue-900 relative">
      
      <div 
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] mix-blend-overlay print:hidden"
        style={{ backgroundImage: "url('/noise.png')" }}
      ></div>
      
      {/* MOBILE TOP NAVIGATION BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a1128] text-white flex items-center justify-between px-4 z-50 shadow-md print:hidden">
        <Link href="/school" className="text-lg font-extrabold tracking-tight">
          <span className="text-white">PayTerm</span> <span className="text-blue-500">Schools</span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-gray-300 active:scale-95 transition-transform hover:text-white">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
  
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-[#0a1128]/60 backdrop-blur-sm z-40 transition-opacity print:hidden" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}
  
      {/* THE SIDEBAR */}
      <div className={`fixed md:relative z-50 w-72 md:w-64 bg-[#0a1128] text-white flex flex-col h-full transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none print:hidden ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* DESKTOP LOGO */}
        <div className="p-6 hidden md:block border-b border-white/5">
          <Link href="/school" className="text-2xl font-extrabold tracking-tight block">
            <span className="text-white">PayTerm</span> <span className="text-blue-500">Schools</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-8 space-y-2 mt-14 md:mt-0 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link key={item.name} href={item.href} onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                }`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>
  
        <div className="p-4 border-t border-white/5 pb-8 md:pb-6">
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-bold text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors active:scale-95">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
  
      <main className="flex-1 overflow-y-auto h-full pt-16 md:pt-0 relative z-10 print:pt-0">
        {children}
      </main>
    </div>
  )
}