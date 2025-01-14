import { drive_v3 } from 'googleapis';

export interface GoogleDocument {
  documentId: string;
  title: string;
  body: DocumentBody;
  documentStyle?: DocumentStyle;
  namedStyles?: NamedStyles;
  revisionId: string;
  suggestionsViewMode?: SuggestionsViewMode;
  inlineObjects?: { [key: string]: InlineObject };
  lists?: { [key: string]: List };
  footers?: { [key: string]: Footer };
  headers?: { [key: string]: Header };
  positionedObjects?: { [key: string]: PositionedObject };
}

export interface DocumentBody {
  content: StructuralElement[];
}

export interface StructuralElement {
  startIndex: number;
  endIndex: number;
  paragraph?: Paragraph;
  table?: Table;
  tableOfContents?: TableOfContents;
  sectionBreak?: SectionBreak;
}

export interface Paragraph {
  elements: ParagraphElement[];
  paragraphStyle?: ParagraphStyle;
  bullet?: Bullet;
  positionedObjectIds?: string[];
}

export interface ParagraphElement {
  startIndex: number;
  endIndex: number;
  textRun?: TextRun;
  inlineObjectElement?: InlineObjectElement;
  footnoteReference?: FootnoteReference;
  horizontalRule?: HorizontalRule;
  pageBreak?: PageBreak;
}

export interface TextRun {
  content: string;
  textStyle?: TextStyle;
}

export interface TextStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: Dimension;
  foregroundColor?: OptionalColor;
  backgroundColor?: OptionalColor;
  baselineOffset?: BaselineOffset;
  weightedFontFamily?: WeightedFontFamily;
  link?: Link;
}

export interface Table {
  rows: number;
  columns: number;
  tableRows: TableRow[];
  tableStyle?: TableStyle;
  suggestedInsertionIds?: string[];
}

export interface TableRow {
  startIndex: number;
  endIndex: number;
  tableCells: TableCell[];
  tableRowStyle?: TableRowStyle;
}

export interface TableCell {
  startIndex: number;
  endIndex: number;
  content: StructuralElement[];
  tableCellStyle?: TableCellStyle;
}

export interface List {
  listProperties?: ListProperties;
  suggestedInsertionId?: string;
  suggestedDeletionIds?: string[];
}

export interface ListProperties {
  nestingLevels?: NestingLevel[];
}

export interface NestingLevel {
  bulletAlignment?: BulletAlignment;
  glyphFormat?: string;
  indentFirstLine?: Dimension;
  indentStart?: Dimension;
  textStyle?: TextStyle;
}

export interface InlineObject {
  objectId: string;
  properties: InlineObjectProperties;
  suggestedInsertionId?: string;
}

export interface InlineObjectProperties {
  embeddedObject?: EmbeddedObject;
}

export interface EmbeddedObject {
  title?: string;
  description?: string;
  size?: Size;
  imageProperties?: ImageProperties;
}

export interface PositionedObject {
  objectId: string;
  properties: PositionedObjectProperties;
  suggestedInsertionId?: string;
}

export interface PositionedObjectProperties {
  positioning: PositionedObjectPositioning;
  embeddedObject?: EmbeddedObject;
}

export interface PositionedObjectPositioning {
  layout: Layout;
  leftOffset?: Dimension;
  topOffset?: Dimension;
}

export interface DocumentStyle {
  background?: Background;
  defaultHeaderId?: string;
  defaultFooterId?: string;
  firstPageHeaderId?: string;
  firstPageFooterId?: string;
  evenPageHeaderId?: string;
  evenPageFooterId?: string;
  pageNumberStart?: number;
  marginTop?: Dimension;
  marginBottom?: Dimension;
  marginRight?: Dimension;
  marginLeft?: Dimension;
  pageSize?: Size;
  useCustomHeaderFooterMargins?: boolean;
}

export interface NamedStyles {
  styles: NamedStyle[];
}

export interface NamedStyle {
  namedStyleType: NamedStyleType;
  textStyle?: TextStyle;
  paragraphStyle?: ParagraphStyle;
}

export enum NamedStyleType {
  NORMAL_TEXT = 'NORMAL_TEXT',
  TITLE = 'TITLE',
  SUBTITLE = 'SUBTITLE',
  HEADING_1 = 'HEADING_1',
  HEADING_2 = 'HEADING_2',
  HEADING_3 = 'HEADING_3',
  HEADING_4 = 'HEADING_4',
  HEADING_5 = 'HEADING_5',
  HEADING_6 = 'HEADING_6'
}

export enum SuggestionsViewMode {
  DEFAULT_FOR_CURRENT_ACCESS = 'DEFAULT_FOR_CURRENT_ACCESS',
  SUGGESTIONS_INLINE = 'SUGGESTIONS_INLINE',
  PREVIEW_SUGGESTIONS_ACCEPTED = 'PREVIEW_SUGGESTIONS_ACCEPTED',
  PREVIEW_WITHOUT_SUGGESTIONS = 'PREVIEW_WITHOUT_SUGGESTIONS'
}

