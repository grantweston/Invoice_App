"use client";

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // On mount, read the theme from localStorage or system preference
    const isDark = localStorage.theme === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    setDarkMode(isDark);
    document.documentElement.classList.toggle('dark', isDark);
  }, []);

  const toggleTheme = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    document.documentElement.classList.toggle('dark', newDarkMode);
    localStorage.theme = newDarkMode ? 'dark' : 'light';
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggleTheme}
      className={`relative py-[6px] px-4 rounded-lg transition-all duration-300 ease-spring
        ${darkMode 
          ? 'bg-gray-800 text-yellow-300 hover:bg-gray-700' 
          : 'bg-gray-600/90 text-yellow-500 hover:bg-gray-500/90'
        }
        hover:scale-105 shadow-sm
        group overflow-hidden`}
      aria-label="Toggle theme"
    >
      <div className={`transform transition-all duration-300 ease-spring
        ${darkMode ? 'rotate-0 scale-100' : 'rotate-90 scale-0'}`}>
        <Moon className="w-5 h-5" />
      </div>
      <div className={`absolute inset-0 flex items-center justify-center transform transition-all duration-300 ease-spring
        ${darkMode ? '-rotate-90 scale-0' : 'rotate-0 scale-100'}`}>
        <Sun className="w-5 h-5" />
      </div>
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300
        ${darkMode 
          ? 'bg-gradient-to-tr from-yellow-300/10 to-transparent' 
          : 'bg-gradient-to-tr from-gray-700/10 to-transparent'
        }`}
      />
    </button>
  );
} 