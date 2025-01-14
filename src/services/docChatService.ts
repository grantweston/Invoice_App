import { GoogleGenerativeAI } from "@google/generative-ai";
import { clientDocsService } from "./clientDocsService";
import { useWIPStore } from "@/src/store/wipStore";
import { useDailyLogs } from "@/src/store/dailyLogs";
import { GoogleDocument, StructuralElement, ParagraphElement, TextRun, TableCell } from '@/src/types/googleDocs';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const SYSTEM_PROMPT = `You are an expert billing assistant with deep knowledge of invoice structures and Google Docs editing. Your task is to help users edit and refine their invoice documents through natural conversation.

IMPORTANT: YOU MUST RESPOND WITH A JSON ARRAY OF GOOGLE DOCS API REQUESTS FIRST, followed by your explanation.

Your response should have this structure:
1. JSON array of edit requests
2. ✅ Changes Made: Brief description of what changes were made

Example response:
[
  {
    "replaceAllText": {
      "containsText": { "text": "search text" },
      "replaceText": "replacement text"
    }
  }
]

✅ Changes Made:
Describe what was changed

DOCUMENT STRUCTURE:
A Google Doc consists of these key components:
1. Body: The main container
2. StructuralElements: Components like paragraphs, tables, sections
3. InlineObjects: Embedded content like images
4. PositionedObjects: Floating content with specific positioning
5. Headers/Footers: Repeated content at page boundaries
6. Lists: Numbered or bulleted content with nesting
7. Tables: Grid-based content organization
8. Footnotes: Referenced supplementary content

DOCUMENT INDICES:
- All positions in the document use 0-based indices
- Indices count ALL characters, including invisible ones
- Each newline counts as a single character
- Table cells and structural elements affect index counting
- Headers and footers have their own index spaces

DOCUMENT EDITING CAPABILITIES:

1. Text & Content Operations:
   a) Replace Text:
   {
     "replaceAllText": {
       "containsText": {
         "text": "exact text to find",
         "matchCase": true
       },
       "replaceText": "new text"
     }
   }

   b) Delete Content:
   {
     "deleteContentRange": {
       "range": {
         "startIndex": number,
         "endIndex": number,
         "segmentId": string
       }
     }
   }

   c) Insert Text:
   {
     "insertText": {
       "location": {
         "index": number,
         "segmentId": string
       },
       "text": "new content"
     }
   }

2. Structural Operations:
   a) Create Paragraph:
   {
     "insertParagraph": {
       "location": {
         "index": number
       },
       "elements": [{
         "textRun": {
           "content": string,
           "textStyle": object
         }
       }]
     }
   }

   b) Create Section Break:
   {
     "insertSectionBreak": {
       "location": {
         "index": number
       },
       "sectionType": "NEXT_PAGE|CONTINUOUS|EVEN_PAGE|ODD_PAGE"
     }
   }

3. List Operations:
   a) Create List:
   {
     "createParagraphBullets": {
       "range": {
         "startIndex": number,
         "endIndex": number
       },
       "bulletPreset": "BULLET_DISC_CIRCLE_SQUARE|BULLET_DIAMONDX_ARROW3D_SQUARE|BULLET_CHECKBOX|NUMBERED_DECIMAL_NESTED|NUMBERED_UPPER_ALPHA_NESTED"
     }
   }

   b) Apply List Style:
   {
     "createNamedRange": {
       "name": string,
       "range": {
         "startIndex": number,
         "endIndex": number
       }
     }
   }

4. Table Operations:
   a) Insert Table:
   {
     "insertTable": {
       "rows": number,
       "columns": number,
       "location": {
         "index": number
       }
     }
   }

   b) Merge Cells:
   {
     "mergeCells": {
       "tableRange": {
         "tableCellLocation": {
           "tableStartLocation": {
             "index": number
           },
           "rowIndex": number,
           "columnIndex": number
         },
         "rowSpan": number,
         "columnSpan": number
       }
     }
   }

   c) Table Styles:
   {
     "updateTableCellStyle": {
       "tableRange": {
         "tableCellLocation": {
           "tableStartLocation": {
             "index": number
           },
           "rowIndex": number,
           "columnIndex": number
         },
         "rowSpan": number,
         "columnSpan": number
       },
       "tableCellStyle": {
         "backgroundColor": object,
         "borderLeft": object,
         "borderRight": object,
         "borderTop": object,
         "borderBottom": object,
         "paddingLeft": object,
         "paddingRight": object,
         "paddingTop": object,
         "paddingBottom": object,
         "contentAlignment": "TOP|MIDDLE|BOTTOM"
       },
       "fields": "backgroundColor,borderLeft,borderRight,borderTop,borderBottom,paddingLeft,paddingRight,paddingTop,paddingBottom,contentAlignment"
     }
   }

5. Formatting Operations:
   a) Text Style:
   {
     "updateTextStyle": {
       "range": {
         "startIndex": number,
         "endIndex": number,
         "segmentId": string
       },
       "textStyle": {
         "bold": boolean,
         "italic": boolean,
         "underline": boolean,
         "strikethrough": boolean,
         "fontSize": { "magnitude": number, "unit": "PT" },
         "weightedFontFamily": { "fontFamily": string, "weight": number },
         "baselineOffset": "NONE|SUPERSCRIPT|SUBSCRIPT",
         "foregroundColor": object,
         "backgroundColor": object,
         "link": { "url": string }
       },
       "fields": "bold,italic,underline,strikethrough,fontSize,weightedFontFamily,baselineOffset,foregroundColor,backgroundColor,link"
     }
   }

   b) Paragraph Style:
   {
     "updateParagraphStyle": {
       "range": {
         "startIndex": number,
         "endIndex": number
       },
       "paragraphStyle": {
         "namedStyleType": "NORMAL_TEXT|HEADING_1|HEADING_2|HEADING_3|HEADING_4|HEADING_5|HEADING_6|TITLE|SUBTITLE",
         "alignment": "START|CENTER|END|JUSTIFIED",
         "lineSpacing": number,
         "direction": "LEFT_TO_RIGHT|RIGHT_TO_LEFT",
         "spaceAbove": { "magnitude": number, "unit": "PT" },
         "spaceBelow": { "magnitude": number, "unit": "PT" },
         "borderBetween": object,
         "borderTop": object,
         "borderBottom": object,
         "borderLeft": object,
         "borderRight": object,
         "indentFirstLine": object,
         "indentStart": object,
         "indentEnd": object,
         "keepLinesTogether": boolean,
         "keepWithNext": boolean,
         "avoidWidowAndOrphan": boolean,
         "shading": object
       },
       "fields": "*"
     }
   }

6. Object Operations:
   a) Insert Inline Image:
   {
     "insertInlineImage": {
       "location": {
         "index": number
       },
       "uri": string,
       "objectSize": {
         "height": object,
         "width": object
       }
     }
   }

   b) Position Object:
   {
     "updatePositionedObjectPositioning": {
       "objectId": string,
       "positioning": {
         "layout": "BREAK_LEFT|BREAK_RIGHT|BREAK_BOTH|IN_LINE|WRAP_TEXT",
         "leftOffset": object,
         "topOffset": object
       },
       "fields": "layout,leftOffset,topOffset"
     }
   }

EDITING RULES:
1. DOCUMENT STRUCTURE:
   - Understand the hierarchical structure of elements
   - Respect section breaks and formatting boundaries
   - Maintain header/footer separation
   - Preserve list structures and numbering

2. INDEX HANDLING:
   - Always verify indices before operations
   - Account for invisible characters in index calculations
   - Consider structural elements in positioning
   - Handle segmentIds correctly for headers/footers

3. CONTENT SAFETY:
   - Verify exact text matches before replacement
   - Break complex changes into atomic operations
   - Preserve existing styles unless explicitly changing
   - Maintain document integrity (tables, lists, etc.)

4. FORMATTING CONSISTENCY:
   - Use named styles when possible
   - Maintain consistent paragraph formatting
   - Preserve table structure and styling
   - Keep consistent list formatting

RESPONSE FORMAT:
[
  {
    "replaceAllText": {
      "containsText": { "text": "exact existing text" },
      "replaceText": "new text"
    }
  }
]

✅ Changes Made:
Describe the changes you made

Remember:
- Start with JSON array of edit requests
- Verify document structure understanding
- Use correct indices and segmentIds
- Maintain document integrity
- Make atomic, verifiable changes
- Preserve styles and formatting
- Consider all structural elements`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ProcessedDocument {
  structure: {
    elements: ProcessedElement[];
    inlineObjects: Record<string, any>;
    lists: Record<string, any>;
    headers: Record<string, any>;
    footers: Record<string, any>;
    styles: Record<string, any>;
  };
  indices: {
    elementMap: Map<number, ProcessedElement>;
    textToIndex: Map<string, number[]>;
    listItems: Map<string, number[]>;
    tables: TableInfo[];
  };
}

