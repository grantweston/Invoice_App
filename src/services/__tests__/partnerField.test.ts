import { createWIPEntry, getWIPEntries } from '../supabaseDB';
import type { WIPEntry } from '../supabaseDB';
import { processScreenActivity } from '@/src/backend/services/screenActivityProcessor';
import type { ScreenAnalysis } from '../screenAnalysisService';

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'test-supabase-url';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock the active partner store
jest.mock('@/src/store/activePartner', () => ({
  useActivePartner: jest.fn()
}));

// Mock screen activity processor
jest.mock('@/src/backend/services/screenActivityProcessor', () => ({
  processScreenActivity: jest.fn().mockImplementation(async () => {
    const now = new Date().toISOString();
    return {
      id: 'test-id-' + Date.now(),
      client_id: 'unknown',
      client_name: 'Test Client',
      client_address: '',
      project_name: 'Test Project',
      description: 'Test description',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: now,
      partner: 'Test Partner',
      created_at: now,
      updated_at: now
    } as WIPEntry;
  })
}));

// Mock the Supabase client
jest.mock('@/src/lib/supabase', () => {
  let mockEntries: WIPEntry[] = [];
  return {
    supabase: {
      from: jest.fn(() => ({
        insert: jest.fn().mockImplementation((entries: WIPEntry[]) => {
          const newEntry = entries[0];
          let updatedEntry: WIPEntry;
          // Replace existing entry if ID matches, otherwise add new entry
          const existingIndex = mockEntries.findIndex(e => e.id === newEntry.id);
          if (existingIndex !== -1) {
            // Create a new object with only the properties that are explicitly set in the new entry
            updatedEntry = { ...mockEntries[existingIndex] };
            Object.keys(newEntry).forEach(key => {
              if (newEntry[key] !== undefined) {
                updatedEntry[key] = newEntry[key];
              }
            });
            mockEntries[existingIndex] = updatedEntry;
          } else {
            updatedEntry = { ...newEntry };
            mockEntries.push(updatedEntry);
          }
          return {
            select: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({ data: updatedEntry, error: null })
          };
        }),
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(callback => {
          return Promise.resolve(callback({ data: mockEntries }));
        })
      })),
      mockEntries,
      __setMockEntries: (entries: WIPEntry[]) => {
        mockEntries = entries;
      }
    }
  };
});

// Import after mocks
import { useActivePartner } from '@/src/store/activePartner';

describe('Partner Field Tests', () => {
  beforeEach(() => {
    // Clear mock entries before each test
    require('@/src/lib/supabase').supabase.__setMockEntries([]);
    // Reset all mocks
    jest.clearAllMocks();
    // Set default mock implementation
    ((useActivePartner as unknown) as jest.Mock).mockImplementation(() => ({
      activePartner: 'Test Partner',
      setActivePartner: jest.fn()
    }));
  });

  test('new WIP entry should use active partner from settings', async () => {
    const now = new Date().toISOString();
    const entry: WIPEntry = {
      id: 'test-id-' + Date.now(),
      client_id: 'unknown',
      client_name: 'Test Client',
      client_address: '',
      project_name: 'Test Project',
      description: 'Test description',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: now,
      partner: useActivePartner().activePartner,
      created_at: now,
      updated_at: now
    };

    const createdEntry = await createWIPEntry(entry);
    expect(createdEntry.partner).toBe('Test Partner');
  });

  test('updating WIP entry should preserve partner field', async () => {
    const now = new Date().toISOString();
    // First create an entry
    const initialEntry: WIPEntry = {
      id: 'test-id-' + Date.now(),
      client_id: 'unknown',
      client_name: 'Test Client',
      client_address: '',
      project_name: 'Test Project',
      description: 'Initial description',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: now,
      partner: 'Original Partner',
      created_at: now,
      updated_at: now
    };

    await createWIPEntry(initialEntry);

    // Create updated entry
    const updatedEntry: WIPEntry = {
      ...initialEntry,
      description: 'Updated description',
      updated_at: new Date().toISOString()
    };

    const result = await createWIPEntry(updatedEntry);
    expect(result.partner).toBe('Original Partner');
  });

  test('screen activity processing should use active partner', async () => {
    const screenData = {
      client_name: 'Test Client',
      project_name: 'Test Project',
      activity_description: 'Test activity',
      confidence_score: 0.9,
      screenshots: ['base64-encoded-screenshot'],
      timestamp: new Date().toISOString()
    } as ScreenAnalysis;

    const processedEntry = await processScreenActivity(screenData);
    expect(processedEntry.partner).toBe('Test Partner');
  });

  test('partner field should default to Unknown if not specified', async () => {
    const now = new Date().toISOString();
    const entry: WIPEntry = {
      id: 'test-id-' + Date.now(),
      client_id: 'unknown',
      client_name: 'Test Client',
      client_address: '',
      project_name: 'Test Project',
      description: 'Test description',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: now,
      partner: 'Unknown',
      created_at: now,
      updated_at: now
    };

    const createdEntry = await createWIPEntry(entry);
    expect(createdEntry.partner).toBe('Unknown');
  });

  test('changing active partner should affect new entries but not existing ones', async () => {
    const now = new Date().toISOString();
    // Create initial entry
    const initialEntry: WIPEntry = {
      id: 'test-initial-' + Date.now(),
      client_id: 'unknown',
      client_name: 'Test Client',
      client_address: '',
      project_name: 'Test Project',
      description: 'Test description',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: now,
      partner: 'Initial Partner',
      created_at: now,
      updated_at: now
    };

    await createWIPEntry(initialEntry);

    // Mock partner change
    ((useActivePartner as unknown) as jest.Mock).mockImplementation(() => ({
      activePartner: 'New Partner',
      setActivePartner: jest.fn()
    }));

    // Create new entry after partner change
    const newEntry: WIPEntry = {
      id: 'test-new-' + Date.now(),
      client_id: 'unknown',
      client_name: 'Test Client 2',
      client_address: '',
      project_name: 'Test Project 2',
      description: 'Test description 2',
      time_in_minutes: 45,
      hourly_rate: 150,
      date: now,
      partner: useActivePartner().activePartner,
      created_at: now,
      updated_at: now
    };

    await createWIPEntry(newEntry);

    // Get all entries
    const entries = await getWIPEntries();
    
    // Check that initial entry partner is unchanged
    const foundInitialEntry = entries.find(e => e.id === initialEntry.id);
    expect(foundInitialEntry?.partner).toBe('Initial Partner');
    
    // Check that new entry uses new partner
    const foundNewEntry = entries.find(e => e.id === newEntry.id);
    expect(foundNewEntry?.partner).toBe('New Partner');
  });
}); 