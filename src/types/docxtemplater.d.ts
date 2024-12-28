declare module 'docxtemplater' {
  export default class Docxtemplater {
    constructor(zip: any, options?: any);
    render(data: any): void;
    getZip(): any;
  }
} 