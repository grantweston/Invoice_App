import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { templateService } from './templateService';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.0-flash-exp",
  generationConfig: {
    temperature: 0.1,  // More precise outputs
    topP: 0.1         // More focused on likely completions
  }
});
console.log('🤖 Initialized Gemini 2.0 flash-exp model');

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

interface LogEntry {
  description: string;
  timeInMinutes: number;
  hourlyRate: number;
  date: string;
  category?: string;
}

interface AnalyzedInvoiceData {
  categories: Array<{
    name: string;
    subtasks: Array<{
      description: string;
      entries: LogEntry[];
      totalTime: string;
      totalAmount: string;
    }>;
    categoryTotal: string;
  }>;
  summary: {
    totalHours: string;
    totalAmount: string;
    periodStart: string;
    periodEnd: string;
    mainDeliverables: string[];
  };
}

export const invoiceService = {
  async generateInvoice(data: InvoiceData): Promise<string> {
    try {
      console.log('📄 Starting invoice generation for client:', data.client);
      
      // First pass: Analyze the logs
      console.log('🧠 Analyzing work logs...');
      const analyzedData = await this.analyzeLogEntries(data.entries);
      console.log('✅ Log analysis complete');

      // Get template and create new document
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
        `${data.client} Invoice - ${date}`,
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

      // Get document structure
      console.log('📖 Fetching document structure...');
      const doc = await docs.documents.get({
        documentId: newDocId
      });
      console.log('📑 Document structure retrieved');

      // Send document directly to Gemini for analysis
      const documentEditPrompt = `You are a billing expert at a prestigious consulting firm. Your task is to edit a Google Doc invoice template using the Google Docs API.

CONTEXT:
- Client: ${data.client}
- Period: ${analyzedData.summary.periodStart} to ${analyzedData.summary.periodEnd}
- Total Amount: ${analyzedData.summary.totalAmount}
- Total Hours: ${analyzedData.summary.totalHours}
- Main Deliverables: ${analyzedData.summary.mainDeliverables.join(", ")}

DETAILED BREAKDOWN:
${JSON.stringify(analyzedData.categories, null, 2)}

YOUR TASK:
1. Analyze the document structure provided below
2. Generate a JSON array of Google Docs API requests to update the document
3. Return ONLY the JSON array, no other text
4. IMPORTANT: Do not generate empty replacements - skip any fields you don't have values for

REQUIRED FORMAT:
[
  {
    "replaceAllText": {
      "containsText": { "text": "{client name}" },
      "replaceText": "Actual Client Name"
    }
  }
]

RULES:
- Only include replacements where you have actual content to insert
- Skip any placeholders where you don't have a value
- Never use empty strings as replacement text
- Ensure all text replacements are meaningful

DOCUMENT STRUCTURE:
${JSON.stringify(doc.data, null, 2)}

Return ONLY a JSON array of Google Docs API requests. No other text or explanation.`;

      console.log('🤖 Sending document to Gemini for analysis...');
      const result = await model.generateContent([
        { text: documentEditPrompt }
      ]);
      const response = result.response.text();
      console.log('✅ Received response from Gemini');
      
      // Parse and validate the edit requests
      let requests;
      try {
        // First try: direct JSON parse
        requests = JSON.parse(response.trim());
        console.log('📝 Successfully parsed Gemini response into', requests.length, 'edit requests');
      } catch (e) {
        console.warn('⚠️ Initial JSON parse failed, attempting to extract JSON array');
        // Second try: find anything that looks like a JSON array
        const jsonMatch = response.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (!jsonMatch) {
          console.error('❌ Could not extract valid JSON array from response');
          console.error('Raw response:', response);
          throw new Error('Invalid response format from Gemini');
        }
        requests = JSON.parse(jsonMatch[0].trim());
        console.log('📝 Successfully extracted and parsed', requests.length, 'edit requests');
      }

      // Validate each request has required fields and non-empty values
      requests = requests.filter(request => {
        if (!request.replaceAllText?.containsText?.text || !request.replaceAllText?.replaceText) {
          console.warn('⚠️ Skipping invalid request:', request);
          return false;
        }
        if (request.replaceAllText.replaceText.trim() === '') {
          console.warn('⚠️ Skipping empty replacement:', request);
          return false;
        }
        return true;
      });

      if (requests.length === 0) {
        console.error('❌ No valid requests after filtering');
        throw new Error('No valid edit requests generated');
      }

      console.log('✅ Validated', requests.length, 'edit requests');

      // Apply the edits
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
  },

  async analyzeLogEntries(logEntries: LogEntry[]): Promise<AnalyzedInvoiceData> {
    const logAnalysisPrompt = `You are a senior billing specialist at a consulting firm. Your task is to analyze work logs and organize them into a clear, professional invoice structure.

INPUT:
These are daily work logs containing:
- Task descriptions
- Time spent (in minutes)
- Hourly rates
- Dates
- Other relevant details

ANALYSIS STEPS:
1. First, identify the major project components:
   - Look for recurring themes in the work
   - Find related tasks and subtasks
   - Identify project milestones
   - Note any special billing considerations

2. Group tasks intelligently:
   - Find natural categories (e.g., "Development", "Meetings", "Research")
   - Identify subtasks within each category
   - Look for task dependencies or sequences
   - Group related work even if done on different days

3. Create billing hierarchy:
   EXAMPLE STRUCTURE:
   {
     "categories": [
       {
         "name": "Project Planning",
         "subtasks": [
           {
             "description": "Initial client meeting",
             "entries": [/* related log entries */],
             "totalTime": "120 minutes",
             "totalAmount": "$200.00"
           }
         ],
         "categoryTotal": "$500.00"
       }
     ],
     "summary": {
       "totalHours": "10.5",
       "totalAmount": "$1,050.00",
       "periodStart": "2024-01-01",
       "periodEnd": "2024-01-31",
       "mainDeliverables": ["Feature A", "Documentation"]
     }
   }

4. Consider client perspective:
   - What tells the clearest story of work completed?
   - How to show value delivered?
   - What grouping makes most sense to client?
   - How to make costs clearly justified?

5. Identify key information for page 1:
   - Total amount
   - Project summary
   - Main deliverables
   - Billing period

6. Organize details for page 2:
   - Group similar tasks
   - Show progression of work
   - Highlight major milestones
   - Present clear time/cost breakdown

WORK LOGS TO ANALYZE:
${JSON.stringify(logEntries, null, 2)}

Return ONLY a JSON structure that follows the example format exactly.
Think like a billing professional who needs to:
1. Justify the value delivered
2. Make the invoice easy to review
3. Tell a clear story of the work
4. Make costs transparent and logical
5. Group related work sensibly`;

    try {
      console.log('🧠 Analyzing work logs...');
      const result = await model.generateContent(logAnalysisPrompt);
      const response = result.response.text();
      
      // Parse the response into structured data
      let analyzedData: AnalyzedInvoiceData;
      try {
        analyzedData = JSON.parse(response);
        console.log('✅ Successfully analyzed logs into', 
          analyzedData.categories.length, 'categories');
      } catch (e) {
        console.warn('⚠️ Initial JSON parse failed, attempting to extract JSON');
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          console.error('❌ Could not extract valid JSON from analysis');
          throw new Error('Invalid analysis format from Gemini');
        }
        analyzedData = JSON.parse(jsonMatch[0]);
        console.log('✅ Successfully extracted and parsed log analysis');
      }

      return analyzedData;
    } catch (error) {
      console.error('❌ Error analyzing logs:', error);
      throw error;
    }
  }
}; 