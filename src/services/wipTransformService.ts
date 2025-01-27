import { WIPEntry } from '@/src/types';
import { useDailyLogs } from '@/src/store/dailyLogs';

export const wipTransformService = {
  /**
   * Aggregates daily log entries into a summarized WIP description
   */
  aggregateDescriptions(entries: WIPEntry[]): string {
    // Group similar descriptions and count occurrences
    const descriptionGroups = new Map<string, number>();
    
    entries.forEach(entry => {
      const desc = entry.description.trim();
      descriptionGroups.set(desc, (descriptionGroups.get(desc) || 0) + 1);
    });

    // Convert to bullet points, with frequency if multiple occurrences
    const bulletPoints = Array.from(descriptionGroups.entries())
      .map(([desc, count]) => {
        const prefix = count > 1 ? `(${count}x) ` : '';
        return `• ${prefix}${desc}`;
      })
      .join('\n');

    return bulletPoints;
  },

  /**
   * Gets all daily entries for a client/project and transforms them into a WIP description
   */
  getDailyEntriesDescription(client: string, project?: string): string {
    const dailyLogs = useDailyLogs.getState().logs;
    
    const matchingEntries = dailyLogs.filter(entry => 
      entry.client === client && 
      (!project || entry.project === project)
    );

    return this.aggregateDescriptions(matchingEntries);
  }
}; 