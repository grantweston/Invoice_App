import { isSameClient, isSameProject, shouldEntriesBeMerged, findRelatedEntries, compareDescriptions, mergeEntryGroup } from '../intelligentAggregationService';
import type { WIPEntry } from '@/src/services/supabaseDB';

// Only mock Gemini if no API key is available
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  jest.mock('@/src/integrations/gemini/geminiService');
}

describe('intelligentAggregationService', () => {
  jest.setTimeout(30000);

  describe('isSameClient', () => {
    it('should return true for exact matches', async () => {
      const result = await isSameClient('Acme Corp', 'Acme Corp');
      expect(result).toBe(true);
    });

    it('should return true for similar names', async () => {
      const result = await isSameClient('Acme Corporation', 'ACME Corp.');
      expect(result).toBe(true);
    });

    it('should return false for different names', async () => {
      const result = await isSameClient('Acme Corp', 'Beta Industries');
      expect(result).toBe(false);
    });

    it('should return true when one client is Unknown', async () => {
      const result = await isSameClient('Unknown', 'Acme Corp');
      expect(result).toBe(true);
    });
  });

  describe('isSameProject', () => {
    it('should return true for exact matches', async () => {
      const result = await isSameProject('Tax Return 2024', 'Tax Return 2024');
      expect(result).toBe(true);
    });

    it('should return true for similar project names', async () => {
      const result = await isSameProject('Tax Return Preparation', 'Tax Return Prep');
      expect(result).toBe(true);
    });

    it('should return false for different project names', async () => {
      const result = await isSameProject('Tax Return 2024', 'Bookkeeping Q1');
      expect(result).toBe(false);
    });
  });

  describe('compareDescriptions', () => {
    it('should combine related descriptions', async () => {
      const result = await compareDescriptions(
        'Started tax return preparation',
        'Completed Schedule C calculations'
      );

      expect(result.shouldUpdate).toBe(true);
      expect(result.updatedDescription).toContain('tax return');
      expect(result.updatedDescription).toContain('Schedule C');
    });

    it('should not update description when tasks are same, even if one is more detailed', async () => {
      const result = await compareDescriptions(
        'Quick review of Q3 statements',
        'Detailed review of Q3 financial statements including reconciliation'
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.updatedDescription).toBe('Quick review of Q3 statements');
    });
  });

  describe('shouldEntriesBeMerged', () => {
    const baseEntry: WIPEntry = {
      id: '1',
      client_name: 'Tech Corp',
      project_name: 'Database Migration',
      description: 'Initial database schema setup',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: new Date().toISOString(),
      client_id: 'client1',
      client_address: '123 Tech St',
      partner: 'Test Partner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should merge similar entries', async () => {
      const entry1 = { ...baseEntry };
      const entry2 = {
        ...baseEntry,
        id: '2',
        description: 'Database indexing and optimization',
        time_in_minutes: 45
      };

      const result = await shouldEntriesBeMerged(entry1, entry2);
      expect(result.shouldMerge).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should not merge unrelated entries', async () => {
      const entry1 = { ...baseEntry };
      const entry2 = {
        ...baseEntry,
        id: '2',
        client_name: 'Different Corp',
        project_name: 'Website Development',
        description: 'Frontend UI implementation'
      };

      const result = await shouldEntriesBeMerged(entry1, entry2);
      expect(result.shouldMerge).toBe(false);
    });
  });

  describe('mergeEntryGroup', () => {
    const baseEntry: WIPEntry = {
      id: '1',
      client_name: 'Tech Corp',
      project_name: 'Database Migration',
      description: 'Initial schema design',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: new Date().toISOString(),
      client_id: 'client1',
      client_address: '123 Tech St',
      partner: 'Test Partner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should merge multiple related entries', async () => {
      const entries = [
        { ...baseEntry },
        {
          ...baseEntry,
          id: '2',
          description: 'Database indexing implementation',
          time_in_minutes: 45
        },
        {
          ...baseEntry,
          id: '3',
          description: 'Performance optimization and testing',
          time_in_minutes: 60
        }
      ];

      const result = await mergeEntryGroup(entries);
      expect(result.time_in_minutes).toBe(135); // 30 + 45 + 60
      expect(result.description).toContain('schema');
      expect(result.description).toContain('indexing');
      expect(result.description).toContain('optimization');
    });

    it('should prefer non-Unknown client info', async () => {
      const entries = [
        { ...baseEntry, client_name: 'Unknown', client_id: '', client_address: '' },
        { ...baseEntry, id: '2', description: 'Additional work' }
      ];

      const result = await mergeEntryGroup(entries);
      expect(result.client_name).toBe('Tech Corp');
      expect(result.client_id).toBe('client1');
      expect(result.client_address).toBe('123 Tech St');
    });
  });
}); 