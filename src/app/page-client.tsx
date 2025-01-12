import { useEffect } from 'react';
import { useDailyLogs, useWIPStore } from '@/src/store/supabaseStores';

// In your PageClient component:
useEffect(() => {
  // Clear old localStorage data
  localStorage.removeItem('daily-logs-storage');
  localStorage.removeItem('wip-storage');
  
  // Initialize new Supabase stores
  useDailyLogs.getState().loadLogs();
  useWIPStore.getState().loadEntries();
}, []); 