'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import '../../globals.css'

import { Home, User, Bell, History, RefreshCcw, LifeBuoy, LogOut, Menu, X } from 'lucide-react'

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { name: 'Home', href: '/parent', icon: Home },
    { name: 'Profile', href: '/parent/profile', icon: User },
    { name: 'Notifications', href: '/parent/notifications', icon: Bell },
    { name: 'Payment History', href: '/parent/history', icon: History },
    { name: 'Restructuring', href: '/parent/restructure', icon: RefreshCcw },
    { name: 'Support', href: '/parent/support', icon: LifeBuoy },
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/parent-login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden text-[#0a1128] selection:bg-blue-100 selection:text-blue-900 relative">
      
      {/* 🚀 THE NOISE LAYER 🚀 */}
      {/* This creates the tactile, frosted-paper feel across the entire app */}
      <div 
  className="pointer-events-none fixed inset-0 z-0 opacity-[0.04] mix-blend-overlay"
  style={{ 
    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
  }}
></div>
      
      {/* Everything below here gets bumped up in the z-index to sit above the background but below the mobile nav */}
      
      {/* MOBILE TOP NAVIGATION BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a1128] text-white flex items-center justify-between px-4 z-50 shadow-md">
        <Link href="/parent" className="text-lg font-extrabold tracking-tight">
          <span className="text-white">PayTerm</span> <span className="text-blue-500">Parents</span>
        </Link>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 -mr-2 text-gray-300 active:scale-95 transition-transform hover:text-white">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
  
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-[#0a1128]/60 backdrop-blur-sm z-40 transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)} 
        />
      )}
  
      {/* THE SIDEBAR */}
      <div className={`fixed md:relative z-50 w-72 md:w-64 bg-[#0a1128] text-white flex flex-col h-full transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        
        {/* DESKTOP LOGO */}
        <div className="p-6 hidden md:block border-b border-white/5">
          <Link href="/parent" className="text-xl font-extrabold tracking-tight block">
            <span className="text-white">PayTerm</span> <span className="text-blue-500">Parents</span>
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
  
      <main className="flex-1 overflow-y-auto h-full pt-16 md:pt-0 relative z-10">
        {children}
      </main>
    </div>
  )
}