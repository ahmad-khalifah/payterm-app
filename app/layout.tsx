import { Plus_Jakarta_Sans } from 'next/font/google'
import { Toaster, resolveValue, toast } from 'react-hot-toast'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
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
        
        {/* --- NEW CUSTOM TOAST ENGINE --- */}
        <Toaster position="top-right">
          {(t) => {
            // Dynamically assign colors, icons, and titles based on the toast type
            let accentColor = 'bg-blue-500'
            let iconColor = 'text-blue-500'
            let title = 'Info'
            let Icon = Info

            if (t.type === 'success') {
              accentColor = 'bg-green-500' 
              iconColor = 'text-green-500'
              title = 'Success'
              Icon = CheckCircle2
            } else if (t.type === 'error') {
              accentColor = 'bg-red-500'   
              iconColor = 'text-red-500'
              title = 'Error'
              Icon = XCircle
            }

            return (
              <div
                className={`${
                  t.visible ? 'animate-in slide-in-from-top-2 fade-in duration-300' : 'animate-out fade-out slide-out-to-top-2 duration-200'
                } max-w-[350px] w-full bg-white shadow-xl shadow-gray-200/50 rounded-xl pointer-events-auto flex overflow-hidden border border-gray-100`}
              >
                {/* 1. Left Accent Border */}
                <div className={`w-2 shrink-0 ${accentColor}`}></div>

                {/* 2. Main Content */}
                <div className="flex-1 p-4 flex items-start gap-3">
                  <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-extrabold text-gray-900">{title}</h3>
                    <p className="text-xs font-medium text-gray-500 mt-0.5 leading-relaxed">
                      {resolveValue(t.message, t)}
                    </p>
                  </div>
                  
                  {/* 3. Close Button */}
                  <button 
                    onClick={() => toast.dismiss(t.id)}
                    className="text-gray-400 hover:text-gray-900 transition-colors shrink-0 p-1 rounded-md hover:bg-gray-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          }}
        </Toaster>

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