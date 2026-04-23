import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

// 1. ADD THESE TWO LINES TO KILL GLOBAL CACHING
export const dynamic = 'force-dynamic'
export const revalidate = 0

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta', // This variable name must match the Tailwind config
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
    // The variable is injected here
    <html lang="en" className={`${jakarta.variable}`}>
      <body className="font-sans antialiased text-gray-900 bg-gray-50">
        {children}
      </body>
    </html>
  )
}