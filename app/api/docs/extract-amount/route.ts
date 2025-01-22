import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

export async function POST(request: Request) {
  try {
    const { doc } = await request.json();

    // Extract all text content from the document
    const content = doc.body.content
      .map((item: any) => {
        if (item.paragraph?.elements) {
          return item.paragraph.elements
            .map((element: any) => element.textRun?.content || '')
            .join('');
        }
        if (item.table) {
          return item.table.tableRows
            ?.map((row: any) =>
              row.tableCells
                ?.map((cell: any) =>
                  cell.content
                    ?.map((content: any) =>
                      content.paragraph?.elements
                        ?.map((element: any) => element.textRun?.content || '')
                        .join('') || ''
                    )
                    .join(' ')
                )
                .join(' | ')
            )
            .join('\n');
        }
        return '';
      })
      .join('\n');

    console.log('📄 Document content:', content);

    const prompt = `You are an expert at analyzing invoice documents. Given the following document content, find the current amount due or total amount. Return ONLY the number, without any currency symbols or formatting. If multiple amounts are found, return the one that appears to be the final amount due.

Document content:
${content}

Return ONLY the number, for example: 23.33`;

    const result = await model.generateContent([{ text: prompt }]);
    const response = result.response.text().trim();
    console.log('🤖 Gemini response:', response);

    // Try to parse the response as a number
    const amount = parseFloat(response);
    if (isNaN(amount)) {
      console.error('❌ Could not parse amount from response:', response);
      return NextResponse.json({ error: 'Could not extract amount' }, { status: 400 });
    }

    console.log('💵 Extracted amount:', amount);
    return NextResponse.json({ amount });

  } catch (error) {
    console.error('Error extracting amount:', error);
    return NextResponse.json({ error: 'Failed to extract amount' }, { status: 500 });
  }
} 