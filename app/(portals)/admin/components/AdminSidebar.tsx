'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
// --- NEW LUCIDE ICONS ---
import { 
  LayoutDashboard, Building2, Wallet, 
  ReceiptText, Users, Settings, LogOut, Menu, X 
} from 'lucide-react'

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const menuItems = [
    { name: 'Platform Overview', href: '/admin', icon: LayoutDashboard },
    { name: 'Manage Schools', href: '/admin/schools', icon: Building2 },
    { name: 'Withdrawal Approvals', href: '/admin/payouts', icon: Wallet },
    { name: 'Parent Collections', href: '/admin/collections', icon: ReceiptText }, 
    { name: 'Financial Ledger', href: '/admin/reports', icon: ReceiptText },
    { name: 'Registered Users', href: '/admin/parents', icon: Users }, 
    { name: 'System Settings', href: '/admin/settings', icon: Settings },
  ]

  useRealtimeSync(() => {
    console.log('Realtime sync triggered')
  })

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const toastId = toast.loading("Disconnecting terminal...")
    try {
      await supabase.auth.signOut()
      router.push('/admin-login')
      toast.success("Disconnected successfully.", { id: toastId })
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error("Failed to disconnect.", { id: toastId })
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* Mobile Top Navigation */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a1128] text-white flex justify-between items-center px-4 z-50 shadow-md border-b border-white/5 print:hidden">
        <h2 className="text-xl font-extrabold tracking-tight">
          PayTerm <span className="text-blue-500">Admin</span>
        </h2>
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 -mr-2 text-slate-400 hover:text-white transition-colors active:scale-95">
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#0a1128]/80 backdrop-blur-sm z-40 md:hidden transition-opacity print:hidden" onClick={() => setIsOpen(false)} />
      )}

      {/* Sidebar Drawer */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-[#0a1128] text-white flex flex-col h-full
        transform transition-transform duration-300 ease-in-out border-r border-white/5 shadow-2xl md:shadow-none print:hidden
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Desktop Logo */}
        <div className="p-6 hidden md:block border-b border-white/5">
          <h2 className="text-2xl font-extrabold tracking-tight block">
            PayTerm <span className="text-blue-500">HQ</span>
          </h2>
          <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">
            Master Control
          </div>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-8 space-y-2 mt-14 md:mt-0 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] ${
                  isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20' 
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-white/5 pb-8 md:pb-6">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors disabled:opacity-50 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? 'Disconnecting...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </>
  )
}