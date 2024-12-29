import { Document, Packer, Paragraph, TextRun } from 'docx';

export async function convertHtmlToDocx(html: string): Promise<Buffer> {
  // Create a new document
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [
            new TextRun({
              text: html.replace(/<[^>]*>/g, ''), // Strip HTML tags for now
            }),
          ],
        }),
      ],
    }],
  });

  // Generate buffer
  return await Packer.toBuffer(doc);
} 