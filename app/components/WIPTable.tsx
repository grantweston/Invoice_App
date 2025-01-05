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

// Format minutes into hours and minutes
const formatTime = (minutes: number | string): string => {
  // Convert string input to number if needed
  const totalMinutes = typeof minutes === 'string' ? parseFloat(minutes) : minutes;
  
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

// Add this helper function at the top with other helpers
const getTimeInMinutes = (entry: WIPEntry): number => {
  return entry.time_in_minutes || 0;
};

const setTimeInMinutes = (entry: WIPEntry, minutes: number): Partial<WIPEntry> => {
  return {
    ...entry,
    time_in_minutes: minutes
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
  const [editingValues, setEditingValues] = useState<Record<string, string | number>>({});
  const textAreaRefs = useRef<Record<string, HTMLTextAreaElement>>({});

  const handleTimeIncrement = (entry: WIPEntry) => {
    const minutes = entry.time_in_minutes || 0;
    const newValue = minutes + 1;
    const updatedEntry = {
      ...entry,
      time_in_minutes: newValue
    };
    onEntryUpdate(updatedEntry);
  };

  const handleTimeDecrement = (entry: WIPEntry) => {
    const minutes = entry.time_in_minutes || 0;
    if (minutes > 0) {
      const newValue = minutes - 1;
      const updatedEntry = {
        ...entry,
        time_in_minutes: newValue
      };
      onEntryUpdate(updatedEntry);
    }
  };

  const handleRateIncrement = (entry: WIPEntry) => {
    const currentValue = entry.hourly_rate || 0;
    const newValue = currentValue + 1;
    const updatedEntry = {
      ...entry,
      hourly_rate: newValue
    };
    onEntryUpdate(updatedEntry);
  };

  const handleRateDecrement = (entry: WIPEntry) => {
    const currentValue = entry.hourly_rate || 0;
    if (currentValue > 0) {
      const newValue = currentValue - 1;
      const updatedEntry = {
        ...entry,
        hourly_rate: newValue
      };
      onEntryUpdate(updatedEntry);
    }
  };

  const handleEdit = (entry: WIPEntry, field: keyof WIPEntry, value: string | number) => {
    const updatedEntry = { ...entry };
    
    if (field === 'time_in_minutes') {
      const minutes = parseInt(value as string) || 0;
      Object.assign(updatedEntry, {
        time_in_minutes: minutes
      });
    } else if (field === 'hourly_rate') {
      updatedEntry.hourly_rate = parseFloat(value as string) || 0;
    } else if (field === 'client_name') {
      updatedEntry.client_name = value as string;
    } else if (field === 'project_name') {
      updatedEntry.project_name = value as string;
    } else if (field === 'partner') {
      updatedEntry.partner = value as string;
    } else {
      (updatedEntry[field] as any) = value;
    }

    onEntryUpdate(updatedEntry);
  };

  const handleBlur = (entry: WIPEntry, field: keyof WIPEntry) => {
    const editKey = `${entry.id}-${field}`;
    const value = editingValues[editKey];
    if (value !== undefined) {
      handleEdit(entry, field, value);
      setEditingValues(prev => {
        const { [editKey]: _, ...rest } = prev;
        return rest;
      });
    }
    if (onBlur) onBlur();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>, entry: WIPEntry, field: keyof WIPEntry) => {
    if (e.key === 'Enter' && (!field.includes('description') || !e.shiftKey)) {
      e.preventDefault();
      handleBlur(entry, field);
      e.currentTarget.blur();
    }
  };

  const getCurrentValue = (entry: WIPEntry, field: keyof WIPEntry): string | number => {
    switch (field) {
      case 'time_in_minutes':
        return entry.time_in_minutes || 0;
      case 'hourly_rate':
        return entry.hourly_rate || 0;
      case 'client_name':
        return entry.client_name || '';
      case 'project_name':
        return entry.project_name || '';
      default:
        return entry[field]?.toString() || '';
    }
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
    Object.values(textAreaRefs.current).forEach(textarea => {
      if (textarea) {
        handleTextAreaInput(textarea);
      }
    });
  }, [entries]);

  const handleTimeChange = (entry: WIPEntry, minutes: number) => {
    handleEdit(entry, 'time_in_minutes', minutes);
  };

  if (entries.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-dark-border">
      <table className="min-w-full bg-white dark:bg-dark-card border-collapse text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg text-gray-700 dark:text-gray-300">
            <th className="p-3 text-left w-[40px]"></th>
            <th className="p-3 text-left min-w-[150px] text-xs">Client</th>
            <th className="p-3 text-left w-[15%] min-w-[150px] text-xs">Project</th>
            <th className="p-3 text-left w-[10%] min-w-[100px] text-xs">Partner</th>
            <th className="p-3 text-left w-[120px] text-xs">Time</th>
            <th className="p-3 text-left w-[70px] text-xs">Rate</th>
            {showTotalCost && <th className="p-3 text-left w-[60px] text-xs">Cost</th>}
            <th className="p-3 text-left w-[90px] text-xs">Date</th>
            <th className="p-3 text-left flex-1 min-w-[300px] text-xs">Description</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, idx) => (
            <tr
              key={entry.id}
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
                    value={getCurrentValue(entry, 'client_name') as string}
                    onChange={(value) => handleEdit(entry, 'client_name', value)}
                    onBlur={() => handleBlur(entry, 'client_name')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'client_name')}
                    className="w-full p-1.5 border dark:border-dark-border rounded focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 text-xs"
                    minRows={1}
                  />
                ) : (
                  <div className="py-1 px-2 bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 rounded text-xs whitespace-pre-wrap break-words border dark:border-dark-border">
                    {entry.client_name}
                  </div>
                )}
              </td>
              <td className="p-3 align-middle">
                {isEditable ? (
                  <TextAreaInput
                    value={getCurrentValue(entry, 'project_name') as string}
                    onChange={(value) => handleEdit(entry, 'project_name', value)}
                    onBlur={() => handleBlur(entry, 'project_name')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'project_name')}
                    className="w-full p-1.5 border dark:border-dark-border rounded focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-600
                      bg-white dark:bg-dark-bg text-gray-900 dark:text-gray-100 transition-colors duration-150 text-xs"
                  />
                ) : (
                  <div className="py-1 px-1.5 whitespace-pre-wrap break-words text-xs">{entry.project_name}</div>
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
              <td className="p-3 align-middle min-w-[100px]">
                {isEditable ? (
                  <AnimatedTimeInput
                    value={getCurrentValue(entry, 'time_in_minutes') as number}
                    onChange={(minutes) => handleTimeChange(entry, minutes)}
                    onBlur={() => handleBlur(entry, 'time_in_minutes')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'time_in_minutes')}
                    onIncrement={() => handleTimeIncrement(entry)}
                    onDecrement={() => handleTimeDecrement(entry)}
                    className="min-w-[80px]"
                  />
                ) : (
                  <div className="py-1 px-2 text-xs">{formatTime(entry.time_in_minutes / 60)}</div>
                )}
              </td>
              <td className="p-3 align-middle min-w-[120px]">
                {isEditable ? (
                  <AnimatedNumberInput
                    value={getCurrentValue(entry, 'hourly_rate') as number}
                    onChange={(value) => handleEdit(entry, 'hourly_rate', value)}
                    onBlur={() => handleBlur(entry, 'hourly_rate')}
                    onKeyDown={(e) => handleKeyDown(e, entry, 'hourly_rate')}
                    prefix="$"
                    upDownButtons={true}
                    onIncrement={() => {
                      handleRateIncrement(entry);
                    }}
                    onDecrement={() => {
                      handleRateDecrement(entry);
                    }}
                    className="min-w-[80px]"
                  />
                ) : (
                  <div className="py-1 px-2 flex items-center text-xs">{formatCurrency(entry.hourly_rate)}</div>
                )}
              </td>
              {showTotalCost && (
                <td className="p-3 align-middle">
                  <div className="py-1 px-2 flex items-center font-medium text-gray-900 dark:text-gray-100 text-xs">
                    {formatCurrency((entry.time_in_minutes / 60) * entry.hourly_rate)}
                  </div>
                </td>
              )}
              <td className="p-3 align-middle">
                {isEditable ? (
                  <div className="relative">
                    <input
                      type="date"
                      value={(() => {
                        try {
                          const date = new Date(entry.date);
                          return date.toISOString().slice(0, 10);
                        } catch (e) {
                          return new Date().toISOString().slice(0, 10);
                        }
                      })()}
                      onChange={(e) => {
                        try {
                          const newDate = new Date(e.target.value).toISOString();
                          if (!isNaN(new Date(newDate).getTime())) {
                            handleEdit(entry, 'date', newDate);
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
                        return new Date(entry.date).toLocaleDateString();
                      } catch (e) {
                        return 'Invalid Date';
                      }
                    })()}
                  </div>
                )}
              </td>
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}