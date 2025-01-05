import { analyzeScreenshots } from '../screenAnalysisService';
import { createWIPEntry, getWIPEntries } from '../supabaseDB';
import { processScreenActivity } from '@/src/backend/services/screenActivityProcessor';

// Mock environment variables
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'test-supabase-url';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';

// Mock the Supabase client
jest.mock('@/src/lib/supabase', () => {
  let mockEntries = [];
  
  return {
    supabase: {
      from: jest.fn(() => ({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ 
          data: { 
            id: 'test-id',
            client_name: 'Test Client',
            project_name: 'Invoice App Development',
            description: 'Test description',
            time_in_minutes: 60,
            hourly_rate: 150,
            date: new Date().toISOString(),
            client_id: 'test-client-id'
          } 
        }),
        order: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation(callback => {
          return Promise.resolve(callback({ data: mockEntries }));
        })
      })),
      mockEntries,
      __setMockEntries: (entries) => {
        mockEntries = entries;
      }
    },
  };
});

// Mock Gemini API
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            client_name: "Test Client",
            project_name: "Invoice App Development",
            activity_description: "• Working on feature implementation\n• Debugging database issues",
            detailed_description: "Implementing new features in the invoice app and fixing database connectivity issues",
            confidence_score: 0.9
          })
        }
      })
    })
  }))
}));

// Mock analyze function for intelligent comparison
jest.mock('@/src/integrations/gemini/geminiService', () => ({
  analyze: jest.fn().mockImplementation((prompt) => {
    // For client comparison
    if (prompt.includes('Compare these two client names')) {
      const client1 = prompt.match(/Client 1: "([^"]+)"/)?.[1];
      const client2 = prompt.match(/Client 2: "([^"]+)"/)?.[1];
      return Promise.resolve(
        client1 === client2 || 
        client1 === "Unknown" || 
        client2 === "Unknown" ? 
        "true" : "false"
      );
    }
    
    // For project comparison
    if (prompt.includes('Compare these two project names')) {
      const project1 = prompt.match(/Project 1: "([^"]+)"/)?.[1];
      const project2 = prompt.match(/Project 2: "([^"]+)"/)?.[1];
      
      // Consider projects similar if they share words or one is "General Work"
      const isGeneral = project2?.toLowerCase().includes('general') || project1?.toLowerCase().includes('general');
      const shareWords = project1?.toLowerCase().split(' ').some(word => 
        project2?.toLowerCase().split(' ').includes(word)
      );
      
      return Promise.resolve(
        project1 === project2 || 
        isGeneral || 
        shareWords ? 
        "true" : "false"
      );
    }
    
    // For description comparison
    if (prompt.includes('Compare these two work descriptions')) {
      const desc1 = prompt.match(/Description 1: "([^"]+)"/)?.[1];
      const desc2 = prompt.match(/Description 2: "([^"]+)"/)?.[1];
      
      // Consider descriptions similar if they share key words or are about the same topic
      const words1 = desc1?.toLowerCase().split(' ') || [];
      const words2 = desc2?.toLowerCase().split(' ') || [];
      
      // Check for topic similarity (e.g., both about database work)
      const topics = {
        database: ['database', 'db', 'sql', 'query', 'connection'],
        frontend: ['ui', 'interface', 'component', 'style', 'css'],
        backend: ['api', 'endpoint', 'server', 'route', 'controller'],
        testing: ['test', 'spec', 'coverage', 'assertion', 'mock']
      };
      
      const getTopics = (words: string[]) => 
        Object.entries(topics).filter(([_, keywords]) => 
          keywords.some(kw => words.some(w => w.includes(kw)))
        ).map(([topic]) => topic);
      
      const topics1 = getTopics(words1);
      const topics2 = getTopics(words2);
      const shareTopics = topics1.some(t => topics2.includes(t));
      
      // Check for word similarity
      const commonWords = words1.filter(word => words2.includes(word));
      const shareSufficientWords = commonWords.length > 1;
      
      return Promise.resolve(JSON.stringify({
        shouldCombine: shareTopics || shareSufficientWords,
        combinedDescription: `${desc1}, ${desc2}`,
        explanation: "Tasks are related",
        areSameTask: false
      }));
    }
    
    // Default response
    return Promise.resolve("false");
  })
}));

