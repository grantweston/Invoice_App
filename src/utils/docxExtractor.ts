import { Document, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth';
import { JSDOM } from 'jsdom';

export interface DocxContent {
  text: string;
  html: string;
  formatting: {
    fonts: Set<string>;
    sizes: Set<number>;
    styles: {
      bold: boolean;
      italic: boolean;
      alignment: string;
    }[];
  };
}

export async function extractDocxContent(buffer: Buffer): Promise<DocxContent> {
  try {
    // Extract text content
    const textResult = await mammoth.extractRawText({ buffer });
    const htmlResult = await mammoth.convertToHtml({ buffer });

    // Parse the HTML to extract formatting
    const formatting = {
      fonts: new Set<string>(),
      sizes: new Set<number>(),
      styles: [] as { bold: boolean; italic: boolean; alignment: string }[]
    };

    // Use JSDOM to parse HTML
    const dom = new JSDOM(htmlResult.value);
    const { document } = dom.window;
    
    // Collect styles
    document.querySelectorAll('p, h1, h2, strong, em').forEach(element => {
      const style = element.getAttribute('style') || '';
      const classes = element.classList;

      formatting.styles.push({
        bold: element.tagName === 'STRONG' || classes.contains('bold'),
        italic: element.tagName === 'EM' || classes.contains('italic'),
        alignment: style.includes('text-align') ? 
          style.match(/text-align:\s*(\w+)/)![1] : 'left'
      });
    });

    return {
      text: textResult.value,
      html: htmlResult.value,
      formatting
    };
  } catch (error) {
    console.error('Failed to extract DOCX content:', error);
    throw new Error('DOCX extraction failed');
  }
}

export function analyzeDocxStructure(content: DocxContent) {
  const structure = {
    sections: [] as { start: number; end: number; type: string }[],
    placeholders: [] as string[],
    tables: [] as { row: number; col: number; content: string }[]
  };

  // Extract placeholders
  const placeholderRegex = /{([^}]+)}/g;
  let match;
  while ((match = placeholderRegex.exec(content.text)) !== null) {
    structure.placeholders.push(match[1]);
  }

  // Parse HTML to find sections and tables
  const dom = new JSDOM(content.html);
  const { document } = dom.window;
  
  // Find sections based on headers or style changes
  let currentSection = { start: 0, type: 'header', level: 0 };
  let lineNumber = 0;

  document.body.childNodes.forEach((node) => {
    if (node.nodeType === node.ELEMENT_NODE) {
      const element = node as Element;
      
      // Detect section changes
      if (element.tagName.match(/^H[1-6]$/)) {
        // End previous section
        structure.sections.push({
          start: currentSection.start,
          end: lineNumber - 1,
          type: currentSection.type
        });

        // Start new section
        currentSection = {
          start: lineNumber,
          type: element.textContent?.trim() || 'unknown',
          level: parseInt(element.tagName[1])
        };
      }

      // Detect tables
      if (element.tagName === 'TABLE') {
        const rows = element.getElementsByTagName('tr');
        Array.from(rows).forEach((row, rowIndex) => {
          const cells = row.getElementsByTagName('td');
          Array.from(cells).forEach((cell, colIndex) => {
            structure.tables.push({
              row: rowIndex,
              col: colIndex,
              content: cell.textContent || ''
            });
          });
        });
      }

      lineNumber++;
    }
  });

  // Close final section
  structure.sections.push({
    start: currentSection.start,
    end: lineNumber,
    type: currentSection.type
  });

  return structure;
} 