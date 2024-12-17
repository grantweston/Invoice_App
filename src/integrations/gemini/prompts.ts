// Prompt templates for various LLM tasks.

export const ONE_MINUTE_SUMMARY_PROMPT = (activities: string[]) => `
You are analyzing a 1-minute video of the user's computer screen, focusing on accounting tasks.
Summarize the following activities: ${activities.join(', ')}
Mention clients, projects, and key actions.
`;

export const FIFTEEN_MINUTE_AGGREGATION_PROMPT = (summaries: string[]) => `
Combine these fifteen 1-minute summaries into one coherent 15-minute summary:
${summaries.join('\n')}
Mention clients, projects, and main tasks in under 3 sentences.
`;

export const DAILY_AGGREGATION_PROMPT = (entries: any[]) => `
Aggregate these time entries by client and project. Output in JSON: { "client_name": { "project_name": { "total_time_hours": number, "description": "string" } } }
Entries:
${JSON.stringify(entries)}
`;

export const INVOICE_GENERATION_PROMPT = (invoiceData: any) => `
Given hours worked, client details, and invoice template placeholders, produce line items and a formal project description.
Data: ${JSON.stringify(invoiceData)}
`;

export const REFINEMENT_PROMPT = (currentText: string) => `
Here is the current invoice text:
${currentText}
The user wants it more formal/concise. Maintain placeholders. Return the revised text.
`;