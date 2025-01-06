import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
import PageClient from '../page-client';
import { upsertWIPEntry, getWIPEntries, updateWIPEntry } from '@/src/services/wipEntryService';
import { ClientScreenRecorder } from '@/src/services/clientScreenRecorder';

// Mock environment variables before importing modules
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:3000';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
process.env.GEMINI_API_KEY = 'test-gemini-key';

// Mock the services
jest.mock('@/src/services/wipEntryService', () => ({
  upsertWIPEntry: jest.fn(),
  getWIPEntries: jest.fn(),
  updateWIPEntry: jest.fn(),
  deleteWIPEntry: jest.fn()
}));

// Mock Gemini service
jest.mock('@/src/integrations/gemini/geminiService', () => ({
  analyze: jest.fn().mockResolvedValue('true'),
  analyzeJson: jest.fn().mockImplementation((prompt) => {
    // For client comparison
    if (prompt.includes('Client 1') && prompt.includes('Client 2')) {
      const client1 = prompt.match(/Client 1: "([^"]+)"/)?.[1];
      const client2 = prompt.match(/Client 2: "([^"]+)"/)?.[1];
      
      // Handle Unknown client case
      if (client1 === 'Unknown' || client2 === 'Unknown') {
        return Promise.resolve({
          isMatch: true,
          confidence: 0.75,
          explanation: "Project patterns suggest same client",
          patterns: [
            "Similar project structure",
            "Consistent terminology"
          ]
        });
      }
      
      // Handle normal client comparison
      const isMatch = client1 === client2;
      return Promise.resolve({
        isMatch,
        confidence: isMatch ? 0.9 : 0.3,
        explanation: isMatch ? "Exact match" : "Different clients",
        patterns: []
      });
    }
    
    // For description comparison
    if (prompt.includes('Description 1') && prompt.includes('Description 2')) {
      return Promise.resolve({
        shouldCombine: true,
        hasNewInfo: true,
        combinedDescription: "Combined description with optimization and indexing",
        explanation: "Descriptions show progress",
        areSameTask: false
      });
    }
    
    return Promise.resolve({
      isMatch: true,
      confidence: 0.9,
      explanation: "Mock response",
      patterns: []
    });
  })
}));

jest.mock('@/src/services/clientScreenRecorder');

jest.mock('@/src/store/dailyLogs', () => ({
  useDailyLogs: () => ({
    addLog: jest.fn()
  })
}));

jest.mock('@/src/store/recordingState', () => ({
  useRecordingState: () => ({
    isRecording: false,
    setIsRecording: jest.fn()
  })
}));

// Mock WIPTable component
jest.mock('../components/WIPTable', () => {
  return function MockWIPTable({ entries }: { entries: any[] }) {
    return <div data-testid="wip-table">{entries.length} entries</div>;
  };
});

// Mock WorkSessionButton component
jest.mock('../components/WorkSessionButton', () => {
  return function MockWorkSessionButton({ onStart }: { onStart: () => Promise<void> }) {
    return (
      <button data-testid="start-button" onClick={() => onStart()}>Begin Work Session</button>
    );
  };
});

const mockScreenAnalysis = {
  client_name: 'Test Client',
  project_name: 'Test Project',
  activity_description: 'Working on tests',
  hourlyRate: 150,
  confidence_score: 0.9
};

describe('PageClient', () => {
  let mockStartRecording: jest.Mock;
  let mockStopRecording: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockStartRecording = jest.fn((callback) => {
      setTimeout(() => {
        callback(['screenshot1']);
      }, 0);
      return Promise.resolve();
    });
    mockStopRecording = jest.fn();

    // Setup ClientScreenRecorder mock implementation
    (ClientScreenRecorder as jest.Mock).mockImplementation(() => ({
      startRecording: mockStartRecording,
      stopRecording: mockStopRecording
    }));

    (getWIPEntries as jest.Mock).mockResolvedValue([]);
    (upsertWIPEntry as jest.Mock).mockImplementation(entry => Promise.resolve(entry));

    // Mock fetch globally
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockScreenAnalysis)
      })
    ) as jest.Mock;
  });

  it('should load WIP entries on mount', async () => {
    const mockEntries = [
      {
        id: '1',
        description: 'Test entry',
        time_in_minutes: 30,
        hourly_rate: 150,
        client_id: 'client1',
        client_name: 'Test Client',
        date: new Date().toISOString()
      }
    ];

    (getWIPEntries as jest.Mock).mockResolvedValue(mockEntries);

    await act(async () => {
      render(<PageClient />);
    });

    await waitFor(() => {
      expect(getWIPEntries).toHaveBeenCalled();
    });
  });

  it('should start recording when start button is clicked', async () => {
    await act(async () => {
      render(<PageClient />);
    });

    const startButton = screen.getByTestId('start-button');
    
    await act(async () => {
      fireEvent.click(startButton);
      // Wait for any state updates
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(mockStartRecording).toHaveBeenCalled();
  });

  it('should create new entry when receiving screen analysis', async () => {
    await act(async () => {
      render(<PageClient />);
    });

    const startButton = screen.getByTestId('start-button');
    
    await act(async () => {
      fireEvent.click(startButton);
      // Wait for any state updates and async operations
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/analyze-screen', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.any(String)
      }));
    });

    await waitFor(() => {
      expect(upsertWIPEntry).toHaveBeenCalledWith(expect.objectContaining({
        client_name: 'Test Client',
        project_name: 'Test Project',
        description: 'Working on tests'
      }));
    });
  });

  it('should update existing entry when receiving matching screen analysis', async () => {
    const existingEntry = {
      id: '1',
      client_name: 'Test Client',
      project_name: 'Test Project',
      time_in_minutes: 30,
      description: 'Initial work',
      date: new Date().toISOString(),
      client_id: 'client1',
      hourly_rate: 150
    };

    (getWIPEntries as jest.Mock).mockResolvedValue([existingEntry]);

    await act(async () => {
      render(<PageClient />);
    });

    // Wait for initial load
    await waitFor(() => {
      expect(getWIPEntries).toHaveBeenCalled();
    });

    const startButton = screen.getByTestId('start-button');
    
    await act(async () => {
      fireEvent.click(startButton);
      // Wait for any state updates and async operations
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    await waitFor(() => {
      expect(updateWIPEntry).toHaveBeenCalledWith(
        existingEntry.id,
        expect.objectContaining({
          time_in_minutes: existingEntry.time_in_minutes + 1
        })
      );
    });
  });
}); 