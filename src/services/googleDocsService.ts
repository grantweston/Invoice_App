import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

// Initialize auth client
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: [
    'https://www.googleapis.com/auth/documents',
    'https://www.googleapis.com/auth/drive',
  ],
});

// Initialize the Docs API
const docs = google.docs({ version: 'v1', auth });
const drive = google.drive({ version: 'v3', auth });

export interface CreateDocumentResponse {
  documentId: string;
  documentUrl: string;
}

export const googleDocsService = {
  async createDocument(title: string): Promise<CreateDocumentResponse> {
    try {
      // Create an empty document
      const createResponse = await docs.documents.create({
        requestBody: {
          title,
        },
      });

      const documentId = createResponse.data.documentId!;
      
      // Make the document publicly accessible with edit permissions
      await drive.permissions.create({
        fileId: documentId,
        requestBody: {
          role: 'writer',
          type: 'anyone',
        },
      });

      return {
        documentId,
        documentUrl: `https://docs.google.com/document/d/${documentId}/edit`,
      };
    } catch (error) {
      console.error('Error creating document:', error);
      throw error;
    }
  },

  async updateDocument(documentId: string, requests: any[]): Promise<void> {
    try {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests,
        },
      });
    } catch (error) {
      console.error('Error updating document:', error);
      throw error;
    }
  },

  async insertText(documentId: string, text: string, index: number = 1): Promise<void> {
    const requests = [{
      insertText: {
        location: {
          index,
        },
        text,
      },
    }];

    await this.updateDocument(documentId, requests);
  },

  async formatText(documentId: string, startIndex: number, endIndex: number, format: any): Promise<void> {
    const requests = [{
      updateTextStyle: {
        range: {
          startIndex,
          endIndex,
        },
        textStyle: format,
        fields: Object.keys(format).join(','),
      },
    }];

    await this.updateDocument(documentId, requests);
  },

  async getDocument(documentId: string) {
    try {
      const response = await docs.documents.get({
        documentId,
      });
      return response.data;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  },
}; 