'use client'

import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      
      {/* NAVIGATION */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* NEW CLEAN LOGO */}
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-[#0a1128]">Pay</span><span className="text-blue-600">Term</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm font-bold text-gray-600 hover:text-[#0a1128] transition-colors">How it Works</Link>
            <Link href="/school-login" className="text-sm font-bold text-gray-600 hover:text-[#0a1128] transition-colors">For Schools</Link>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/parent-login" className="text-sm font-bold text-[#0a1128] hover:text-blue-600 transition-colors hidden sm:block">Log In</Link>
            <Link href="/parent-login" className="bg-[#0a1128] text-white px-6 py-2.5 rounded-full text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-900/20 active:scale-95">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="flex-grow">
        <section className="relative pt-40 pb-20 md:pt-48 md:pb-24 overflow-hidden">
          {/* Subtle Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 bg-gradient-to-b from-blue-400 to-transparent blur-3xl pointer-events-none rounded-full"></div>
          
          <div className="max-w-5xl mx-auto px-6 relative z-10 text-center">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-[#0a1128] tracking-tighter leading-[1.1] mb-6">
              Pay school fees in <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">easy monthly installments.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl mx-auto mb-10 leading-relaxed">
              Zero interest. Maximum flexibility. Join thousands of parents using PayTerm to manage education expenses without the financial stress.
            </p>

            {/* DUAL CTA BUTTONS REPLACING SEARCH BAR */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
              <Link href="/parent-login" className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-full font-bold text-base md:text-lg hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all active:scale-95">
                Get Started as a Parent
              </Link>
              <Link href="/school-login" className="w-full sm:w-auto px-8 py-4 bg-white text-[#0a1128] border border-gray-200 rounded-full font-bold text-base md:text-lg hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                Partner as a School
              </Link>
            </div>

            {/* NEW TRUST STATS REPLACING CBN/NDIC */}
            <div className="mt-20 pt-10 border-t border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div>
                <h4 className="text-3xl md:text-4xl font-black text-[#0a1128]">50+</h4>
                <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">Partner Schools</p>
              </div>
              <div>
                <h4 className="text-3xl md:text-4xl font-black text-[#0a1128]">10k+</h4>
                <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">Active Students</p>
              </div>
              <div className="col-span-2 md:col-span-1">
                <h4 className="text-3xl md:text-4xl font-black text-[#0a1128]">₦2B+</h4>
                <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">Fees Financed</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 bg-gray-50/50 border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a1128] tracking-tight mb-4">How PayTerm Works</h2>
              <p className="text-gray-500 font-medium text-lg">Your child's education, financed in three simple steps.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                </div>
                <h3 className="text-xl font-bold text-[#0a1128] mb-3">1. Select School</h3>
                <p className="text-gray-500 leading-relaxed font-medium">Find your child's institution from our network of verified partner schools across the country.</p>
              </div>

              {/* Step 2 */}
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </div>
                <h3 className="text-xl font-bold text-[#0a1128] mb-3">2. Choose a Plan</h3>
                <p className="text-gray-500 leading-relaxed font-medium">Select a flexible payment timeline that matches your cash flow. See all fees upfront.</p>
              </div>

              {/* Step 3 */}
              <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm hover:shadow-xl hover:shadow-blue-900/5 transition-all duration-300 group">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-[#0a1128] mb-3">3. Pay & Clear</h3>
                <p className="text-gray-500 leading-relaxed font-medium">Make your initial deposit to instantly activate your child's enrollment. We handle the rest.</p>
              </div>
            </div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-24 bg-blue-600 text-center px-6">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight mb-6">Ready to ease the burden?</h2>
          <p className="text-blue-100 font-medium text-lg max-w-xl mx-auto mb-10">Set up your account in 60 seconds and give your child the uninterrupted education they deserve.</p>
          <Link href="/parent-login" className="inline-block bg-white text-blue-600 px-10 py-4 rounded-full font-extrabold text-lg hover:bg-gray-50 transition-colors shadow-2xl active:scale-95">
            Create Parent Account
          </Link>
        </section>
      </main>

      {/* NEW PRO FOOTER */}
      <footer className="bg-[#0a1128] text-white pt-16 pb-8 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            
            {/* Brand Column */}
            <div className="col-span-1 md:col-span-1">
              <Link href="/" className="text-2xl font-extrabold tracking-tight mb-4 block">
                <span className="text-white">Pay</span><span className="text-blue-500">Term</span>
              </Link>
              <p className="text-gray-400 text-sm font-medium leading-relaxed mb-6">
                Making quality education accessible through flexible, zero-interest payment plans for Nigerian families.
              </p>
            </div>

            {/* Links Columns */}
            <div>
              <h4 className="font-bold text-white mb-4 uppercase tracking-widest text-xs">Product</h4>
              <ul className="space-y-3">
                <li><Link href="/parent-login" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">For Parents</Link></li>
                <li><Link href="/school-login" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">For Schools</Link></li>
                <li><Link href="#how-it-works" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">How it Works</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4 uppercase tracking-widest text-xs">Company</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">About Us</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Careers</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Contact Support</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white mb-4 uppercase tracking-widest text-xs">Legal</h4>
              <ul className="space-y-3">
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Terms of Service</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Privacy Policy</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Security</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-xs font-medium">
              © {new Date().getFullYear()} PayTerm Financial Technologies. All rights reserved.
            </p>
            {/* Dummy Social Icons */}
            <div className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </div>
              <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors cursor-pointer text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}