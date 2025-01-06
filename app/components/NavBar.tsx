"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import Settings from "./Settings";
import { useActivePartner } from '@/src/store/activePartner';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();
  const { activePartner } = useActivePartner();
  
  const isActivePath = (path: string) => pathname === path;

  return (
    <nav className="w-full bg-gradient-to-r from-blue-600 to-blue-500 dark:from-dark-card dark:to-dark-bg p-4 shadow-lg transition-all duration-300 border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between text-white dark:text-white">
        <div className="flex items-center space-x-6">
          <Link href="/">
            <div className="flex items-center space-x-2 hover:scale-105 transition-all duration-200">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="font-bold text-lg">Invoice App</span>
            </div>
          </Link>
          
          <div className="hidden sm:flex space-x-2">
            <Link href="/">
              <div className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium
                ${isActivePath('/') 
                  ? 'bg-white/20 shadow-lg scale-105 border border-white/20' 
                  : 'hover:bg-white/10 hover:scale-105'}`}>
                WIP Report
              </div>
            </Link>
            <Link href="/daily-report">
              <div className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium
                ${isActivePath('/daily-report') 
                  ? 'bg-white/20 shadow-lg scale-105 border border-white/20' 
                  : 'hover:bg-white/10 hover:scale-105'}`}>
                Daily Activity
              </div>
            </Link>
            <Link href="/invoice">
              <div className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium
                ${isActivePath('/invoice') 
                  ? 'bg-white/20 shadow-lg scale-105 border border-white/20' 
                  : 'hover:bg-white/10 hover:scale-105'}`}>
                Invoices
              </div>
            </Link>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="text-sm bg-white/10 px-3 py-1.5 rounded-lg">
            {activePartner}
          </div>
          <ThemeToggle />
          <Settings />
        </div>
      </div>
      
      {/* Mobile menu */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-blue-600 dark:bg-dark-card p-2 flex justify-around items-center border-t border-white/20 backdrop-blur-lg bg-opacity-90">
        <Link href="/">
          <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200
            ${isActivePath('/') ? 'bg-white/20 scale-105' : 'hover:bg-white/10'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1 font-medium">Home</span>
          </div>
        </Link>
        <Link href="/daily-report">
          <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200
            ${isActivePath('/daily-report') ? 'bg-white/20 scale-105' : 'hover:bg-white/10'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium">Reports</span>
          </div>
        </Link>
        <Link href="/invoice">
          <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200
            ${isActivePath('/invoice') ? 'bg-white/20 scale-105' : 'hover:bg-white/10'}`}>
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs mt-1 font-medium">Invoices</span>
          </div>
        </Link>
      </div>
    </nav>
  );
}