import { processScreenActivity } from '../screenActivityProcessor';
import { getOrCreateUnknownClient } from '@/src/services/supabaseDB';
import { shouldEntriesBeMerged } from '../intelligentAggregationService';

// Mock crypto for consistent IDs in tests
const mockRandomUUID = jest.fn(() => 'test-uuid');
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: mockRandomUUID }
});

// Mock localStorage
const mockStorage: { [key: string]: string } = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => mockStorage[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach(key => delete mockStorage[key]);
  }),
  length: 0,
  key: jest.fn(),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
  })
} as Storage;

// Assign to global
Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

// Mock the client creation function
jest.mock('@/src/services/supabaseDB', () => ({
  getOrCreateUnknownClient: jest.fn().mockResolvedValue({
    id: 'test-client-id',
    name: 'Unknown',
    address: 'N/A'
  })
}));

// Mock the similarity check function
jest.mock('../intelligentAggregationService', () => ({
  shouldEntriesBeMerged: jest.fn().mockResolvedValue({ shouldMerge: false, confidence: 0 })
}));

describe('processScreenActivity', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  it('should use partner name from settings', async () => {
    // Setup mock settings
    mockLocalStorage.setItem('userSettings', JSON.stringify({
      userName: 'Test Partner'
    }));

    const analysis = {
      client_name: 'Unknown',
      project_name: 'Test Project',
      activity_description: 'Test activity',
      confidence_score: 0.8
    };

    const result = await processScreenActivity(analysis);
    expect(result.partner).toBe('Test Partner');
  });

  it('should use "Unknown" as partner when settings are missing', async () => {
    mockLocalStorage.removeItem('userSettings');

    const analysis = {
      client_name: 'Unknown',
      project_name: 'Test Project',
      activity_description: 'Test activity',
      confidence_score: 0.8
    };

    const result = await processScreenActivity(analysis);
    expect(result.partner).toBe('Unknown');
  });

  it('should standardize bullet points in description', async () => {
    const analysis = {
      client_name: 'Unknown',
      project_name: 'Test Project',
      activity_description: 'First line\n• Second line\n- Third line\n* Fourth line',
      confidence_score: 0.8
    };

    const result = await processScreenActivity(analysis);
    expect(result.description).toBe('- First line\n- Second line\n- Third line\n- Fourth line');
  });

  it('should use project name from analysis', async () => {
    const analysis = {
      client_name: 'Unknown',
      project_name: 'Custom Project Name',
      activity_description: 'Test activity',
      confidence_score: 0.8
    };

    const result = await processScreenActivity(analysis);
    expect(result.project_name).toBe('Custom Project Name');
  });

  it('should use "General" as fallback project name', async () => {
    const analysis = {
      client_name: 'Unknown',
      project_name: '',
      activity_description: 'Test activity',
      confidence_score: 0.8
    };

    const result = await processScreenActivity(analysis);
    expect(result.project_name).toBe('General');
  });

  it('should merge similar entries and combine their descriptions', async () => {
    // Mock similarity check to return true
    (shouldEntriesBeMerged as jest.Mock).mockResolvedValueOnce({ 
      shouldMerge: true, 
      confidence: 0.8 
    });

    const analysis = {
      client_name: 'Unknown',
      project_name: 'Test Project',
      activity_description: '- New activity',
      confidence_score: 0.8
    };

    const existingEntries = [{
      id: 'existing-id',
      client_name: 'Unknown',
      client_id: 'test-client-id',
      project_name: 'Test Project',
      description: '- Existing activity',
      time_in_minutes: 5,
      hourly_rate: 150,
      date: new Date().toISOString(),
      client_address: 'N/A',
      partner: 'Unknown',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }];

    const result = await processScreenActivity(analysis, existingEntries);
    expect(result.time_in_minutes).toBe(6); // 5 + 1
    expect(result.description).toContain('Existing activity');
    expect(result.description).toContain('New activity');
  });

  it('should use hourly rate from settings', async () => {
    mockLocalStorage.setItem('userSettings', JSON.stringify({
      userName: 'Test Partner',
      defaultRate: 200
    }));

    const analysis = {
      client_name: 'Unknown',
      project_name: 'Test Project',
      activity_description: 'Test activity',
      confidence_score: 0.8
    };

    const result = await processScreenActivity(analysis);
    expect(result.hourly_rate).toBe(200);
  });

  it('should use fallback rate when settings are missing', async () => {
    mockLocalStorage.removeItem('userSettings');

    const analysis = {
      client_name: 'Unknown',
      project_name: 'Test Project',
      activity_description: 'Test activity',
      confidence_score: 0.8
    };

    const result = await processScreenActivity(analysis);
    expect(result.hourly_rate).toBe(150);
  });
}); 