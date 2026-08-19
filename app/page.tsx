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

const floatAnimation = {
  hidden: { y: 0 },
  visible: {
    y: [-10, 10, -10],
    transition: {
      duration: 6,
      ease: "easeInOut" as const,
      repeat: Infinity,
    }
  }
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
        <nav className="max-w-6xl mx-auto bg-white/95 backdrop-blur-xl border border-gray-200 shadow-sm rounded-full px-6 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black tracking-tight">
            <span className="text-[#0a1128]">Pay</span><span className="text-blue-600">Term</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 bg-gray-50 px-6 py-1.5 rounded-full border border-gray-100">
            <Link href="#how-it-works" className="text-[13px] font-bold text-gray-500 hover:text-[#0a1128] transition-colors uppercase tracking-wider">How it Works</Link>
            <Link href="/school-login" className="text-[13px] font-bold text-gray-500 hover:text-[#0a1128] transition-colors uppercase tracking-wider">For Schools</Link>
          </div>

          {/* EXPLICIT LOGIN BUTTONS FOR BOTH USERS */}
          <div className="flex items-center gap-4">
            <Link href="/school-login" className="text-sm font-bold text-gray-500 hover:text-[#0a1128] transition-colors hidden sm:block">
              School Login
            </Link>
            <Link href="/parent-login" className="bg-[#0a1128] text-white px-5 sm:px-6 py-2 rounded-full text-sm font-bold hover:bg-blue-600 transition-all shadow-md active:scale-95">
              Parent Login
            </Link>
          </div>
        </nav>
      </motion.div>

      <main className="flex-grow">
        {/* HERO SECTION - SPLIT PANE DESIGN */}
        <section className="relative pt-40 pb-20 md:pt-48 md:pb-32 overflow-hidden min-h-[90vh] flex items-center">
          
          {/* Subtle Background Elements */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-blue-50 rounded-full blur-[100px] opacity-70 -z-10 translate-x-1/3 -translate-y-1/4" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-50 rounded-full blur-[100px] opacity-70 -z-10 -translate-x-1/3 translate-y-1/4" />

          <div className="max-w-7xl mx-auto px-6 w-full relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">
              
              {/* Left Column: Text & CTA */}
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="text-center lg:text-left pt-10 lg:pt-0"
              >
                
                <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl md:text-[4.5rem] font-black text-[#0a1128] tracking-tighter leading-[1.05] mb-6">
                  Manage school fees with <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">your Family Wallet.</span>
                </motion.h1>

                <motion.p variants={fadeInUp} className="text-lg md:text-xl text-gray-500 font-medium max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                  Instantly generate a dedicated virtual bank account. Fund it at your own pace, track tuition balances, and clear school fees with a single tap.
                </motion.p>

                <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                  <Link href="/parent-login" className="w-full sm:w-auto px-8 py-4 bg-[#0a1128] text-white rounded-full font-bold text-base md:text-lg hover:bg-blue-600 shadow-xl shadow-[#0a1128]/10 transition-all active:scale-95 flex items-center justify-center gap-2 group">
                    Create Free Wallet
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  </Link>
                  <Link href="/school-login" className="w-full sm:w-auto px-8 py-4 bg-white text-[#0a1128] border border-gray-200 rounded-full font-bold text-base md:text-lg hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95 shadow-sm">
                    Partner as a School
                  </Link>
                </motion.div>

                {/* Trust Indicators */}
                <motion.div variants={fadeInUp} className="mt-12 pt-8 border-t border-gray-200 flex flex-wrap items-center justify-center lg:justify-start gap-x-8 gap-y-4">
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-[#0a1128]">Zero</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Hidden Fees</span>
                  </div>
                  <div className="w-px h-8 bg-gray-200 hidden sm:block" />
                  <div className="flex flex-col">
                    <span className="text-2xl font-black text-[#0a1128]">Instant</span>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Reconciliation</span>
                  </div>
                </motion.div>
              </motion.div>

              {/* Right Column: Hero App Image */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: -5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1.2, ease: customEase, delay: 0.2 }}
                className="relative flex justify-center items-center h-full mt-8 lg:mt-0"
              >
                {/* Glow behind phone */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-blue-400/20 to-purple-400/20 blur-3xl rounded-full" />
                
                <motion.div variants={floatAnimation} initial="hidden" animate="visible" className="relative z-10 drop-shadow-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src="/payterm-phone-transparent.png" 
                    alt="PayTerm Parent Dashboard showing wallet balance and active payment plans" 
                    className="w-full max-w-[320px] sm:max-w-[380px] lg:max-w-[420px] object-contain rotate-[-2deg]"
                  />
                  
                  {/* Floating Notification Badge */}
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1.5, duration: 0.8 }}
                    className="absolute right-0 lg:-right-12 top-24 lg:top-32 bg-white px-4 py-3 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3 scale-90 lg:scale-100 origin-right"
                  >
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#0a1128]">Payment Cleared</p>
                      <p className="text-[10px] font-medium text-gray-500 whitespace-nowrap">School notified instantly</p>
                    </div>
                  </motion.div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* REDESIGNED DEMO VIDEO BANNER */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={staggerContainer}
          className="relative z-20 pb-24 pt-0 px-6 bg-white"
        >
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          
          <div className="max-w-5xl mx-auto text-center pt-16 mb-10">
            <h3 className="text-2xl md:text-3xl font-black text-[#0a1128] tracking-tight mb-3">See PayTerm in Action</h3>
            <p className="text-gray-500 font-medium">Watch exactly how the platform works for both sides of the classroom.</p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Parent Demo Card */}
            <motion.a
              variants={fadeInUp}
              href="https://youtube.com/shorts/-HYDUycnaqA?si=ZlybvSZa6XuXKIlQ"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden bg-[#0a1128] rounded-[2rem] p-8 md:p-10 hover:-translate-y-2 transition-all duration-500 shadow-lg hover:shadow-2xl"
            >
              {/* Card Background Pattern */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-colors" />
              
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-widest mb-6 border border-white/20">
                    Parent Experience
                  </div>
                  <h4 className="text-3xl font-black text-white leading-tight mb-4">
                    The Family <br/> Wallet Demo
                  </h4>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed max-w-sm">
                    Watch a parent fund their virtual account and clear their child's tuition in seconds.
                  </p>
                </div>
                
                <div className="mt-8 flex items-center gap-4 text-white">
                  <div className="w-14 h-14 bg-red-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-red-500 transition-all shadow-lg shadow-red-600/30">
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <span className="font-bold text-sm tracking-wide">Watch on YouTube Shorts</span>
                </div>
              </div>
            </motion.a>

            {/* School Demo Card */}
            <motion.a
              variants={fadeInUp}
              href="https://youtube.com/shorts/-HYDUycnaqA?si=r4SNUqLnLqgozGCe"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative overflow-hidden bg-white border border-gray-200 rounded-[2rem] p-8 md:p-10 hover:-translate-y-2 transition-all duration-500 shadow-sm hover:shadow-xl hover:border-blue-200"
            >
              {/* Card Background Pattern */}
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-gray-100 rounded-full blur-3xl group-hover:bg-blue-50 transition-colors" />
              
              <div className="relative z-10 h-full flex flex-col justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-[10px] font-black uppercase tracking-widest mb-6 border border-gray-200">
                    Admin Experience
                  </div>
                  <h4 className="text-3xl font-black text-[#0a1128] leading-tight mb-4">
                    The School <br/> Dashboard Demo
                  </h4>
                  <p className="text-gray-500 text-sm font-medium leading-relaxed max-w-sm">
                    See how administrators track payments, manage ledgers, and withdraw funds seamlessly.
                  </p>
                </div>
                
                <div className="mt-8 flex items-center gap-4 text-[#0a1128]">
                  <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-red-100 transition-all border border-red-100">
                    <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <span className="font-bold text-sm tracking-wide">Watch on YouTube Shorts</span>
                </div>
              </div>
            </motion.a>

          </div>
        </motion.section>

        {/* HOW IT WORKS SECTION */}
        <motion.section
          id="how-it-works"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="py-24 md:py-32 bg-[#FAFAFA] relative border-t border-gray-100"
        >
          <div className="max-w-7xl mx-auto px-6">
            <motion.div variants={fadeInUp} className="text-center mb-16 md:mb-24">
              <h2 className="text-3xl md:text-5xl font-black text-[#0a1128] tracking-tight mb-4">How PayTerm Works</h2>
              <p className="text-gray-500 font-medium text-lg md:text-xl max-w-2xl mx-auto">Your child's education, financed and secured in three simple steps.</p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">

              {/* Step 1 */}
              <motion.div variants={fadeInUp} className="bg-white p-10 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group hover:shadow-xl hover:shadow-gray-200/40 hover:-translate-y-1 transition-all duration-500">
                <div className="absolute -right-8 -bottom-12 text-[12rem] font-black text-gray-50 group-hover:text-blue-50 transition-colors duration-500 select-none pointer-events-none leading-none">1</div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gray-50 shadow-inner border border-gray-100 text-[#0a1128] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all duration-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#0a1128] mb-4 tracking-tight">Link Your Child</h3>
                  <p className="text-gray-500 leading-relaxed font-medium text-lg">Find your child's institution from our verified nationwide network. Instantly sync their details and active term fees.</p>
                </div>
              </motion.div>

              {/* Step 2 */}
              <motion.div variants={fadeInUp} className="bg-white p-10 rounded-[2.5rem] border border-gray-100 relative overflow-hidden group hover:shadow-xl hover:shadow-gray-200/40 hover:-translate-y-1 transition-all duration-500">
                <div className="absolute -right-8 -bottom-12 text-[12rem] font-black text-gray-50 group-hover:text-blue-50 transition-colors duration-500 select-none pointer-events-none leading-none">2</div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-gray-50 shadow-inner border border-gray-100 text-[#0a1128] rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-all duration-500">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" /></svg>
                  </div>
                  <h3 className="text-2xl font-extrabold text-[#0a1128] mb-4 tracking-tight">Get a Virtual Account</h3>
                  <p className="text-gray-500 leading-relaxed font-medium text-lg">We instantly generate a dedicated bank account for your family. No more physical bank tellers or confusing school accounts.</p>
                </div>
              </motion.div>

              {/* Step 3 */}
              <motion.div variants={fadeInUp} className="bg-[#0a1128] p-10 rounded-[2.5rem] border border-[#15234b] relative overflow-hidden group hover:shadow-2xl hover:shadow-[#0a1128]/30 hover:-translate-y-1 transition-all duration-500 text-white">
                <div className="absolute -right-8 -bottom-12 text-[12rem] font-black text-white/5 group-hover:text-blue-500/10 transition-colors duration-500 select-none pointer-events-none leading-none">3</div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500 shadow-md">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <h3 className="text-2xl font-extrabold mb-4 tracking-tight">Top-up & Clear</h3>
                  <p className="text-gray-400 leading-relaxed font-medium text-lg">Transfer funds to your wallet at your own pace. Once funded, authorize the tuition payment with one click to get cleared.</p>
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
              Take control of your child's fees.
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-blue-100 font-medium text-lg md:text-xl max-w-2xl mx-auto mb-12">
              Set up your family wallet in 60 seconds and give your child the uninterrupted education they deserve.
            </motion.p>
            <motion.div variants={fadeInUp}>
              <Link href="/parent-login" className="inline-flex items-center gap-3 bg-white text-[#0a1128] px-10 py-5 rounded-full font-black text-lg hover:bg-gray-50 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] active:scale-95">
                Create Parent Wallet
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
                Making quality education accessible through secure, dedicated virtual accounts for Nigerian families.
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