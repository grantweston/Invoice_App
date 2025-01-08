import { GoogleGenerativeAI } from "@google/generative-ai";
import { clientDocsService } from "./clientDocsService";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

const SYSTEM_PROMPT = `You are an AI assistant helping to edit a Google Doc invoice. 
Analyze the document and make the requested changes directly.
After making changes, respond with a brief summary of what you changed.
Keep the formatting professional and consistent.
If you make edits, start your response with "✅ Changes made:" followed by a brief list.
If no edits were needed, explain why.`;

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
      
      const prompt = `${SYSTEM_PROMPT}

Current document content:
${JSON.stringify(doc, null, 2)}

User request: ${message}

Generate a JSON array of Google Docs API requests to make the necessary changes.
Each request should follow the Google Docs API format.
After the JSON array, provide a brief summary of the changes made.`;

      // Get AI response
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();

      // Try to extract JSON requests
      const jsonMatch = responseText.match(/\[[\s\S]*?\]/);
      if (jsonMatch) {
        const requests = JSON.parse(jsonMatch[0]);
        await clientDocsService.updateDocument(documentId, requests);
        
        // Extract the summary (everything after the JSON array)
        const summary = responseText.split(/\][ \n]*/).slice(1).join('').trim();
        return { response: summary, documentUpdated: true };
      }

      return { response: responseText, documentUpdated: false };
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