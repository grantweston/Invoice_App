import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Mock crypto for UUID generation
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid'
  }
}); 