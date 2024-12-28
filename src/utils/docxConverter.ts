import htmlDocx from 'html-docx-js';

export async function htmlToDocx(html: string): Promise<Buffer> {
  // Add default styling
  const styledHtml = `
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          td, th { border: 1px solid #ddd; padding: 8px; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        ${html}
      </body>
    </html>
  `;

  return Buffer.from(htmlDocx.asBlob(styledHtml));
} 