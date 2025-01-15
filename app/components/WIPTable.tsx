"use client";

import type { WIPEntry } from "@/src/types";
import { useEffect, useRef, useState } from 'react';
import EmptyState from './EmptyState';

interface WIPTableProps {
  entries: WIPEntry[];
  onEntryUpdate: (entry: WIPEntry) => void;
  onDelete: (entry: WIPEntry) => void;
  onBlur?: () => void;
  isEditable: boolean;
  showTimestamp?: boolean;
  showTotalCost?: boolean;
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

// Format timestamp to show only time
const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
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

// Add this helper function at the top with other helpers
const getTimeInMinutes = (entry: WIPEntry): number => {
  if (typeof entry.timeInMinutes === 'number') {
    return entry.timeInMinutes;
  }
  return entry.hours ? Math.round(entry.hours * 60) : 0;
};

const setTimeInMinutes = (entry: WIPEntry, minutes: number): Partial<WIPEntry> => {
  return {
    timeInMinutes: minutes,
    hours: minutes / 60
  };
};

// Add this helper function for text fields that should use textarea
const TextAreaInput = ({ 
  value, 
  onChange, 
  onBlur, 
  onKeyDown,
  className,
  minRows = 1
}: {
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
  minRows?: number;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, minRows * 24)}px`;
    }
  }, [value, minRows]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${Math.max(e.target.scrollHeight, minRows * 24)}px`;
      }}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      className={`${className} resize-none overflow-hidden`}
      rows={minRows}
    />
  );
};

// Update the formatDateRange function
function formatDateRange(startDate: number, lastWorkedDate: number): string {
  const start = new Date(startDate);
  const end = new Date(lastWorkedDate);
  
  // Format date without time
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric'
    });
  };
  
  // If same day, show just one date
  if (formatDate(start) === formatDate(end)) {
    return formatDate(start);
  }
  
  // Show range
  return `${formatDate(start)} - ${formatDate(end)}`;
}

