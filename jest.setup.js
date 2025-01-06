const { fetch, Headers, Request, Response } = require('node-fetch');
const dotenv = require('dotenv');

// Load environment variables from .env.test
dotenv.config({ path: '.env.test' });

global.fetch = fetch;
global.Headers = Headers;
global.Request = Request;
global.Response = Response; 