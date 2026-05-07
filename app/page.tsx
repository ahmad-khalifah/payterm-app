'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

// --- PREMIUM ANIMATION VARIANTS ---
const customEase: [number, number, number, number] = [0.16, 1, 0.3, 1]

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
}

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: customEase } 
  },
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.8, ease: customEase } 
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col overflow-x-hidden">
      
      {/* FLOATING PILL NAVIGATION */}
      <motion.div 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: customEase }}
        className="fixed top-0 w-full z-50 px-4 sm:px-6 pt-6"
      >
        <nav className="max-w-6xl mx-auto bg-white/80 backdrop-blur-xl border border-white/40 shadow-[0_8px_30px_rgb(0,0,0,0.04)] rounded-full px-6 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tight">
            <span className="text-[#0a1128]">Pay</span><span className="text-blue-600">Term</span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 bg-gray-50/50 px-6 py-1.5 rounded-full border border-gray-100">
            <Link href="#how-it-works" className="text-[13px] font-bold text-gray-500 hover:text-[#0a1128] transition-colors uppercase tracking-wider">How it Works</Link>
            <Link href="/school-login" className="text-[13px] font-bold text-gray-500 hover:text-[#0a1128] transition-colors uppercase tracking-wider">For Schools</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/parent-login" className="text-sm font-bold text-[#0a1128] hover:text-blue-600 transition-colors hidden sm:block">Log In</Link>
            <Link href="/parent-login" className="bg-[#0a1128] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-blue-600 transition-all shadow-md hover:shadow-xl hover:shadow-blue-900/20 active:scale-95">
              Get Started
            </Link>
          </div>
        </nav>
      </motion.div>

      <main className="flex-grow">
        {/* HERO SECTION */}
        <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 overflow-hidden">
          
          {/* Aesthetic Mesh Gradients */}
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
          <div className="absolute top-[20%] right-[-10%] w-[40%] h-[60%] bg-indigo-400/10 rounded-full blur-[120px] pointer-events-none mix-blend-multiply" />
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="max-w-5xl mx-auto px-6 relative z-10 text-center"
          >
            {/* Premium Badge */}
            <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-widest mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Nigeria's #1 Fee Financing Platform
            </motion.div>

            <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl md:text-[5rem] font-black text-[#0a1128] tracking-tighter leading-[1.05] mb-6">
              Pay school fees in <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600">easy monthly chunks.</span>
            </motion.h1>
            
            <motion.p variants={fadeInUp} className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl mx-auto mb-12 leading-relaxed">
              Zero interest. Maximum flexibility. Join thousands of parents using PayTerm to manage education expenses without the financial stress.
            </motion.p>

            <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
              <Link href="/parent-login" className="w-full sm:w-auto px-8 py-4 bg-[#0a1128] text-white rounded-full font-bold text-base md:text-lg hover:bg-blue-600 shadow-xl shadow-[#0a1128]/10 transition-all active:scale-95 flex items-center justify-center gap-2">
                Parent Setup
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
              <Link href="/school-login" className="w-full sm:w-auto px-8 py-4 bg-white text-[#0a1128] border border-gray-200 rounded-full font-bold text-base md:text-lg hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                Partner as a School
              </Link>
            </motion.div>

            {/* FLOATING GLASS STATS */}
            <motion.div 
              variants={staggerContainer}
              className="mt-24 mx-auto max-w-4xl bg-white/60 backdrop-blur-2xl border border-white rounded-[2rem] p-8 md:p-12 shadow-[0_8px_30px_rgb(0,0,0,0.04)] grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
              
              <motion.div variants={scaleIn} className="relative z-10">
                <h4 className="text-4xl md:text-5xl font-black text-[#0a1128] tracking-tight">50+</h4>
                <p className="text-[11px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">Partner Schools</p>
              </motion.div>
              <motion.div variants={scaleIn} className="relative z-10">
                <h4 className="text-4xl md:text-5xl font-black text-[#0a1128] tracking-tight">10k+</h4>
                <p className="text-[11px] md:text-xs text-gray-500 font-bold uppercase tracking-widest mt-2">Active Students</p>
              </motion.div>
              <motion.div variants={scaleIn} className="col-span-2 md:col-span-1 relative z-10">
                <h4 className="text-4xl md:text-5xl font-black text-blue-600 tracking-tight">₦2B+</h4>
                <p className="text-[11px] md:text-xs text-blue-600/70 font-bold uppercase tracking-widest mt-2">Fees Financed</p>
              </motion.div>
            </motion.div>
          </motion.div>
        </section>

        {/* HOW IT WORKS SECTION */}
        <motion.section 
          id="how-it-works" 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 md:py-32 bg-white relative"
        >
          <div className="max-w-7xl mx-auto px-6">
            <motion.div variants={fadeInUp} className="text-center mb-16 md:mb-24">
              <h2 className="text-3xl md:text-5xl font-black text-[#0a1128] tracking-tight mb-4">How PayTerm Works</h2>
              <p className="text-gray-500 font-medium text-lg md:text-xl max-w-2xl mx-auto">Your child's education, financed and secured in three simple steps.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              
              {/* Step 1 */}
              <motion.div variants={fadeInUp} className="bg-[#FAFAFA] p-10 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group hover:shadow-[0_20px_40px_rgb(0,0,0,0.04)] hover:-translate-y-2 transition-all duration-500">
                <div className="absolute -right-8 -bottom-12 text-[12rem] font-black text-gray-100 group-hover:text-blue-50 transition-colors duration-500 select-none pointer-events-none leading-none">1</div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-white shadow-sm border border-gray-100 text-[#0a1128] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#0a1128] mb-4 tracking-tight">Select School</h3>
                  <p className="text-gray-500 leading-relaxed font-medium text-lg">Find your child's institution from our verified nationwide network. Instantly sync their details and active term fees.</p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div variants={fadeInUp} className="bg-[#FAFAFA] p-10 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group hover:shadow-[0_20px_40px_rgb(0,0,0,0.04)] hover:-translate-y-2 transition-all duration-500">
                <div className="absolute -right-8 -bottom-12 text-[12rem] font-black text-gray-100 group-hover:text-blue-50 transition-colors duration-500 select-none pointer-events-none leading-none">2</div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-white shadow-sm border border-gray-100 text-[#0a1128] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#0a1128] mb-4 tracking-tight">Choose a Plan</h3>
                  <p className="text-gray-500 leading-relaxed font-medium text-lg">Opt to pay in full or slice the fee into a 60% initial deposit with the remainder due at mid-term.</p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div variants={fadeInUp} className="bg-[#0a1128] p-10 rounded-[2.5rem] border border-[#15234b] relative overflow-hidden group hover:shadow-[0_20px_40px_rgba(10,17,40,0.2)] hover:-translate-y-2 transition-all duration-500">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute -right-8 -bottom-12 text-[12rem] font-black text-white/5 group-hover:text-white/10 transition-colors duration-500 select-none pointer-events-none leading-none">3</div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 shadow-lg shadow-blue-900/50">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08-.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-2xl font-extrabold text-white mb-4 tracking-tight">Pay & Clear</h3>
                  <p className="text-blue-100/70 leading-relaxed font-medium text-lg">Make your payment securely. We instantly disburse funds to the school and generate your digital clearance.</p>
                </div>
              </motion.div>

            </div>
          </div>
        </motion.section>

        {/* BOTTOM CTA */}
        <motion.section 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="py-24 md:py-32 bg-blue-600 text-center px-6 relative overflow-hidden"
        >
          {/* Subtle background circles for depth */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
            <div className="absolute -top-1/2 -left-1/4 w-[1000px] h-[1000px] rounded-full border-[100px] border-white/5" />
            <div className="absolute -bottom-1/2 -right-1/4 w-[800px] h-[800px] rounded-full border-[80px] border-white/5" />
          </div>

          <div className="relative z-10">
            <motion.h2 variants={fadeInUp} className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-6">
              Ready to ease the burden?
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-blue-100 font-medium text-lg md:text-xl max-w-2xl mx-auto mb-12">
              Set up your account in 60 seconds and give your child the uninterrupted education they deserve.
            </motion.p>
            <motion.div variants={scaleIn}>
              <Link href="/parent-login" className="inline-flex items-center gap-3 bg-white text-[#0a1128] px-10 py-5 rounded-full font-black text-lg hover:bg-gray-50 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95">
                Create Parent Account
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </Link>
            </motion.div>
          </div>
        </motion.section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#0a1128] text-white pt-20 pb-8 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-1">
              <Link href="/" className="text-2xl font-black tracking-tight mb-6 block">
                <span className="text-white">Pay</span><span className="text-blue-500">Term</span>
              </Link>
              <p className="text-gray-400 text-sm font-medium leading-relaxed mb-6 pr-4">
                Making quality education accessible through flexible, zero-interest payment plans for Nigerian families.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Product</h4>
              <ul className="space-y-4">
                <li><Link href="/parent-login" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">For Parents</Link></li>
                <li><Link href="/school-login" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">For Schools</Link></li>
                <li><Link href="#how-it-works" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">How it Works</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Company</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">About Us</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Careers</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Contact Support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-white mb-6 uppercase tracking-widest text-xs">Legal</h4>
              <ul className="space-y-4">
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Terms of Service</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Privacy Policy</Link></li>
                <li><Link href="#" className="text-gray-400 hover:text-white text-sm transition-colors font-medium">Security</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-xs font-medium tracking-wide">
              © {new Date().getFullYear()} PayTerm Financial Technologies. All rights reserved.
            </p>
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-gray-400 hover:text-white">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </div>
              <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer text-gray-400 hover:text-white">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
              </div>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}