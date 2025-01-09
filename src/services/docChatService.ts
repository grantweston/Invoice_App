import { GoogleGenerativeAI } from "@google/generative-ai";
import { clientDocsService } from "./clientDocsService";
import { useWIPStore } from "@/src/store/wipStore";
import { useDailyLogs } from "@/src/store/dailyLogs";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const SYSTEM_PROMPT = `You are an expert billing assistant with deep knowledge of invoice structures and document editing. Your task is to help users edit and refine their invoice documents through natural conversation.

IMPORTANT: YOU MUST RESPOND WITH A JSON ARRAY OF EDIT REQUESTS FIRST, followed by your explanation.

DOCUMENT STRUCTURE:
The invoice document has specific sections:
1. Header (company info, logo, address)
2. Client Information
3. Invoice Details (date, number)
4. Service Description
5. Payment Instructions
6. Footer

DOCUMENT EDITING CAPABILITIES:
1. Text Replacement:
   - You can only replace text that exists EXACTLY as specified
   - Break down large changes into smaller, precise replacements
   - Verify the text exists in the document before trying to replace it
   - Never use global patterns like "*" or "."
   {
     "replaceAllText": {
       "containsText": {
         "text": "exact text to find - must exist exactly as written"
       },
       "replaceText": "new text"
     }
   }

2. Text Insertion:
   - Specify the section where text should be inserted
   - Never insert at the beginning of the document
   - Use existing text to find the right location
   {
     "insertText": {
       "location": {
         "index": number  // Index after specific existing text
       },
       "text": "new content"
     }
   }

EDITING RULES:
1. First, identify the EXACT text you want to replace by finding it in the document
2. Break down large changes into multiple small, precise replacements
3. YOU MUST START YOUR RESPONSE with a JSON array of edit requests
4. Each edit request must follow the exact format above
5. Never use raw strings for containsText - always use the object format
6. Only try to replace text that exists EXACTLY as specified
7. When adding new text, find appropriate section markers
8. Preserve document formatting and structure

REQUIRED RESPONSE FORMAT:
[
  {
    "replaceAllText": {
      "containsText": { "text": "exact text that exists in document" },
      "replaceText": "new text"
    }
  }
]

✅ Changes Made:
[Describe the changes you made]

🔍 Reason for Changes:
[Explain why these changes improve the document]

✓ To Verify:
[List the exact text you replaced and what it was changed to]

Remember: You MUST start with the JSON array of edit requests, and only try to replace text that exists EXACTLY in the document.`;

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
      
      // Improved content extraction with structure preservation
      const documentContent = content.map((item: any) => {
        const paragraph = item.paragraph;
        if (!paragraph) return '';
        
        // Extract all text runs from the paragraph
        const text = paragraph.elements?.map((element: any) => {
          const textRun = element.textRun;
          if (!textRun) return '';
          
          // Include text style information for better context
          const style = textRun.textStyle || {};
          return textRun.content;
        }).join('') || '';
        
        return text;
      });

      const documentText = documentContent.join('\n');
      console.log('📄 Document content:', {
        rawContent: content,
        extractedText: documentText,
        paragraphCount: content.length,
        textLength: documentText.length
      });

      // Calculate end index after full content extraction
      const endIndex = documentText.length;
      
      const prompt = `${SYSTEM_PROMPT}

Current invoice content (please analyze carefully):
${documentText}

Document Statistics:
- Total paragraphs: ${content.length}
- Total characters: ${documentText.length}

WIP Entries:
${JSON.stringify(wipEntries, null, 2)}

Daily Activity Logs:
${JSON.stringify(dailyLogs, null, 2)}

Chat history:
${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User request: ${message}

Before making any changes:
1. Carefully verify the exact text exists in the document
2. Only attempt to replace text that is found exactly as specified
3. Make precise, targeted changes
4. Return empty array if no valid changes can be made

First, analyze all the data and determine what changes are needed.
Then, generate a JSON array of Google Docs API requests to make the necessary changes.
Finally, provide a summary explaining what you did and how to verify the changes.`;

      // Get AI response
      console.log('🤖 Sending request to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      console.log('📝 Raw Gemini response:', responseText);

      // Try to extract JSON requests
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      console.log('🔍 Found JSON match:', !!jsonMatch);
      
      if (jsonMatch) {
        console.log('📋 Extracted JSON:', jsonMatch[0]);
        let requests = JSON.parse(jsonMatch[0]);
        console.log('✨ Parsed requests:', requests);
        
        // Validate and fix request format
        requests = requests.map((req: any) => {
          console.log('🔄 Processing request:', req);
          
          // Fix replaceAllText format if needed
          if (req.replaceAllText?.containsText && typeof req.replaceAllText.containsText === 'string') {
            console.log('⚠️ Found string containsText, converting to object:', req.replaceAllText.containsText);
            return {
              ...req,
              replaceAllText: {
                ...req.replaceAllText,
                containsText: { text: req.replaceAllText.containsText }
              }
            };
          }
          
          // Replace END_OF_DOCUMENT with actual index
          if (req.insertText?.location?.index === 'END_OF_DOCUMENT') {
            console.log('📍 Replacing END_OF_DOCUMENT with actual index:', endIndex);
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

        // Filter out invalid requests
        const originalLength = requests.length;
        requests = requests.filter((req: any) => {
          // Prevent dangerous global replacements
          const dangerousPatterns = ['*', '.', '\\s+'];
          const hasDangerousPattern = dangerousPatterns.some(pattern => 
            req.replaceAllText?.containsText?.text === pattern
          );
          if (hasDangerousPattern) {
            console.log('❌ Blocked dangerous global replacement pattern:', req.replaceAllText?.containsText?.text);
            return false;
          }

          // Validate replaceAllText
          if (req.replaceAllText) {
            const searchText = req.replaceAllText.containsText?.text;
            // Minimum length to prevent too broad replacements
            if (searchText && searchText.length < 3) {
              console.log('❌ Search text too short:', searchText);
              return false;
            }
            
            const isValid = (
              searchText &&
              typeof searchText === 'string' &&
              req.replaceAllText.replaceText &&
              typeof req.replaceAllText.replaceText === 'string' &&
              documentText.includes(searchText) // Check if text actually exists
            );
            if (!isValid) {
              if (!documentText.includes(searchText)) {
                console.log('❌ Text not found in document:', searchText);
              } else {
                console.log('❌ Invalid replaceAllText request:', req);
              }
            }
            return isValid;
          }

          // Validate insertText
          if (req.insertText) {
            // Don't allow insertions at the very beginning of the document
            if (req.insertText.location?.index <= 1) {
              console.log('❌ Prevented insertion at document start');
              return false;
            }

            const isValid = (
              typeof req.insertText.location?.index === 'number' &&
              req.insertText.text &&
              typeof req.insertText.text === 'string' &&
              !req.insertText.text.includes('expert billing assistant') && // Prevent system prompt insertion
              req.insertText.text.trim().length > 0 // Prevent empty insertions
            );
            if (!isValid) {
              if (req.insertText.text?.includes('expert billing assistant')) {
                console.log('❌ Prevented system prompt insertion');
              } else if (!req.insertText.text?.trim()) {
                console.log('❌ Prevented empty text insertion');
              } else {
                console.log('❌ Invalid insertText request:', req);
              }
            }
            return isValid;
          }

          console.log('❌ Unknown request type:', req);
          return false;
        });
        console.log(`🧹 Filtered requests: ${requests.length} valid out of ${originalLength} total`);
        console.log('📤 Final requests to be sent:', requests);

        // Apply the updates
        console.log('🚀 Sending update request to Google Docs API...');
        try {
          // Prevent empty request arrays
          if (!requests || requests.length === 0) {
            console.log('⚠️ No valid requests to process');
            return {
              response: "I analyzed the document but couldn't find the exact text to modify. Please verify the text you want to change exists exactly as specified in the document.",
              documentUpdated: false
            };
          }

          await clientDocsService.updateDocument(documentId, requests);
          console.log('✅ Successfully updated document');
        } catch (error) {
          console.error('❌ Failed to update document:', error);
          if (error instanceof Error) {
            console.error('Error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            });
          }
          throw error;
        }
        
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