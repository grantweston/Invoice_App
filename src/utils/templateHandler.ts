import { 
  Document, 
  Paragraph, 
  Table, 
  TableRow, 
  TableCell, 
  TextRun, 
  HeadingLevel, 
  convertInchesToTwip,
  WidthType,
  Packer,
  SectionType
} from 'docx';
import { DetailedInvoice, WorkCategory } from '@/src/types';
import { extractDocxContent } from './docxExtractor';
import docx4js from 'docx4js';

interface TemplatePositions {
  clientInfo: {
    name: { line: number, indent: number },
    address: { line: number, indent: number },
    clientNumber: { line: number, indent: number }
  },
  invoiceDetails: {
    number: { line: number, indent: number },
    date: { line: number, indent: number }
  },
  workItems: {
    startLine: number,
    columns: {
      description: number,
      hours: number,
      rate: number,
      amount: number
    }
  },
  totals: {
    subtotal: { line: number, indent: number },
    adjustments: { line: number, indent: number },
    total: { line: number, indent: number }
  }
}

// These would be calibrated to match the Eisner Amper template
const DEFAULT_POSITIONS: TemplatePositions = {
  clientInfo: {
    name: { line: 5, indent: 72 },
    address: { line: 6, indent: 72 },
    clientNumber: { line: 7, indent: 72 }
  },
  invoiceDetails: {
    number: { line: 5, indent: 432 },
    date: { line: 6, indent: 432 }
  },
  workItems: {
    startLine: 15,
    columns: {
      description: 72,
      hours: 300,
      rate: 372,
      amount: 444
    }
  },
  totals: {
    subtotal: { line: -3, indent: 444 },  // Negative means from bottom
    adjustments: { line: -2, indent: 444 },
    total: { line: -1, indent: 444 }
  }
};

export async function fillTemplate(
  template: Buffer,
  invoice: DetailedInvoice,
  positions: TemplatePositions = DEFAULT_POSITIONS
): Promise<Buffer> {
  try {
    // Load the template
    const doc = await docx4js.load(template);
    const content = await doc.render();
    
    // Replace placeholders in the template
    content.forEach((item: any, index: number) => {
      if (typeof item === 'string') {
        // Replace client info
        content[index] = item
          .replace(/{client name}/g, invoice.client.name)
          .replace(/{client address}/g, invoice.client.address)
          .replace(/{client number}/g, invoice.client.clientNumber || '')
          .replace(/{Invoice Number}/g, invoice.invoiceNumber)
          .replace(/{day, month, year}/g, formatDate(invoice.dateRange.end))
          .replace(/{Start Date}/g, formatDate(invoice.dateRange.start))
          .replace(/{End Date}/g, formatDate(invoice.dateRange.end))
          .replace(/{Amount}/g, formatCurrency(invoice.totalAmount));
      }
    });

    // Add second page for details
    content.push('\f'); // Page break
    content.push('Detailed Work Items\n\n');

    // Add categorized work items
    invoice.categories.forEach(category => {
      content.push(`${category.name}\n`);
      
      [...category.entries, ...category.activities].forEach(item => {
        const hours = Number(item.timeInMinutes) / 60;
        const hourlyRate = 'hourlyRate' in item ? 
          (typeof item.hourlyRate === 'string' ? 
            parseFloat(item.hourlyRate) : Number(item.hourlyRate)) : 0;
        const amount = hours * hourlyRate;
        
        content.push(
          `${item.description}\n` +
          `Hours: ${formatNumber(hours, 2)}\n` +
          `Rate: ${hourlyRate ? formatCurrency(hourlyRate) : 'N/A'}\n` +
          `Amount: ${formatCurrency(amount)}\n\n`
        );
      });

      content.push(
        `${category.name} Total: ${formatCurrency(category.totalAmount)}\n\n`
      );
    });

    // Save the modified document
    await doc.save(content);
    const buffer = await doc.getBuffer();
    
    return buffer;
  } catch (error) {
    console.error('Failed to fill template:', error);
    throw new Error('Failed to generate invoice');
  }
}

function createWorkItemsTable(
  categories: WorkCategory[],
  columns: TemplatePositions['workItems']['columns']
): Table {
  const rows: TableRow[] = [];
  
  categories.forEach(category => {
    // Add category header
    rows.push(new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({
            text: category.name,
            heading: HeadingLevel.HEADING_2
          })]
        })
      ]
    }));
    
    // Add work items
    [...category.entries, ...category.activities].forEach(item => {
      const hours = Number(item.timeInMinutes) / 60;
      const hourlyRate = 'hourlyRate' in item ? 
        (typeof item.hourlyRate === 'string' ? 
          parseFloat(item.hourlyRate) : Number(item.hourlyRate)) : 0;
      const amount = hours * hourlyRate;
      
      rows.push(new TableRow({
        children: [
          new TableCell({ children: [new Paragraph(item.description)] }),
          new TableCell({ children: [new Paragraph(formatNumber(hours, 2))] }),
          new TableCell({ 
            children: [new Paragraph('hourlyRate' in item ? 
              formatCurrency(hourlyRate) : '')] 
          }),
          new TableCell({ children: [new Paragraph(formatCurrency(amount))] })
        ]
      }));
    });
    
    // Add category total
    const totalMinutes = typeof category.totalMinutes === 'string' ? 
      parseFloat(category.totalMinutes) : Number(category.totalMinutes);
    const totalHours = totalMinutes / 60;
    
    rows.push(new TableRow({
      children: [
        new TableCell({ children: [new Paragraph(`${category.name} Total`)] }),
        new TableCell({ children: [new Paragraph(formatNumber(totalHours, 2))] }),
        new TableCell({ children: [new Paragraph('')] }),
        new TableCell({ children: [new Paragraph(formatCurrency(category.totalAmount))] })
      ]
    }));
  });
  
  return new Table({
    rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE
    },
    columnWidths: [
      convertInchesToTwip(columns.description),
      convertInchesToTwip(columns.hours),
      convertInchesToTwip(columns.rate),
      convertInchesToTwip(columns.amount)
    ]
  });
}

function createParagraph(indent: number, text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun(text)],
    indent: { start: convertInchesToTwip(indent) }
  });
}

// Helper functions
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatNumber(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
} 