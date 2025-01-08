import { GoogleGenerativeAI } from "@google/generative-ai";
import { clientDocsService } from "./clientDocsService";
import { useWIPStore } from "@/src/store/wipStore";
import { useDailyLogs } from "@/src/store/dailyLogs";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const SYSTEM_PROMPT = `You are an expert billing assistant with deep knowledge of invoice structures and document editing. Your task is to intelligently analyze and edit invoice documents.

DOCUMENT ANALYSIS INSTRUCTIONS:
1. First, analyze the document structure to identify:
   - Header section with company info
   - Client information section
   - Invoice details (number, date)
   - Line items and amounts
   - Payment instructions
   - Any special notes or terms

2. When making edits:
   - Preserve the document's existing structure and formatting
   - Identify the exact location of text that needs to be changed
   - Consider the context around each edit
   - Ensure changes maintain document consistency

3. For amount changes:
   - Look for all related fields (subtotals, totals, line items)
   - Ensure mathematical consistency
   - Match the existing number format (e.g., "$110.00" vs "$110")
   - Update both numeric and written amounts if present

AVAILABLE OPERATIONS:
1. Text Replacement:
   {
     "replaceAllText": {
       "containsText": {
         "text": "exact text to find"
       },
       "replaceText": "new text"
     }
   }

2. Text Insertion:
   {
     "insertText": {
       "location": {
         "index": "END_OF_DOCUMENT"
       },
       "text": "new content"
     }
   }

EDITING PROCESS:
1. Analyze the full document content
2. Identify all locations that need updates
3. Generate precise edit requests
4. Verify changes maintain document consistency
5. Ensure all related fields are updated together

RULES:
1. Always analyze the full context before making edits
2. Make precise, targeted changes
3. Update all related fields together
4. Preserve existing formatting and structure
5. Validate mathematical consistency
6. Consider document layout and spacing

YOUR RESPONSE FORMAT:
1. Analysis: Brief explanation of what needs to change and why
2. JSON array of edit requests
3. Verification steps to confirm changes are correct

Remember: You have access to the full document content, WIP entries, and daily logs. Use this context to make intelligent, precise edits.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const docChatService = {
  async processMessage(
    documentId: string,
    message: string,
    history: ChatMessage[]
  ): Promise<{ response: string; documentUpdated: boolean }> {
    try {
      // Get current document content
      const doc = await clientDocsService.getDocument(documentId);
      
      // Get WIP entries and daily logs
      const wipEntries = useWIPStore.getState().entries;
      const dailyLogs = useDailyLogs.getState().logs;
      
      // Extract text content and find end index
      const content = doc.body?.content || [];
      const endIndex = content.reduce((sum, item) => {
        const text = item.paragraph?.elements?.[0]?.textRun?.content || '';
        return sum + text.length;
      }, 0);
      
      // Extract text content for better context
      const documentText = content
        .map((item: any) => item.paragraph?.elements?.[0]?.textRun?.content || '')
        .join('\n');
      
      const prompt = `${SYSTEM_PROMPT}

Current invoice content:
${documentText}

WIP Entries:
${JSON.stringify(wipEntries, null, 2)}

Daily Activity Logs:
${JSON.stringify(dailyLogs, null, 2)}

Chat history:
${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User request: ${message}

First, analyze all the data and determine what changes are needed.
Then, generate a JSON array of Google Docs API requests to make the necessary changes.
Finally, provide a summary explaining what you did and how to verify the changes.`;

      // Get AI response
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Try to extract JSON requests
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      if (jsonMatch) {
        let requests = JSON.parse(jsonMatch[0]);
        
        // Replace END_OF_DOCUMENT with actual index
        requests = requests.map((req: any) => {
          if (req.insertText?.location?.index === 'END_OF_DOCUMENT') {
            return {
              ...req,
              insertText: {
                ...req.insertText,
                location: { index: endIndex }
              }
            };
          }
          return req;
        });

        // Apply the updates
        await clientDocsService.updateDocument(documentId, requests);
        
        // Extract all sections after the JSON array
        const sectionsMatch = responseText
          .split(/\]\s*/)
          .slice(1)
          .join('')
          .match(/✅ Changes Made:[\s\S]*?(?=🔍 Reason for Changes:)|\n🔍 Reason for Changes:[\s\S]*?(?=✓ To Verify:)|\n✓ To Verify:[\s\S]*/g);

        if (sectionsMatch) {
          const formattedResponse = sectionsMatch
            .map(section => section.trim())
            .join('\n\n');
          return { 
            response: formattedResponse,
            documentUpdated: true 
          };
        }
        
        // Fallback if sections aren't properly formatted
        return { 
          response: '✅ Changes applied successfully\n\n' + responseText.split(/\]\s*/).slice(1).join('').trim(),
          documentUpdated: true 
        };
      }

      return { 
        response: responseText.trim(), 
        documentUpdated: false 
      };
    } catch (error) {
      console.error('Error in doc chat service:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }
}; 