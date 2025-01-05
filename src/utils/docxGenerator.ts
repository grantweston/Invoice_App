import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType } from 'docx';
import { WIPEntry, DailyActivity, DetailedInvoice, WorkCategory } from '@/src/types';
import { generateDetailedInvoice } from '@/src/services/invoiceDetailService';

interface InvoiceData {
  client: {
    name: string;
    address: string;
  };
  invoiceNumber: string;
  dateRange: {
    start: string;
    end: string;
  };
  wipEntries: WIPEntry[];
  dailyActivities: DailyActivity[];
}

function generateSecondPage(invoice: DetailedInvoice): Paragraph[] {
  const elements: Paragraph[] = [
    // Header
    new Paragraph({
      children: [
        new TextRun({
          text: 'Eisner Advisory Group LLC',
          bold: true,
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({ text: invoice.client.name }),
        new TextRun({ text: '\nClient no - ' + (invoice.client.clientNumber || '') }),
        new TextRun({ text: '\n' + invoice.invoiceNumber }),
        new TextRun({ text: '\nPage 2' }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: '\nProfessional services rendered in connection with:\n\n',
          bold: true,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `Work performed during the period ${invoice.dateRange.start} to ${invoice.dateRange.end}.\n\n`,
        }),
      ],
    }),
  ];

  // Add each category
  invoice.categories.forEach(category => {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: category.name.toUpperCase(),
            bold: true,
          }),
          new TextRun({ text: category.description ? ': ' + category.description : '' }),
        ],
      })
    );

    // Add WIP entries
    category.entries.forEach(entry => {
      if (entry.entities) {
        entry.entities.forEach(entity => {
          elements.push(
            new Paragraph({
              indent: { left: 360 }, // 0.25 inch indent
              children: [new TextRun({ text: `• ${entity}` })],
            })
          );
        });
      }
      if (entry.details) {
        entry.details.forEach(detail => {
          elements.push(
            new Paragraph({
              indent: { left: 720 }, // 0.5 inch indent
              children: [new TextRun({ text: `- ${detail}` })],
            })
          );
        });
      }
    });

    // Add daily activities if any
    category.activities.forEach(activity => {
      elements.push(
        new Paragraph({
          indent: { left: 360 },
          children: [new TextRun({ text: `• ${activity.description}` })],
        })
      );
    });

    elements.push(new Paragraph({ text: '' })); // Add spacing
  });

  // Add financial summary
  if (invoice.adjustments || invoice.retainerAmount) {
    elements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `Amount: `, bold: true }),
          new TextRun({ text: `$${invoice.totalAmount.toFixed(2)}` }),
        ],
      })
    );

    if (invoice.adjustments) {
      invoice.adjustments.forEach(adj => {
        elements.push(
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `${adj.description}: ` }),
              new TextRun({ text: `$${adj.amount.toFixed(2)}` }),
            ],
          })
        );
      });
    }

    if (invoice.retainerAmount) {
      elements.push(
        new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: `Less Retainer Payment: ` }),
            new TextRun({ text: `($${invoice.retainerAmount.toFixed(2)})` }),
          ],
        })
      );
    }

    const finalAmount = invoice.totalAmount - (invoice.retainerAmount || 0);
    elements.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({ text: `Amount Due: `, bold: true }),
          new TextRun({ text: `$${finalAmount.toFixed(2)}` }),
        ],
      })
    );
  }

  return elements;
}

async function generateInvoiceDoc(data: InvoiceData): Promise<Buffer> {
  // Generate detailed invoice data
  const detailedInvoice = await generateDetailedInvoice(
    data.client,
    data.invoiceNumber,
    data.dateRange,
    data.wipEntries,
    data.dailyActivities
  );

  const doc = new Document({
    sections: [
      {
        // First page (existing invoice)
        properties: {},
        children: [
          // Header with company info
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: '733 Third Avenue\nNew York, NY 10017-2703\nT 212.949.8700\nF 212.891.4100',
                size: 20,
              }),
            ],
          }),

          // Client Info
          new Paragraph({
            children: [
              new TextRun({
                text: data.client.name + '\n' + data.client.address,
                size: 24,
              }),
            ],
          }),

          // Invoice Number
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({
                text: `Invoice: ${data.invoiceNumber}`,
                size: 24,
                bold: true,
              }),
            ],
          }),

          // Date Range
          new Paragraph({
            children: [
              new TextRun({
                text: `Professional services rendered in connection with ${data.dateRange.start}-${data.dateRange.end}:`,
                size: 24,
              }),
            ],
          }),

          // WIP Entries Table
          new Table({
            width: {
              size: 100,
              type: 'pct',
            },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: 'Description' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Hours' })] }),
                  new TableCell({ children: [new Paragraph({ text: 'Amount' })] }),
                ],
              }),
              ...data.wipEntries.map(entry => 
                new TableRow({
                  children: [
                    new TableCell({ 
                      children: [new Paragraph({ text: entry.description })]
                    }),
                    new TableCell({ 
                      children: [new Paragraph({ text: (entry.timeInMinutes / 60).toFixed(2) })]
                    }),
                    new TableCell({ 
                      children: [new Paragraph({ 
                        text: `$${((entry.timeInMinutes / 60) * entry.hourlyRate).toFixed(2)}` 
                      })]
                    }),
                  ],
                })
              ),
            ],
          }),

          // Daily Activities Section
          new Paragraph({
            children: [
              new TextRun({
                text: '\nDaily Activities:',
                bold: true,
                size: 24,
              }),
            ],
          }),
          ...data.dailyActivities.map(activity => 
            new Paragraph({
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: `${activity.description} (${activity.timeInMinutes} minutes)`,
                  size: 24,
                }),
              ],
            })
          ),

          // Payment Instructions
          new Paragraph({
            children: [
              new TextRun({
                text: '\nPLEASE RETURN BOTTOM PORTION WITH PAYMENT - THANK YOU',
                bold: true,
                size: 24,
              }),
            ],
          }),
        ],
      },
      {
        // Second page (detailed breakdown)
        properties: {},
        children: await generateSecondPage(detailedInvoice),
      },
    ],
  });

  return await Packer.toBuffer(doc);
}

export async function generateInvoice(data: InvoiceData) {
  try {
    const docxBuffer = await generateInvoiceDoc(data);
    return docxBuffer;
  } catch (error) {
    console.error('Failed to generate invoice:', error);
    throw error;
  }
} 