interface ProcessedElement {
  type: 'paragraph' | 'table' | 'tableCell' | 'list' | 'sectionBreak';
  startIndex: number;
  endIndex: number;
  content?: string;
  style?: any;
  elements?: ProcessedElement[];
  listId?: string;
  nestingLevel?: number;
  rowIndex?: number;
  columnIndex?: number;
}

interface TableInfo {
  startIndex: number;
  endIndex: number;
  rows: number;
  columns: number;
  cells: {
    rowIndex: number;
    columnIndex: number;
    startIndex: number;
    endIndex: number;
  }[];
}

function processDocument(doc: GoogleDocument): ProcessedDocument {
  const processed: ProcessedDocument = {
    structure: {
      elements: [],
      inlineObjects: doc.inlineObjects || {},
      lists: doc.lists || {},
      headers: doc.headers || {},
      footers: doc.footers || {},
      styles: doc.namedStyles?.styles || []
    },
    indices: {
      elementMap: new Map(),
      textToIndex: new Map(),
      listItems: new Map(),
      tables: []
    }
  };

  function processStructuralElement(element: StructuralElement): ProcessedElement | null {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      const processedElement: ProcessedElement = {
        type: 'paragraph',
        startIndex: element.startIndex,
        endIndex: element.endIndex,
        style: paragraph.paragraphStyle,
        elements: []
      };

      if (paragraph.bullet) {
        processedElement.type = 'list';
        processedElement.listId = paragraph.bullet.listId;
        processedElement.nestingLevel = paragraph.bullet.nestingLevel;
        
        const listIndices = processed.indices.listItems.get(paragraph.bullet.listId) || [];
        listIndices.push(element.startIndex);
        processed.indices.listItems.set(paragraph.bullet.listId, listIndices);
      }

      paragraph.elements?.forEach(el => {
        const paragraphElement = processParagraphElement(el);
        if (paragraphElement) {
          processedElement.elements?.push(paragraphElement);
          
          // Map text content to indices for exact matching
          if (paragraphElement.content) {
            const indices = processed.indices.textToIndex.get(paragraphElement.content) || [];
            indices.push(paragraphElement.startIndex);
            processed.indices.textToIndex.set(paragraphElement.content, indices);
          }
        }
      });

      return processedElement;
    }

    if (element.table) {
      const table = element.table;
      const tableInfo: TableInfo = {
        startIndex: element.startIndex,
        endIndex: element.endIndex,
        rows: table.rows,
        columns: table.columns,
        cells: []
      };

      const processedElement: ProcessedElement = {
        type: 'table',
        startIndex: element.startIndex,
        endIndex: element.endIndex,
        style: table.tableStyle,
        elements: []
      };

      table.tableRows?.forEach((row, rowIndex) => {
        row.tableCells?.forEach((cell, columnIndex) => {
          const processedCell = processTableCell(cell, rowIndex, columnIndex);
          if (processedCell) {
            processedElement.elements?.push(processedCell);
            tableInfo.cells.push({
              rowIndex,
              columnIndex,
              startIndex: cell.startIndex,
              endIndex: cell.endIndex
            });
          }
        });
      });

      processed.indices.tables.push(tableInfo);
      return processedElement;
    }

    if (element.sectionBreak) {
      return {
        type: 'sectionBreak',
        startIndex: element.startIndex,
        endIndex: element.endIndex,
        style: element.sectionBreak.sectionStyle
      };
    }

    return null;
  }

  function processParagraphElement(element: ParagraphElement): ProcessedElement | null {
    if (element.textRun) {
      return {
        type: 'paragraph',
        startIndex: element.startIndex,
        endIndex: element.endIndex,
        content: element.textRun.content,
        style: element.textRun.textStyle
      };
    }
    return null;
  }

  function processTableCell(cell: TableCell, rowIndex: number, columnIndex: number): ProcessedElement | null {
    const processedCell: ProcessedElement = {
      type: 'tableCell',
      startIndex: cell.startIndex,
      endIndex: cell.endIndex,
      style: cell.tableCellStyle,
      elements: [],
      rowIndex,
      columnIndex
    };

    cell.content?.forEach(element => {
      const cellElement = processStructuralElement(element);
      if (cellElement) {
        processedCell.elements?.push(cellElement);
      }
    });

    return processedCell;
  }

  // Process the main document content
  doc.body.content.forEach(element => {
    const processedElement = processStructuralElement(element);
    if (processedElement) {
      processed.structure.elements.push(processedElement);
      processed.indices.elementMap.set(processedElement.startIndex, processedElement);
    }
  });

  return processed;
}

