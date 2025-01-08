import { google } from 'googleapis';
import { JWT } from 'google-auth-library';
import { drive_v3 } from 'googleapis/build/src/apis/drive/v3';
import { useTemplateStore } from '@/src/store/templateStore';
import { templateMetadataService } from './templateMetadataService';
import { Readable } from 'stream';

// Initialize auth client
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive'],
});

// Initialize the Drive API
const drive = google.drive({ version: 'v3', auth });

const TEMPLATES_FOLDER_NAME = 'Invoice Templates';
const INVOICES_FOLDER_NAME = 'Invoices';

export interface Template {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  webViewLink: string;
  googleDocId?: string;  // ID of converted Google Doc version
}

interface TemplateMetadata {
  originalId: string;
  googleDocId: string;
}

export const templateService = {
  async ensureFoldersExist() {
    try {
      // Check if Templates folder exists
      let templatesFolder = await this.findFolder(TEMPLATES_FOLDER_NAME);
      if (!templatesFolder) {
        templatesFolder = await this.createFolder(TEMPLATES_FOLDER_NAME);
      }

      // Check if Invoices folder exists
      let invoicesFolder = await this.findFolder(INVOICES_FOLDER_NAME);
      if (!invoicesFolder) {
        invoicesFolder = await this.createFolder(INVOICES_FOLDER_NAME);
      }

      return {
        templatesFolderId: templatesFolder.id!,
        invoicesFolderId: invoicesFolder.id!,
      };
    } catch (error) {
      console.error('Error ensuring folders exist:', error);
      throw error;
    }
  },

  async findFolder(name: string): Promise<drive_v3.Schema$File | null> {
    try {
      const response = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`,
        fields: 'files(id, name)',
      });

      return response.data.files?.[0] || null;
    } catch (error) {
      console.error('Error finding folder:', error);
      throw error;
    }
  },

  async createFolder(name: string): Promise<drive_v3.Schema$File> {
    try {
      const response = await drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      return response.data;
    } catch (error) {
      console.error('Error creating folder:', error);
      throw error;
    }
  },

  async uploadTemplate(file: File): Promise<TemplateMetadata> {
    try {
      console.log('Starting template upload for file:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      const { templatesFolderId } = await this.ensureFoldersExist();
      console.log('Templates folder ID:', templatesFolderId);

      // Convert File to Buffer and then to Readable stream
      console.log('Converting file to stream...');
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const stream = Readable.from(buffer);
      console.log('File converted to stream');

      // Upload original file
      console.log('Uploading file to Google Drive...');
      const uploadResponse = await drive.files.create({
        requestBody: {
          name: file.name,
          parents: [templatesFolderId],
          description: 'Invoice template file'
        },
        media: {
          mimeType: file.type,
          body: stream,
        },
        fields: 'id, name, mimeType, webViewLink',
      });

      console.log('File uploaded successfully:', uploadResponse.data);
      const originalId = uploadResponse.data.id!;

      // Make the file publicly accessible
      console.log('Setting public access permissions...');
      await drive.permissions.create({
        fileId: originalId,
        requestBody: {
          role: 'writer',
          type: 'anyone'
        }
      });

      // Convert to Google Doc if not already
      console.log('Converting to Google Doc...');
      const googleDocId = await this.convertToGoogleDoc(originalId, templatesFolderId);
      console.log('Converted to Google Doc, ID:', googleDocId);

      // Make the Google Doc publicly accessible with edit permissions
      await drive.permissions.create({
        fileId: googleDocId,
        requestBody: {
          role: 'writer',
          type: 'anyone'
        }
      });

      const metadata = { originalId, googleDocId };
      console.log('Storing template metadata:', metadata);
      
      // Store metadata both client and server-side
      if (typeof window !== 'undefined') {
        useTemplateStore.getState().storeTemplateMetadata(metadata);
      }
      await templateMetadataService.updateMetadata(metadata);
      
      console.log('Template metadata stored successfully');

      return metadata;
    } catch (error) {
      console.error('Error uploading template:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  },

  async convertToGoogleDoc(fileId: string, folderId: string): Promise<string> {
    try {
      console.log('Getting file metadata for conversion:', fileId);
      // Get the file's metadata
      const file = await drive.files.get({
        fileId,
        fields: 'mimeType, name',
      });
      console.log('File metadata:', file.data);

      if (file.data.mimeType === 'application/vnd.google-apps.document') {
        console.log('File is already a Google Doc');
        return fileId;
      }

      console.log('Converting file to Google Doc...');
      // Copy the file as a Google Doc
      const response = await drive.files.copy({
        fileId,
        requestBody: {
          mimeType: 'application/vnd.google-apps.document',
          name: `${file.data.name} (Google Doc)`,
          parents: [folderId],
        },
        fields: 'id',
      });
      console.log('File converted successfully:', response.data);

      return response.data.id!;
    } catch (error) {
      console.error('Error converting to Google Doc:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  },

  async listTemplates(): Promise<Template[]> {
    try {
      // Get templates folder ID from cache if possible
      let templatesFolderId = await drive.files.list({
        q: `mimeType='application/vnd.google-apps.folder' and name='${TEMPLATES_FOLDER_NAME}' and trashed=false`,
        fields: 'files(id)',
        pageSize: 1
      }).then(res => res.data.files?.[0]?.id);

      if (!templatesFolderId) {
        // Only create if doesn't exist
        const folder = await this.createFolder(TEMPLATES_FOLDER_NAME);
        templatesFolderId = folder.id!;
      }
      
      // Get all files in one query with all needed fields
      const response = await drive.files.list({
        q: `'${templatesFolderId}' in parents and trashed=false`,
        fields: 'files(id, name, mimeType, createdTime, webViewLink, description)',
        orderBy: 'createdTime desc',
        pageSize: 100 // Limit to reasonable number
      });

      const files = response.data.files || [];
      
      // Get metadata in parallel with file listing
      const [serverMetadata, clientMetadata] = await Promise.all([
        templateMetadataService.getMetadata(),
        Promise.resolve(typeof window !== 'undefined' ? useTemplateStore.getState().templateMetadata : {})
      ]);
      
      // Map files to templates with metadata
      return files.map(file => ({
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        createdTime: file.createdTime!,
        webViewLink: file.webViewLink!,
        googleDocId: (clientMetadata[file.id!] || serverMetadata[file.id!])?.googleDocId
      }));

    } catch (error) {
      console.error('Error listing templates:', error);
      throw error;
    }
  },

  async createInvoiceFromTemplate(
    templateId: string,
    projectName: string,
    date: string
  ): Promise<string> {
    try {
      const { invoicesFolderId } = await this.ensureFoldersExist();

      // Get the Google Doc version of the template
      const metadata = useTemplateStore.getState().getTemplateMetadata(templateId);
      const sourceId = metadata?.googleDocId || templateId;

      const response = await drive.files.copy({
        fileId: sourceId,
        requestBody: {
          name: `${projectName} - Invoice - ${date}`,
          parents: [invoicesFolderId],
        },
        fields: 'id',
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error creating invoice from template:', error);
      throw error;
    }
  },

  // Replace localStorage-based functions with Zustand store
  async getDefaultTemplateId(): Promise<string | null> {
    // Try client-side first, fall back to server-side
    const clientId = typeof window !== 'undefined' 
      ? useTemplateStore.getState().defaultTemplateId
      : null;
    
    if (clientId) {
      // Verify the template still exists
      const metadata = await this.getTemplateMetadata(clientId);
      if (metadata) return clientId;
    }
    
    return templateMetadataService.getDefaultTemplateId();
  },

  async setDefaultTemplateId(templateId: string): Promise<void> {
    try {
      console.log('Setting default template ID:', templateId);
      
      // Get the template metadata first
      const metadata = await this.getTemplateMetadata(templateId);
      if (!metadata) {
        throw new Error('Template metadata not found');
      }

      // Update client-side store
      if (typeof window !== 'undefined') {
        useTemplateStore.getState().setDefaultTemplateId(templateId);
      }

      // Update server-side metadata
      await templateMetadataService.updateMetadata(metadata);
      
      console.log('Default template ID set successfully');
    } catch (error) {
      console.error('Error setting default template ID:', error);
      throw error;
    }
  },

  async getTemplateMetadata(originalId: string): Promise<TemplateMetadata | null> {
    console.log('Getting template metadata for:', originalId);
    
    // Try client-side first
    if (typeof window !== 'undefined') {
      const clientMetadata = useTemplateStore.getState().getTemplateMetadata(originalId);
      if (clientMetadata) {
        console.log('Found client-side metadata:', clientMetadata);
        return clientMetadata;
      }
    }
    
    // Fall back to server-side
    const serverMetadata = await templateMetadataService.getMetadata();
    console.log('Server-side metadata:', serverMetadata);
    
    if (serverMetadata[originalId]) {
      console.log('Found server-side metadata for template:', serverMetadata[originalId]);
      return serverMetadata[originalId];
    }

    // If not found in either place, try to find it directly in Google Drive
    try {
      const file = await drive.files.get({
        fileId: originalId,
        fields: 'id, name, mimeType, description'
      });

      // If this is already a Google Doc, use it directly
      if (file.data.mimeType === 'application/vnd.google-apps.document') {
        const metadata = {
          originalId,
          googleDocId: originalId
        };
        console.log('Created new metadata for Google Doc:', metadata);
        return metadata;
      }

      // Otherwise, look for the converted version in the description
      const description = file.data.description;
      if (description && description.includes('googleDocId:')) {
        const googleDocId = description.split('googleDocId:')[1].trim();
        const metadata = {
          originalId,
          googleDocId
        };
        console.log('Found metadata in file description:', metadata);
        return metadata;
      }
    } catch (error) {
      console.error('Error getting file metadata from Drive:', error);
    }

    console.log('No metadata found for template:', originalId);
    return null;
  },

  async deleteTemplate(templateId: string): Promise<void> {
    try {
      console.log('Deleting template:', templateId);
      
      // Get metadata to also delete the Google Doc version
      const metadata = await this.getTemplateMetadata(templateId);
      
      // Delete original file
      await drive.files.delete({
        fileId: templateId
      });
      
      // Delete Google Doc version if it exists
      if (metadata?.googleDocId && metadata.googleDocId !== templateId) {
        await drive.files.delete({
          fileId: metadata.googleDocId
        });
      }
      
      // Remove from client-side store if available
      if (typeof window !== 'undefined') {
        const store = useTemplateStore.getState();
        const currentMetadata = { ...store.templateMetadata };
        delete currentMetadata[templateId];
        store.setTemplateMetadata(currentMetadata);
        
        // If this was the default template, clear it
        if (store.defaultTemplateId === templateId) {
          store.setDefaultTemplateId(null);
        }
      }
      
      // Remove from server-side metadata
      const serverMetadata = await templateMetadataService.getMetadata();
      if (serverMetadata[templateId]) {
        const updatedMetadata = { ...serverMetadata };
        delete updatedMetadata[templateId];
        
        // Get the first remaining template as the new default if this was the default
        const remainingTemplateIds = Object.keys(updatedMetadata);
        const newDefaultId = remainingTemplateIds.length > 0 ? remainingTemplateIds[0] : null;
        
        if (newDefaultId) {
          await templateMetadataService.updateMetadata(updatedMetadata[newDefaultId]);
        }
      }
      
      console.log('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  }
}; 