export interface Dimension {
  magnitude: number;
  unit: 'PT' | 'MM' | 'INCH';
}

export interface OptionalColor {
  color?: Color;
}

export interface Color {
  rgbColor?: RgbColor;
}

export interface RgbColor {
  red?: number;
  green?: number;
  blue?: number;
}

export interface WeightedFontFamily {
  fontFamily: string;
  weight: number;
}

export type BaselineOffset = 'NONE' | 'SUPERSCRIPT' | 'SUBSCRIPT';

export interface Link {
  url?: string;
  bookmarkId?: string;
  headingId?: string;
}

export type Layout = 'INLINE' | 'BREAK_LEFT' | 'BREAK_RIGHT' | 'BREAK_BOTH' | 'WRAP_TEXT';

export interface Size {
  width: Dimension;
  height: Dimension;
}

export interface ImageProperties {
  contentUri?: string;
  sourceUri?: string;
  brightness?: number;
  contrast?: number;
  transparency?: number;
  angle?: number;
}

export interface Background {
  color?: OptionalColor;
}

export interface Header {
  headerId: string;
  content: StructuralElement[];
}

export interface Footer {
  footerId: string;
  content: StructuralElement[];
}

export interface TableOfContents {
  content: StructuralElement[];
}

export interface SectionBreak {
  sectionStyle?: SectionStyle;
}

export interface SectionStyle {
  columnProperties?: SectionColumnProperties[];
  columnSeparatorStyle?: ColumnSeparatorStyle;
  contentDirection?: ContentDirection;
}

export type ColumnSeparatorStyle = 'NONE' | 'BETWEEN_EACH_COLUMN';
export type ContentDirection = 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT';

export interface SectionColumnProperties {
  width: Dimension;
  paddingEnd: Dimension;
}

export interface Bullet {
  listId: string;
  nestingLevel: number;
  textStyle?: TextStyle;
}

export interface ParagraphStyle {
  namedStyleType?: NamedStyleType;
  alignment?: Alignment;
  lineSpacing?: number;
  direction?: ContentDirection;
  spacingMode?: SpacingMode;
  spaceAbove?: Dimension;
  spaceBelow?: Dimension;
  borderBetween?: ParagraphBorder;
  borderTop?: ParagraphBorder;
  borderBottom?: ParagraphBorder;
  borderLeft?: ParagraphBorder;
  borderRight?: ParagraphBorder;
  indentFirstLine?: Dimension;
  indentStart?: Dimension;
  indentEnd?: Dimension;
  tabStops?: TabStop[];
  keepLinesTogether?: boolean;
  keepWithNext?: boolean;
  avoidWidowAndOrphan?: boolean;
  shading?: Shading;
}

export interface TableStyle {
  tableColumnProperties?: TableColumnProperties[];
}

export interface TableRowStyle {
  minRowHeight?: Dimension;
  preventOverflow?: boolean;
}

export interface TableCellStyle {
  backgroundColor?: OptionalColor;
  borderLeft?: TableCellBorder;
  borderRight?: TableCellBorder;
  borderTop?: TableCellBorder;
  borderBottom?: TableCellBorder;
  paddingLeft?: Dimension;
  paddingRight?: Dimension;
  paddingTop?: Dimension;
  paddingBottom?: Dimension;
  contentAlignment?: ContentAlignment;
}

export interface InlineObjectElement {
  inlineObjectId: string;
  textStyle?: TextStyle;
}

export interface FootnoteReference {
  footnoteId: string;
  footnoteNumber: string;
  textStyle?: TextStyle;
}

export interface HorizontalRule {
  textStyle?: TextStyle;
}

export interface PageBreak {
  textStyle?: TextStyle;
}

export interface ParagraphBorder {
  color?: OptionalColor;
  width?: Dimension;
  padding?: Dimension;
  dashStyle?: DashStyle;
}

export interface TableCellBorder {
  color?: OptionalColor;
  width?: Dimension;
  dashStyle?: DashStyle;
}

export interface TableColumnProperties {
  widthType?: WidthType;
  width?: Dimension;
}

export interface TabStop {
  offset?: Dimension;
  alignment?: TabStopAlignment;
}

export interface Shading {
  backgroundColor?: OptionalColor;
}

export type Alignment = 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
export type SpacingMode = 'NEVER_COLLAPSE' | 'COLLAPSE_LISTS' | 'COLLAPSE_ALL';
export type DashStyle = 'SOLID' | 'DOT' | 'DASH' | 'DASH_DOT' | 'DASH_DOT_DOT';
export type WidthType = 'WIDTH_TYPE_UNSPECIFIED' | 'EVENLY_DISTRIBUTED' | 'FIXED_WIDTH';
export type TabStopAlignment = 'START' | 'CENTER' | 'END';
export type ContentAlignment = 'TOP' | 'MIDDLE' | 'BOTTOM';
export type BulletAlignment = 'START' | 'CENTER' | 'END'; 