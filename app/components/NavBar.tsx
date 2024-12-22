"use client";

import Link from "next/link";
import ThemeToggle from "./ThemeToggle";

export default function NavBar() {
  return (
    <nav className="w-full bg-gradient-to-r from-primary-600 to-primary-500 dark:from-dark-card dark:to-dark-bg text-white p-4 shadow-lg transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/">
            <div className="flex items-center space-x-2 hover:text-primary-100 transition-colors">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-semibold">Invoice App</span>
            </div>
          </Link>
          
          <div className="hidden sm:flex space-x-4">
            <Link href="/">
              <div className="px-3 py-2 rounded-lg hover:bg-primary-700/50 dark:hover:bg-dark-border transition-colors">
                Dashboard
              </div>
            </Link>
            <Link href="/daily-report">
              <div className="px-3 py-2 rounded-lg hover:bg-primary-700/50 dark:hover:bg-dark-border transition-colors">
                Daily Report
              </div>
            </Link>
            <Link href="/invoice">
              <div className="px-3 py-2 rounded-lg hover:bg-primary-700/50 dark:hover:bg-dark-border transition-colors">
                Invoices
              </div>
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <button className="hidden sm:block px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors">
            Settings
          </button>
        </div>
      </div>
      
      {/* Mobile menu - shown at bottom of screen on small devices */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-primary-600 dark:bg-dark-card p-2 flex justify-around items-center border-t border-primary-700 dark:border-dark-border">
        <Link href="/">
          <div className="flex flex-col items-center p-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </div>
        </Link>
        <Link href="/daily-report">
          <div className="flex flex-col items-center p-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1">Reports</span>
          </div>
        </Link>
        <Link href="/invoice">
          <div className="flex flex-col items-center p-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1">Invoices</span>
          </div>
        </Link>
      </div>
    </nav>
  );
}