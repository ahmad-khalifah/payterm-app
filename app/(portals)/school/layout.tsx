import SchoolSidebar from './components/SchoolSidebar'
import '../../globals.css'

export const metadata = {
  title: 'School Portal | PayTerm',
  description: 'Manage student payment plans and school payouts.',
}

export default function SchoolLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full bg-gray-50 font-sans overflow-hidden text-[#0a1128]">
      <SchoolSidebar />
      <main className="flex-1 overflow-y-auto h-full bg-gray-50 pb-12 md:pb-0 selection:bg-blue-100">
        {children}
      </main>
    </div>
  )
}