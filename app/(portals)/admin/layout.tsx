'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import '../../globals.css'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  const navItems = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Schools & Verification', href: '/admin/schools' },
    { name: 'Parents Ledger', href: '/admin/parents' },
    { name: 'Registered Users', href: '/admin/directory' }, 
    { name: 'Payouts & Withdrawals', href: '/admin/payouts' },
    { name: 'Reports', href: '/admin/reports' },
    { name: 'Settings', href: '/admin/settings' },
  ]

  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden text-gray-900">
      
      {/* MOBILE HEADER */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a1128] text-white flex items-center justify-between px-6 z-50">
        <h2 className="text-xl font-bold tracking-tight">
          <span className="text-white">PayTerm</span> <span className="text-blue-500">Admin</span>
        </h2>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-300">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isMobileMenuOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* SIDEBAR (Matches School Portal exactly) */}
      <div className={`
        fixed md:relative z-40 w-64 bg-[#0a1128] text-white flex flex-col h-full 
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* LOGO */}
        <div className="p-6 hidden md:block border-b border-white/5">
          <h2 className="text-2xl font-bold tracking-tight">
            <span className="text-white">PayTerm</span> <span className="text-blue-500">Admin</span>
          </h2>
        </div>
        
        {/* NAVIGATION */}
        <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto mt-16 md:mt-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`
                  block px-4 py-3 rounded-xl text-sm font-medium transition-all
                  ${isActive 
                    ? 'bg-blue-600 text-white' // The exact blue pill from your screenshot
                    : 'text-gray-300 hover:bg-white/5 hover:text-white'}
                `}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto h-full pt-16 md:pt-0 bg-gray-50">
        {children}
      </main>
      
    </div>
  )
}