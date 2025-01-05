import { createClient } from '@supabase/supabase-js';
import { upsertWIPEntry, getWIPEntries, updateWIPEntry, deleteWIPEntry } from '../wipEntryService';
import { WIPEntry } from '@/src/types';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';

// Mock Supabase client
jest.mock('@supabase/supabase-js', () => {
  const mockSupabaseClient = {
    from: jest.fn(() => ({
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(() => Promise.resolve({ data: mockEntry, error: null }))
        }))
      })),
      select: jest.fn(() => ({
        order: jest.fn(() => Promise.resolve({ data: [mockEntry], error: null }))
      })),
      delete: jest.fn(() => ({
        match: jest.fn(() => Promise.resolve({ error: null }))
      })),
      update: jest.fn(() => ({
        match: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => Promise.resolve({ data: mockEntry, error: null }))
          }))
        }))
      }))
    }))
  };

  return {
    createClient: jest.fn(() => mockSupabaseClient)
  };
});

const mockEntry: WIPEntry = {
  id: '123',
  description: 'Test entry',
  time_in_minutes: 30,
  hourly_rate: 150,
  date: new Date().toISOString(),
  client_id: 'client123',
  client_name: 'Test Client',
  client_address: '123 Test St',
  project_name: 'Test Project'
};

describe('WIP Entry Service', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient = (createClient as jest.Mock)();
  });

  describe('upsertWIPEntry', () => {
    it('should create a new entry successfully', async () => {
      const result = await upsertWIPEntry(mockEntry);
      expect(result).toEqual(mockEntry);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wip_entries');
    });

    it('should handle errors when creating entry', async () => {
      const mockError = new Error('Failed to create entry');
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        upsert: () => ({
          select: () => ({
            single: () => Promise.reject(mockError)
          })
        })
      }));

      await expect(upsertWIPEntry(mockEntry)).rejects.toThrow();
    });
  });

  describe('getWIPEntries', () => {
    it('should fetch entries successfully', async () => {
      const entries = await getWIPEntries();
      expect(entries).toEqual([mockEntry]);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wip_entries');
    });

    it('should handle errors when fetching entries', async () => {
      const mockError = new Error('Failed to fetch entries');
      mockSupabaseClient.from.mockImplementationOnce(() => ({
        select: () => ({
          order: () => Promise.reject(mockError)
        })
      }));

      await expect(getWIPEntries()).rejects.toThrow();
    });
  });

  describe('updateWIPEntry', () => {
    it('should update an entry successfully', async () => {
      const updates = {
        description: 'Updated description',
        time_in_minutes: 45
      };

      const result = await updateWIPEntry(mockEntry.id, updates);
      expect(result).toEqual(mockEntry);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wip_entries');
    });
  });

  describe('deleteWIPEntry', () => {
    it('should delete an entry successfully', async () => {
      await expect(deleteWIPEntry(mockEntry.id)).resolves.not.toThrow();
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('wip_entries');
    });
  });
}); 