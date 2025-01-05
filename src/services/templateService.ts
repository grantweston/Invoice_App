import { supabase } from '@/src/lib/supabaseClient';
import { Template, TemplateAnalysis } from '@/src/types';
import { analyzeTemplate } from './templateAnalyzer';
import { extractDocxContent } from '@/src/utils/docxExtractor';

export async function uploadAndAnalyzeTemplate(
  file: File,
  name: string
): Promise<Template> {
  try {
    // Generate unique ID
    const templateId = `template_${Date.now()}`;
    
    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('invoice-templates')
      .upload(`${templateId}.docx`, file);

    if (uploadError) {
      throw new Error(`Failed to upload template: ${uploadError.message}`);
    }

    // Get the uploaded file for analysis
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('invoice-templates')
      .download(`${templateId}.docx`);

    if (downloadError || !fileData) {
      throw new Error('Failed to retrieve uploaded template for analysis');
    }

    // Convert File to Buffer for analysis
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // Analyze template
    const analysis = await analyzeTemplate(buffer);

    // Create template record
    const template: Template = {
      id: templateId,
      name,
      analysis,
      lastUpdated: new Date().toISOString()
    };

    // Store template metadata in Supabase
    const { error: dbError } = await supabase
      .from('templates')
      .insert([template]);

    if (dbError) {
      throw new Error(`Failed to store template metadata: ${dbError.message}`);
    }

    return template;
  } catch (error) {
    console.error('Template upload and analysis failed:', error);
    throw error;
  }
}

export async function getTemplate(templateId: string): Promise<Template> {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (error || !data) {
    throw new Error(`Failed to retrieve template: ${error?.message}`);
  }

  return data as Template;
}

export async function updateTemplateAnalysis(
  templateId: string,
  analysis: TemplateAnalysis
): Promise<void> {
  const { error } = await supabase
    .from('templates')
    .update({ 
      analysis,
      lastUpdated: new Date().toISOString()
    })
    .eq('id', templateId);

  if (error) {
    throw new Error(`Failed to update template analysis: ${error.message}`);
  }
}

export async function analyzeTemplateFile(file: File): Promise<TemplateAnalysis> {
  const formData = new FormData();
  formData.append('template', file);

  const response = await fetch('/api/analyze-template', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to analyze template');
  }

  return response.json();
} 