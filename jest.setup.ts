import '@testing-library/jest-dom';
import { fetch, Headers, Request, Response } from 'node-fetch';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

// Polyfill fetch
global.fetch = fetch as unknown as typeof global.fetch;
global.Headers = Headers as unknown as typeof global.Headers;
global.Request = Request as unknown as typeof global.Request;
global.Response = Response as unknown as typeof global.Response;

// Polyfill crypto.randomUUID
if (!global.crypto) {
  global.crypto = {} as Crypto;
}
global.crypto.randomUUID = (() => uuidv4()) as Crypto['randomUUID'];

// Rest of your setup code...