"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { demoDataService } from '@/src/services/demoDataService';
import { useRecordingState } from '@/src/store/recordingState';
import { ClientScreenRecorder } from '@/src/services/clientScreenRecorder';
import WorkSessionButton from './WorkSessionButton';
import { useDailyLogs } from "@/src/store/dailyLogs";
import { useWIPStore, WIPEntry as StoreWIPEntry } from "@/src/store/wipStore";
import type { WIPEntry } from "@/src/types";
import type { ScreenAnalysis } from '@/src/services/screenAnalysisService';

const recorder = new ClientScreenRecorder();

export default function NavBar() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [userName, setUserName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const addDailyLog = useDailyLogs((state) => state.addLog);
  const wipEntries = useWIPStore((state) => state.entries);
  const setWipEntries = useWIPStore((state) => state.setEntries);

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

  const handleStartDemo = async () => {
    if (window.confirm('This will clear all existing data. Are you sure you want to load demo data?')) {
      const success = await demoDataService.loadDemoData();
      if (success) {
        alert('Demo data loaded successfully!');
        window.location.reload();
      } else {
        alert('Failed to load demo data. Please try again.');
      }
    }
  };

  const handleTestApi = async () => {
    try {
      console.log('🚀 Starting Google Drive API test...');
      const response = await fetch('/api/test-googleapi');
      console.log('📨 Response status:', response.status);
      console.log('📨 Raw response:', response);
      const data = await response.json();
      console.log('✅ API Response:', data);
    } catch (error) {
      console.error('❌ Test API failed:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      alert('Failed to test API. Check console for details.');
    }
  };

  const handleLogEnv = () => {
    console.log('🔧 Environment Variables:', {
      nodeEnv: process.env.NODE_ENV,
      nextPublicBaseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      // Google API credentials
      hasClientEmail: !!process.env.GOOGLE_CLIENT_EMAIL,
      hasPrivateKey: !!process.env.GOOGLE_PRIVATE_KEY,
      hasProjectId: !!process.env.GOOGLE_PROJECT_ID,
      hasPrivateKeyId: !!process.env.GOOGLE_PRIVATE_KEY_ID,
      hasClientId: !!process.env.GOOGLE_CLIENT_ID,
      // Detailed checks
      clientEmailLength: process.env.GOOGLE_CLIENT_EMAIL?.length || 0,
      privateKeyLength: process.env.GOOGLE_PRIVATE_KEY?.length || 0,
      privateKeyStartsWith: process.env.GOOGLE_PRIVATE_KEY?.substring(0, 27) || 'not found',
      privateKeyEndsWith: process.env.GOOGLE_PRIVATE_KEY?.substring(-25) || 'not found',
      privateKeyHasNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes('\\n'),
      privateKeyHasRealNewlines: process.env.GOOGLE_PRIVATE_KEY?.includes('\n'),
    });
  };

  const handleTestEnv = async () => {
    try {
      console.log('🔧 Testing environment variables...');
      const response = await fetch('/api/test-env');
      console.log('📨 Response status:', response.status);
      const data = await response.json();
      console.log('✨ Server environment:', data);
    } catch (error) {
      console.error('❌ Environment test failed:', error);
    }
  };

  // Helper function to get time in minutes
  const getTimeInMinutes = (entry: StoreWIPEntry | WIPEntry): number => {
    return entry.timeInMinutes || 0;
  };

  // Helper function to convert store WIPEntry to types WIPEntry
  const convertToTypesWIPEntry = (entry: StoreWIPEntry): WIPEntry => ({
    id: parseInt(entry.id),
    client: entry.client,
    project: entry.project,
    timeInMinutes: entry.timeInMinutes,
    description: entry.description,
    partner: entry.partner,
    hourlyRate: entry.hourlyRate,
    associatedDailyIds: entry.associatedDailyIds.map(id => parseInt(id)),
    subEntries: [],
    startDate: Date.now(),
    lastWorkedDate: Date.now()
  });

  // Helper function to convert types WIPEntry to store WIPEntry
  const convertToStoreWIPEntry = (entry: WIPEntry): StoreWIPEntry => ({
    id: entry.id.toString(),
    client: entry.client,
    project: entry.project,
    timeInMinutes: entry.timeInMinutes || 0,
    description: entry.description,
    partner: entry.partner,
    hourlyRate: entry.hourlyRate,
    associatedDailyIds: entry.associatedDailyIds.map(id => id.toString())
  });

  // Helper function to check name similarity
  function isSimilarName(name1: string, name2: string): boolean {
    const clean1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const clean2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (clean1.includes(clean2) || clean2.includes(clean1)) {
      const similarity = Math.max(clean1.length / clean2.length, clean2.length / clean1.length);
      return similarity > 0.7;
    }
    return false;
  }

  // Helper function for merging descriptions
  function mergeDescriptions(existingDesc: string, newDesc: string): string {
    const allSentences = [existingDesc, newDesc].flatMap(desc => 
      desc.split(/[.!?]/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s.replace(/^[•\-]\s*/, ''))
    );
    const uniqueSentences = Array.from(new Set(allSentences));
    return uniqueSentences.length > 0 
      ? uniqueSentences.map(s => `• ${s}`).join('\n')
      : 'No description available';
  }

  // Handle screen batch analysis
  const handleScreenBatch = async (screenshots: string[]) => {
    try {
      if (screenshots.length < 60) {
        console.log(`⏳ Waiting for more screenshots (${screenshots.length}/60)...`);
        return;
      }

      const now = new Date();
      console.log(`📤 Sending batch of ${screenshots.length} screenshots for analysis...`);

      const response = await fetch('/api/analyze-screen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          screenshots,
          currentTasks: wipEntries.map(convertToTypesWIPEntry)
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze screenshots');
      }

      const analysis: ScreenAnalysis = await response.json();
      console.log('📊 Received analysis:', analysis);
      
      if (analysis.confidence_score > 0) {
        // Get settings from localStorage
        const savedSettings = localStorage.getItem('userSettings');
        const { userName: partner, hourlyRate: rate } = savedSettings ? JSON.parse(savedSettings) : { userName: '', hourlyRate: 0 };
        
        // Create a single daily entry for this minute
        const dailyEntry: WIPEntry = {
          id: Date.now(),
          client: analysis.client_name,
          project: analysis.project_name,
          timeInMinutes: 1,
          hours: 1/60,
          partner: partner,
          hourlyRate: rate,
          description: analysis.detailed_description || analysis.activity_description || 'No description available',
          associatedDailyIds: [],
          subEntries: [],
          startDate: Date.now(),
          lastWorkedDate: Date.now()
        };

        // Add the daily entry
        addDailyLog(dailyEntry);
        console.log('📝 Created daily entry:', dailyEntry);

        // Look for matching WIP entry to update
        const matchingEntry = wipEntries.find(entry => {
          if (analysis.client_name !== "Unknown") {
            return isSimilarName(entry.client, analysis.client_name) &&
                   isSimilarName(entry.project, analysis.project_name);
          }
          return isSimilarName(entry.project, analysis.project_name);
        });

        if (matchingEntry) {
          // Update existing WIP entry
          const updatedEntry: StoreWIPEntry = {
            ...matchingEntry,
            client: matchingEntry.client === "Unknown" && analysis.client_name !== "Unknown" 
              ? analysis.client_name 
              : matchingEntry.client,
            timeInMinutes: getTimeInMinutes(matchingEntry) + 1,
            description: mergeDescriptions(matchingEntry.description, analysis.activity_description || ''),
            associatedDailyIds: [...(matchingEntry.associatedDailyIds || []), dailyEntry.id.toString()]
          };
          
          setWipEntries(wipEntries.map(entry => 
            entry.id === matchingEntry.id ? updatedEntry : entry
          ));
        } else {
          // Create new WIP entry
          const newEntry: StoreWIPEntry = {
            id: Date.now().toString(),
            client: analysis.client_name,
            project: analysis.project_name,
            timeInMinutes: 1,
            partner: partner,
            hourlyRate: rate,
            description: analysis.detailed_description || analysis.activity_description || 'No description available',
            associatedDailyIds: [dailyEntry.id.toString()]
          };
          
          setWipEntries([...wipEntries, newEntry]);
        }
      }
    } catch (error) {
      console.error('Error processing screenshots:', error);
    }
  };

  return (
    <>
      <nav className="w-full bg-gradient-to-r from-gray-700 to-gray-800 dark:from-dark-card dark:to-dark-bg p-4 shadow-lg transition-all duration-300 border-b border-white/10">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-gray-100 dark:text-white">
          <div className="flex items-center space-x-6">
            <Link href="/daily-report">
              <div className="flex items-center space-x-2 hover:scale-105 transition-all duration-200">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="font-bold text-sm tracking-wide font-mono bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Bill Mechanic</span>
              </div>
            </Link>
            
            <div className="hidden sm:flex space-x-2">
              <Link href="/daily-report">
                <div className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-xs
                  ${isActivePath('/daily-report') 
                    ? 'bg-white/30 shadow-lg scale-105 border border-white/30' 
                    : 'hover:bg-white/20 hover:scale-105'}`}>
                  Daily Time Sheet
                </div>
              </Link>
              <Link href="/">
                <div className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-xs
                  ${isActivePath('/') 
                    ? 'bg-white/30 shadow-lg scale-105 border border-white/30' 
                    : 'hover:bg-white/20 hover:scale-105'}`}>
                  WIP Report
                </div>
              </Link>
              <Link href="/templates">
                <div className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-xs
                  ${isActivePath('/templates') 
                    ? 'bg-white/30 shadow-lg scale-105 border border-white/30' 
                    : 'hover:bg-white/20 hover:scale-105'}`}>
                  Templates
                </div>
              </Link>
              <Link href="/invoices">
                <div className={`px-4 py-2 rounded-lg transition-all duration-200 font-medium text-xs
                  ${isActivePath('/invoices') 
                    ? 'bg-white/30 shadow-lg scale-105 border border-white/30' 
                    : 'hover:bg-white/20 hover:scale-105'}`}>
                  Invoices
                </div>
              </Link>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <WorkSessionButton 
              onStart={async () => {
                await recorder.startRecording(handleScreenBatch);
              }}
              onEnd={async () => {
                await recorder.stopRecording();
              }}
            />
            <button
              onClick={handleStartDemo}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition-all duration-200 hover:scale-105"
            >
              Start Demo
            </button>
            <button
              onClick={handleTestApi}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-all duration-200 hover:scale-105"
            >
              Test API
            </button>
            <button
              onClick={handleLogEnv}
              className="px-4 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white font-medium text-xs transition-all duration-200 hover:scale-105 ml-2"
            >
              Log Env
            </button>
            <button
              onClick={handleTestEnv}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs transition-all duration-200 hover:scale-105"
            >
              Test Env
            </button>
            <ThemeToggle />
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="hidden sm:flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all duration-200 
                hover:scale-105 border border-white/20 hover:border-white/30 shadow-lg font-medium text-xs"
            >
              Settings
            </button>
          </div>
        </div>
        
        {/* Mobile menu */}
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-gray-700 dark:bg-dark-card p-2 flex justify-around items-center border-t border-white/20 backdrop-blur-lg bg-opacity-90">
          <Link href="/daily-report">
            <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200
              ${isActivePath('/daily-report') ? 'bg-white/20 scale-105' : 'hover:bg-white/10'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xs mt-1 font-medium">Daily Time Sheet</span>
            </div>
          </Link>
          <Link href="/">
            <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200
              ${isActivePath('/') ? 'bg-white/20 scale-105' : 'hover:bg-white/10'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="text-xs mt-1 font-medium">WIP Report</span>
            </div>
          </Link>
          <Link href="/templates">
            <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200
              ${isActivePath('/templates') ? 'bg-white/20 scale-105' : 'hover:bg-white/10'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span className="text-xs mt-1 font-medium">Templates</span>
            </div>
          </Link>
          <Link href="/invoices">
            <div className={`flex flex-col items-center p-2 rounded-lg transition-all duration-200
              ${isActivePath('/invoices') ? 'bg-white/20 scale-105' : 'hover:bg-white/10'}`}>
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
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 button-press"
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