import { compareDescriptions } from '../backend/services/intelligentAggregationService';
import { analyze, areDescriptionsEquivalent } from '../integrations/gemini/geminiService';
import { GoogleGenerativeAI } from '@google/generative-ai';

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!).getGenerativeModel({ model: 'gemini-pro' });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface TestCase {
  name: string;
  project: string;
  client: string;
  existingDesc: string;
  newDesc: string;
  expectedDesc: string;
  shouldUpdate: boolean;
}

// Helper function to evaluate description quality
async function evaluateDescription(generated: string, expected: string): Promise<{ isGood: boolean; explanation: string }> {
  const prompt = `
  Compare these two task descriptions and evaluate if they effectively convey the same information and maintain the correct order of tasks:

  Generated: "${generated}"
  Expected: "${expected}"

  Consider:
  1. Do both descriptions capture the key tasks/milestones?
  2. Is the order of tasks logical and similar?
  3. Are important details preserved?
  4. Do they convey the same overall progress/status?

  Respond with just a JSON object:
  {
    "isGood": boolean,
    "explanation": string (brief explanation of why it's good or needs improvement)
  }`;

  try {
    const response = await analyze(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Error evaluating description:', error);
    return { isGood: false, explanation: 'Error evaluating description quality' };
  }
}

const testCases: TestCase[] = [
  {
    name: 'Basic task combination',
    project: 'Tax Return',
    client: 'Johnson LLC',
    existingDesc: 'Started tax return',
    newDesc: 'Worked on Schedule C',
    expectedDesc: 'Started tax return, completed Schedule C',
    shouldUpdate: true
  },
  {
    name: 'Same work different format',
    project: 'Website',
    client: 'Johnson LLC',
    existingDesc: 'Website development - Phase 1',
    newDesc: 'Web dev - P1',
    expectedDesc: 'Website development - Phase 1',
    shouldUpdate: false
  },
  {
    name: 'Progress update',
    project: 'Financial Review',
    client: 'Johnson LLC',
    existingDesc: 'Reviewed Q3 statements',
    newDesc: 'Found issues in receivables',
    expectedDesc: 'Reviewed Q3 statements, found AR issues',
    shouldUpdate: true
  },
  {
    name: 'Meeting progress',
    project: 'Tax Planning',
    client: 'Johnson LLC',
    existingDesc: 'Client meeting about strategy',
    newDesc: 'Discussed timeline and next steps',
    expectedDesc: 'Met with client, discussed strategy, set timeline',
    shouldUpdate: true
  },
  {
    name: 'Different work types',
    project: 'Mixed',
    client: 'Johnson LLC',
    existingDesc: 'Client meeting about requirements',
    newDesc: 'Code review for login page',
    expectedDesc: 'Client meeting about requirements',
    shouldUpdate: false
  },
  {
    name: 'Related development tasks',
    project: 'Website',
    client: 'Johnson LLC',
    existingDesc: 'Created login page',
    newDesc: 'Added password reset',
    expectedDesc: 'Created login page, added password reset',
    shouldUpdate: true
  },
  {
    name: 'Distinct activities',
    project: 'Mixed',
    client: 'Johnson LLC',
    existingDesc: 'Tax return 2023',
    newDesc: 'Bookkeeping for Q4',
    expectedDesc: 'Tax return 2023',
    shouldUpdate: false
  },
  {
    name: 'Financial task progression',
    project: 'Financial Review',
    client: 'Johnson LLC',
    existingDesc: 'Started financial review',
    newDesc: 'Completed bank reconciliation',
    expectedDesc: 'Started financial review, completed bank reconciliation',
    shouldUpdate: true
  }
];

async function testDescriptionUpdates() {
  console.log('\n🧪 Testing description updates:\n');

  for (const test of testCases) {
    console.log(`📝 Test: ${test.name}`);
    console.log(`Project: "${test.project}"`);
    console.log(`Client: "${test.client}"`);
    console.log(`Existing: "${test.existingDesc}"`);
    console.log(`New: "${test.newDesc}"`);
    console.log(`Expected: "${test.expectedDesc}"`);

    try {
      const result = await compareDescriptions(test.existingDesc, test.newDesc);
      console.log(`Result: ${result.shouldUpdate ? '✅ UPDATED' : '❌ NOT UPDATED'}`);
      if (result.updatedDescription) {
        console.log(`Updated Description: "${result.updatedDescription}"`);
        const quality = await evaluateDescription(result.updatedDescription, test.expectedDesc);
        console.log(`Description Quality: ${quality.isGood ? '✅ GOOD' : '❌ NEEDS IMPROVEMENT'}`);
        console.log(`Quality Explanation: ${quality.explanation}`);
      }
      console.log(`Update Explanation: ${result.explanation}`);
      console.log(`Expected Update: ${test.shouldUpdate ? 'Yes' : 'No'}`);
      
      const testPassed = (result.shouldUpdate === test.shouldUpdate) &&
                        (!result.shouldUpdate || await areDescriptionsEquivalent(result.updatedDescription || '', test.expectedDesc));
      
      console.log(`Test Status: ${testPassed ? '✅ PASSED' : '❌ FAILED'}`);
      console.log('');
    } catch (error) {
      console.error('Error testing description:', error);
      console.log(`Test Status: ❌ FAILED\n`);
    }
  }
}

testDescriptionUpdates(); 