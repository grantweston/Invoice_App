import { NextResponse } from 'next/server';
import { getFile } from '@/src/services/fileStorage';
import { convertHtmlToDocx } from '@/src/utils/docxConverter';

export async function POST(request: Request) {
  try {
    const { templateId, client, invoiceNumber, dateRange, wipEntries, dailyActivities } = await request.json();

    // Get template file
    const templateData = await getFile(templateId);
    if (!templateData) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Create invoice content
    const invoiceContent = `
      <h1>Invoice ${invoiceNumber}</h1>
      <h2>Client: ${client.name}</h2>
      <p>Period: ${dateRange.start} - ${dateRange.end}</p>
      
      <h3>Work Items</h3>
      ${wipEntries.map(entry => `
        <div>
          <p>${entry.description}</p>
          <p>Time: ${entry.timeInMinutes / 60} hours @ $${entry.hourlyRate}/hr</p>
          <p>Amount: $${(entry.timeInMinutes / 60) * entry.hourlyRate}</p>
        </div>
      `).join('')}
      
      <h3>Daily Activities</h3>
      ${dailyActivities.map(activity => `
        <p>${activity.description} (${activity.timeInMinutes} minutes)</p>
      `).join('')}
    `;

    // Convert to DOCX
    const docxBuffer = await convertHtmlToDocx(invoiceContent);

    return new NextResponse(docxBuffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="invoice-${invoiceNumber}.docx"`
      }
    });
  } catch (error) {
    console.error('Failed to generate invoice:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}

// Prevent GET requests
export async function GET() {
  return new NextResponse(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      'Content-Type': 'application/json'
    }
  });
} 