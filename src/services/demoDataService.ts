import type { WIPEntry as DailyWIPEntry } from "@/src/types";
import type { WIPEntry as StoreWIPEntry } from "@/src/store/wipStore";
import { useDailyLogs } from "@/src/store/dailyLogs";
import { useWIPStore } from "@/src/store/wipStore";

// Helper to generate timestamps within the last hour
const getRecentTimestamp = (minutesAgo: number) => {
  const now = Date.now();
  return now - (minutesAgo * 60 * 1000);
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

      // Create daily entries
      const dailyEntries: DailyWIPEntry[] = [
        // Tax Prep Entries
        ...TAX_PREP_DESCRIPTIONS.map((desc, i) => ({
          id: Date.now() + i + 2,
          client: taxPrepWIP.client,
          project: taxPrepWIP.project,
          timeInMinutes: 1,
          hours: 1/60,
          partner: taxPrepWIP.partner,
          hourlyRate: taxPrepWIP.hourlyRate,
          description: desc.substring(2), // Remove bullet point
          startDate: getRecentTimestamp(60 - i),
          lastWorkedDate: getRecentTimestamp(60 - i),
          associatedDailyIds: [],
          subEntries: []
        })),
        // Tax Research Entries
        ...TAX_RESEARCH_DESCRIPTIONS.map((desc, i) => ({
          id: Date.now() + i + 5,
          client: taxResearchWIP.client,
          project: taxResearchWIP.project,
          timeInMinutes: 1,
          hours: 1/60,
          partner: taxResearchWIP.partner,
          hourlyRate: taxResearchWIP.hourlyRate,
          description: desc.substring(2), // Remove bullet point
          startDate: getRecentTimestamp(30 - i),
          lastWorkedDate: getRecentTimestamp(30 - i),
          associatedDailyIds: [],
          subEntries: []
        }))
      ];

      // Add daily entries
      for (const entry of dailyEntries) {
        await useDailyLogs.getState().addLog(entry);
      }

      console.log('✅ Demo data loaded successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to load demo data:', error);
      return false;
    }
  }
}; 