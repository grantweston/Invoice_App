import { analyze, analyzeJson } from '@/src/integrations/gemini/geminiService';
import { analyzeScreenshots } from '../screenAnalysisService';
import { processScreenActivity } from '@/src/backend/services/screenActivityProcessor';
import { WIPEntry } from '@/src/services/supabaseDB';

// Only run these tests if GEMINI_API_KEY is available
const runTests = process.env.GEMINI_API_KEY ? describe : describe.skip;

runTests('Gemini Integration Tests', () => {
  jest.setTimeout(30000); // Increase timeout for API calls

  describe('Client Name Comparison', () => {
    test('should identify exact matches', async () => {
      const result = await analyze(
        'Compare these two client names:\nClient 1: "Acme Corp"\nClient 2: "Acme Corp"\nAre they the same client?'
      );
      expect(result.toLowerCase()).toContain('true');
    });

    test('should identify similar company names', async () => {
      const result = await analyze(
        'Compare these two client names and determine if they refer to the same company:\nClient 1: "Acme Corporation"\nClient 2: "ACME Corp."\nConsider common variations in company names, abbreviations, and capitalization. Are they the same client?'
      );
      expect(result.toLowerCase()).toContain('true');
    });

    test('should identify different companies', async () => {
      const result = await analyze(
        'Compare these two client names:\nClient 1: "Acme Corp"\nClient 2: "Beta Industries"\nAre they the same client?'
      );
      expect(result.toLowerCase()).toContain('false');
    });
  });

  describe('Project Name Comparison', () => {
    test('should identify related projects', async () => {
      const result = await analyze(
        'Compare these two project names:\nProject 1: "Invoice App Development"\nProject 2: "Invoice Application Frontend"\nAre they related projects?'
      );
      expect(result.toLowerCase()).toContain('true');
    });

    test('should identify unrelated projects', async () => {
      const result = await analyze(
        'Compare these two project names:\nProject 1: "Invoice App Development"\nProject 2: "Network Security Audit"\nAre they related projects?'
      );
      expect(result.toLowerCase()).toContain('false');
    });
  });

  describe('Work Description Comparison', () => {
    test('should identify similar tasks', async () => {
      const result = await analyzeJson(`
        Compare these two work descriptions and determine if they should be combined:
        Description 1: "Setting up PostgreSQL database and configuring connections"
        Description 2: "Database setup and connection testing"

        IMPORTANT: You must respond with a valid JSON object in exactly this format:
        {
          "shouldCombine": boolean,
          "combinedDescription": string,
          "explanation": string,
          "areSameTask": boolean
        }
      `);
      expect(result.shouldCombine).toBe(true);
    });

    test('should identify different tasks', async () => {
      const result = await analyzeJson(`
        Compare these two work descriptions and determine if they should be combined:
        Description 1: "Frontend UI development"
        Description 2: "Database optimization"

        IMPORTANT: You must respond with a valid JSON object in exactly this format:
        {
          "shouldCombine": boolean,
          "combinedDescription": string,
          "explanation": string,
          "areSameTask": boolean
        }
      `);
      expect(result.shouldCombine).toBe(false);
    });
  });

  describe('Screenshot Analysis', () => {
    test('should analyze real screenshot content', async () => {
      // This is a minimal base64 image for testing
      const mockScreenshot = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      
      const analysis = await analyzeScreenshots([mockScreenshot]);
      
      expect(analysis).toEqual(expect.objectContaining({
        client_name: expect.any(String),
        project_name: expect.any(String),
        activity_description: expect.any(String),
        detailed_description: expect.any(String),
        confidence_score: expect.any(Number)
      }));
    });
  });

  describe('Entry Merging with Real AI', () => {
    test('should correctly merge similar work entries', async () => {
      const existingEntry: WIPEntry = {
        id: 'test-1',
        client_name: 'Tech Corp',
        project_name: 'Database Migration',
        description: 'Initial database schema setup',
        time_in_minutes: 60,
        hourly_rate: 150,
        date: new Date().toISOString(),
        client_id: 'client-1',
        client_address: '123 Tech St',
        partner: 'Test Partner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const mockAnalysis = {
        client_name: 'Tech Corporation',
        project_name: 'DB Migration Project',
        activity_description: 'Implementing database indexes and optimizing queries',
        detailed_description: 'Working on database performance improvements',
        confidence_score: 0.9
      };

      const result = await processScreenActivity(mockAnalysis, [existingEntry]);
      
      expect(result.time_in_minutes).toBeGreaterThan(existingEntry.time_in_minutes);
      expect(result.description).toContain('database');
      expect(result.client_name).toBe(existingEntry.client_name);
    });
  });
}); 