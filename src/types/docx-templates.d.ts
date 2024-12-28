declare module 'docx-templates' {
  export function createReport(options: {
    template: Buffer;
    data: any;
    cmdDelimiter?: [string, string];
  }): Promise<Buffer>;
} 