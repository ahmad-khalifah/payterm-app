import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster } from 'react-hot-toast' // <-- 1. Import Toaster
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
        
        {/* 2. ADD THE TOASTER HERE */}
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#0a1128',
              color: '#fff',
              fontWeight: 'bold',
              borderRadius: '12px',
            },
            success: {
              style: { background: '#16a34a' } // Green for success
            },
            error: {
              style: { background: '#dc2626' } // Red for errors
            }
          }} 
        />

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