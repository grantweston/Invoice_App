/**
 * Format a timestamp to display only the time in 12-hour format
 */
export const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Format a date range into a readable string
 */
export const formatDateRange = (startDate: number, endDate: number): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // If dates are the same, just show one date
  if (start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }
  
  // Otherwise show the range
  return `${start.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })} - ${end.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  })}`;
}; 