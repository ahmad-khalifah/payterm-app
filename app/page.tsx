import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] selection:bg-blue-100 selection:text-blue-900 font-sans">
      
      {/* 1. STICKY NAVBAR */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-extrabold text-xl tracking-tight text-[#0a1128]">
            PayTerm<span className="text-blue-600">.</span>
          </div>
          <div className="hidden md:flex gap-8 text-sm font-bold text-gray-500">
            <a href="#how-it-works" className="hover:text-[#0a1128] transition-colors">How it Works</a>
            <a href="#portals" className="hover:text-[#0a1128] transition-colors">Portals</a>
          </div>
          <Link href="#portals" className="bg-[#0a1128] text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-blue-600 transition-colors shadow-sm">
            Access Dashboard
          </Link>
        </div>
      </nav>

      {/* 2. MODERN HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden px-6">
        {/* Architectural Background Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-[0.15] blur-[100px]"></div>

        <div className="relative z-10 max-w-5xl mx-auto text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
          
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-600 text-xs font-bold uppercase tracking-widest mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            Liquidity Engine Live
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold text-[#0a1128] tracking-tight mb-6 leading-tight">
            Education financing, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">engineered for trust.</span>
          </h1>
          
          <p className="text-gray-500 text-lg md:text-xl max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
            PayTerm acts as the central financial bridge. We secure installment plans for parents in escrow, while guaranteeing upfront liquidity payouts for partner schools.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link href="#portals" className="bg-blue-600 text-white px-8 py-4 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">
              Enter Platform
            </Link>
            <a href="#how-it-works" className="bg-white text-[#0a1128] border border-gray-200 px-8 py-4 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
              View Mechanics
            </a>
          </div>
        </div>
      </section>

      {/* 3. BENTO BOX FEATURE GRID (Mechanics) */}
      <section id="how-it-works" className="py-20 bg-white border-y border-gray-100 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-12 md:mb-16">
            <h2 className="text-3xl font-bold text-[#0a1128] tracking-tight mb-4">Financial Infrastructure</h2>
            <p className="text-gray-500 font-medium max-w-2xl">A transparent breakdown of how capital moves through the PayTerm ecosystem.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Main Feature: 60/40 Split */}
            <div className="md:col-span-2 bg-gray-50 rounded-3xl p-8 md:p-12 border border-gray-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <svg className="w-32 h-32 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div className="relative z-10">
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-6 inline-block">Parent Flow</span>
                <h3 className="text-2xl md:text-3xl font-bold text-[#0a1128] mb-4">The 60/40 Escrow Split</h3>
                <p className="text-gray-500 font-medium leading-relaxed max-w-md mb-8">
                  Parents secure their child&apos;s seat with a 60% downpayment. Funds are held in a secure, verifiable escrow ledger until the school verifies the enrollment. The remaining 40% is structured for mid-term completion.
                </p>
                {/* Visual Math Representation */}
                <div className="flex items-center gap-2 font-mono text-sm font-bold">
                  <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-[#0a1128]">60% Initial</div>
                  <span className="text-gray-400">+</span>
                  <div className="bg-white border border-gray-200 px-4 py-2 rounded-lg text-[#0a1128]">40% Mid-term</div>
                </div>
              </div>
            </div>

            {/* Sub Feature 1: Liquidity */}
            <div className="bg-[#0a1128] rounded-3xl p-8 border border-gray-800 shadow-xl relative overflow-hidden flex flex-col justify-between">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full opacity-20 blur-3xl"></div>
               <div>
                <span className="bg-blue-900/50 text-blue-300 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-6 inline-block border border-blue-800">School Flow</span>
                <h3 className="text-xl font-bold text-white mb-3">Upfront Liquidity</h3>
                <p className="text-gray-400 text-sm font-medium leading-relaxed">
                  Partner schools do not wait. Upon verifying a 60% parent downpayment, PayTerm immediately clears an 80% capital tranche for school withdrawal.
                </p>
               </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4. THE PORTAL GATEWAYS */}
      <section id="portals" className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#0a1128] tracking-tight mb-4">Access Your Dashboard</h2>
          <p className="text-gray-500 font-medium max-w-xl mx-auto mb-16">Select your designated portal to view your real-time ledgers, manage students, or request payouts.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 text-left">
            
            {/* Parent Portal */}
            <Link href="/parent-login" className="group p-8 rounded-3xl bg-white border border-gray-200 hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-900/5 transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors duration-300">
                <svg className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-[#0a1128] mb-2">Parent Portal</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-8 font-medium">Link your student, manage your downpayments, and access your secure escrow ledger.</p>
              <div className="text-xs font-bold text-blue-600 flex items-center gap-2 uppercase tracking-wide">
                Secure Login <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </Link>

            {/* School Portal */}
            <Link href="/school-login" className="group p-8 rounded-3xl bg-white border border-gray-200 hover:border-indigo-600 hover:shadow-2xl hover:shadow-indigo-900/5 transition-all duration-300 transform hover:-translate-y-1">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 transition-colors duration-300">
                <svg className="w-7 h-7 text-indigo-600 group-hover:text-white transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h3 className="text-xl font-bold text-[#0a1128] mb-2">School Partner</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-8 font-medium">Verify student enrollments, track active pipelines, and claim your escrowed funds.</p>
              <div className="text-xs font-bold text-indigo-600 flex items-center gap-2 uppercase tracking-wide">
                Secure Login <span className="group-hover:translate-x-1 transition-transform">&rarr;</span>
              </div>
            </Link>

          </div>
        </div>
      </section>

      {/* 5. MINIMAL FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-10 px-6 text-center">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          © 2026 PayTerm Financial Technologies
        </p>
      </footer>

    </div>
  )
}