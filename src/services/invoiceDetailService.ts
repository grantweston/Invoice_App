import { WIPEntry, DailyActivity } from '@/src/services/supabaseDB';
import { WorkCategory, DetailedInvoice } from '@/src/types';
import { categorizeDescription, groupSimilarWork } from './categoryService';

async function categorizeWork(
  wipEntries: WIPEntry[],
  dailyActivities: DailyActivity[]
): Promise<WorkCategory[]> {
  // Combine all entries for grouping
  const allEntries = [...wipEntries, ...dailyActivities];
  const groupedWork = await groupSimilarWork(allEntries);

  // Convert groups to WorkCategory format
  const categories: WorkCategory[] = [];

  // Use Array.from to handle iteration
  Array.from(groupedWork.entries()).forEach(([categoryName, entries]) => {
    const category: WorkCategory = {
      name: categoryName,
      entries: [],
      activities: [],
      totalMinutes: 0,
      totalAmount: 0
    };

    // Split back into WIP and Daily activities
    entries.forEach(entry => {
      if ('hourly_rate' in entry) {
        // WIP Entry
        category.entries.push(entry);
        category.totalMinutes += entry.time_in_minutes;
        category.totalAmount += (entry.time_in_minutes / 60) * entry.hourly_rate;
      } else {
        // Daily Activity
        category.activities.push(entry);
        category.totalMinutes += entry.time_in_minutes;
      }
    });

    categories.push(category);
  });

  // Sort by total amount
  return categories.sort((a, b) => b.totalAmount - a.totalAmount);
}

export async function generateDetailedInvoice(
  client: { name: string; address: string; clientNumber?: string },
  invoiceNumber: string,
  dateRange: { start: string; end: string },
  wipEntries: WIPEntry[],
  dailyActivities: DailyActivity[],
  retainerAmount?: number,
  adjustments?: { description: string; amount: number }[]
): Promise<DetailedInvoice> {
  const categories = await categorizeWork(wipEntries, dailyActivities);
  
  const totalAmount = categories.reduce(
    (sum, category) => sum + category.totalAmount, 
    0
  );

  return {
    client,
    invoiceNumber,
    dateRange,
    categories,
    totalAmount,
    retainerAmount,
    adjustments
  };
} 