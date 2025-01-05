import { isSameClient, isSameProject, shouldEntriesBeMerged, findRelatedEntries, compareDescriptions } from '../intelligentAggregationService';
import * as GeminiService from '@/src/integrations/gemini/geminiService';
import { WIPEntry } from '@/src/types';

jest.mock('@/src/integrations/gemini/geminiService', () => ({
  analyze: jest.fn()
}));

describe('intelligentAggregationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('isSameClient', () => {
    it('should return true for exact matches', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue('true');

      const result = await isSameClient('Client A', 'Client A');
      expect(result).toBe(true);
      expect(mockAnalyze).toHaveBeenCalled();
    });

    it('should return true for similar names', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue('true');

      const result = await isSameClient('Client A Inc', 'Client A Corporation');
      expect(result).toBe(true);
      expect(mockAnalyze).toHaveBeenCalled();
    });

    it('should return false for different names', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue('false');

      const result = await isSameClient('Client A', 'Client B');
      expect(result).toBe(false);
      expect(mockAnalyze).toHaveBeenCalled();
    });

    it('should return true when one client is Unknown', async () => {
      const result = await isSameClient('Unknown', 'Client A');
      expect(result).toBe(true);
    });
  });

  describe('isSameProject', () => {
    it('should return true for exact matches', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue('true');

      const result = await isSameProject('Project X', 'Project X');
      expect(result).toBe(true);
      expect(mockAnalyze).toHaveBeenCalled();
    });

    it('should return true for similar project names', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue('true');

      const result = await isSameProject('Project X Development', 'Project X Dev');
      expect(result).toBe(true);
      expect(mockAnalyze).toHaveBeenCalled();
    });

    it('should return false for different project names', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue('false');

      const result = await isSameProject('Project X', 'Project Y');
      expect(result).toBe(false);
      expect(mockAnalyze).toHaveBeenCalled();
    });

    it('should handle empty project names', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue('false');

      const result = await isSameProject('', '');
      expect(result).toBe(false);
      expect(mockAnalyze).toHaveBeenCalled();
    });
  });

  describe('shouldEntriesBeMerged', () => {
    const baseEntry: WIPEntry = {
      id: '1',
      client_name: 'Test Client',
      project_name: 'Test Project',
      description: 'Test description',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: new Date().toISOString(),
      client_id: 'client1',
      client_address: '',
      partner: 'Test Partner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should merge entries with same client and project', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValueOnce('true')  // isSameClient
        .mockResolvedValueOnce('true')  // isSameProject
        .mockResolvedValueOnce('{"shouldCombine": true, "combinedDescription": "Combined desc", "explanation": "test"}');  // compareDescriptions

      const entry1 = { ...baseEntry };
      const entry2 = { ...baseEntry, id: '2', description: 'Another description' };

      const result = await shouldEntriesBeMerged(entry1, entry2);
      expect(result.shouldMerge).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should not merge entries with different clients', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValueOnce('false')  // isSameClient
        .mockResolvedValueOnce('true')   // isSameProject
        .mockResolvedValueOnce('{"shouldCombine": true, "combinedDescription": "Combined desc", "explanation": "test"}');  // compareDescriptions

      const entry1 = { ...baseEntry };
      const entry2 = { ...baseEntry, id: '2', client_name: 'Different Client' };

      const result = await shouldEntriesBeMerged(entry1, entry2);
      expect(result.shouldMerge).toBe(false);
    });

    it('should merge entries with Unknown client', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValueOnce('true')  // isSameProject
        .mockResolvedValueOnce('{"shouldCombine": true, "combinedDescription": "Combined desc", "explanation": "test"}');  // compareDescriptions

      const entry1 = { ...baseEntry, client_name: 'Unknown' };
      const entry2 = { ...baseEntry, id: '2', client_name: 'Test Client' };

      const result = await shouldEntriesBeMerged(entry1, entry2);
      expect(result.shouldMerge).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should handle errors gracefully', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockRejectedValue(new Error('Test error'));

      const entry1 = { ...baseEntry };
      const entry2 = { ...baseEntry, id: '2' };

      const result = await shouldEntriesBeMerged(entry1, entry2);
      expect(result.shouldMerge).toBe(false);
      expect(result.confidence).toBe(0);
    });
  });

  describe('findRelatedEntries', () => {
    const baseEntry: WIPEntry = {
      id: '1',
      client_name: 'Test Client',
      project_name: 'Test Project',
      description: 'Test description',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: new Date().toISOString(),
      client_id: 'client1',
      client_address: '',
      partner: 'Test Partner',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    it('should group related entries together', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockImplementation((prompt) => {
          if (prompt.includes('Test Client') && prompt.includes('Different Client')) {
            return Promise.resolve(JSON.stringify({
              areSimilar: false,
              explanation: 'Different companies'
            }));
          }
          return Promise.resolve(JSON.stringify({
            areSimilar: true,
            explanation: 'Same company'
          }));
        });

      const entries = [
        {
          id: '1',
          client_name: 'Test Client',
          client_id: 'client1',
          project_name: 'Test Project',
          description: 'First task',
          time_in_minutes: 30,
          hourly_rate: 150,
          partner: 'Test Partner',
          client_address: '',
          created_at: '2025-01-05T12:21:04.419Z',
          updated_at: '2025-01-05T12:21:04.419Z',
          date: '2025-01-05T12:21:04.419Z'
        },
        {
          id: '2',
          client_name: 'Test Client',
          client_id: 'client1',
          project_name: 'Test Project',
          description: 'Second task',
          time_in_minutes: 30,
          hourly_rate: 150,
          partner: 'Test Partner',
          client_address: '',
          created_at: '2025-01-05T12:21:04.419Z',
          updated_at: '2025-01-05T12:21:04.419Z',
          date: '2025-01-05T12:21:04.419Z'
        },
        {
          id: '3',
          client_name: 'Different Client',
          client_id: 'client1',
          project_name: 'Test Project',
          description: 'Different client task',
          time_in_minutes: 30,
          hourly_rate: 150,
          partner: 'Test Partner',
          client_address: '',
          created_at: '2025-01-05T12:21:04.419Z',
          updated_at: '2025-01-05T12:21:04.419Z',
          date: '2025-01-05T12:21:04.419Z'
        }
      ];

      const groups = await findRelatedEntries(entries);
      expect(groups).toHaveLength(2);  // Two groups: one for Test Client, one for Different Client
      expect(groups[0]).toHaveLength(2);  // First group has two entries
      expect(groups[1]).toHaveLength(1);  // Second group has one entry
    });

    it('should handle empty input', async () => {
      const groups = await findRelatedEntries([]);
      expect(groups).toHaveLength(0);
    });

    it('should handle single entry', async () => {
      const groups = await findRelatedEntries([baseEntry]);
      expect(groups).toHaveLength(1);
      expect(groups[0]).toHaveLength(1);
      expect(groups[0][0]).toEqual(baseEntry);
    });

    it('should handle errors gracefully', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockRejectedValue(new Error('Test error'));

      const entries = [
        { ...baseEntry, id: '1' },
        { ...baseEntry, id: '2' }
      ];

      const groups = await findRelatedEntries(entries);
      expect(groups).toHaveLength(2);  // Each entry in its own group due to error
    });
  });

  describe('compareDescriptions', () => {
    it('should combine related descriptions', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue(JSON.stringify({
          shouldCombine: true,
          combinedDescription: 'Combined description',
          explanation: 'Related tasks',
          areSameTask: false
        }));

      const result = await compareDescriptions(
        'Started tax return',
        'Completed Schedule C'
      );

      expect(result.shouldUpdate).toBe(true);
      expect(result.updatedDescription).toBe('Combined description');
    });

    it('should not combine unrelated descriptions', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue(JSON.stringify({
          shouldCombine: false,
          explanation: 'Different tasks',
          areSameTask: false
        }));

      const result = await compareDescriptions(
        'Client meeting',
        'Code review'
      );

      expect(result.shouldUpdate).toBe(false);
    });

    it('should handle same task with different wording', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue(JSON.stringify({
          shouldCombine: true,
          combinedDescription: 'Started tax return',
          explanation: 'Same task',
          areSameTask: true
        }));

      const result = await compareDescriptions(
        'Started tax return',
        'Beginning tax return preparation'
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.updatedDescription).toBe('Beginning tax return preparation');
    });

    it('should handle invalid JSON response', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockResolvedValue('Invalid JSON');

      const result = await compareDescriptions(
        'Description 1',
        'Description 2'
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.explanation).toBe('Error during analysis');
    });

    it('should handle API errors', async () => {
      const mockAnalyze = jest.spyOn(GeminiService, 'analyze')
        .mockRejectedValue(new Error('API error'));

      const result = await compareDescriptions(
        'Description 1',
        'Description 2'
      );

      expect(result.shouldUpdate).toBe(false);
      expect(result.explanation).toBe('Error during analysis');
    });
  });
}); 