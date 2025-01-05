import { TemplateAnalysis } from '@/src/types';

export async function analyzeTemplate(buffer: Buffer): Promise<TemplateAnalysis> {
  const formData = new FormData();
  formData.append('template', new Blob([buffer]));

  const response = await fetch('/api/analyze-template', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to analyze template');
  }

  return response.json();
}

export async function validateTemplate(template: TemplateAnalysis): Promise<boolean> {
  const response = await fetch('/api/validate-template', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(template)
  });

  if (!response.ok) {
    return false;
  }

  return response.json();
} 