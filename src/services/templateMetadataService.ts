import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

interface TemplateMetadata {
  originalId: string;
  googleDocId: string;
}

interface MetadataFile {
  templates: Record<string, TemplateMetadata>;
  defaultTemplateId: string | null;
}

// Initialize auth client
const auth = new JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/drive.appdata'],
});

// Initialize the Drive API
const drive = google.drive({ version: 'v3', auth });

const METADATA_FILE_NAME = 'template_metadata.json';

export const templateMetadataService = {
  async getMetadataFileId(): Promise<string | null> {
    try {
      const response = await drive.files.list({
        spaces: 'appDataFolder',
        q: `name='${METADATA_FILE_NAME}'`,
        fields: 'files(id)',
      });

      return response.data.files?.[0]?.id || null;
    } catch (error) {
      console.error('Error getting metadata file ID:', error);
      return null;
    }
  },

  async createMetadataFile(content: MetadataFile): Promise<string> {
    try {
      const response = await drive.files.create({
        requestBody: {
          name: METADATA_FILE_NAME,
          parents: ['appDataFolder'],
        },
        media: {
          mimeType: 'application/json',
          body: JSON.stringify(content),
        },
        fields: 'id',
      });

      return response.data.id!;
    } catch (error) {
      console.error('Error creating metadata file:', error);
      throw error;
    }
  },

  async getMetadata(): Promise<Record<string, TemplateMetadata>> {
    try {
      const fileId = await this.getMetadataFileId();
      if (!fileId) {
        return {};
      }

      const response = await drive.files.get({
        fileId,
        alt: 'media',
      });

      const data = response.data as MetadataFile;
      return data.templates || {};
    } catch (error) {
      console.error('Error getting metadata:', error);
      return {};
    }
  },

  async updateMetadata(metadata: TemplateMetadata): Promise<void> {
    try {
      let fileId = await this.getMetadataFileId();
      const currentMetadata = await this.getMetadata();
      
      const updatedMetadata: MetadataFile = {
        templates: {
          ...currentMetadata,
          [metadata.originalId]: metadata,
        },
        defaultTemplateId: metadata.originalId
      };

      console.log('Updating metadata file with:', updatedMetadata);

      if (fileId) {
        console.log('Updating existing metadata file:', fileId);
        await drive.files.update({
          fileId,
          media: {
            mimeType: 'application/json',
            body: JSON.stringify(updatedMetadata),
          },
        });
      } else {
        console.log('Creating new metadata file');
        fileId = await this.createMetadataFile(updatedMetadata);
        console.log('Created new metadata file:', fileId);
      }

      // Verify the update
      const verifyResponse = await drive.files.get({
        fileId: fileId!,
        alt: 'media',
      });
      console.log('Verified metadata update:', verifyResponse.data);
    } catch (error) {
      console.error('Error updating metadata:', error);
      throw error;
    }
  },

  async getDefaultTemplateId(): Promise<string | null> {
    try {
      const fileId = await this.getMetadataFileId();
      if (!fileId) {
        return null;
      }

      const response = await drive.files.get({
        fileId,
        alt: 'media',
      });

      const data = response.data as MetadataFile;
      return data.defaultTemplateId || null;
    } catch (error) {
      console.error('Error getting default template ID:', error);
      return null;
    }
  }
} 