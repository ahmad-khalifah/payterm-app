'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSidebar() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const menuItems = [
    { name: 'Platform Overview', href: '/admin' },
    { name: 'Manage Schools', href: '/admin/schools' },
    { name: 'Withdrawal Approvals', href: '/admin/payouts' },
    // Renamed for clarity, but keeps your existing file path
    { name: 'Financial Ledger', href: '/admin/parents' }, 
    // The new directory page you are adding
    { name: 'Registered Users', href: '/admin/directory' }, 
    { name: 'System Settings', href: '/admin/settings' },
  ]

  return (
    <>
      {/* Mobile Top Navigation */}
      <div className="md:hidden bg-[#050a15] text-white flex justify-between items-center p-4 shrink-0 z-20 shadow-md border-b border-blue-900">
        <h2 className="text-xl font-bold tracking-tight">PayTerm <span className="text-purple-400">Admin</span></h2>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 bg-slate-800 rounded-md">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isOpen ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
          </svg>
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setIsOpen(false)} />}

      {/* Sidebar Drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#050a15] text-white flex flex-col h-full
        transform transition-transform duration-300 ease-in-out border-r border-slate-800
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 hidden md:block">
          <h2 className="text-xl font-bold tracking-tight">PayTerm <span className="text-purple-400">HQ</span></h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-bold">Master Control</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-1 mt-2 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                  ? 'bg-purple-600 text-white shadow-sm' 
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>
    </>
  )
}