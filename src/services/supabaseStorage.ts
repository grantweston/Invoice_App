import { supabase } from '@/src/lib/supabase'

const BUCKET_NAME = 'invoice-templates'

export async function uploadTemplate(id: string, file: File): Promise<void> {
  console.log('Starting Supabase upload:', { id, fileName: file.name, fileSize: file.size });
  
  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(`${id}.docx`, file, {
        upsert: true,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
    
    if (error) {
      console.error('Supabase upload error:', {
        name: error.name,
        message: error.message
      });
      throw error;
    }
    
    console.log('Supabase upload successful:', { path: data?.path });
  } catch (error) {
    console.error('Unexpected upload error:', error);
    throw error;
  }
}

export async function getTemplate(fileId: string) {
  console.log('Attempting to download template:', fileId);
  try {
    // First check if file exists by trying to download it directly
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .download(`${fileId}.docx`);

    if (error) {
      console.error('Error downloading template:', {
        error,
        name: error.name,
        message: error.message
      });
      
      // Try to list files to see what's available
      const { data: files, error: listError } = await supabase.storage
        .from(BUCKET_NAME)
        .list('', {
          limit: 100,
          offset: 0,
          sortBy: { column: 'name', order: 'asc' }
        });

      if (listError) {
        console.error('Error listing templates:', listError);
      } else {
        console.log('Files in bucket:', files.map(f => f.name));
      }
      
      return { data: null, error };
    }

    console.log('Template downloaded successfully:', {
      size: data?.size,
      type: data?.type
    });
    return { data, error: null };
  } catch (error: any) {
    console.error('Error in getTemplate:', {
      error,
      name: error?.name,
      message: error?.message
    });
    return { data: null, error };
  }
}

export async function listTemplates() {
  try {
    const { data: files, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (error) {
      console.error('Error listing templates:', error);
      return { files: [], error };
    }

    return { files: files.filter(f => f.name !== '.emptyFolderPlaceholder'), error: null };
  } catch (error: any) {
    console.error('Error listing templates:', error);
    return { files: [], error };
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([`${id}.docx`]);
  
  if (error) {
    console.error('Error deleting template:', {
      name: error.name,
      message: error.message
    });
    throw error;
  }
}

export async function getSignedUrl(id: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(`${id}.docx`, 60); // URL valid for 60 seconds
  
  if (error) {
    console.error('Error creating signed URL:', {
      name: error.name,
      message: error.message
    });
    throw error;
  }
  
  return data.signedUrl;
} 