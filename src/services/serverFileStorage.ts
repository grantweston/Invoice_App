import { promises as fs } from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'templates');

// Initialize storage directory
fs.mkdir(STORAGE_DIR, { recursive: true }).catch(console.error);

export async function storeServerFile(id: string, buffer: Buffer): Promise<void> {
  const filePath = path.join(STORAGE_DIR, `${id}.docx`);
  await fs.writeFile(filePath, buffer);
}

export async function getServerFile(id: string): Promise<Buffer | undefined> {
  try {
    const filePath = path.join(STORAGE_DIR, `${id}.docx`);
    return await fs.readFile(filePath);
  } catch (error) {
    console.error('Error reading file:', error);
    return undefined;
  }
}

export async function deleteServerFile(id: string): Promise<void> {
  try {
    const filePath = path.join(STORAGE_DIR, `${id}.docx`);
    await fs.unlink(filePath);
  } catch (error) {
    console.error('Error deleting file:', error);
  }
}

// Add this to .gitignore to prevent template files from being committed
fs.appendFile(
  path.join(process.cwd(), '.gitignore'),
  '\n# Template storage\nstorage/templates/\n'
).catch(console.error); 