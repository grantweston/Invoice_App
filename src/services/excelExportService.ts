import * as XLSX from 'xlsx';
import { WIPEntry } from '../types';

export const exportToExcel = (wipEntries: WIPEntry[], dailyEntries: WIPEntry[]) => {
  // Debug logging
  console.log('Debug - WIP Entries associations:');
  wipEntries.forEach(entry => {
    console.log(`WIP Entry ${entry.id}:`, {
      client: entry.client,
      associatedDailyIds: entry.associatedDailyIds
    });
  });

  console.log('\nDebug - Daily Entries looking for associations:');
  dailyEntries.forEach(daily => {
    const associatedWips = wipEntries.filter(wip => wip.associatedDailyIds?.includes(daily.id));
    console.log(`Daily Entry ${daily.id}:`, {
      client: daily.client,
      foundInWips: associatedWips.map(w => w.id)
    });
  });

  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Format WIP entries for Excel
  const wipData = wipEntries.map(entry => ({
    'ID': entry.id,
    'Client': entry.client,
    'Project': entry.project,
    'Description': entry.description,
    'Partner': entry.partner,
    'Time (mins)': entry.timeInMinutes || 0,
    'Hours': entry.hours || 0,
    'Rate ($/hr)': entry.hourlyRate,
    'Cost ($)': ((entry.hours || 0) * entry.hourlyRate).toFixed(2),
    'Start Date': new Date(entry.startDate).toLocaleString(),
    'Last Worked': new Date(entry.lastWorkedDate).toLocaleString(),
    'Associated Daily Entry IDs': entry.associatedDailyIds?.join(', ') || ''
  }));

  // Format Daily entries for Excel
  const dailyData = dailyEntries.map(entry => ({
    'ID': entry.id,
    'Client': entry.client,
    'Project': entry.project,
    'Description': entry.description,
    'Partner': entry.partner,
    'Time (mins)': entry.timeInMinutes || 0,
    'Hours': entry.hours || 0,
    'Rate ($/hr)': entry.hourlyRate,
    'Cost ($)': ((entry.hours || 0) * entry.hourlyRate).toFixed(2),
    'Start Date': new Date(entry.startDate).toLocaleString(),
    'Last Worked': new Date(entry.lastWorkedDate).toLocaleString(),
    'Associated WIP Entry IDs': wipEntries
      .filter(wip => wip.associatedDailyIds?.includes(entry.id))
      .map(wip => wip.id)
      .join(', ') || ''
  }));

  // Create worksheets
  const wipWs = XLSX.utils.json_to_sheet(wipData);
  const dailyWs = XLSX.utils.json_to_sheet(dailyData);

  // Set column widths
  const colWidths = [
    { wch: 12 }, // ID
    { wch: 15 }, // Client
    { wch: 15 }, // Project
    { wch: 40 }, // Description
    { wch: 15 }, // Partner
    { wch: 12 }, // Time
    { wch: 10 }, // Hours
    { wch: 12 }, // Rate
    { wch: 12 }, // Cost
    { wch: 20 }, // Start Date
    { wch: 20 }, // Last Worked
    { wch: 30 }, // Associated IDs
  ];

  wipWs['!cols'] = colWidths;
  dailyWs['!cols'] = colWidths;

  // Add worksheets to workbook
  XLSX.utils.book_append_sheet(wb, wipWs, "WIP Report");
  XLSX.utils.book_append_sheet(wb, dailyWs, "Daily Activity");

  // Save the file
  XLSX.writeFile(wb, `Invoice_App_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
}; 