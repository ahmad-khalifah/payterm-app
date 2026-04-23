'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
// FIX 1: Guaranteed absolute import path so it never silently crashes
import { supabase } from '@/lib/supabase' 

export default function SchoolSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const menuItems = [
    { name: 'Dashboard', href: '/school' },
    { name: 'Students & Verification', href: '/school/students' },
    { name: 'Fee Setup', href: '/school/fees' },
    { name: 'Payouts & Withdrawals', href: '/school/payouts' },
    { name: 'Reports', href: '/school/reports' },
    { name: 'Settings', href: '/school/settings' },
  ]

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await supabase.auth.signOut()
      
      // FIX 2: Force a hard browser redirect instead of a soft Next.js route.
      // This guarantees the local cache is wiped clean.
      window.location.href = '/school-login'
      
    } catch (error) {
      console.error('Error logging out:', error)
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* MOBILE TOP NAVIGATION BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a1128] text-white flex justify-between items-center px-6 z-50 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight">
          <span className="text-white">PayTerm</span> <span className="text-blue-500">Schools</span>
        </h2>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 focus:outline-none text-gray-300 hover:text-white transition-colors"
          aria-label="Toggle Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#0a1128]/80 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* THE SIDEBAR */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0a1128] text-white flex flex-col h-full
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* DESKTOP LOGO */}
        <div className="p-6 border-b border-white/5 hidden md:block">
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-white">PayTerm</span> <span className="text-blue-500">Schools</span>
          </h2>
        </div>
        
        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-3 py-6 space-y-1 mt-16 md:mt-0 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  block px-4 py-3.5 rounded-xl text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* SECURE LOGOUT BUTTON */}
        <div className="p-4 border-t border-white/10 mb-4 md:mb-0">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
          </button>
        </div>
      </div>
    </>
  )
}