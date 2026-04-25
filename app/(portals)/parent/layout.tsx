'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import '../../globals.css'

export default function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const navItems = [
    { name: 'Dashboard', href: '/parent' },
    { name: 'Profile', href: '/parent/profile' },
    { name: 'Notifications', href: '/parent/notifications' },
    { name: 'Payment History', href: '/parent/history' },
    { name: 'Restructuring', href: '/parent/restructure' },
    { name: 'Support', href: '/parent/support' },
  ]

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login') // Adjust to your actual login route if different
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden text-gray-900">
      
      {/* MOBILE HEADER - Clean & Modern */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a1128] text-white flex items-center justify-between px-5 z-50 shadow-md">
        <h2 className="text-xl font-extrabold tracking-tight">
          <span className="text-white">PayTerm</span>
        </h2>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 -mr-2 text-gray-300 hover:text-white transition-colors"
        >
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>
  
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-[#0a1128]/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
  
      {/* RESPONSIVE SIDEBAR */}
      <div className={`
        fixed md:relative z-50 w-72 md:w-64 bg-[#0a1128] text-white flex flex-col h-full 
        transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* DESKTOP LOGO */}
        <div className="p-8 hidden md:block border-b border-white/5">
          <h2 className="text-2xl font-extrabold tracking-tight">
            <span className="text-white">PayTerm</span>
          </h2>
        </div>
        
        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-4 py-8 space-y-2 mt-16 md:mt-0 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  block px-5 py-3.5 rounded-2xl text-sm font-bold transition-all
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                `}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
  
        {/* LOGOUT BUTTON */}
        <div className="p-5 border-t border-white/5 pb-8 md:pb-5">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 rounded-2xl text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sign Out
          </button>
        </div>
      </div>
  
      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-y-auto h-full pt-16 md:pt-0 bg-gray-50 selection:bg-blue-100">
        {children}
      </main>
      
    </div>
  )
}