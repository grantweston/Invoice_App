import { analyze } from '@/src/integrations/gemini/geminiService';
import { WIPEntry, DailyActivity } from '@/src/services/supabaseDB';

// Cache categories to avoid redundant API calls
const categoryCache = new Map<string, string>();

// Track failed categorization attempts
const failedAttempts = new Map<string, number>();
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000; // 1 second

async function retryWithDelay(fn: () => Promise<string>, delay: number): Promise<string> {
  await new Promise(resolve => setTimeout(resolve, delay));
  return fn();
}

export async function categorizeDescription(text: string): Promise<string> {
  // Check cache first
  const cached = categoryCache.get(text);
  if (cached) return cached;

  // Check if we've failed too many times
  const attempts = failedAttempts.get(text) || 0;
  if (attempts >= MAX_RETRIES) {
    console.warn(`Max retries reached for categorizing: "${text.substring(0, 50)}..."`);
    return 'Professional Services';
  }

  const prompt = `
    As an accounting professional, analyze this work description and categorize it:
    "${text}"

    Rules:
    1. Use standard accounting/tax service categories
    2. Be specific but not too granular
    3. Group similar activities together
    4. Consider the business context
    5. Return ONLY the category name, no explanation
    6. Use one of these categories if possible:
       - Tax Return Preparation
       - Tax Planning & Strategy
       - Financial Statement Review
       - Business Advisory
       - Compliance & Reporting
       - Client Communication
       - Bookkeeping & Accounting
       - Audit Support
       - International Tax Services
       - Estate & Trust Services
       - Only create a new category if none of these fit
  `;

  try {
    const category = await analyze(prompt);
    const cleanCategory = category.trim().replace(/["']/g, '');
    
    // Validate response
    if (!cleanCategory || cleanCategory.length > 50) {
      throw new Error('Invalid category response');
    }

    categoryCache.set(text, cleanCategory);
    failedAttempts.delete(text); // Reset attempts on success
    return cleanCategory;
  } catch (error) {
    console.error('Failed to categorize with Gemini:', error);
    failedAttempts.set(text, attempts + 1);
    
    // Retry with delay if not max attempts
    if (attempts < MAX_RETRIES) {
      return retryWithDelay(() => categorizeDescription(text), RETRY_DELAY * (attempts + 1));
    }
    
    return 'Professional Services';
  }
}

interface CategoryMergeRule {
  categories: string[];
  shouldMerge: (a: string, b: string) => boolean;
  mergeTo: (a: string, b: string) => string;
}

const mergeRules: CategoryMergeRule[] = [
  {
    categories: ['Tax Return Preparation', 'Tax Planning & Strategy', 'International Tax Services'],
    shouldMerge: (a, b) => a.includes('Tax') && b.includes('Tax'),
    mergeTo: (a, b) => a.includes('Planning') ? a : b
  },
  {
    categories: ['Financial Statement Review', 'Bookkeeping & Accounting', 'Audit Support'],
    shouldMerge: (a, b) => 
      (a.includes('Financial') || a.includes('Accounting')) && 
      (b.includes('Financial') || b.includes('Accounting')),
    mergeTo: (_, b) => b
  }
];

export async function groupSimilarWork(entries: (WIPEntry | DailyActivity)[]): Promise<Map<string, (WIPEntry | DailyActivity)[]>> {
  const groups = new Map<string, (WIPEntry | DailyActivity)[]>();
  
  // First pass: Categorize all entries with retries
  for (const entry of entries) {
    try {
      const category = await categorizeDescription(entry.description);
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(entry);
    } catch (error) {
      console.error('Failed to categorize entry:', error);
      const fallbackCategory = 'Professional Services';
      if (!groups.has(fallbackCategory)) {
        groups.set(fallbackCategory, []);
      }
      groups.get(fallbackCategory)!.push(entry);
    }
  }

  // Second pass: Apply merge rules first
  for (const rule of mergeRules) {
    const categories = Array.from(groups.keys());
    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const catA = categories[i];
        const catB = categories[j];
        
        if (rule.shouldMerge(catA, catB)) {
          const targetCategory = rule.mergeTo(catA, catB);
          const sourceCategory = targetCategory === catA ? catB : catA;
          
          if (groups.has(sourceCategory) && groups.has(targetCategory)) {
            const sourceEntries = groups.get(sourceCategory)!;
            const targetEntries = groups.get(targetCategory)!;
            groups.set(targetCategory, [...targetEntries, ...sourceEntries]);
            groups.delete(sourceCategory);
          }
        }
      }
    }
  }

  // Third pass: Use Gemini for any remaining potential merges
  if (groups.size > 1) {
    const mergeCandidates = Array.from(groups.keys());
    const prompt = `
      Analyze these accounting service categories and suggest which ones should be merged:
      ${mergeCandidates.join('\n')}

      Rules:
      1. Only merge if truly related and would make sense on an invoice
      2. Keep specific service types separate (e.g. don't merge "Tax Planning" with "Bookkeeping")
      3. Return pairs to merge as JSON array of arrays
      4. Return [] if no merges needed
      5. Consider client readability and professional standards
    `;

    try {
      const mergeResult = await analyze(prompt);
      const mergePairs = JSON.parse(mergeResult) as string[][];
      
      for (const [from, to] of mergePairs) {
        if (groups.has(from) && groups.has(to)) {
          const fromEntries = groups.get(from)!;
          const toEntries = groups.get(to)!;
          groups.set(to, [...toEntries, ...fromEntries]);
          groups.delete(from);
        }
      }
    } catch (error) {
      console.error('Failed to analyze category merges:', error);
    }
  }

  return groups;
} 