export const docChatService = {
  async processMessage(
    documentId: string,
    message: string,
    history: ChatMessage[]
  ): Promise<{ response: string; documentUpdated: boolean }> {
    try {
      // Get current document content
      const doc = await clientDocsService.getDocument(documentId);
      
      // Process document into a structured format with indices
      const processedDoc = processDocument(doc as GoogleDocument);
      
      // Get WIP entries and daily logs
      const wipEntries = useWIPStore.getState().entries;
      const dailyLogs = useDailyLogs.getState().logs;

      const prompt = `${SYSTEM_PROMPT}

CURRENT DOCUMENT STATE:
${Array.from(processedDoc.indices.elementMap.entries())
  .map(([_, element]) => 
    `${element.type.toUpperCase()}: ${element.startIndex}-${element.endIndex}${
      element.content ? ` Content: "${element.content}"` : ''
    }`
  )
  .join('\n')}

Table Structures:
${JSON.stringify(processedDoc.indices.tables, null, 2)}

List Structures:
${JSON.stringify(Array.from(processedDoc.indices.listItems.entries()), null, 2)}

Document Statistics:
- Total elements: ${processedDoc.structure.elements.length}
- Tables: ${processedDoc.indices.tables.length}
- Lists: ${processedDoc.indices.listItems.size}
- Inline objects: ${Object.keys(processedDoc.structure.inlineObjects).length}
- Headers: ${Object.keys(processedDoc.structure.headers).length}
- Footers: ${Object.keys(processedDoc.structure.footers).length}
- Named styles: ${processedDoc.structure.styles.length}

WIP Entries:
${JSON.stringify(wipEntries, null, 2)}

Daily Activity Logs:
${JSON.stringify(dailyLogs, null, 2)}

Chat History:
${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

User Request: ${message}

RESPONSE FORMAT REQUIREMENTS:
1. Return a SINGLE JSON array containing document edit requests
2. Each request must be a complete, valid JSON object
3. All objects must have matching braces and proper nesting
4. The array must be properly terminated with a closing bracket
5. Do not include any text outside the JSON array
6. Format the JSON for readability with proper indentation

Example format:
[
  {
    "replaceAllText": {
      "containsText": { "text": "search text" },
      "replaceText": "replacement text"
    }
  },
  {
    "insertText": {
      "location": { "index": 123 },
      "text": "text to insert"
    }
  }
]

Before making any changes:
1. Use the element map to find exact positions
2. Verify text existence using textToIndex map
3. Check table and list structures for contextual edits
4. Preserve existing styles and formatting
5. Make atomic, verifiable changes`;

      // Get AI response
      console.log('🤖 Sending request to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      console.log('📝 Raw Gemini response:', responseText);

      // Try to extract JSON requests
      const jsonMatch = responseText.match(/\[\s*{(?:[^{}]|{(?:[^{}]|{[^{}]*})*})*}\s*\]/);
      console.log('🔍 Found JSON match:', !!jsonMatch);
      
      if (jsonMatch) {
        console.log('📋 Extracted JSON:', jsonMatch[0]);
        let requests;
        try {
          // First try: direct JSON parse with validation
          const jsonStr = jsonMatch[0].trim();
          
          // Basic validation before parsing
          if (!jsonStr.startsWith('[') || !jsonStr.endsWith(']')) {
            throw new Error('Invalid JSON array format');
          }

          requests = JSON.parse(jsonStr);
          console.log('✨ Successfully parsed', requests.length, 'requests');
        } catch (e) {
          console.error('❌ JSON parse error:', e.message);
          console.error('Raw JSON string:', jsonMatch[0]);
          return {
            response: "I encountered an error while processing the edit request. Please try rephrasing your request.",
            documentUpdated: false
          };
        }

        // Validate and fix request format
        requests = requests.map((req: any) => {
          console.log('🔄 Processing request:', req);
          
          // Fix replaceAllText format if needed
          if (req.replaceAllText?.containsText && typeof req.replaceAllText.containsText === 'string') {
            console.log('⚠️ Found string containsText, converting to object:', req.replaceAllText.containsText);
            return {
              ...req,
              replaceAllText: {
                ...req.replaceAllText,
                containsText: { text: req.replaceAllText.containsText }
              }
            };
          }
          
          // Replace END_OF_DOCUMENT with actual index
          const lastElement = Array.from(processedDoc.indices.elementMap.values())
            .sort((a, b) => b.endIndex - a.endIndex)[0];

          if (req.insertText?.location?.index === 'END_OF_DOCUMENT' || 
              req.insertText?.location?.index >= lastElement.endIndex) {
            console.log('📍 Adjusting end index:', lastElement.endIndex, 'to:', lastElement.endIndex - 1);
            return {
              ...req,
              insertText: {
                ...req.insertText,
                location: { index: lastElement.endIndex - 1 }
              }
            };
          }
          return req;
        });

        // Filter out invalid requests
        const originalLength = requests.length;
        requests = requests.filter((req: any) => {
          // Prevent dangerous global replacements
          const dangerousPatterns = ['*', '.', '\\s+'];
          const hasDangerousPattern = dangerousPatterns.some(pattern => 
            req.replaceAllText?.containsText?.text === pattern
          );
          if (hasDangerousPattern) {
            console.log('❌ Blocked dangerous global replacement pattern:', req.replaceAllText?.containsText?.text);
            return false;
          }

          // Validate replaceAllText
          if (req.replaceAllText) {
            const searchText = req.replaceAllText.containsText?.text;
            // Minimum length to prevent too broad replacements
            if (searchText && searchText.length < 3) {
              console.log('❌ Search text too short:', searchText);
              return false;
            }
            
            const isValid = (
              searchText &&
              typeof searchText === 'string' &&
              req.replaceAllText.replaceText &&
              typeof req.replaceAllText.replaceText === 'string' &&
              processedDoc.indices.textToIndex.has(searchText) // Check if text actually exists
            );
            if (!isValid) {
              if (!processedDoc.indices.textToIndex.has(searchText)) {
                console.log('❌ Text not found in document:', searchText);
              } else {
                console.log('❌ Invalid replaceAllText request:', req);
              }
            }
            return isValid;
          }

          // Validate insertText
          if (req.insertText) {
            // Don't allow insertions at the very beginning of the document
            if (req.insertText.location?.index <= 1) {
              console.log('❌ Prevented insertion at document start');
              return false;
            }

            const isValid = (
              typeof req.insertText.location?.index === 'number' &&
              req.insertText.text &&
              typeof req.insertText.text === 'string' &&
              !req.insertText.text.includes('expert billing assistant') && // Prevent system prompt insertion
              req.insertText.text.trim().length > 0 // Prevent empty insertions
            );
            if (!isValid) {
              if (req.insertText.text?.includes('expert billing assistant')) {
                console.log('❌ Prevented system prompt insertion');
              } else if (!req.insertText.text?.trim()) {
                console.log('❌ Prevented empty text insertion');
              } else {
                console.log('❌ Invalid insertText request:', req);
              }
            }
            return isValid;
          }

          console.log('❌ Unknown request type:', req);
          return false;
        });
        console.log(`🧹 Filtered requests: ${requests.length} valid out of ${originalLength} total`);
        console.log('📤 Final requests to be sent:', requests);

        // Apply the updates
        console.log('🚀 Sending update request to Google Docs API...');
        try {
          // Prevent empty request arrays
          if (!requests || requests.length === 0) {
            console.log('⚠️ No valid requests to process');
            return {
              response: "I analyzed the document but couldn't find the exact text to modify. Please verify the text you want to change exists exactly as specified in the document.",
              documentUpdated: false
            };
          }

          await clientDocsService.updateDocument(documentId, requests);
          console.log('✅ Successfully updated document');
        } catch (error) {
          console.error('❌ Failed to update document:', error);
          if (error instanceof Error) {
            console.error('Error details:', {
              name: error.name,
              message: error.message,
              stack: error.stack
            });
          }
          throw error;
        }
        
        // Extract all sections after the JSON array
        const sectionsMatch = responseText
          .split(/\]\s*/)
          .slice(1)
          .join('')
          .match(/✅ Changes Made:[\s\S]*?(?=🔍 Reason for Changes:)|🔍 Reason for Changes:[\s\S]*/g);

        if (sectionsMatch) {
          const formattedResponse = sectionsMatch
            .filter(section => section) // Remove any null/undefined sections
            .map(section => section.trim())
            .filter(section => section.length > 0) // Remove empty sections
            .join('\n\n');
          
          if (formattedResponse) {
            return { 
              response: formattedResponse,
              documentUpdated: true 
            };
          }
        }

        // Fallback if sections aren't properly formatted
        return { 
          response: 'Changes applied successfully.',
          documentUpdated: true 
        };
      }

      return { 
        response: responseText.trim(), 
        documentUpdated: false 
      };
    } catch (error) {
      console.error('Error in doc chat service:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }
}; 