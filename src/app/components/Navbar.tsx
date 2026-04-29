'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  LogOut,
  LayoutDashboard,
  ChevronDown,
  Menu,
  X,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile menu on route change
  // Removed useEffect to avoid linter error and use explicit onClick handlers instead


  const navLinks = [
    { name: 'Home', href: '/' },
    // { name: 'Exam Simulator', href: '/exam' },
    { name: 'Mock Tests', href: '/mock-tests' },
    { name: 'Practice', href: '/practice' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'About', href: '/about' },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[60] transition-all duration-500 ${
          isScrolled
            ? 'py-3 bg-white/80 backdrop-blur-xl shadow-[0_2px_20px_-10px_rgba(0,0,0,0.1)]'
            : 'py-5 bg-white/80 backdrop-blur-xl'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="flex items-center justify-between">
            {/* --- LOGO --- */}
            <Link
              href="/"
              className="flex items-center gap-3 group relative z-[70]"
            >
              <div className="w-10 h-10 lg:w-11 lg:h-11 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-3 transition-transform">
                <BookOpen className="text-white w-5 h-5 lg:w-6 lg:h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-slate-900 font-black text-lg lg:text-xl tracking-tighter">
                  IELTS.AI
                </span>
                <span className="text-blue-600 text-[9px] font-bold uppercase tracking-widest leading-none">
                  Practice Pro
                </span>
              </div>
            </Link>

            {/* --- DESKTOP LINKS --- */}
            <div className="hidden lg:flex items-center bg-slate-100/50 p-1 rounded-2xl border border-slate-200/50">
              {navLinks.map(link => (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
                    pathname === link.href
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>

            {/* --- DESKTOP AUTH --- */}
            <div className="hidden lg:flex items-center gap-4">
              {session ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() =>
                      setIsProfileDropdownOpen(!isProfileDropdownOpen)
                    }
                    className="flex items-center gap-3 p-1.5 pr-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-white transition-all"
                  >
                    <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xs uppercase">
                      {session.user?.name?.[0]}
                    </div>
                    <ChevronDown
                      size={14}
                      className={`text-slate-400 transition-transform ${isProfileDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {isProfileDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-3 w-64 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 p-2 overflow-hidden"
                      >
                        <div className="px-4 py-3 mb-2 bg-slate-50 rounded-xl">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Logged in as
                          </p>
                          <p className="text-sm font-black text-slate-900 truncate">
                            {session.user?.email}
                          </p>
                        </div>
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"
                        >
                          <LayoutDashboard size={18} /> Dashboard
                        </Link>
                        <button
                          type="button"
                          onClick={() => signOut()}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 rounded-xl transition-all text-left"
                        >
                          <LogOut size={18} /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link
                    href="/login"
                    className="px-5 py-2 text-slate-600 font-bold text-sm hover:text-blue-600 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/get-free"
                    className="px-6 py-3 bg-slate-900 text-white font-bold text-sm rounded-2xl hover:bg-blue-600 shadow-lg shadow-slate-200 hover:shadow-blue-100 transition-all"
                  >
                    Get Started Free
                  </Link>
                </div>
              )}
            </div>

            {/* --- MOBILE TOGGLE BUTTON --- */}
            <button
              type="button"
              className="lg:hidden relative z-[70] p-2.5 bg-slate-100 rounded-xl text-slate-900 active:scale-90 transition-transform"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </nav>

      {/* --- MOBILE MENU OVERLAY --- */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[55] lg:hidden"
            />

            {/* Menu Content */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-[58] lg:hidden shadow-2xl flex flex-col p-8 pt-24"
            >
              <div className="flex flex-col gap-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-4 mb-2">
                  Navigation
                </p>
                {navLinks.map(link => (
                  <Link
                    key={link.name}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-4 rounded-2xl text-lg font-bold transition-all ${
                      pathname === link.href
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {link.name}
                    <ArrowRight
                      size={18}
                      className={
                        pathname === link.href ? 'opacity-100' : 'opacity-0'
                      }
                    />
                  </Link>
                ))}
              </div>

              <div className="mt-auto space-y-4">
                {session ? (
                  <div className="space-y-3">
                    <div className="p-4 bg-slate-50 rounded-2xl flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold">
                        {session.user?.name?.[0]}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {session.user?.name}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {session.user?.email}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex w-full items-center justify-center gap-2 py-4 bg-slate-100 text-slate-900 font-bold rounded-2xl"
                    >
                      <LayoutDashboard size={20} /> Go to Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        signOut();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-2 py-4 text-red-500 font-bold bg-red-50 rounded-2xl"
                    >
                      <LogOut size={20} /> Sign Out
                    </button>
                  </div>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full py-4 text-center font-bold text-slate-600 border border-slate-200 rounded-2xl"
                    >
                      Login
                    </Link>
                    <Link
                      href="/get-free"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="block w-full py-4 text-center font-bold bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100"
                    >
                      Get Started Free
                    </Link>
                  </>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
