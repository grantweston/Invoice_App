"use client";

import type { WIPEntry } from "@/src/types";
import { useNormalizedNames } from '@/src/store/normalizedNames';
import { useEffect, useRef, useState } from 'react';

interface WIPTableProps {
  entries: WIPEntry[];
  onEntryUpdate: (entry: WIPEntry) => void;
  onDelete: (entry: WIPEntry) => void;
  onBlur?: () => void;
  isEditable: boolean;
  showTimestamp?: boolean; // For daily report view
  showTotalCost?: boolean; // Add this line
}

// Format hours into hours and minutes
const formatTime = (hours: number | string): string => {
  // Convert string input to number if needed
  const numericHours = typeof hours === 'string' ? parseFloat(hours) : hours;
  
  // Convert hours to minutes (1 hour = 60 minutes)
  const totalMinutes = Math.round(numericHours * 60);
  
  if (totalMinutes === 0) {
    return '0 min';
  }
  
  // Calculate hours and remaining minutes
  const displayHours = Math.floor(totalMinutes / 60);
  const displayMinutes = totalMinutes % 60;
  
  // Format the output
  if (displayHours === 0) {
    return `${displayMinutes} min`;
  }
  if (displayMinutes === 0) {
    return displayHours === 1 ? '1 hour' : `${displayHours} hours`;
  }
  return `${displayHours} ${displayHours === 1 ? 'hour' : 'hours'}, ${displayMinutes} min`;
};

