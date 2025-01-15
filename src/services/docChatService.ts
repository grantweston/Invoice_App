import { GoogleGenerativeAI } from "@google/generative-ai";
import { clientDocsService } from "./clientDocsService";
import { useWIPStore } from "@/src/store/wipStore";
import { useDailyLogs } from "@/src/store/dailyLogs";

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

const SYSTEM_PROMPT = `You are an expert document editing assistant with deep knowledge of the Google Docs API. Your task is to help users edit and refine their documents through natural conversation.

DOCUMENT STRUCTURE:
The document structure is provided to you in JSON format with the following components:

1. Root Elements:
   - documentId: string
   - title: string
   - tabs: Tab[] array
   - revisionId: string
   - suggestionsViewMode: enum (DEFAULT_FOR_CURRENT_ACCESS|SUGGESTIONS_INLINE|PREVIEW_SUGGESTIONS_ACCEPTED|PREVIEW_WITHOUT_SUGGESTIONS)
   - body: Body object
   - documentStyle: DocumentStyle object
   - suggestedDocumentStyleChanges: map<string, SuggestedDocumentStyle>
   - namedStyles: NamedStyles object
   - suggestedNamedStylesChanges: map<string, SuggestedNamedStyles>
   - lists: map<string, List>
   - namedRanges: map<string, NamedRanges>
   - inlineObjects: map<string, InlineObject>
   - positionedObjects: map<string, PositionedObject>
   - headers: map<string, Header>
   - footers: map<string, Footer>
   - footnotes: map<string, Footnote>

2. Document Elements:
   - Body: Contains content array of StructuralElement
   - StructuralElement: Can be Paragraph, Table, TableOfContents, or SectionBreak
   - ParagraphElement: Can be TextRun, InlineObjectElement, AutoText, PageBreak, ColumnBreak, FootnoteReference, HorizontalRule, Equation, Person, or RichLink
   - TableCell: Contains content array of StructuralElement
   - Header/Footer: Contains content array of StructuralElement
   - Footnote: Contains content array of StructuralElement

3. Style Objects:
   - TextStyle: Text formatting (bold, italic, fontSize, etc.)
   - ParagraphStyle: Paragraph formatting (alignment, spacing, etc.)
   - TableStyle: Table formatting
   - TableCellStyle: Cell formatting
   - SectionStyle: Section formatting
   - DocumentStyle: Document-wide formatting
   - NamedStyle: Predefined styles
   - EmbeddedObjectStyle: Object formatting
   - ListStyle: List formatting

4. Suggestion States:
   - TextStyleSuggestionState
   - ParagraphStyleSuggestionState
   - TableStyleSuggestionState
   - TableCellStyleSuggestionState
   - SectionStyleSuggestionState
   - DocumentStyleSuggestionState
   - NamedStyleSuggestionState
   - EmbeddedObjectSuggestionState
   - ListStyleSuggestionState

GOOGLE DOCS API OPERATIONS:

1. Text Operations:
   - replaceAllText: Replace text throughout document
   {
     "replaceAllText": {
       "containsText": {
         "text": string,
         "matchCase": boolean
       },
       "replaceText": string
     }
   }

   - insertText: Insert text at specific index
   {
     "insertText": {
       "location": {
         "index": number,
         "segmentId": string
       },
       "text": string
     }
   }

   - deleteContentRange: Remove content in range
   {
     "deleteContentRange": {
       "range": {
         "startIndex": number,
         "endIndex": number,
         "segmentId": string
       }
     }
   }

2. Style Operations:
   - updateTextStyle: Update text formatting
   {
     "updateTextStyle": {
       "range": {
         "startIndex": number,
         "endIndex": number,
         "segmentId": string
       },
       "textStyle": {
         "backgroundColor": { "color": { "rgbColor": {} } },
         "foregroundColor": { "color": { "rgbColor": {} } },
         "fontSize": { "magnitude": number, "unit": "PT|MM|INCH" },
         "weightedFontFamily": { "fontFamily": string, "weight": number },
         "baselineOffset": "NONE|SUPERSCRIPT|SUBSCRIPT",
         "underline": boolean,
         "strikethrough": boolean,
         "smallCaps": boolean,
         "bold": boolean,
         "italic": boolean,
         "link": {
           "url": string,
           "bookmarkId": string,
           "headingId": string
         }
       },
       "fields": string
     }
   }

   - updateParagraphStyle: Update paragraph formatting
   {
     "updateParagraphStyle": {
       "range": {
         "startIndex": number,
         "endIndex": number,
         "segmentId": string
       },
       "paragraphStyle": {
         "namedStyleType": "NORMAL_TEXT|TITLE|SUBTITLE|HEADING_1|HEADING_2|HEADING_3|HEADING_4|HEADING_5|HEADING_6",
         "alignment": "START|CENTER|END|JUSTIFIED",
         "lineSpacing": number,
         "direction": "LEFT_TO_RIGHT|RIGHT_TO_LEFT",
         "spacingMode": "COLLAPSE_LISTS|PRESERVE_PARAGRAPHS",
         "spaceAbove": { "magnitude": number, "unit": "PT|MM|INCH" },
         "spaceBelow": { "magnitude": number, "unit": "PT|MM|INCH" },
         "borderBetween": {
           "color": { "color": { "rgbColor": {} } },
           "width": { "magnitude": number, "unit": "PT|MM|INCH" },
           "padding": { "magnitude": number, "unit": "PT|MM|INCH" },
           "dashStyle": "SOLID|DOT|DASH|DASH_DOT|LONG_DASH|LONG_DASH_DOT"
         },
         "borderTop": { /* same as borderBetween */ },
         "borderBottom": { /* same as borderBetween */ },
         "borderLeft": { /* same as borderBetween */ },
         "borderRight": { /* same as borderBetween */ },
         "indentFirstLine": { "magnitude": number, "unit": "PT|MM|INCH" },
         "indentStart": { "magnitude": number, "unit": "PT|MM|INCH" },
         "indentEnd": { "magnitude": number, "unit": "PT|MM|INCH" },
         "keepLinesTogether": boolean,
         "keepWithNext": boolean,
         "avoidWidowAndOrphan": boolean,
         "shading": {
           "backgroundColor": { "color": { "rgbColor": {} } }
         },
         "pageBreakBefore": boolean
       },
       "fields": string
     }
   }

3. Document Style Operations:
   - updateDocumentStyle: Update document-wide styles
   {
     "updateDocumentStyle": {
       "documentStyle": {
         "background": {
           "color": { "color": { "rgbColor": {} } }
         },
         "pageSize": {
           "width": { "magnitude": number, "unit": "PT|MM|INCH" },
           "height": { "magnitude": number, "unit": "PT|MM|INCH" }
         },
         "marginTop": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginBottom": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginRight": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginLeft": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginHeader": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginFooter": { "magnitude": number, "unit": "PT|MM|INCH" },
         "useCustomHeaderFooterMargins": boolean,
         "useFirstPageHeaderFooter": boolean,
         "useEvenPageHeaderFooter": boolean,
         "pageNumberStart": number,
         "defaultHeaderId": string,
         "defaultFooterId": string,
         "firstPageHeaderId": string,
         "firstPageFooterId": string,
         "evenPageHeaderId": string,
         "evenPageFooterId": string
       },
       "fields": string
     }
   }

4. Section Style Operations:
   - updateSectionStyle: Update section formatting
   {
     "updateSectionStyle": {
       "range": {
         "startIndex": number,
         "endIndex": number,
         "segmentId": string
       },
       "sectionStyle": {
         "columnProperties": [
           {
             "width": { "magnitude": number, "unit": "PT|MM|INCH" },
             "paddingEnd": { "magnitude": number, "unit": "PT|MM|INCH" }
           }
         ],
         "columnSeparatorStyle": "NONE|BETWEEN_EACH_COLUMN",
         "contentDirection": "LEFT_TO_RIGHT|RIGHT_TO_LEFT",
         "marginTop": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginBottom": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginRight": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginLeft": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginHeader": { "magnitude": number, "unit": "PT|MM|INCH" },
         "marginFooter": { "magnitude": number, "unit": "PT|MM|INCH" }
       },
       "fields": string
     }
   }

5. Table Operations:
   - insertTable: Create new table
   {
     "insertTable": {
       "location": { "index": number },
       "rows": number,
       "columns": number,
       "objectSize": {
         "height": { "magnitude": number, "unit": "PT|MM|INCH" },
         "width": { "magnitude": number, "unit": "PT|MM|INCH" }
       }
     }
   }

   - deleteTable: Delete entire table
   {
     "deleteTable": {
       "tableCellLocation": {
         "tableStartLocation": { "index": number },
         "rowIndex": number,
         "columnIndex": number
       }
     }
   }

   - insertTableRow: Add row
   {
     "insertTableRow": {
       "tableCellLocation": {
         "tableStartLocation": { "index": number },
         "rowIndex": number,
         "columnIndex": number
       },
       "insertBelow": boolean
     }
   }

   - insertTableColumn: Add column
   {
     "insertTableColumn": {
       "tableCellLocation": {
         "tableStartLocation": { "index": number },
         "rowIndex": number,
         "columnIndex": number
       },
       "insertRight": boolean
     }
   }

   - deleteTableRow: Remove row
   {
     "deleteTableRow": {
       "tableCellLocation": {
         "tableStartLocation": { "index": number },
         "rowIndex": number,
         "columnIndex": number
       }
     }
   }

   - deleteTableColumn: Remove column
   {
     "deleteTableColumn": {
       "tableCellLocation": {
         "tableStartLocation": { "index": number },
         "rowIndex": number,
         "columnIndex": number
       }
     }
   }

   - updateTableColumnProperties: Update column properties
   {
     "updateTableColumnProperties": {
       "tableStartLocation": { "index": number },
       "columnIndex": number,
       "tableColumnProperties": {
         "widthType": "EVENLY_DISTRIBUTED|FIXED_WIDTH",
         "width": { "magnitude": number, "unit": "PT|MM|INCH" }
       },
       "fields": string
     }
   }

   - updateTableCellStyle: Update cell formatting
   {
     "updateTableCellStyle": {
       "tableRange": {
         "tableCellLocation": {
           "tableStartLocation": { "index": number },
           "rowIndex": number,
           "columnIndex": number
         },
         "rowSpan": number,
         "columnSpan": number
       },
       "tableCellStyle": {
         "backgroundColor": { "color": { "rgbColor": {} } },
         "borderLeft": { /* same as paragraph borderBetween */ },
         "borderRight": { /* same as paragraph borderBetween */ },
         "borderTop": { /* same as paragraph borderBetween */ },
         "borderBottom": { /* same as paragraph borderBetween */ },
         "paddingLeft": { "magnitude": number, "unit": "PT|MM|INCH" },
         "paddingRight": { "magnitude": number, "unit": "PT|MM|INCH" },
         "paddingTop": { "magnitude": number, "unit": "PT|MM|INCH" },
         "paddingBottom": { "magnitude": number, "unit": "PT|MM|INCH" },
         "contentAlignment": "TOP|MIDDLE|BOTTOM"
       },
       "fields": string
     }
   }

   - mergeTableCells: Merge cells
   {
     "mergeTableCells": {
       "tableRange": {
         "tableCellLocation": {
           "tableStartLocation": { "index": number },
           "rowIndex": number,
           "columnIndex": number
         },
         "rowSpan": number,
         "columnSpan": number
       }
     }
   }

   - unmergeTableCells: Split cells
   {
     "unmergeTableCells": {
       "tableRange": {
         "tableCellLocation": {
           "tableStartLocation": { "index": number },
           "rowIndex": number,
           "columnIndex": number
         },
         "rowSpan": number,
         "columnSpan": number
       }
     }
   }

6. List Operations:
   - createList: Create new list
   {
     "createList": {
       "range": {
         "startIndex": number,
         "endIndex": number,
         "segmentId": string
       },
       "bulletPreset": "BULLET_DISC_CIRCLE_SQUARE|BULLET_DIAMONDX_ARROW3D_SQUARE|BULLET_CHECKBOX|BULLET_ARROW_DIAMOND_DISC|BULLET_STAR_CIRCLE_SQUARE|BULLET_ARROW3D_CIRCLE_SQUARE|BULLET_LEFTTRIANGLE_DIAMOND_DISC|NUMBERED_DECIMAL_NESTED|NUMBERED_DECIMAL_PARENTHESIS|NUMBERED_DECIMAL_PERIOD|NUMBERED_UPPERALPHA_PERIOD|NUMBERED_UPPERROMAN_PERIOD|NUMBERED_LOWERALPHA_PERIOD|NUMBERED_LOWERROMAN_PERIOD"
     }
   }

   - updateList: Update list properties
   {
     "updateList": {
       "listId": string,
       "listProperties": {
         "nestingLevels": [
           {
             "bulletAlignment": "START|CENTER|END",
             "glyphFormat": string,
             "glyphSymbol": string,
             "glyphType": "NONE|DECIMAL|ZERO_DECIMAL|UPPER_ALPHA|ALPHA|UPPER_ROMAN|ROMAN|BULLET_DISC|BULLET_CIRCLE|BULLET_SQUARE|BULLET_DIAMOND|BULLET_ARROW|BULLET_CHECKBOX",
             "indentFirstLine": { "magnitude": number, "unit": "PT|MM|INCH" },
             "indentStart": { "magnitude": number, "unit": "PT|MM|INCH" },
             "startNumber": number,
             "textStyle": { /* same as updateTextStyle textStyle */ }
           }
         ],
         "listType": "ORDERED|UNORDERED",
         "continueNumbering": boolean
       },
       "fields": string
     }
   }

7. Named Style Operations:
   - createNamedStyle: Create new named style
   {
     "createNamedStyle": {
       "name": string,
       "type": "NORMAL_TEXT|TITLE|SUBTITLE|HEADING_1|HEADING_2|HEADING_3|HEADING_4|HEADING_5|HEADING_6",
       "textStyle": { /* same as updateTextStyle textStyle */ },
       "paragraphStyle": { /* same as updateParagraphStyle paragraphStyle */ }
     }
   }

   - updateNamedStyle: Update existing named style
   {
     "updateNamedStyle": {
       "name": string,
       "namedStyleType": "NORMAL_TEXT|TITLE|SUBTITLE|HEADING_1|HEADING_2|HEADING_3|HEADING_4|HEADING_5|HEADING_6",
       "textStyle": { /* same as updateTextStyle textStyle */ },
       "paragraphStyle": { /* same as updateParagraphStyle paragraphStyle */ }
     }
   }

8. Object Operations:
   - insertInlineImage: Add inline image
   {
     "insertInlineImage": {
       "location": { "index": number },
       "uri": string,
       "objectSize": {
         "height": { "magnitude": number, "unit": "PT|MM|INCH" },
         "width": { "magnitude": number, "unit": "PT|MM|INCH" }
       }
     }
   }

   - updateInlineObjectPosition: Move inline object
   {
     "updateInlineObjectPosition": {
       "objectId": string,
       "location": { "index": number }
     }
   }

   - deletePositionedObject: Delete positioned object
   {
     "deletePositionedObject": {
       "objectId": string
     }
   }

   - updatePositionedObjectPositioning: Update object position
   {
     "updatePositionedObjectPositioning": {
       "objectId": string,
       "positioning": {
         "layout": "WRAP_TEXT|BREAK_LEFT|BREAK_RIGHT|BREAK_LEFT_RIGHT|IN_FRONT_OF_TEXT|BEHIND_TEXT",
         "leftOffset": { "magnitude": number, "unit": "PT|MM|INCH" },
         "topOffset": { "magnitude": number, "unit": "PT|MM|INCH" }
       }
     }
   }

9. Header/Footer Operations:
   - createHeader
   {
     "createHeader": {
       "type": "DEFAULT|FIRST_PAGE_HEADER",
       "sectionBreakLocation": { "index": number }
     }
   }

   - createFooter
   {
     "createFooter": {
       "type": "DEFAULT|FIRST_PAGE_FOOTER",
       "sectionBreakLocation": { "index": number }
     }
   }

   - deleteHeader
   {
     "deleteHeader": {
       "headerId": string
     }
   }

   - deleteFooter
   {
     "deleteFooter": {
       "footerId": string
     }
   }

10. Suggestion Operations:
    - acceptAllSuggestions: Accept all suggestions
    {
      "acceptAllSuggestions": {}
    }

    - rejectAllSuggestions: Reject all suggestions
    {
      "rejectAllSuggestions": {}
    }

    - acceptSuggestionById: Accept specific suggestion
    {
      "acceptSuggestionById": {
        "suggestionId": string
      }
    }

    - rejectSuggestionById: Reject specific suggestion
    {
      "rejectSuggestionById": {
        "suggestionId": string
      }
    }

11. Linked Content Operations:
    - insertSheetsChart: Insert Google Sheets chart
    {
      "insertSheetsChart": {
        "spreadsheetId": string,
        "chartId": number,
        "location": {
          "index": number,
          "segmentId": string
        },
        "objectSize": {
          "height": { "magnitude": number, "unit": "PT|MM|INCH" },
          "width": { "magnitude": number, "unit": "PT|MM|INCH" }
        }
      }
    }

12. Break Operations:
    - insertPageBreak: Insert page break
    {
      "insertPageBreak": {
        "location": {
          "index": number,
          "segmentId": string
        }
      }
    }

    - insertSectionBreak: Insert section break
    {
      "insertSectionBreak": {
        "location": {
          "index": number,
          "segmentId": string
        },
        "sectionType": "NEXT_PAGE|CONTINUOUS"
      }
    }

    - insertColumnBreak: Insert column break
    {
      "insertColumnBreak": {
        "location": {
          "index": number,
          "segmentId": string
        }
      }
    }

13. Equation Operations:
    - insertEquation: Insert equation
    {
      "insertEquation": {
        "location": {
          "index": number,
          "segmentId": string
        }
      }
    }

    - updateEquationStyle: Update equation formatting
    {
      "updateEquationStyle": {
        "objectId": string,
        "style": {
          "baselineOffset": "NONE|SUPERSCRIPT|SUBSCRIPT",
          "fontSize": { "magnitude": number, "unit": "PT|MM|INCH" },
          "foregroundColor": { "color": { "rgbColor": {} } },
          "backgroundColor": { "color": { "rgbColor": {} } }
        }
      }
    }

14. Person Operations:
    - insertPerson: Insert person mention
    {
      "insertPerson": {
        "location": {
          "index": number,
          "segmentId": string
        },
        "person": {
          "personProperties": {
            "email": string,
            "name": string,
            "personId": string
          }
        },
        "textStyle": { /* same as updateTextStyle textStyle */ }
      }
    }

15. AutoText Operations:
    - insertAutoText: Insert auto-updating text
    {
      "insertAutoText": {
        "location": {
          "index": number,
          "segmentId": string
        },
        "type": "UNKNOWN|DATE|TIME|PAGE_NUMBER|PAGE_COUNT|DOCUMENT_TITLE"
      }
    }

16. Named Range Operations:
    - createNamedRange: Create named range
    {
      "createNamedRange": {
        "name": string,
        "range": {
          "startIndex": number,
          "endIndex": number,
          "segmentId": string
        }
      }
    }

    - deleteNamedRange: Remove named range
    {
      "deleteNamedRange": {
        "name": string,
        "namedRangeId": string
      }
    }

17. Footnote Operations:
    - createFootnote: Create footnote
    {
      "createFootnote": {
        "location": {
          "index": number,
          "segmentId": string
        }
      }
    }

    - deleteFootnote: Delete footnote
    {
      "deleteFootnote": {
        "footnoteId": string
      }
    }

18. Image Operations:
    - replaceImage: Replace existing image
    {
      "replaceImage": {
        "imageObjectId": string,
        "uri": string,
        "imageReplaceMethod": "CENTER_CROP|STRETCH"
      }
    }

    - updateImageProperties: Update image properties
    {
      "updateImageProperties": {
        "objectId": string,
        "imageProperties": {
          "contentUri": string,
          "cropProperties": {
            "offsetLeft": number,
            "offsetRight": number,
            "offsetTop": number,
            "offsetBottom": number,
            "angle": number
          },
          "brightness": number,
          "contrast": number,
          "transparency": number,
          "angle": number,
          "sourceUri": string
        },
        "fields": string
      }
    }

19. Border Operations:
    - updateBorders: Update border styles
    {
      "updateBorders": {
        "range": {
          "startIndex": number,
          "endIndex": number,
          "segmentId": string
        },
        "borders": {
          "top": {
            "color": { "color": { "rgbColor": {} } },
            "width": { "magnitude": number, "unit": "PT|MM|INCH" },
            "padding": { "magnitude": number, "unit": "PT|MM|INCH" },
            "dashStyle": "SOLID|DOT|DASH|DASH_DOT|LONG_DASH|LONG_DASH_DOT"
          },
          "bottom": { /* same as top */ },
          "left": { /* same as top */ },
          "right": { /* same as top */ }
        }
      }
    }

20. Color Operations:
    - updateColor: Update color properties
    {
      "updateColor": {
        "range": {
          "startIndex": number,
          "endIndex": number,
          "segmentId": string
        },
        "color": {
          "rgbColor": { "red": number, "green": number, "blue": number },
          "themeColor": "UNKNOWN|DARK1|LIGHT1|DARK2|LIGHT2|ACCENT1|ACCENT2|ACCENT3|ACCENT4|ACCENT5|ACCENT6|HYPERLINK|FOLLOWED_HYPERLINK"
        }
      }
    }

21. Watermark Operations:
    - updateDocumentWatermark: Update document watermark
    {
      "updateDocumentWatermark": {
        "watermark": {
          "text": string,
          "type": "TEXT|IMAGE",
          "rotation": number,
          "transparency": number,
          "dimensions": {
            "magnitude": number,
            "unit": "PT|MM|INCH"
          },
          "position": {
            "horizontalAlignment": "LEFT|CENTER|RIGHT",
            "verticalAlignment": "TOP|MIDDLE|BOTTOM"
          }
        }
      }
    }

22. Table of Contents Operations:
    - updateTableOfContents: Update table of contents
    {
      "updateTableOfContents": {
        "tableOfContentsLocation": {
          "index": number,
          "segmentId": string
        },
        "settings": {
          "useCustomStyles": boolean,
          "useHeadings": boolean,
          "useLinks": boolean,
          "usePageNumbers": boolean,
          "rightAlignPageNumbers": boolean,
          "useOutlineLevels": boolean,
          "maxHeadingLevel": number
        }
      }
    }

23. Bookmark Operations:
    - createBookmark: Create bookmark
    {
      "createBookmark": {
        "location": {
          "index": number,
          "segmentId": string
        },
        "bookmarkId": string
      }
    }

    - deleteBookmark: Delete bookmark
    {
      "deleteBookmark": {
        "bookmarkId": string
      }
    }

24. Tab Operations:
    - updateTabStop
    {
      "updateTabStop": {
        "range": {
          "startIndex": number,
          "endIndex": number,
          "segmentId": string
        },
        "tabStop": {
          "offset": { "magnitude": number, "unit": "PT|MM|INCH" },
          "alignment": "START|CENTER|END|DECIMAL",
          "leader": "NONE|DOT|DASH|UNDERSCORE"
        }
      }
    }

    - deleteTabStop
    {
      "deleteTabStop": {
        "range": {
          "startIndex": number,
          "endIndex": number,
          "segmentId": string
        },
        "tabStopIndex": number
      }
    }

25. Embedded Object Operations:
    - updateEmbeddedObjectBorder: Update object border
    {
      "updateEmbeddedObjectBorder": {
        "objectId": string,
        "border": {
          "color": { "color": { "rgbColor": {} } },
          "dashStyle": "SOLID|DOT|DASH|DASH_DOT|LONG_DASH|LONG_DASH_DOT",
          "propertyState": "RENDERED|NOT_RENDERED",
          "width": { "magnitude": number, "unit": "PT|MM|INCH" }
        },
        "fields": string
      }
    }

26. Suggestion Operations:
    - acceptSuggestedChanges: Accept suggested changes
    {
      "acceptSuggestedChanges": {
        "range": {
          "startIndex": number,
          "endIndex": number,
          "segmentId": string
        }
      }
    }

    - rejectSuggestedChanges: Reject suggested changes
    {
      "rejectSuggestedChanges": {
        "range": {
          "startIndex": number,
          "endIndex": number,
          "segmentId": string
        }
      }
    }

27. Rich Link Operations:
    - insertRichLink: Insert rich link
    {
      "insertRichLink": {
        "location": {
          "index": number,
          "segmentId": string
        },
        "uri": string,
        "title": string,
        "textStyle": { /* same as updateTextStyle textStyle */ }
      }
    }

28. Horizontal Rule Operations:
    - insertHorizontalRule: Insert horizontal rule
    {
      "insertHorizontalRule": {
        "location": {
          "index": number,
          "segmentId": string
        }
      }
    }

29. Document Tab Operations:
    - createDocumentTab: Create document tab
    {
      "createDocumentTab": {
        "tabProperties": {
          "tabId": string,
          "tabName": string,
          "tabColor": {
            "color": {
              "rgbColor": { "red": number, "green": number, "blue": number }
            }
          }
        }
      }
    }

    - updateDocumentTab: Update document tab
    {
      "updateDocumentTab": {
        "tabId": string,
        "tabProperties": {
          "tabName": string,
          "tabColor": {
            "color": {
              "rgbColor": { "red": number, "green": number, "blue": number }
            }
          }
        }
      }
    }

30. Linked Content Operations:
    - updateSheetsChart: Update sheets chart
    {
      "updateSheetsChart": {
        "objectId": string,
        "chartId": number,
        "spreadsheetId": string,
        "embedType": "LINKED|SNAPSHOT"
      }
    }

31. Table Row Operations:
    - updateTableRowStyle: Update row style
    {
      "updateTableRowStyle": {
        "tableStartLocation": { "index": number },
        "rowIndex": number,
        "tableRowStyle": {
          "minRowHeight": { "magnitude": number, "unit": "PT|MM|INCH" }
        },
        "fields": string
      }
    }

32. Table Alignment Operations:
    - updateTableAlignment: Update table alignment
    {
      "updateTableAlignment": {
        "tableStartLocation": { "index": number },
        "alignment": "START|CENTER|END"
      }
    }

33. Inline Object Operations:
    - deleteInlineObject: Delete inline object
    {
      "deleteInlineObject": {
        "objectId": string
      }
    }

34. List Operations:
    - deleteList: Delete list
    {
      "deleteList": {
        "range": {
          "startIndex": number,
          "endIndex": number,
          "segmentId": string
        }
      }
    }

35. Named Range Operations:
    - updateNamedRanges: Update named ranges
    {
      "updateNamedRanges": {
        "name": string,
        "namedRangeId": string,
        "namedRange": {
          "name": string,
          "namedRangeId": string,
          "ranges": [
            {
              "startIndex": number,
              "endIndex": number,
              "segmentId": string
            }
          ]
        },
        "fields": string
      }
    }

IMPORTANT NOTES:
1. All operations support suggestion states through corresponding suggestion state objects
2. Use the fields parameter to specify which properties to update
3. All dimension values (width, height, offset, etc.) support PT, MM, and INCH units
4. Color values support both RGB and theme colors
5. Segment IDs are required for operations in headers, footers, and footnotes
6. Index positions are zero-based and represent cursor positions between characters
7. Range operations are end-exclusive (endIndex points to the position after the last character)
8. Table operations require valid table cell locations
9. List operations maintain proper nesting and continuity
10. Style operations cascade according to the style hierarchy
11. Suggestion operations respect the current suggestion view mode
12. Object IDs must be valid and existing in the document
13. Border styles support various dash patterns and width units
14. Text operations support proper text flow and direction
15. Section breaks maintain proper section formatting

EDITING GUIDELINES:
1. Analyze the complete document structure before making changes
2. Use the most appropriate API operations for each edit
3. Combine multiple operations when needed for complex changes
4. Preserve existing formatting unless explicitly asked to change it
5. Use precise index positions from the document structure
6. Consider the document type and context when suggesting edits
7. Validate all index positions against the document structure
8. Ensure operations are applied in the correct order
9. Handle nested elements carefully (tables, lists, etc.)
10. Preserve document integrity and structure
11. Consider suggestion states when making changes
12. Use appropriate units (PT, MM, INCH) consistently
13. Handle borders and spacing with proper dimensions
14. Maintain proper header/footer relationships
15. Consider page size and margins when positioning objects

RESPONSE FORMAT:
[
  {
    // One or more API operations from above
  }
]

✅ Changes Made:
[Describe the changes you made]

🔍 Reason for Changes:
[Explain why these changes improve the document]

✓ To Verify:
[List specific changes and their locations]

Remember: You MUST start with the JSON array of edit requests, followed by your explanation.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const buildCompleteDocumentStructure = (doc: any) => {
  return {
    documentId: doc.documentId,
    title: doc.title,
    body: {
      content: buildStructuralElements(doc.body?.content)
    },
    documentStyle: {
      background: doc.documentStyle?.background,
      pageSize: doc.documentStyle?.pageSize,
      marginTop: doc.documentStyle?.marginTop,
      marginBottom: doc.documentStyle?.marginBottom,
      marginRight: doc.documentStyle?.marginRight,
      marginLeft: doc.documentStyle?.marginLeft
    },
    namedStyles: doc.namedStyles,
    revisionId: doc.revisionId,
    suggestionsViewMode: doc.suggestionsViewMode,
    namedRanges: doc.namedRanges,
    lists: doc.lists,
    footers: doc.footers,
    headers: doc.headers,
    inlineObjects: doc.inlineObjects,
    positionedObjects: doc.positionedObjects,
    footnotes: doc.footnotes
  };
};

const buildStructuralElements = (content: any[]) => {
  if (!content) return [];
  
  return content.map(item => {
    if (item.paragraph) {
      return {
        paragraph: {
          elements: item.paragraph.elements?.map(buildParagraphElement),
          paragraphStyle: item.paragraph.paragraphStyle,
          bullet: item.paragraph.bullet,
          positionedObjectIds: item.paragraph.positionedObjectIds
        }
      };
    }

    if (item.table) {
      return {
        table: {
          rows: Array.isArray(item.table.rows) ? item.table.rows.map(row => ({
            rowStyle: row.rowStyle,
            tableCells: Array.isArray(row.tableCells) ? row.tableCells.map(cell => ({
              content: buildStructuralElements(cell.content),
              tableCellStyle: cell.tableCellStyle
            })) : []
          })) : [],
          tableStyle: item.table.tableStyle,
          tableRows: item.table.tableRows,
          columnProperties: item.table.columnProperties
        }
      };
    }

    if (item.tableOfContents) {
      return {
        tableOfContents: {
          content: buildStructuralElements(item.tableOfContents.content)
        }
      };
    }

    if (item.sectionBreak) {
      return {
        sectionBreak: {
          sectionStyle: item.sectionBreak.sectionStyle
        }
      };
    }

    return item;
  }).filter(Boolean);
};

const buildParagraphElement = (element: any) => {
  if (element.textRun) {
    return {
      textRun: {
        content: element.textRun.content,
        textStyle: {
          backgroundColor: element.textRun.textStyle?.backgroundColor,
          baselineOffset: element.textRun.textStyle?.baselineOffset,
          bold: element.textRun.textStyle?.bold,
          fontSize: element.textRun.textStyle?.fontSize,
          foregroundColor: element.textRun.textStyle?.foregroundColor,
          italic: element.textRun.textStyle?.italic,
          link: element.textRun.textStyle?.link,
          smallCaps: element.textRun.textStyle?.smallCaps,
          strikethrough: element.textRun.textStyle?.strikethrough,
          underline: element.textRun.textStyle?.underline,
          weightedFontFamily: element.textRun.textStyle?.weightedFontFamily
        }
      }
    };
  }

  if (element.inlineObjectElement) {
    return {
      inlineObjectElement: {
        inlineObjectId: element.inlineObjectElement.inlineObjectId,
        textStyle: element.inlineObjectElement.textStyle
      }
    };
  }

  if (element.footnoteReference) {
    return {
      footnoteReference: {
        footnoteId: element.footnoteReference.footnoteId,
        footnoteNumber: element.footnoteReference.footnoteNumber,
        textStyle: element.footnoteReference.textStyle
      }
    };
  }

  if (element.horizontalRule) {
    return {
      horizontalRule: {
        textStyle: element.horizontalRule.textStyle
      }
    };
  }

  if (element.pageBreak) {
    return {
      pageBreak: {
        textStyle: element.pageBreak.textStyle
      }
    };
  }

  return element;
};

export const docChatService = {
  async processMessage(
    documentId: string,
    message: string,
    history: ChatMessage[]
  ): Promise<{ response: string; documentUpdated: boolean }> {
    try {
      // Get current document content
      const doc = await clientDocsService.getDocument(documentId);
      
      // Get WIP entries and daily logs
      const wipEntries = useWIPStore.getState().entries;
      const dailyLogs = useDailyLogs.getState().logs;
      
      // Build complete document structure
      const documentStructure = buildCompleteDocumentStructure(doc);
      
      const prompt = `${SYSTEM_PROMPT}