describe('Screen Recording to WIP Entry Flow', () => {
  const mockScreenshots = [
    'data:image/jpeg;base64,/9j/4AAQSkZJRg...', // Add some base64 test data
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mock entries
    require('@/src/lib/supabase').supabase.__setMockEntries([]);
  });

  test('should create a WIP entry from screen analysis', async () => {
    // 1. Analyze screenshots
    const analysis = await analyzeScreenshots(mockScreenshots);
    
    expect(analysis).toEqual(expect.objectContaining({
      client_name: expect.any(String),
      project_name: expect.any(String),
      activity_description: expect.any(String),
      confidence_score: expect.any(Number)
    }));

    // 2. Process the analysis into a WIP entry
    const wipEntry = await processScreenActivity(analysis);
    
    expect(wipEntry).toEqual(expect.objectContaining({
      id: expect.any(String),
      client_name: expect.any(String),
      project_name: expect.any(String),
      description: expect.any(String),
      time_in_minutes: expect.any(Number),
      hourly_rate: expect.any(Number),
      client_id: expect.any(String),
      date: expect.any(String)
    }));

    // 3. Create the entry in the database
    const createdEntry = await createWIPEntry(wipEntry);
    
    expect(createdEntry).toHaveProperty('id');
  });

  test('should handle missing client information gracefully', async () => {
    // Mock Gemini to return unknown client
    const mockAnalysis = {
      client_name: "Unknown",
      project_name: "General Development",
      activity_description: "• Coding and debugging",
      detailed_description: "Working on code implementation",
      confidence_score: 0.5
    };

    const wipEntry = await processScreenActivity(mockAnalysis);

    expect(wipEntry.client_name).toBe("Unknown");
    expect(wipEntry.hourly_rate).toBeDefined();
    expect(wipEntry.client_id).toBe('');
  });

  test('should aggregate similar activities within the same timeframe', async () => {
    // Set up mock entries
    require('@/src/lib/supabase').supabase.__setMockEntries([
      {
        id: 'test-id-1',
        client_name: 'Test Client',
        project_name: 'Invoice App Development',
        description: 'Initial work',
        time_in_minutes: 30,
        hourly_rate: 150,
        date: new Date().toISOString(),
        client_id: 'test-client-id'
      }
    ]);

    // Create two similar activities close in time
    const analysis1 = await analyzeScreenshots(mockScreenshots);
    const analysis2 = await analyzeScreenshots(mockScreenshots);

    const entry1 = await processScreenActivity(analysis1);
    const entry2 = await processScreenActivity(analysis2);

    // Get all entries and check if they were aggregated
    const allEntries = await getWIPEntries();
    
    expect(allEntries.length).toBeLessThanOrEqual(2);
  });

  test('should handle empty screenshots array', async () => {
    await expect(analyzeScreenshots([])).rejects.toThrow('No screenshots received');
  });

  test('should merge entries with similar descriptions', async () => {
    const existingEntries = [{
      id: 'test-id-1',
      client_name: 'Test Client',
      project_name: 'Invoice App Development',
      description: 'Working on database setup',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: new Date().toISOString(),
      client_id: 'test-client-id'
    }];

    const mockAnalysis = {
      client_name: "Test Client",
      project_name: "Invoice App Development",
      activity_description: "Configuring database connections",
      detailed_description: "Setting up database connections and testing connectivity",
      confidence_score: 0.9
    };

    const wipEntry = await processScreenActivity(mockAnalysis, existingEntries);
    expect(wipEntry.time_in_minutes).toBeGreaterThan(30); // Should include existing entry's time
    expect(wipEntry.description).toContain('database');
  });

  test('should preserve client information when merging entries', async () => {
    const existingEntries = [{
      id: 'test-id-1',
      client_name: 'Existing Client',
      project_name: 'Existing Project',
      description: 'Previous work',
      time_in_minutes: 30,
      hourly_rate: 150,
      date: new Date().toISOString(),
      client_id: 'existing-client-id',
      client_address: '123 Client St'
    }];

    const mockAnalysis = {
      client_name: "Unknown",
      project_name: "General Work",
      activity_description: "Similar work being done",
      detailed_description: "Continuing previous work",
      confidence_score: 0.8
    };

    const wipEntry = await processScreenActivity(mockAnalysis, existingEntries);
    expect(wipEntry.client_name).toBe('Existing Client');
    expect(wipEntry.client_id).toBe('existing-client-id');
    expect(wipEntry.client_address).toBe('123 Client St');
  });

  test('should handle malformed screenshot data', async () => {
    const badScreenshots = ['not-a-base64-image'];
    await expect(analyzeScreenshots(badScreenshots)).rejects.toThrow();
  });

  test('should maintain default values for optional fields', async () => {
    const mockAnalysis = {
      client_name: "Test Client",
      project_name: "Test Project",
      activity_description: "Basic work",
      detailed_description: "Some work being done",
      confidence_score: 0.7
    };

    const wipEntry = await processScreenActivity(mockAnalysis);
    expect(wipEntry).toEqual(expect.objectContaining({
      hourly_rate: expect.any(Number),
      category: 'Development',
      created_at: expect.any(String),
      updated_at: expect.any(String)
    }));
  });
}); 