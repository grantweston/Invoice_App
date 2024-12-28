declare module 'pizzip' {
  export default class PizZip {
    constructor(data?: Buffer | string);
    generate(options: { type: string; compression?: string }): Buffer;
  }
} 