User request: ${message}

Chat history:
${history.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

WIP Entries:
${JSON.stringify(wipEntries, null, 2)}

Daily Activity Logs:
${JSON.stringify(dailyLogs, null, 2)}

Complete document structure (analyze carefully):
${JSON.stringify(documentStructure, null, 2)}

Document Metadata:
- Document ID: ${doc.documentId}
- Revision ID: ${doc.revisionId}
- Total structural elements: ${documentStructure.body.content.length}
- Has headers: ${Object.keys(documentStructure.headers || {}).length > 0}
- Has footers: ${Object.keys(documentStructure.footers || {}).length > 0}
- Has footnotes: ${Object.keys(documentStructure.footnotes || {}).length > 0}
- Has positioned objects: ${Object.keys(documentStructure.positionedObjects || {}).length > 0}
- Has inline objects: ${Object.keys(documentStructure.inlineObjects || {}).length > 0}

Style Information:
- Named styles: ${documentStructure.namedStyles ? JSON.stringify(documentStructure.namedStyles, null, 2) : 'None'}
- Document style: ${documentStructure.documentStyle ? JSON.stringify(documentStructure.documentStyle, null, 2) : 'Default'}

Lists and Ranges:
- Named ranges: ${Object.keys(documentStructure.namedRanges || {}).length}
- List structures: ${Object.keys(documentStructure.lists || {}).length}`;

      // Get AI response
      console.log('🤖 Sending request to Gemini...');
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const responseText = response.text();
      console.log('📝 Raw Gemini response:', responseText);

      // Try to extract JSON requests
      const jsonMatch = responseText.match(/\[\s*\{[\s\S]*?\}\s*\]/);
      console.log('🔍 Found JSON match:', !!jsonMatch);
      
      if (jsonMatch) {
        console.log('📋 Extracted JSON:', jsonMatch[0]);
        try {
          // Pre-process the JSON string to evaluate any expressions
          const processedJson = jsonMatch[0].replace(
            /:\s*(\d+)\s*\+\s*(\d+)/g,
            (match, num1, num2) => `: ${parseInt(num1) + parseInt(num2)}`
          );
          
          let requests = JSON.parse(processedJson);
          console.log('✨ Parsed requests:', requests);

          // Validate and fix request format
          requests = requests.map((req: any) => {
            console.log('🔄 Processing request:', req);
            
            // Handle replaceAllText
            if (req.replaceAllText) {
              return handleReplaceAllText(req, documentStructure);
            }
            
            // Handle insertText
            if (req.insertText) {
              return handleInsertText(req, documentStructure);
            }
            
            // Handle table operations
            if (req.insertTable || req.deleteTable || req.insertTableRow || req.deleteTableRow || 
                req.insertTableColumn || req.deleteTableColumn || req.mergeTableCells || 
                req.unmergeTableCells || req.updateTableCellStyle || req.updateTableRowStyle ||
                req.updateTableColumnProperties || req.updateTableAlignment) {
              return handleTableOperation(req, documentStructure);
            }
            
            // Handle list operations
            if (req.createList || req.deleteList || req.updateList) {
              return handleListOperation(req, documentStructure);
            }
            
            // Handle style operations
            if (req.updateTextStyle || req.updateParagraphStyle || req.updateTableCellStyle ||
                req.updateTableRowStyle || req.createNamedStyle || req.updateNamedStyle) {
              return handleStyleOperation(req, documentStructure);
            }
            
            // Handle object operations
            if (req.insertInlineImage || req.deletePositionedObject || req.deleteInlineObject ||
                req.replaceImage || req.updateEmbeddedObjectBorder || req.updateImageProperties ||
                req.updatePositionedObjectPositioning) {
              return handleObjectOperation(req, documentStructure);
            }
            
            // Handle break operations
            if (req.insertPageBreak || req.insertSectionBreak || req.insertColumnBreak) {
              return handleBreakOperation(req, documentStructure);
            }
            
            // Handle suggestion operations
            if (req.acceptAllSuggestions || req.rejectAllSuggestions || 
                req.acceptSuggestionById || req.rejectSuggestionById) {
              return handleSuggestionOperation(req);
            }
            
            // Handle linked content operations
            if (req.insertSheetsChart || req.updateSheetsChart) {
              return handleLinkedContentOperation(req, documentStructure);
            }
            
            // Handle equation operations
            if (req.insertEquation || req.updateEquationStyle) {
              return handleEquationOperation(req, documentStructure);
            }
            
            // Handle person operations
            if (req.insertPerson) {
              return handlePersonOperation(req, documentStructure);
            }
            
            // Handle autotext operations
            if (req.insertAutoText) {
              return handleAutoTextOperation(req, documentStructure);
            }
            
            // Handle tab operations
            if (req.createDocumentTab || req.deleteDocumentTab) {
              return handleDocumentTabOperation(req);
            }
            
            // Handle bookmark operations
            if (req.insertBookmark || req.deleteBookmark) {
              return handleBookmarkOperation(req, documentStructure);
            }
            
            // Handle border operations
            if (req.updateBorders) {
              return handleBorderOperation(req, documentStructure);
            }
            
            // Handle color operations
            if (req.updateColor) {
              return handleColorOperation(req, documentStructure);
            }
            
            // Handle named range operations
            if (req.createNamedRange || req.deleteNamedRange || req.updateNamedRanges) {
              return handleNamedRangeOperation(req, documentStructure);
            }

            if (req.updateDocumentStyle) {
              return handleDocumentStyleOperation(req, documentStructure);
            }

            if (req.updateSectionStyle) {
              return handleSectionStyleOperation(req, documentStructure);
            }

            if (req.createFootnote || req.updateFootnoteStyle) {
              return handleFootnoteOperation(req, documentStructure);
            }

            if (req.createHeader || req.createFooter) {
              return handleHeaderFooterOperation(req, documentStructure);
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
              
              // Check if text exists in any paragraph content
              const textExists = documentStructure.body.content.some(element => {
                if (element.paragraph?.elements) {
                  return element.paragraph.elements.some(el => 
                    el.textRun?.content?.includes(searchText)
                  );
                }
                return false;
              });
              
              const isValid = (
                searchText &&
                typeof searchText === 'string' &&
                req.replaceAllText.replaceText &&
                typeof req.replaceAllText.replaceText === 'string' &&
                textExists
              );
              if (!isValid) {
                if (!textExists) {
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
            .match(/✅ Changes Made:[\s\S]*?(?=🔍 Reason for Changes:)|\n🔍 Reason for Changes:[\s\S]*?(?=✓ To Verify:)|\n✓ To Verify:[\s\S]*/g);

          if (sectionsMatch) {
            const formattedResponse = sectionsMatch
              .map(section => section.trim())
              .join('\n\n');
            return { 
              response: formattedResponse,
              documentUpdated: true 
            };
          }
          
          // Fallback if sections aren't properly formatted
          return { 
            response: '✅ Changes applied successfully\n\n' + responseText.split(/\]\s*/).slice(1).join('').trim(),
            documentUpdated: true 
          };
        } catch (error) {
          console.error('Error in JSON parsing:', error);
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

// Operation handler functions
const handleReplaceAllText = (req: any, doc: any) => {
  const searchText = req.replaceAllText?.containsText?.text;
  if (!searchText || typeof searchText !== 'string' || searchText.length < 3) {
    console.log('❌ Invalid search text:', searchText);
    return null;
  }
  
  // Check for dangerous patterns
  const dangerousPatterns = ['*', '.', '\\s+'];
  if (dangerousPatterns.some(pattern => searchText === pattern)) {
    console.log('❌ Dangerous pattern detected:', searchText);
    return null;
  }
  
  // Validate text exists in document
  const textExists = validateTextExists(searchText, doc);
  if (!textExists) {
    console.log('❌ Text not found in document:', searchText);
    return null;
  }
  
  return {
    ...req,
    replaceAllText: {
      ...req.replaceAllText,
      containsText: typeof req.replaceAllText.containsText === 'string' 
        ? { text: req.replaceAllText.containsText }
        : req.replaceAllText.containsText
    }
  };
};

const handleInsertText = (req: any, documentStructure: any) => {
  if (req.insertText?.location?.index === 'END_OF_DOCUMENT') {
    // If the user wants to insert at end, just pass the request as is
    return req;
  }

  const docLength = getDocumentTextLength(documentStructure);
  const requestedIndex = req.insertText?.location?.index;

  if (typeof requestedIndex === 'number' && requestedIndex > docLength) {
    console.log(
      '🛑 Clamping insertText location from',
      requestedIndex,
      'to',
      docLength
    );
    req.insertText.location.index = docLength;
  }

  return req;
};

const handleTableOperation = (req: any, doc: any) => {
  // Validate table indices and existence
  if ('tableStartLocation' in req) {
    const isValidLocation = validateTableLocation(req.tableStartLocation, doc);
    if (!isValidLocation) {
      console.log('❌ Invalid table location:', req.tableStartLocation);
      return null;
    }
  }
  return req;
};

const handleListOperation = (req: any, doc: any) => {
  // Validate list properties and existence
  if ('listId' in req && !validateListExists(req.listId, doc)) {
    console.log('❌ Invalid list ID:', req.listId);
    return null;
  }
  return req;
};

const handleStyleOperation = (req: any, doc: any) => {
  // Validate style properties
  if (!validateStyleProperties(req)) {
    console.log('❌ Invalid style properties:', req);
    return null;
  }
  return req;
};

const handleObjectOperation = (req: any, doc: any) => {
  // Validate object IDs and properties
  if ('objectId' in req && !validateObjectExists(req.objectId, doc)) {
    console.log('❌ Invalid object ID:', req.objectId);
    return null;
  }
  return req;
};

const handleBreakOperation = (req: any, doc: any) => {
  // Validate break location
  if (!validateLocation(req.location, doc)) {
    console.log('❌ Invalid break location:', req.location);
    return null;
  }
  return req;
};

const handleSuggestionOperation = (req: any) => {
  // Validate suggestion IDs
  if ('suggestionId' in req && !validateSuggestionId(req.suggestionId)) {
    console.log('❌ Invalid suggestion ID:', req.suggestionId);
    return null;
  }
  return req;
};

const handleLinkedContentOperation = (req: any, doc: any) => {
  // Validate linked content properties
  if (!validateLinkedContent(req)) {
    console.log('❌ Invalid linked content:', req);
    return null;
  }
  return req;
};

const handleEquationOperation = (req: any, doc: any) => {
  // Validate equation properties
  if (!validateLocation(req.location, doc)) {
    console.log('❌ Invalid equation location:', req.location);
    return null;
  }
  return req;
};

const handlePersonOperation = (req: any, doc: any) => {
  // Validate person properties
  if (!validatePersonProperties(req.person)) {
    console.log('❌ Invalid person properties:', req.person);
    return null;
  }
  return req;
};

const handleAutoTextOperation = (req: any, doc: any) => {
  // Validate autotext properties
  if (!validateAutoTextType(req.type)) {
    console.log('❌ Invalid autotext type:', req.type);
    return null;
  }
  return req;
};

const handleDocumentTabOperation = (req: any) => {
  // Validate tab properties
  if (!validateTabProperties(req.tabProperties)) {
    console.log('❌ Invalid tab properties:', req.tabProperties);
    return null;
  }
  return req;
};

const handleBookmarkOperation = (req: any, doc: any) => {
  // Validate bookmark properties
  if ('bookmarkId' in req && !validateBookmarkExists(req.bookmarkId, doc)) {
    console.log('❌ Invalid bookmark ID:', req.bookmarkId);
    return null;
  }
  return req;
};

const handleBorderOperation = (req: any, doc: any) => {
  // Validate border properties
  if (!validateBorderProperties(req.borders)) {
    console.log('❌ Invalid border properties:', req.borders);
    return null;
  }
  return req;
};

const handleColorOperation = (req: any, doc: any) => {
  // Validate color properties
  if (!validateColorProperties(req.color)) {
    console.log('❌ Invalid color properties:', req.color);
    return null;
  }
  return req;
};

const handleNamedRangeOperation = (req: any, doc: any) => {
  // Validate named range properties
  if ('namedRangeId' in req && !validateNamedRangeExists(req.namedRangeId, doc)) {
    console.log('❌ Invalid named range ID:', req.namedRangeId);
    return null;
  }
  return req;
};

// Add new operation handlers
const handleDocumentStyleOperation = (req: any, doc: any) => {
  if (!validateDocumentStyle(req.documentStyle)) {
    console.log('❌ Invalid document style:', req.documentStyle);
    return null;
  }
  return req;
};

const handleSectionStyleOperation = (req: any, doc: any) => {
  if (!validateSectionStyle(req.sectionStyle)) {
    console.log('❌ Invalid section style:', req.sectionStyle);
    return null;
  }
  return req;
};

const handleFootnoteOperation = (req: any, doc: any) => {
  if (req.createFootnote && !validateLocation(req.location, doc)) {
    console.log('❌ Invalid footnote location:', req.location);
    return null;
  }
  return req;
};

const handleHeaderFooterOperation = (req: any, doc: any) => {
  if (!validateHeaderFooterType(req.type)) {
    console.log('❌ Invalid header/footer type:', req.type);
    return null;
  }

  if (req.deleteHeader) {
    const { headerId } = req.deleteHeader;
    // Validate headerId
    if (!doc.headers || !doc.headers[headerId]) {
      console.log('❌ Invalid header ID:', headerId);
      return null;
    }
    return req;
  }

  if (req.deleteFooter) {
    const { footerId } = req.deleteFooter;
    // Validate footerId
    if (!doc.footers || !doc.footers[footerId]) {
      console.log('❌ Invalid footer ID:', footerId);
      return null;
    }
    return req;
  }

  return req;
};

// Update validation functions with proper checks
const validateTextExists = (text: string, doc: any): boolean => {
  return doc.body.content.some(element => {
    if (element.paragraph?.elements) {
      return element.paragraph.elements.some(el => 
        el.textRun?.content?.includes(text)
      );
    }
    return false;
  });
};

const validateTableLocation = (location: any, doc: any): boolean => {
  if (!location || typeof location.index !== 'number') return false;
  return location.index >= 0 && location.index < doc.body.content.length;
};

const validateLocation = (location: any, doc: any): boolean => {
  if (!location || typeof location.index !== 'number') return false;
  return location.index >= 0 && location.index < doc.body.content.length;
};

const validateListExists = (listId: string, doc: any): boolean => {
  return doc.lists && listId in doc.lists;
};

const validateStyleProperties = (req: any): boolean => {
  if (!req) return false;
  
  // Validate text style properties
  if (req.textStyle) {
    const { fontSize, weightedFontFamily, baselineOffset } = req.textStyle;
    if (fontSize && !validateDimension(fontSize)) return false;
    if (weightedFontFamily && !validateWeightedFontFamily(weightedFontFamily)) return false;
    if (baselineOffset && !['NONE', 'SUPERSCRIPT', 'SUBSCRIPT'].includes(baselineOffset)) return false;
  }
  
  // Validate paragraph style properties
  if (req.paragraphStyle) {
    const { alignment, lineSpacing, direction } = req.paragraphStyle;
    if (alignment && !['START', 'CENTER', 'END', 'JUSTIFIED'].includes(alignment)) return false;
    if (lineSpacing && typeof lineSpacing !== 'number') return false;
    if (direction && !['LEFT_TO_RIGHT', 'RIGHT_TO_LEFT'].includes(direction)) return false;
  }
  
  return true;
};

const validateBorderProperties = (borders: any): boolean => {
  if (!borders) return false;
  
  const validDashStyles = ['SOLID', 'DOT', 'DASH', 'DASH_DOT', 'LONG_DASH', 'LONG_DASH_DOT'];
  const validWidthUnits = ['PT', 'MM', 'INCH'];
  
  for (const border of Object.values(borders)) {
    const { dashStyle, width, padding } = border as any;
    
    if (dashStyle && !validDashStyles.includes(dashStyle)) return false;
    if (width && (!width.magnitude || !validWidthUnits.includes(width.unit))) return false;
    if (padding && (!padding.magnitude || !validWidthUnits.includes(padding.unit))) return false;
  }
  
  return true;
};

const validateBookmarkExists = (bookmarkId: string, doc: any): boolean => {
  return doc.body.content.some(element => {
    if (element.paragraph?.elements) {
      return element.paragraph.elements.some(el => 
        el.textRun?.textStyle?.link?.bookmarkId === bookmarkId
      );
    }
    return false;
  });
};

const validateLinkedContent = (req: any): boolean => {
  if (!req) return false;
  
  // Validate Sheets chart reference
  if (req.sheetsChart) {
    const { spreadsheetId, chartId } = req.sheetsChart;
    if (!spreadsheetId || typeof spreadsheetId !== 'string') return false;
    if (!chartId || typeof chartId !== 'number') return false;
  }
  
  return true;
};

const validateDocumentStyle = (style: any): boolean => {
  if (!style) return false;
  
  const { pageSize, marginTop, marginBottom, marginLeft, marginRight } = style;
  
  // Validate page size
  if (pageSize && (!validateDimension(pageSize.width) || !validateDimension(pageSize.height))) {
    return false;
  }
  
  // Validate margins
  const margins = [marginTop, marginBottom, marginLeft, marginRight];
  if (margins.some(margin => margin && !validateDimension(margin))) {
    return false;
  }
  
  return true;
};

const validateSectionStyle = (style: any): boolean => {
  if (!style) return false;
  
  const { columnProperties, columnSeparatorStyle } = style;
  
  // Validate column properties
  if (columnProperties) {
    for (const prop of columnProperties) {
      if (!validateDimension(prop.width)) return false;
      if (prop.paddingEnd && !validateDimension(prop.paddingEnd)) return false;
    }
  }
  
  // Validate separator style
  if (columnSeparatorStyle && !['NONE', 'BETWEEN_EACH_COLUMN'].includes(columnSeparatorStyle)) {
    return false;
  }
  
  return true;
};

const validateHeaderFooterType = (type: string): boolean => {
  return ['DEFAULT', 'FIRST_PAGE_HEADER', 'FIRST_PAGE_FOOTER'].includes(type);
};

const validateDimension = (dimension: any): boolean => {
  return dimension && 
         typeof dimension.magnitude === 'number' && 
         ['PT', 'MM', 'INCH'].includes(dimension.unit);
};

const validateWeightedFontFamily = (font: any): boolean => {
  return font && 
         typeof font.fontFamily === 'string' && 
         typeof font.weight === 'number' &&
         font.weight >= 100 && 
         font.weight <= 900 && 
         font.weight % 100 === 0;
};

const validateSuggestionId = (suggestionId: string): boolean => {
  return typeof suggestionId === 'string' && suggestionId.length > 0;
};

const validateColorProperties = (color: any): boolean => {
  return color && (color.rgbColor || color.themeColor);
};

const validateNamedRangeExists = (namedRangeId: string, doc: any): boolean => {
  return doc.namedRanges && namedRangeId in doc.namedRanges;
};

const validateObjectExists = (objectId: string, doc: any): boolean => {
  return (
    (doc.inlineObjects && objectId in doc.inlineObjects) ||
    (doc.positionedObjects && objectId in doc.positionedObjects)
  );
};

const validatePersonProperties = (person: any): boolean => {
  return person && person.personProperties && 
    (person.personProperties.email || person.personProperties.name);
};

const validateAutoTextType = (type: string): boolean => {
  const validTypes = [
    'UNKNOWN', 'DATE', 'TIME', 'PAGE_NUMBER', 
    'PAGE_COUNT', 'DOCUMENT_TITLE'
  ];
  return validTypes.includes(type);
};

const validateTabProperties = (props: any): boolean => {
  return props && props.tabId && props.tabName;
};

function handleTabOperation(req: any) {
  // existing checks...

  if (req.deleteTabStop) {
    const { range, tabStopIndex } = req.deleteTabStop;
    // Validate range and tabStopIndex
    if (!range || typeof tabStopIndex !== 'number') {
      console.log('❌ Invalid deleteTabStop request:', req.deleteTabStop);
      return null;
    }
    // Additional logic/validations here
    return req;
  }

  return req;
}

function getDocumentTextLength(documentStructure: any): number {
  let total = 0;
  if (!documentStructure?.body?.content) return total;

  for (const element of documentStructure.body.content) {
    if (element.paragraph?.elements) {
      for (const el of element.paragraph.elements) {
        if (el.textRun?.content) {
          total += el.textRun.content.length;
        }
      }
    }
  }

  return total;
}

// ... rest of the file remains unchanged ... 