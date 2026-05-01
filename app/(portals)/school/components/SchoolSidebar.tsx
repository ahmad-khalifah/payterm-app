'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase' 
import toast from 'react-hot-toast'
import { useRealtimeSync } from '@/lib/useRealtimeSync'
// --- NEW LUCIDE ICONS ---
import { 
  LayoutDashboard, Users, Landmark, Wallet, 
  BarChart3, Settings, LogOut, Menu, X 
} from 'lucide-react'

export default function SchoolSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  // Mapped specific icons to each route
  const menuItems = [
    { name: 'Dashboard', href: '/school', icon: LayoutDashboard },
    { name: 'Students & Verification', href: '/school/students', icon: Users },
    { name: 'Fee Setup', href: '/school/fees', icon: Landmark },
    { name: 'Payouts & Withdrawals', href: '/school/payouts', icon: Wallet },
    { name: 'Reports', href: '/school/reports', icon: BarChart3 },
    { name: 'Settings', href: '/school/settings', icon: Settings },
  ]

  useRealtimeSync(() => {
    console.log('Realtime sync triggered')
  })

  const handleLogout = async () => {
    setIsLoggingOut(true)
    const toastId = toast.loading("Signing out...")
    try {
      await supabase.auth.signOut()
      router.push('/school-login')
      toast.success("Signed out successfully", { id: toastId })
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error("Failed to sign out.", { id: toastId })
      setIsLoggingOut(false)
    }
  }

  return (
    <>
      {/* MOBILE TOP NAVIGATION BAR */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-[#0a1128] text-white flex justify-between items-center px-4 z-50 shadow-md print:hidden">
        <Link href="/school" className="text-lg font-extrabold tracking-tight">
          <span className="text-white">Pay</span><span className="text-blue-500">Term</span> <span className="font-medium text-gray-300 ml-1 text-sm">Schools</span>
        </Link>
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="p-2 -mr-2 focus:outline-none text-gray-300 hover:text-white active:scale-95 transition-all"
          aria-label="Toggle Menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
  
      {/* MOBILE OVERLAY */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-[#0a1128]/60 backdrop-blur-sm z-40 md:hidden transition-opacity print:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
  
      {/* THE SIDEBAR */}
      <div className={`
        fixed inset-y-0 left-0 z-50 w-72 md:w-64 bg-[#0a1128] text-white flex flex-col h-full
        transform transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none print:hidden
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* DESKTOP LOGO */}
        <div className="p-6 hidden md:block border-b border-white/5">
          <Link href="/school" className="text-2xl font-extrabold tracking-tight block">
            <span className="text-white">Pay</span><span className="text-blue-500">Term</span>
            <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mt-0.5">School Portal</div>
          </Link>
        </div>
        
        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-4 py-8 space-y-2 mt-14 md:mt-0 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98]
                  ${isActive 
                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-900/20' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }
                `}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                {item.name}
              </Link>
            )
          })}
        </nav>
  
        {/* SECURE LOGOUT BUTTON */}
        <div className="p-4 border-t border-white/5 pb-8 md:pb-6">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-bold text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-colors disabled:opacity-50 active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? 'Logging out...' : 'Sign Out'}
          </button>
        </div>
      </div>
    </>
  )
}