// Add this new base component for all animated number inputs
const AnimatedNumberInput = ({ 
  value,
  onChange,
  onBlur,
  onKeyDown,
  className,
  prefix,
  suffix,
  min = "0",
  upDownButtons,
  onIncrement,
  onDecrement
}: {
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  className?: string;
  prefix?: string;
  suffix?: string;
  min?: string;
  upDownButtons?: boolean;
  onIncrement?: () => void;
  onDecrement?: () => void;
}) => {
  const [isIncreasing, setIsIncreasing] = useState(false);
  const [isDecreasing, setIsDecreasing] = useState(false);
  const prevValueRef = useRef(value);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (value !== prevValueRef.current) {
      // Clear any existing timeouts
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }

      // Force animation reset by updating key
      setAnimationKey(prev => prev + 1);

      if (value > prevValueRef.current) {
        setIsIncreasing(true);
        animationTimeoutRef.current = setTimeout(() => setIsIncreasing(false), 300);
      } else if (value < prevValueRef.current) {
        setIsDecreasing(true);
        animationTimeoutRef.current = setTimeout(() => setIsDecreasing(false), 300);
      }
      prevValueRef.current = value;
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value) || 0;
    onChange(newValue);
  };

  return (
    <div className="relative w-full" key={animationKey}>
      <input
        type="number"
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
        className={`
          w-full h-[34px] border dark:border-dark-border rounded 
          focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
          bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 
          transition-all duration-150 ease-in-out
          text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none 
          [&::-webkit-inner-spin-button]:appearance-none
          ${prefix ? 'pl-4' : 'pl-2'}
          ${suffix || upDownButtons ? 'pr-8' : 'pr-2'}
          ${className}
        `}
        min={min}
        style={{
          backgroundColor: isIncreasing 
            ? `var(${window.matchMedia('(prefers-color-scheme: dark)').matches ? '--emerald-bg-dark' : '--emerald-bg-light'})` 
            : isDecreasing 
              ? `var(${window.matchMedia('(prefers-color-scheme: dark)').matches ? '--red-bg-dark' : '--red-bg-light'})` 
              : '',
          borderColor: isIncreasing 
            ? `var(${window.matchMedia('(prefers-color-scheme: dark)').matches ? '--emerald-border-dark' : '--emerald-border-light'})` 
            : isDecreasing 
              ? `var(${window.matchMedia('(prefers-color-scheme: dark)').matches ? '--red-border-dark' : '--red-border-light'})` 
              : '',
          // Light theme - much brighter colors
          '--emerald-bg-light': 'rgb(209 250 229 / 1)',
          '--emerald-border-light': 'rgb(52 211 153)',
          '--red-bg-light': 'rgb(254 226 226 / 1)',
          '--red-border-light': 'rgb(239 68 68)',
          // Dark theme - more subtle colors
          '--emerald-bg-dark': 'rgb(6 78 59 / 0.15)',
          '--emerald-border-dark': 'rgb(4 120 87 / 0.4)',
          '--red-bg-dark': 'rgb(127 29 29 / 0.15)',
          '--red-border-dark': 'rgb(185 28 28 / 0.4)',
        } as React.CSSProperties}
      />
      {prefix && (
        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none text-xs">
          {prefix}
        </span>
      )}
      {suffix && (
        <span className="absolute right-7 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none text-xs">
          {` ${suffix}`}
        </span>
      )}
      {upDownButtons && onIncrement && onDecrement && (
        <div className="absolute right-0 top-0 bottom-0 w-6 flex flex-col border-l dark:border-dark-border">
          <button
            type="button"
            onClick={onIncrement}
            className="flex-1 hover:bg-gray-100 dark:hover:bg-dark-bg/50 text-gray-600 dark:text-gray-400"
          >
            <svg className="w-3 h-3 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={onDecrement}
            className="flex-1 hover:bg-gray-100 dark:hover:bg-dark-bg/50 text-gray-600 dark:text-gray-400 border-t dark:border-dark-border"
          >
            <svg className="w-3 h-3 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

// Update the AnimatedTimeInput to use the base component
const AnimatedTimeInput = ({ 
  value,
  onChange,
  onBlur,
  onKeyDown,
  onIncrement,
  onDecrement,
  className
}: {
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onIncrement: () => void;
  onDecrement: () => void;
  className?: string;
}) => {
  return (
    <AnimatedNumberInput
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      suffix="min"
      upDownButtons={true}
      onIncrement={onIncrement}
      onDecrement={onDecrement}
      className={className}
    />
  );
};

export default function WIPTable({ entries = [], onEntryUpdate, onDelete, onBlur, isEditable, showTimestamp = false, showTotalCost = true }: WIPTableProps) {
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
    const updatedEntry = { ...entry };
    
    if (field === 'timeInMinutes') {
      const minutes = parseInt(value as string) || 0;
      Object.assign(updatedEntry, {
        timeInMinutes: minutes,
        hours: minutes / 60
      });
    } else if (field === 'hourlyRate') {
      updatedEntry.hourlyRate = parseFloat(value as string) || 0;
    } else if (field === 'client') {
      updatedEntry.client = value as string;
    } else if (field === 'project') {
      updatedEntry.project = value as string;
    } else if (field === 'partner') {
      updatedEntry.partner = value as string;
    } else if (field === 'description') {
      updatedEntry.description = value as string;
    }
    
    onEntryUpdate(updatedEntry);
    onBlur?.();
  };

  // Get the current value for a field (either editing value or entry value)
  const getCurrentValue = (entry: WIPEntry, field: keyof WIPEntry): string | number => {
    const editKey = `${entry.id}-${field}`;
    const editValue = editingValues[editKey];
    if (editValue !== undefined) return editValue;
    
    const entryValue = entry[field];
    if (field === 'timeInMinutes') {
      return entryValue as number || getTimeInMinutes(entry);
    }
    return entryValue as string | number;
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

  if (entries.length === 0) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg border border-gray-200 dark:border-dark-border overflow-hidden">
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
      <table className="min-w-full bg-white dark:bg-dark-card border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-700 dark:text-gray-300">
            <th className="p-3 text-left w-[40px]"></th>
            <th className="p-3 text-left min-w-[150px] text-xs">Client</th>
            <th className="p-3 text-left w-[15%] min-w-[150px] text-xs">Work Package</th>
            <th className="p-3 text-left w-[10%] min-w-[100px] text-xs">Employee</th>
            <th className="p-3 text-left w-[90px] text-xs">Date</th>
            <th className="p-3 text-left w-[80px] text-xs">Time</th>
            <th className="p-3 text-left w-[70px] text-xs">Rate</th>
            {showTotalCost && <th className="p-3 text-left w-[60px] text-xs">Cost</th>}
            <th className="p-3 text-left flex-1 min-w-[300px] text-xs">Description</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={`${entry.id}-${entry.client}-${entry.project}`}
              className={`group border-b border-gray-100 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-bg/50 transition-colors duration-150
                ${idx % 2 === 0 ? 'bg-gray-50/50 dark:bg-dark-bg/25' : 'bg-white dark:bg-dark-card'}`}
            >
              <td className="p-3 align-middle">
                <button
                  onClick={() => onDelete(entry)}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 
                    hover:bg-red-200 dark:hover:bg-red-900/50 hover:text-red-800 dark:hover:text-red-300 transition-all duration-150"
                  title="Delete entry"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </td>
              <td className="p-3 align-middle">
                {isEditable ? (
                  <TextAreaInput
                    value={getCurrentValue(entry, 'client') as string}
                    onChange={(value) => handleEdit(entry, 'client', value)}
                    onBlur={() => handleBlur(entry, 'client')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'client')}
                    className="w-full p-1.5 border dark:border-dark-border rounded focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 text-xs"
                    minRows={1}
                  />
                ) : (
                  <div className="py-1 px-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 rounded text-xs whitespace-pre-wrap break-words border dark:border-dark-border">
                    {entry.client}
                  </div>
                )}
              </td>
              <td className="p-3 align-middle">
                {isEditable ? (
                  <TextAreaInput
                    value={getCurrentValue(entry, 'project') as string}
                    onChange={(value) => handleEdit(entry, 'project', value)}
                    onBlur={() => handleBlur(entry, 'project')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'project')}
                    className="w-full p-1.5 border dark:border-dark-border rounded focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-150 text-xs"
                  />
                ) : (
                  <div className="py-1 px-1.5 whitespace-pre-wrap break-words text-xs">{entry.project}</div>
                )}
              </td>
              <td className="p-3 align-middle">
                {isEditable ? (
                  <TextAreaInput
                    value={getCurrentValue(entry, 'partner') as string}
                    onChange={(value) => handleEdit(entry, 'partner', value)}
                    onBlur={() => handleBlur(entry, 'partner')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'partner')}
                    className="w-full p-1.5 border dark:border-dark-border rounded focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-150 text-xs"
                  />
                ) : (
                  <div className="py-1 px-1.5 whitespace-pre-wrap break-words text-xs">{entry.partner}</div>
                )}
              </td>
              <td className="p-3 align-middle">
                {isEditable ? (
                  <div className="relative">
                    <input
                      type="date"
                      value={(() => {
                        try {
                          const date = new Date(entry.startDate);
                          return date.toISOString().slice(0, 10);
                        } catch (e) {
                          return new Date().toISOString().slice(0, 10);
                        }
                      })()}
                      onChange={(e) => {
                        try {
                          const newDate = new Date(e.target.value).getTime();
                          if (!isNaN(newDate)) {
                            handleEdit(entry, 'startDate', newDate);
                            handleEdit(entry, 'lastWorkedDate', newDate);
                            onEntryUpdate({
                              ...entry,
                              startDate: newDate,
                              lastWorkedDate: newDate
                            });
                          }
                        } catch (e) {
                          console.error('Invalid date:', e);
                        }
                      }}
                      className="w-full h-[34px] p-2 border dark:border-dark-border rounded focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                        bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-150 text-xs"
                    />
                  </div>
                ) : (
                  <div className="py-1 px-2 whitespace-nowrap h-[34px] flex items-center text-xs">
                    {(() => {
                      try {
                        return formatDateRange(entry.startDate, entry.lastWorkedDate);
                      } catch (e) {
                        return 'Invalid Date';
                      }
                    })()}
                  </div>
                )}
              </td>
              <td className="p-3 align-middle min-w-[100px]">
                {isEditable && !showTimestamp ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={getCurrentValue(entry, 'timeInMinutes') ?? getTimeInMinutes(entry)}
                      onChange={(e) => {
                        const minutes = parseInt(e.target.value) || 0;
                        handleEdit(entry, 'timeInMinutes', minutes);
                        handleEdit(entry, 'hours', minutes / 60);
                      }}
                      onBlur={() => handleBlur(entry, 'timeInMinutes')}
                      onKeyDown={(e) => handleKeyDown(e, entry, 'timeInMinutes')}
                      className="w-full h-[34px] p-2 pr-[45px] min-w-[70px] border dark:border-dark-border rounded focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                        bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-150 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-left pl-2"
                      min="0"
                    />
                    <span className="absolute right-[30px] top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none text-xs">
                      min
                    </span>
                    <div className="absolute right-0 top-0 bottom-0 w-6 flex flex-col border-l dark:border-dark-border">
                      <button
                        type="button"
                        onClick={() => {
                          const minutes = (getCurrentValue(entry, 'timeInMinutes') as number) || 0;
                          const newValue = minutes + 1;
                          const updatedEntry = {
                            ...entry,
                            timeInMinutes: newValue,
                            hours: newValue / 60
                          };
                          setEditingValues(prev => ({
                            ...prev,
                            [`${entry.id}-timeInMinutes`]: newValue,
                            [`${entry.id}-hours`]: newValue / 60
                          }));
                          onEntryUpdate(updatedEntry);
                        }}
                        className="flex-1 hover:bg-gray-100 dark:hover:bg-dark-bg/50 text-gray-600 dark:text-gray-400"
                      >
                        <svg className="w-3 h-3 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const minutes = (getCurrentValue(entry, 'timeInMinutes') as number) || 0;
                          if (minutes > 0) {
                            const newValue = minutes - 1;
                            const updatedEntry = {
                              ...entry,
                              timeInMinutes: newValue,
                              hours: newValue / 60
                            };
                            setEditingValues(prev => ({
                              ...prev,
                              [`${entry.id}-timeInMinutes`]: newValue,
                              [`${entry.id}-hours`]: newValue / 60
                            }));
                            onEntryUpdate(updatedEntry);
                          }
                        }}
                        className="flex-1 hover:bg-gray-100 dark:hover:bg-dark-bg/50 text-gray-600 dark:text-gray-400 border-t dark:border-dark-border"
                      >
                        <svg className="w-3 h-3 mx-auto" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-1 px-2 text-xs">
                    {showTimestamp ? formatTimestamp(entry.startDate) : formatTime(getTimeInMinutes(entry) / 60)}
                  </div>
                )}
              </td>
              <td className="p-3 align-middle min-w-[120px]">
                {isEditable ? (
                  <AnimatedNumberInput
                    value={getCurrentValue(entry, 'hourlyRate') as number}
                    onChange={(value) => handleEdit(entry, 'hourlyRate', value)}
                    onBlur={() => handleBlur(entry, 'hourlyRate')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'hourlyRate')}
                    prefix="$"
                    upDownButtons={true}
                    onIncrement={() => {
                      const currentValue = getCurrentValue(entry, 'hourlyRate') as number;
                      const newValue = currentValue + 1;
                      handleEdit(entry, 'hourlyRate', newValue);
                      onEntryUpdate({
                        ...entry,
                        hourlyRate: newValue
                      });
                    }}
                    onDecrement={() => {
                      const currentValue = getCurrentValue(entry, 'hourlyRate') as number;
                      if (currentValue > 0) {
                        const newValue = currentValue - 1;
                        handleEdit(entry, 'hourlyRate', newValue);
                        onEntryUpdate({
                          ...entry,
                          hourlyRate: newValue
                        });
                      }
                    }}
                    className="min-w-[80px]"
                  />
                ) : (
                  <div className="py-1 px-2 flex items-center text-xs">{formatCurrency(entry.hourlyRate)}</div>
                )}
              </td>
              {showTotalCost && (
                <td className="p-3 align-middle">
                  <div className="py-1 px-2 flex items-center font-medium text-gray-900 dark:text-gray-100 text-xs">
                    {formatCurrency((getTimeInMinutes(entry) / 60) * entry.hourlyRate)}
                  </div>
                </td>
              )}
              <td className="p-3 align-top w-full">
                <div className="space-y-4">
                  {/* Main description */}
                  {isEditable ? (
                    <TextAreaInput
                      value={getCurrentValue(entry, 'description') as string}
                      onChange={(value) => handleEdit(entry, 'description', value)}
                      onBlur={() => handleBlur(entry, 'description')}
                      onKeyDown={(e) => handleKeyDown(e, entry, 'description')}
                      className="w-full p-1.5 border dark:border-dark-border rounded focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                        bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 leading-normal transition-colors duration-150 text-xs"
                      minRows={2}
                    />
                  ) : (
                    <div className="whitespace-pre-wrap break-words py-1 px-2 leading-normal text-gray-700 dark:text-gray-300 text-xs">
                      {entry.description}
                    </div>
                  )}
                  
                  {/* Sub-entries */}
                  {entry.subEntries && entry.subEntries.length > 0 && (
                    <div className="pl-4 border-l-2 border-gray-200 dark:border-dark-border space-y-3">
                      {entry.subEntries.map(subEntry => (
                        <div key={subEntry.id} className="text-xs">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="text-gray-700 dark:text-gray-300">{subEntry.description}</div>
                              <div className="text-gray-500 dark:text-gray-400 mt-1">
                                {formatTime(subEntry.timeInMinutes / 60)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}