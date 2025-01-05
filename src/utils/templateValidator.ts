import { TemplateAnalysis } from '@/src/types';

interface ValidationIssue {
  type: 'error' | 'warning';
  message: string;
  region?: string;
  element?: string;
  location?: {
    page: number;
    section: string;
    bounds?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
}

interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  structure: {
    regions: {
      name: string;
      elements: number;
      valid: boolean;
      issues?: string[];
    }[];
    placeholders: {
      name: string;
      valid: boolean;
      issues?: string[];
    }[];
    layout: {
      valid: boolean;
      issues?: string[];
    };
  };
}

export function validateTemplate(template: TemplateAnalysis): ValidationResult {
  const issues: ValidationIssue[] = [];
  const regionValidation = new Map<string, { valid: boolean; issues: string[] }>();
  
  // Validate required regions
  validateRequiredRegions(template, issues, regionValidation);
  
  // Validate placeholders
  const placeholderValidation = validatePlaceholders(template, issues);
  
  // Validate layout and spacing
  const layoutValidation = validateLayout(template, issues);
  
  // Validate element relationships
  validateElementRelationships(template, issues);
  
  return {
    valid: issues.filter(i => i.type === 'error').length === 0,
    issues,
    structure: {
      regions: template.sections.map(section => ({
        name: section.name,
        elements: template.elements.filter(e => 
          e.position?.section === section.name
        ).length,
        valid: regionValidation.get(section.name)?.valid ?? false,
        issues: regionValidation.get(section.name)?.issues
      })),
      placeholders: placeholderValidation,
      layout: layoutValidation
    }
  };
}

function validateRequiredRegions(
  template: TemplateAnalysis,
  issues: ValidationIssue[],
  regionValidation: Map<string, { valid: boolean; issues: string[] }>
) {
  const requiredRegions = [
    {
      name: 'header',
      requiredElements: ['company_info', 'invoice_details']
    },
    {
      name: 'client_info',
      requiredElements: ['name', 'address']
    },
    {
      name: 'details',
      requiredElements: ['line_items']
    },
    {
      name: 'summary',
      requiredElements: ['total_amount']
    }
  ];
  
  requiredRegions.forEach(region => {
    const found = template.sections.find(s => 
      s.name.toLowerCase().includes(region.name)
    );
    
    if (!found) {
      issues.push({
        type: 'error',
        message: `Missing required region: ${region.name}`,
        region: region.name
      });
      regionValidation.set(region.name, { valid: false, issues: ['Region not found'] });
    } else {
      const regionElements = template.elements.filter(e => 
        e.position?.section === found.name
      );
      
      const missingElements = region.requiredElements.filter(required =>
        !regionElements.some(e => e.content.toLowerCase().includes(required))
      );
      
      if (missingElements.length > 0) {
        issues.push({
          type: 'error',
          message: `Missing required elements in ${region.name}: ${missingElements.join(', ')}`,
          region: found.name
        });
        regionValidation.set(found.name, {
          valid: false,
          issues: missingElements.map(e => `Missing ${e}`)
        });
      } else {
        regionValidation.set(found.name, { valid: true, issues: [] });
      }
    }
  });
}

function validatePlaceholders(
  template: TemplateAnalysis,
  issues: ValidationIssue[]
): Array<{ name: string; valid: boolean; issues?: string[] }> {
  const requiredPlaceholders = [
    'client_name',
    'client_address',
    'invoice_number',
    'date',
    'total_amount'
  ];
  
  return requiredPlaceholders.map(required => {
    const found = template.placeholders.some(p => 
      p.toLowerCase().includes(required)
    );
    
    if (!found) {
      issues.push({
        type: 'error',
        message: `Missing required placeholder: ${required}`
      });
      return {
        name: required,
        valid: false,
        issues: ['Placeholder not found']
      };
    }
    
    return {
      name: required,
      valid: true
    };
  });
}

function validateLayout(
  template: TemplateAnalysis,
  issues: ValidationIssue[]
): { valid: boolean; issues?: string[] } {
  const layoutIssues: string[] = [];
  
  // Check section order
  const expectedOrder = ['header', 'client_info', 'details', 'summary'];
  const actualOrder = template.sections
    .map(s => s.name.toLowerCase())
    .filter(name => expectedOrder.includes(name));
  
  let isOrderCorrect = true;
  for (let i = 0; i < expectedOrder.length; i++) {
    if (actualOrder[i] !== expectedOrder[i]) {
      isOrderCorrect = false;
      break;
    }
  }
  
  if (!isOrderCorrect) {
    issues.push({
      type: 'warning',
      message: 'Sections are not in the expected order'
    });
    layoutIssues.push('Incorrect section order');
  }
  
  // Check for overlapping elements
  template.elements.forEach((elem1, i) => {
    template.elements.slice(i + 1).forEach(elem2 => {
      if (
        elem1.position?.section === elem2.position?.section &&
        elem1.position?.page === elem2.position?.page
      ) {
        issues.push({
          type: 'warning',
          message: `Possible element overlap in ${elem1.position.section}`,
          region: elem1.position.section,
          location: {
            page: elem1.position.page,
            section: elem1.position.section
          }
        });
        layoutIssues.push('Element overlap detected');
      }
    });
  });
  
  return {
    valid: layoutIssues.length === 0,
    issues: layoutIssues.length > 0 ? layoutIssues : undefined
  };
}

function validateElementRelationships(
  template: TemplateAnalysis,
  issues: ValidationIssue[]
) {
  // Validate that related elements are in the correct sections
  template.sections.forEach(section => {
    const sectionElements = template.elements.filter(e => 
      e.position?.section === section.name
    );
    
    sectionElements.forEach(element => {
      // Check if element references exist in the same section
      if (element.content.includes('{ref:')) {
        const refMatch = element.content.match(/{ref:([^}]+)}/);
        if (refMatch) {
          const referencedElement = sectionElements.find(e => 
            e.content.includes(refMatch[1])
          );
          
          if (!referencedElement) {
            issues.push({
              type: 'error',
              message: `Referenced element "${refMatch[1]}" not found in section ${section.name}`,
              region: section.name,
              element: element.content
            });
          }
        }
      }
    });
  });
} 