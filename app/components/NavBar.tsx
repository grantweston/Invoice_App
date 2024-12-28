"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    if (isSettingsOpen) {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const { userName: savedName, hourlyRate: savedRate } = JSON.parse(savedSettings);
        setUserName(savedName || '');
        setHourlyRate(savedRate || '');
      }
    }
  }, [isSettingsOpen]);

  const handleSaveSettings = () => {
    const settings = {
      userName,
      hourlyRate: parseFloat(hourlyRate) || 0
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
    setIsSettingsOpen(false);
    window.location.reload();
  };

  const isActivePath = (path: string) => pathname === path;

  return (
    <>
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
            <ThemeToggle />
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="hidden sm:flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 
                hover:scale-105 border border-white/10 hover:border-white/20 shadow-lg font-medium"
            >
              Settings
            </button>
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

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96 relative dropdown-menu">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white button-press"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold mb-6 text-white">Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded-md text-white input-focus"
                  placeholder="Enter your name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Hourly Rate ($)
                </label>
                <input
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 rounded-md text-white input-focus"
                  placeholder="Enter your hourly rate"
                  min="0"
                  step="0.01"
                />
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-4 py-2 text-gray-300 hover:text-white mr-2 button-press"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 button-press"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}