import { WIPEntry, DailyActivity } from './services/supabaseDB';

export interface WorkCategory {
  name: string;
  description?: string;
  entries: WIPEntry[];
  activities: DailyActivity[];
  totalMinutes: number;
  totalAmount: number;
}

export interface DetailedInvoice {
  client: {
    name: string;
    address: string;
    clientNumber?: string;
  };
  invoiceNumber: string;
  dateRange: {
    start: string;
    end: string;
  };
  categories: WorkCategory[];
  totalAmount: number;
  retainerAmount?: number;
  adjustments?: {
    description: string;
    amount: number;
  }[];
}

export interface StyleAnalysis {
  font: {
    family: string;
    weight: number;
    style: string;
    size: number;
  };
  paragraph: {
    lineSpacing: number;
    beforeSpacing: number;
    afterSpacing: number;
    indentation: number;
  };
  borders?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  background?: string;
  color?: string;
}

export interface TemplateAnalysis {
  elements: {
    type: 'text' | 'placeholder' | 'table' | 'section' | 'static';
    content: string;
    style: StyleAnalysis;
    position?: {
      page: number;
      section?: string;
    };
    staticElement?: {
      type: 'logo' | 'letterhead' | 'footer' | 'watermark';
      preserveExact: boolean;
      content: string;
    };
  }[];
  placeholders: string[];
  sections: {
    name: string;
    startMarker: string;
    endMarker?: string;
  }[];
  staticElements: {
    type: 'logo' | 'letterhead' | 'footer' | 'watermark';
    position: {
      page: number;
      x: number;
      y: number;
      width: number;
      height: number;
    };
    content: string;
    preserveExact: boolean;
  }[];
}

export interface Template {
  id: string;
  name: string;
  analysis: TemplateAnalysis;
  lastUpdated: string;
} 