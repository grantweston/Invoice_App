// This function takes a number representing hours (can be fractional) and converts it
// to a string in the format "Hh Mm", where H is whole hours and M is remaining minutes.
// Example: 1.5 hours -> "1h 30m"
export function formatTime(hours: number) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}