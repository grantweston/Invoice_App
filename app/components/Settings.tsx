'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [userName, setUserName] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  useEffect(() => {
    // Load saved settings
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      const { userName: savedName, hourlyRate: savedRate } = JSON.parse(savedSettings);
      setUserName(savedName || '');
      setHourlyRate(savedRate || '');
    }
  }, []);

  const handleSave = () => {
    const settings = {
      userName,
      hourlyRate: parseFloat(hourlyRate) || 0
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 relative dropdown-menu">
        <button
          onClick={onClose}
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
              className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white input-focus"
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
              className="w-full px-3 py-2 bg-gray-700 rounded-lg text-white input-focus"
              placeholder="Enter your hourly rate"
              min="0"
              step="0.01"
            />
          </div>
          
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-300 hover:text-white mr-2 button-press"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 button-press"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 