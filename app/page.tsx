import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white selection:bg-blue-100 selection:text-blue-900 overflow-hidden relative">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 w-full h-full bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none"></div>
      
      <div className="relative z-10 w-full max-w-5xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Live Status Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest mb-10 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
          </span>
          Platform Operations Live
        </div>

        {/* Clean Hero Text */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-[#0a1128] tracking-tight mb-6">
          Education financing, <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">simplified.</span>
        </h1>
        <p className="text-gray-500 text-base md:text-lg max-w-2xl mx-auto mb-16 font-medium leading-relaxed">
          Secure installment plans for parents. Guaranteed upfront payouts for schools. Select your portal to access your financial dashboard.
        </p>

        {/* Spacious Portal Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          
          {/* Parent Portal */}
          <Link href="/parent-login" className="group text-left p-8 rounded-3xl bg-white border border-gray-200 hover:border-blue-600 hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
              <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-[#0a1128] mb-3">Parents</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-8 font-medium">Link your child, manage your downpayments, and access your secure escrow ledger.</p>
            <span className="text-sm font-bold text-blue-600 flex items-center gap-2 group-hover:gap-3 transition-all uppercase tracking-wide">
              Access Portal <span aria-hidden="true">&rarr;</span>
            </span>
          </Link>

          {/* School Portal */}
          <Link href="/school-login" className="group text-left p-8 rounded-3xl bg-white border border-gray-200 hover:border-indigo-600 hover:shadow-xl hover:shadow-indigo-900/5 transition-all duration-300">
            <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
              <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-[#0a1128] mb-3">Schools</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-8 font-medium">Verify student enrollments, track active pipelines, and claim your escrowed funds.</p>
            <span className="text-sm font-bold text-indigo-600 flex items-center gap-2 group-hover:gap-3 transition-all uppercase tracking-wide">
              Access Portal <span aria-hidden="true">&rarr;</span>
            </span>
          </Link>

          {/* Admin Portal */}
          <Link href="/admin-login" className="group text-left p-8 rounded-3xl bg-white border border-gray-200 hover:border-gray-900 hover:shadow-xl hover:shadow-gray-900/5 transition-all duration-300">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-gray-200 transition-all duration-300">
              <svg className="w-7 h-7 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-[#0a1128] mb-3">Administration</h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-8 font-medium">Manage platform liquidity, approve partner schools, and oversee total network escrow.</p>
            <span className="text-sm font-bold text-gray-900 flex items-center gap-2 group-hover:gap-3 transition-all uppercase tracking-wide">
              Access Portal <span aria-hidden="true">&rarr;</span>
            </span>
          </Link>

        </div>
      </div>
    </div>
  )
}