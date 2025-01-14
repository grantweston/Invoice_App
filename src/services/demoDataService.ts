import type { WIPEntry as DailyWIPEntry } from "@/src/types";
import type { WIPEntry as StoreWIPEntry } from "@/src/store/wipStore";
import { useDailyLogs } from "@/src/store/dailyLogs";
import { useWIPStore } from "@/src/store/wipStore";

// Helper to generate timestamps within the last hour
const getRecentTimestamp = (minutesAgo: number) => {
  const now = new Date();
  // Round down to nearest minute
  now.setSeconds(0);
  now.setMilliseconds(0);
  // Create a new date object for the offset time
  const timestamp = new Date(now);
  timestamp.setMinutes(now.getMinutes() - minutesAgo);
  return timestamp.getTime();
};

const TAX_PREP_DESCRIPTIONS = [
  "• Reviewing client's W-2 forms and verifying income calculations",
  "• Cross-checking business expense receipts and categorizing deductions",
  "• Preparing Schedule C for client's small business income reporting"
];

const TAX_RESEARCH_DESCRIPTIONS = [
  "• Researching recent tax law changes affecting S-corporation distributions",
  "• Analyzing IRS guidance on home office deductions for remote workers",
  "• Reviewing tax implications of cryptocurrency transactions for client portfolio",
  "• Studying state-specific tax regulations for multi-state business operations",
  "• Investigating tax credits available for sustainable business practices",
  "• Researching international tax treaties for client's foreign investments",
  "• Analyzing recent tax court decisions regarding passive activity losses"
];

export const demoDataService = {
  loadDemoData: async () => {
    try {
      // Clear existing data
      useWIPStore.getState().clearEntries();
      useDailyLogs.getState().clearLogs();

      // Create WIP entries first
      const taxPrepWIP: StoreWIPEntry = {
        id: Date.now().toString(),
        client: "Johnson & Associates",
        project: "Tax Return Preparation",
        timeInMinutes: 3,
        partner: "Alex",
        hourlyRate: 150,
        description: TAX_PREP_DESCRIPTIONS.join('\n'),
        associatedDailyIds: []
      };

      const taxResearchWIP: StoreWIPEntry = {
        id: (Date.now() + 1).toString(),
        client: "Smith & Co Tax Advisors",
        project: "Tax Law Research",
        timeInMinutes: 7,
        partner: "Alex",
        hourlyRate: 200,
        description: TAX_RESEARCH_DESCRIPTIONS.join('\n'),
        associatedDailyIds: []
      };

      // Add WIP entries
      await useWIPStore.getState().setEntries([taxPrepWIP, taxResearchWIP]);

      // Create an array of timestamps, one minute apart
      const now = new Date();
      now.setSeconds(0);
      now.setMilliseconds(0);
      const timestamps = Array.from({ length: 10 }, (_, i) => {
        const timestamp = new Date(now);
        timestamp.setMinutes(now.getMinutes() - (9 - i)); // Start 9 minutes ago
        return timestamp.getTime();
      });

      // Create daily entries with sequential timestamps
      const dailyEntries: DailyWIPEntry[] = [
        // Tax Prep Entries - first 3 timestamps
        ...TAX_PREP_DESCRIPTIONS.map((desc, i) => ({
          id: Date.now() + i + 2,
          client: taxPrepWIP.client,
          project: taxPrepWIP.project,
          timeInMinutes: 1,
          hours: 1/60,
          partner: taxPrepWIP.partner,
          hourlyRate: taxPrepWIP.hourlyRate,
          description: desc.substring(2), // Remove bullet point
          startDate: timestamps[i],
          lastWorkedDate: timestamps[i],
          associatedDailyIds: [],
          subEntries: []
        })),
        // Tax Research Entries - remaining timestamps
        ...TAX_RESEARCH_DESCRIPTIONS.map((desc, i) => ({
          id: Date.now() + i + 5,
          client: taxResearchWIP.client,
          project: taxResearchWIP.project,
          timeInMinutes: 1,
          hours: 1/60,
          partner: taxResearchWIP.partner,
          hourlyRate: taxResearchWIP.hourlyRate,
          description: desc.substring(2), // Remove bullet point
          startDate: timestamps[i + 3], // Start after Tax Prep entries
          lastWorkedDate: timestamps[i + 3],
          associatedDailyIds: [],
          subEntries: []
        }))
      ];

      // Sort entries by timestamp in descending order (newest first)
      dailyEntries.sort((a, b) => b.startDate - a.startDate);

      // Add daily entries
      for (const entry of dailyEntries) {
        await useDailyLogs.getState().addLog(entry);
      }

      console.log('✅ Demo data loaded successfully');
      console.log('Created entries with timestamps:', dailyEntries.map(e => new Date(e.startDate).toLocaleTimeString()));
      return true;
    } catch (error) {
      console.error('❌ Failed to load demo data:', error);
      return false;
    }
  }
}; 