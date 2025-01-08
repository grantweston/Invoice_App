import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { templateService } from './templateService';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
console.log('🤖 Initialized Gemini model');

// Initialize auth client
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/documents'
  ],
});

// Initialize the Drive API
const drive = google.drive({ version: 'v3', auth });
const docs = google.docs({ version: 'v1', auth });

interface InvoiceData {
  client: string;
  entries: Array<{
    description: string;
    timeInMinutes: number;
    hourlyRate: number;
    date?: string;
  }>;
  userSettings?: {
    userName?: string;
    hourlyRate?: number;
  };
}

export const invoiceService = {
  async generateInvoice(data: InvoiceData): Promise<string> {
    try {
      console.log('📄 Starting invoice generation for client:', data.client);
      
      const defaultTemplateId = await templateService.getDefaultTemplateId();
      if (!defaultTemplateId) {
        console.error('❌ No default template found');
        throw new Error('No default template set');
      }
      console.log('📋 Using template ID:', defaultTemplateId);

      const metadata = await templateService.getTemplateMetadata(defaultTemplateId);
      if (!metadata?.googleDocId) {
        console.error('❌ Template metadata missing');
        throw new Error('Template metadata not found');
      }
      console.log('📎 Template Google Doc ID:', metadata.googleDocId);

      const date = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      console.log('🗓️ Creating new invoice document...');
      const newDocId = await templateService.createInvoiceFromTemplate(
        metadata.googleDocId,
        `${data.client} Invoice`,
        date
      );
      console.log('✨ Created new invoice document:', newDocId);

      // Set document permissions
      console.log('🔐 Setting document permissions...');
      await drive.permissions.create({
        fileId: newDocId,
        requestBody: {
          role: 'writer',
          type: 'anyone'
        }
      });
      console.log('✅ Document permissions set to allow editing');

      console.log('📖 Fetching document structure...');
      const doc = await docs.documents.get({
        documentId: newDocId
      });
      console.log('📑 Document structure retrieved');

      // Calculate total amount
      const totalAmount = data.entries.reduce((sum, entry) => {
        const hours = entry.timeInMinutes / 60;
        return sum + (hours * entry.hourlyRate);
      }, 0);
      console.log('💰 Calculated total amount:', totalAmount);

      // Prepare the data in a clear format
      const invoiceData = {
        client: data.client,
        date,
        from: data.userSettings?.userName,
        entries: data.entries.map(entry => ({
          description: entry.description,
          time: `${entry.timeInMinutes} minutes (${(entry.timeInMinutes / 60).toFixed(2)} hours)`,
          rate: `$${entry.hourlyRate}/hour`,
          amount: `$${((entry.timeInMinutes / 60) * entry.hourlyRate).toFixed(2)}`
        })),
        total: `$${totalAmount.toFixed(2)}`
      };

      const prompt = `You are an expert at analyzing Google Docs structure and generating precise edit requests. I have an invoice template that needs to be filled with data.

Document Structure (this is a JSON representation of the Google Doc):
${JSON.stringify(doc.data, null, 2)}

Invoice Data to Insert:
${JSON.stringify(invoiceData, null, 2)}

Analyze the document structure and generate a list of precise Google Docs API requests to insert/update the data in appropriate locations. The document is an invoice template, so look for logical places to insert each piece of information.

Important Rules:
1. Use exact character indices from the document structure
2. For client name replacement, look for any existing client name or placeholder and replace the entire text
3. When replacing text, make sure to capture the full text to be replaced including any surrounding whitespace or formatting
4. Each edit must specify exact start and end indices
5. Preserve existing formatting by using the right positions
6. Look for contextual clues like "Bill To:", "Date:", etc. to find the right spots
7. Do not partially replace text - always replace complete fields

Return ONLY a JSON array of Google Docs API requests. Each request must follow one of these exact formats:

For inserting text:
{
  "insertText": {
    "location": {
      "index": number  // Exact character position
    },
    "text": string
  }
}

For replacing text:
{
  "replaceText": {
    "text": string,
    "location": {
      "index": number  // Start position
    },
    "endIndex": number  // End position, must capture entire field
  }
}

Focus on making precise edits at exact positions in the document.`;

      console.log('🤖 Sending prompt to Gemini...');
      const result = await model.generateContent(prompt);
      const response = result.response.text();
      console.log('✅ Received response from Gemini');
      
      // Parse the response into requests
      let requests;
      try {
        requests = JSON.parse(response);
        console.log('📝 Successfully parsed Gemini response into', requests.length, 'edit requests');
      } catch (e) {
        console.warn('⚠️ Initial JSON parse failed, attempting to extract JSON from response');
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          console.error('❌ Could not extract valid JSON from Gemini response');
          throw new Error('Invalid response format from Gemini');
        }
        requests = JSON.parse(jsonMatch[0]);
        console.log('📝 Successfully extracted and parsed', requests.length, 'edit requests');
      }

      // Validate requests
      console.log('🔍 Validating edit requests...');
      requests = requests.map((request, index) => {
        console.log(`Request ${index + 1}:`, 
          request.insertText ? 
            `Insert at index ${request.insertText.location.index}` : 
            `Replace from index ${request.replaceText?.location.index} to ${request.replaceText?.endIndex}`
        );
        
        if (request.insertText) {
          // Validate index is within document bounds
          const docLength = doc.data.body?.content?.reduce((sum: number, item: any) => 
            sum + (item.paragraph?.elements?.reduce((len: number, el: any) => 
              len + (el.textRun?.content?.length || 0), 0) || 0), 0) || 0;
          
          if (request.insertText.location.index > docLength) {
            console.warn(`⚠️ Adjusting insert index ${request.insertText.location.index} to document length ${docLength}`);
            request.insertText.location.index = docLength;
          }
          
          return {
            insertText: {
              location: {
                index: request.insertText.location.index
              },
              text: request.insertText.text
            }
          };
        } else if (request.replaceText) {
          return {
            insertText: {
              location: {
                index: request.replaceText.location.index
              },
              text: request.replaceText.text
            }
          };
        }
        console.error('❌ Invalid request format detected');
        throw new Error('Invalid request format');
      });

      console.log('📤 Applying document updates...');
      await docs.documents.batchUpdate({
        documentId: newDocId,
        requestBody: { requests }
      });
      console.log('✅ Successfully updated document');

      return newDocId;
    } catch (error) {
      console.error('❌ Error generating invoice:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  },

  convertToDocRequests(formattedData: any): any[] {
    const requests = [];
    
    // Helper function to create text replacement request
    const createReplaceTextRequest = (text: string, placeholder: string) => ({
      replaceAllText: {
        containsText: { text: placeholder },
        replaceText: text,
      },
    });

    // Replace client name
    if (formattedData.client) {
      requests.push(createReplaceTextRequest(formattedData.client, '{{CLIENT_NAME}}'));
    }

    // Replace date
    if (formattedData.date) {
      requests.push(createReplaceTextRequest(formattedData.date, '{{DATE}}'));
    }

    // Replace entries
    if (formattedData.entries && Array.isArray(formattedData.entries)) {
      const entriesText = formattedData.entries.map((entry: any) => 
        `${entry.description}\n${entry.time} @ ${entry.rate}\n${entry.amount}`
      ).join('\n\n');
      requests.push(createReplaceTextRequest(entriesText, '{{ENTRIES}}'));
    }

    // Replace total
    if (formattedData.total) {
      requests.push(createReplaceTextRequest(formattedData.total, '{{TOTAL}}'));
    }

    return requests;
  }
}; 