// Format timestamp
const formatTimestamp = (id: number): string => {
  const date = new Date(id);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  });
};

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export default function WIPTable({ entries = [], onEntryUpdate, onDelete, onBlur, isEditable, showTimestamp = false, showTotalCost = true }: WIPTableProps) {
  const addNormalizedName = useNormalizedNames((state) => state.addNormalizedName);
  const textareaRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});
  const [editingValues, setEditingValues] = useState<Record<string, string | number>>({});

  const handleEdit = (entry: WIPEntry, field: keyof WIPEntry, value: string | number) => {
    // Store the editing value locally
    const editKey = `${entry.id}-${field}`;
    setEditingValues(prev => ({
      ...prev,
      [editKey]: value
    }));
  };

  const handleBlur = (entry: WIPEntry, field: keyof WIPEntry) => {
    const editKey = `${entry.id}-${field}`;
    const value = editingValues[editKey];
    
    if (value === undefined) return;

    // Clear the editing value
    setEditingValues(prev => {
      const newValues = { ...prev };
      delete newValues[editKey];
      return newValues;
    });

    // Convert values based on field type
    let finalValue = value;
    if (field === 'hours' && typeof value === 'number') {
      finalValue = value / 60;
    } else if (field === 'hourlyRate') {
      finalValue = parseFloat(value as string) || 0;
    }
    
    // Store normalized names when client or project is edited
    if (typeof value === 'string') {
      if (field === 'client') {
        addNormalizedName('clients', entry.client, value);
      } else if (field === 'project') {
        addNormalizedName('projects', entry.project, value);
      }
    }
    
    // Update parent state
    onEntryUpdate({
      ...entry,
      [field]: finalValue
    });

    // Call the onBlur handler from parent
    onBlur && onBlur();
  };

  // Get the current value for a field (either editing value or entry value)
  const getCurrentValue = (entry: WIPEntry, field: keyof WIPEntry) => {
    const editKey = `${entry.id}-${field}`;
    return editingValues[editKey] !== undefined ? editingValues[editKey] : entry[field];
  };

  // Auto-resize textarea
  const handleTextAreaInput = (textarea: HTMLTextAreaElement) => {
    if (!textarea) return;
    
    const cursorPosition = textarea.selectionStart;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(textarea.scrollHeight, 100)}px`; // Minimum height of 100px
    textarea.selectionStart = cursorPosition;
    textarea.selectionEnd = cursorPosition;
  };

  // Add effect to initialize textarea heights
  useEffect(() => {
    Object.values(textareaRefs.current).forEach(textarea => {
      if (textarea) {
        handleTextAreaInput(textarea);
      }
    });
  }, [entries]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, entry: WIPEntry, field: keyof WIPEntry) => {
    if (e.key === 'Enter' && (!field.includes('description') || !e.shiftKey)) {
      e.preventDefault();
      handleBlur(entry, field);
      e.currentTarget.blur();
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-200 table-fixed">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="p-2 text-left w-8"></th>
            <th className="p-2 text-left w-[12%]">Client</th>
            <th className="p-2 text-left w-[12%]">Project</th>
            <th className="p-2 text-left w-[10%]">Partner</th>
            <th className="p-2 text-left w-[10%]">{showTimestamp ? 'Timestamp' : 'Time (minutes)'}</th>
            <th className="p-2 text-left w-[10%]">Hourly Rate</th>
            {showTotalCost && <th className="p-2 text-left w-[10%]">Total Cost</th>}
            <th className="p-2 text-left w-[36%]">Description</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={`${entry.id}-${entry.client}-${entry.project}`} className="border-b border-gray-100">
              <td className="p-2 align-top">
                <button
                  onClick={() => onDelete(entry)}
                  className="w-6 h-6 flex items-center justify-center rounded-full bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-800 transition-colors"
                  title="Delete entry"
                >
                  ×
                </button>
              </td>
              <td className="p-2 align-top">
                {isEditable ? (
                  <input
                    type="text"
                    value={getCurrentValue(entry, 'client') as string}
                    onChange={(e) => handleEdit(entry, 'client', e.target.value)}
                    onBlur={() => handleBlur(entry, 'client')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'client')}
                    className="w-full p-1 border rounded"
                  />
                ) : entry.client}
              </td>
              <td className="p-2 align-top">
                {isEditable ? (
                  <input
                    type="text"
                    value={getCurrentValue(entry, 'project') as string}
                    onChange={(e) => handleEdit(entry, 'project', e.target.value)}
                    onBlur={() => handleBlur(entry, 'project')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'project')}
                    className="w-full p-1 border rounded"
                  />
                ) : entry.project}
              </td>
              <td className="p-2 align-top">
                {isEditable ? (
                  <input
                    type="text"
                    value={getCurrentValue(entry, 'partner') as string || ''}
                    onChange={(e) => handleEdit(entry, 'partner', e.target.value)}
                    onBlur={() => handleBlur(entry, 'partner')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'partner')}
                    className="w-full p-1 border rounded"
                    placeholder="Partner name"
                  />
                ) : entry.partner || 'N/A'}
              </td>
              <td className="p-2 whitespace-nowrap align-top">
                {isEditable ? (
                  <input
                    type="number"
                    value={Math.round((getCurrentValue(entry, 'hours') as number) * 60)}
                    onChange={(e) => handleEdit(entry, 'hours', parseInt(e.target.value, 10))}
                    onBlur={() => handleBlur(entry, 'hours')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'hours')}
                    min="0"
                    className="w-full p-1 border rounded"
                    placeholder="Minutes"
                  />
                ) : showTimestamp ? formatTimestamp(entry.id) : formatTime(entry.hours)}
              </td>
              <td className="p-2 align-top">
                {isEditable ? (
                  <input
                    type="number"
                    value={getCurrentValue(entry, 'hourlyRate') as number || ''}
                    onChange={(e) => handleEdit(entry, 'hourlyRate', e.target.value)}
                    onBlur={() => handleBlur(entry, 'hourlyRate')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'hourlyRate')}
                    min="0"
                    step="0.01"
                    className="w-full p-1 border rounded"
                    placeholder="Rate/hour"
                  />
                ) : formatCurrency(entry.hourlyRate || 0)}
              </td>
              {showTotalCost && (
                <td className="p-2 whitespace-nowrap align-top">
                  {formatCurrency((entry.hourlyRate || 0) * entry.hours)}
                </td>
              )}
              <td className="p-2 align-top">
                {isEditable ? (
                  <textarea
                    ref={(el) => {
                      if (el) {
                        textareaRefs.current[entry.id] = el;
                      }
                    }}
                    value={getCurrentValue(entry, 'description') as string}
                    onChange={(e) => {
                      handleEdit(entry, 'description', e.target.value);
                      handleTextAreaInput(e.target);
                    }}
                    onBlur={() => handleBlur(entry, 'description')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'description')}
                    className="w-full p-1 border rounded leading-normal min-h-[100px]"
                    style={{ 
                      resize: 'none',
                      overflow: 'hidden',
                      minHeight: '100px'
                    }}
                  />
                ) : (
                  <div className="whitespace-pre-wrap break-words py-1 px-1 leading-normal">
                    {entry.description}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}