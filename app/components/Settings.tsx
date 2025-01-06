'use client';

import { useState, useEffect } from 'react';
import { useActivePartner } from '@/src/store/activePartner';

export default function Settings() {
  const { activePartner, setActivePartner } = useActivePartner();
  const [isOpen, setIsOpen] = useState(false);
  const [hourlyRate, setHourlyRate] = useState('');
  const [partnerName, setPartnerName] = useState(activePartner);

  useEffect(() => {
    if (isOpen) {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        const { hourlyRate: savedRate } = JSON.parse(savedSettings);
        setHourlyRate(savedRate || '');
      }
    }
  }, [isOpen]);

  const handleSave = () => {
    const settings = {
      hourlyRate: parseFloat(hourlyRate) || 0
    };
    localStorage.setItem('userSettings', JSON.stringify(settings));
    setActivePartner(partnerName);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
      >
        Settings
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-gray-800 rounded-lg shadow-lg p-4 z-50">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Active Partner
              </label>
              <input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md p-2"
                placeholder="Enter partner name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-2">
                Hourly Rate ($)
              </label>
              <input
                type="number"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-md p-2"
                placeholder="Enter hourly rate"
                min="0"
                step="0.01"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-sm text-gray-300 hover:text-white mr-2"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 