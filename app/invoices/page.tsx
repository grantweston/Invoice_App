'use client';

import { useEffect } from 'react';
import { useWIPStore } from '@/src/store/wipStore';
import DocGenerator from '../components/DocGenerator';
import { WIPEntry } from '@/src/types';

export default function InvoicesPage() {
  const wipEntries = useWIPStore((state) => state.entries);

  // Format currency helper
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  // Format time helper
  const formatTime = (hours: number): string => {
    const totalMinutes = Math.round(hours * 60);
    if (totalMinutes === 0) return '0 min';
    
    const displayHours = Math.floor(totalMinutes / 60);
    const displayMinutes = totalMinutes % 60;
    
    if (displayHours === 0) return `${displayMinutes} min`;
    if (displayMinutes === 0) return displayHours === 1 ? '1 hour' : `${displayHours} hours`;
    return `${displayHours} ${displayHours === 1 ? 'hour' : 'hours'}, ${displayMinutes} min`;
  };

  // Group entries by client
  const clientProjects = wipEntries.reduce((acc, entry) => {
    if (!acc[entry.client]) {
      acc[entry.client] = {
        projects: {},
        totalAmount: 0,
        totalHours: 0
      };
    }
    
    if (!acc[entry.client].projects[entry.project]) {
      acc[entry.client].projects[entry.project] = {
        entries: [],
        totalHours: 0,
        totalAmount: 0
      };
    }
    
    const timeInMinutes = entry.timeInMinutes || 0;
    const hours = timeInMinutes / 60;
    const amount = hours * entry.hourlyRate;
    
    acc[entry.client].projects[entry.project].entries.push({
      ...entry,
      id: typeof entry.id === 'string' ? parseInt(entry.id) : entry.id,
      associatedDailyIds: entry.associatedDailyIds.map(id => typeof id === 'string' ? parseInt(id) : id),
      subEntries: [],
      startDate: Date.now(),
      lastWorkedDate: Date.now()
    });
    acc[entry.client].projects[entry.project].totalHours += hours;
    acc[entry.client].projects[entry.project].totalAmount += amount;
    acc[entry.client].totalHours += hours;
    acc[entry.client].totalAmount += amount;
    
    return acc;
  }, {} as Record<string, {
    projects: Record<string, {
      entries: WIPEntry[];
      totalHours: number;
      totalAmount: number;
    }>;
    totalAmount: number;
    totalHours: number;
  }>);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Invoices</h1>
          <p className="text-sm text-gray-600">Generate and manage client invoices</p>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(clientProjects).map(([clientName, data]) => (
          <div key={clientName} className="bg-white dark:bg-dark-card p-6 rounded-lg border border-gray-200 dark:border-dark-border">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">{clientName}</h2>
                <p className="text-sm text-gray-500">
                  {Object.keys(data.projects).length} projects • 
                  {formatTime(data.totalHours)} • 
                  {formatCurrency(data.totalAmount)}
                </p>
              </div>
              <DocGenerator 
                client={clientName} 
                entries={Object.values(data.projects).flatMap(p => p.entries)} 
              />
            </div>

            <div className="mt-4 space-y-3">
              {Object.entries(data.projects).map(([projectName, projectData]) => (
                <div key={projectName} className="pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  <h3 className="font-medium">{projectName}</h3>
                  <p className="text-sm text-gray-500">
                    {formatTime(projectData.totalHours)} • 
                    {formatCurrency(projectData.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {Object.keys(clientProjects).length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No WIP entries found. Start tracking work to generate invoices.
          </div>
        )}
      </div>
    </div>
  );
} 