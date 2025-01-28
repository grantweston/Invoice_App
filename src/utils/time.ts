export const formatTime = (hours: number): string => {
  const totalMinutes = Math.round(hours * 60);
  const displayHours = Math.floor(totalMinutes / 60);
  const displayMinutes = totalMinutes % 60;
  
  if (totalMinutes === 0) return '0 min';
  if (displayHours === 0) return `${displayMinutes} min`;
  if (displayMinutes === 0) return `${displayHours} ${displayHours === 1 ? 'hour' : 'hours'}`;
  return `${displayHours} ${displayHours === 1 ? 'hour' : 'hours'}, ${displayMinutes} min`;
}; 