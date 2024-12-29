import mammoth from 'mammoth';
import puppeteer from 'puppeteer';

export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  try {
    // Convert DOCX to HTML
    const { value: html } = await mammoth.convertToHtml({ buffer: docxBuffer });

    // Add some basic styling
    const styledHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              padding: 40px;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f8f9fa;
            }
            @page {
              margin: 20px;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;

    // Launch browser
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox']
    });

    try {
      // Create new page
      const page = await browser.newPage();
      await page.setContent(styledHtml, { waitUntil: 'networkidle0' });

      // Generate PDF
      const pdfData = await page.pdf({
        format: 'Letter',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });

      // Convert Uint8Array to Buffer
      return Buffer.from(pdfData);
    } finally {
      await browser.close();
    }
  } catch (error) {
    console.error('Error converting DOCX to PDF:', error);
    throw error;
  }
} 