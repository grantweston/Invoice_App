export async function analyze(prompt: string): Promise<string> {
  // For project/client comparison, use semantic understanding
  if (prompt.includes('Project 1') || prompt.includes('Client 1')) {
    const text1 = prompt.match(/(?:Project|Client) 1: "([^"]+)"/)?.[1];
    const text2 = prompt.match(/(?:Project|Client) 2: "([^"]+)"/)?.[1];
    
    if (!text1 || !text2) return 'false';
    
    // Simulate semantic understanding by comparing text similarity
    const similarity = calculateSimilarity(text1, text2);
    return similarity > 0.7 ? 'true' : 'false';
  }
  
  return 'false';
}

export async function analyzeJson(prompt: string): Promise<any> {
  // For client/project comparison
  if (prompt.includes('Client 1') || prompt.includes('Project 1')) {
    const text1 = prompt.match(/(?:Client|Project) 1: "([^"]+)"/)?.[1];
    const text2 = prompt.match(/(?:Client|Project) 2: "([^"]+)"/)?.[1];
    
    if (!text1 || !text2) {
      return {
        isMatch: false,
        confidence: 0.3,
        explanation: "Insufficient information",
        patterns: []
      };
    }

    const similarity = calculateSimilarity(text1, text2);
    const isMatch = similarity > 0.7;
    
    return {
      isMatch,
      confidence: similarity,
      explanation: isMatch ? "High semantic similarity" : "Low semantic similarity",
      patterns: []
    };
  }
  
  // For description comparison
  if (prompt.includes('Description 1') && prompt.includes('Description 2')) {
    const desc1 = prompt.match(/Description 1: "([^"]+)"/)?.[1];
    const desc2 = prompt.match(/Description 2: "([^"]+)"/)?.[1];
    
    if (!desc1 || !desc2) {
      return {
        shouldCombine: false,
        hasNewInfo: false,
        combinedDescription: "",
        explanation: "Missing descriptions",
        areSameTask: false
      };
    }

    // Check for semantic relationships in tax/accounting domain
    const taxTerms = ['tax', 'return', 'schedule c', 'financial', 'statement', 'reconciliation'];
    const hasTaxContext = taxTerms.some(term => 
      desc1.toLowerCase().includes(term) && desc2.toLowerCase().includes(term)
    );

    // Calculate base similarity
    const similarity = calculateSimilarity(desc1, desc2);
    
    // Determine if descriptions are related enough to combine
    const shouldCombine = hasTaxContext || (similarity > 0.3 && similarity < 0.8);
    
    // Determine which description is more detailed
    const detailLevel1 = calculateDetailLevel(desc1);
    const detailLevel2 = calculateDetailLevel(desc2);
    const moreDetailedDesc = detailLevel1 > detailLevel2 ? desc1 : desc2;
    
    // Check if they're essentially the same task
    const areSameTask = similarity > 0.8 || (hasTaxContext && similarity > 0.5);
    
    if (areSameTask) {
      return {
        shouldCombine: false,
        combinedDescription: null,
        explanation: "Tasks are the same - keeping original version",
        areSameTask: true
      };
    }
    
    return {
      shouldCombine,
      hasNewInfo: shouldCombine,
      combinedDescription: shouldCombine ? combineDescriptions(desc1, desc2) : desc1,
      explanation: shouldCombine ? "Descriptions are complementary" : "Descriptions are too different",
      areSameTask: false
    };
  }
  
  return {
    isMatch: false,
    confidence: 0.3,
    explanation: "Default response",
    patterns: []
  };
}

// Helper function to simulate semantic similarity
function calculateSimilarity(text1: string, text2: string): number {
  // Convert to lowercase and split into words
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));
  
  // Calculate Jaccard similarity using arrays for iteration
  const intersection = Array.from(words1).filter(x => words2.has(x));
  const union = Array.from(new Set([...Array.from(words1), ...Array.from(words2)]));
  
  return intersection.length / union.length;
}

// Helper function to calculate detail level of a description
function calculateDetailLevel(description: string): number {
  const words = description.split(/\s+/);
  const specificTerms = ['including', 'detailed', 'comprehensive', 'reconciliation', 'analysis', 'review'];
  const hasSpecificTerms = specificTerms.some(term => description.toLowerCase().includes(term));
  return words.length + (hasSpecificTerms ? 5 : 0);
}

// Helper function to intelligently combine descriptions
function combineDescriptions(desc1: string, desc2: string): string {
  // If one starts with a bullet point style, maintain it
  const bulletMatch = desc1.match(/^[•\-\*]\s/) || desc2.match(/^[•\-\*]\s/);
  const bullet = bulletMatch ? bulletMatch[0] : '- ';
  
  // Split and clean descriptions
  const lines1 = desc1.split(/[\n,]/).map(l => l.trim()).filter(Boolean);
  const lines2 = desc2.split(/[\n,]/).map(l => l.trim()).filter(Boolean);
  
  // Remove bullet points for comparison
  const cleanLines1 = lines1.map(l => l.replace(/^[•\-\*]\s+/, ''));
  const cleanLines2 = lines2.map(l => l.replace(/^[•\-\*]\s+/, ''));
  
  // Combine unique lines
  const allLines = new Set([...cleanLines1, ...cleanLines2]);
  
  // Add bullet points back and join
  return Array.from(allLines)
    .map(line => line.startsWith(bullet) ? line : `${bullet}${line}`)
    .join('\n');
}

export class GeminiService {
  async compareNames(name1: string, name2: string) {
    const similarity = calculateSimilarity(name1, name2);
    return {
      areSimilar: similarity > 0.7,
      confidence: similarity
    };
  }
} 