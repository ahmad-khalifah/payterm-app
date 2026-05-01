import { Plus_Jakarta_Sans } from 'next/font/google'
import ToastProvider from './components/ToastProvider'
import RealtimeProvider from './components/RealtimeProvider' // <-- 1. Import the engine
import './globals.css'

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta', 
})

export const metadata = {
  title: 'PayTerm',
  description: 'Educational Financing Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${jakarta.variable}`}>
      <body className="font-sans antialiased text-[#0a1128] bg-gray-50 relative min-h-screen">
        
        <ToastProvider />
        <RealtimeProvider /> {/* <-- 2. Inject it here */}

        {/* GLOBAL NOISE LAYER */}
        <div 
          className="pointer-events-none fixed inset-0 z-0 opacity-[0.03] mix-blend-overlay print:hidden"
          style={{ backgroundImage: "url('/noise.png')" }}
        ></div>

        <div className="relative z-10 h-full">
          {children}
        </div>

      </body>
    </html>
  )
}