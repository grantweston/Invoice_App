import { platform } from 'os';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';

const execAsync = promisify(exec);

// Get the LibreOffice executable path based on platform
const getLibreOfficePath = async () => {
  if (platform() === 'darwin') { // macOS
    const path = '/Applications/LibreOffice.app/Contents/MacOS/soffice';
    try {
      await fs.access(path, fs.constants.X_OK);
      return path;
    } catch (error) {
      console.error('LibreOffice not found at expected path:', path);
      throw new Error('LibreOffice not found. Please ensure it is installed at the correct location.');
    }
  }
  return 'libreoffice'; // Default for other platforms
};

// Ensure temp directory exists
const TEMP_DIR = path.join(process.cwd(), 'temp');
fs.mkdir(TEMP_DIR, { recursive: true }).catch(console.error);

export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  try {
    // Get and verify LibreOffice path
    const libreofficePath = await getLibreOfficePath();
    console.log('Using LibreOffice at:', libreofficePath);

    // Create temporary files
    const tempId = uuidv4();
    const inputPath = path.join(TEMP_DIR, `${tempId}.docx`);
    const outputPath = path.join(TEMP_DIR, `${tempId}.pdf`);

    // Write the input file
    await fs.writeFile(inputPath, docxBuffer);

    // Convert using LibreOffice
    const command = `"${libreofficePath}" --headless --convert-to pdf --outdir "${TEMP_DIR}" "${inputPath}"`;
    console.log('Executing command:', command);
    
    const { stdout, stderr } = await execAsync(command);
    console.log('Conversion output:', stdout);
    if (stderr) console.error('Conversion errors:', stderr);

    // Read the output file
    const pdfBuffer = await fs.readFile(outputPath);
    
    // Clean up temporary files
    await Promise.all([
      fs.unlink(inputPath).catch(console.error),
      fs.unlink(outputPath).catch(console.error)
    ]);

    if (!pdfBuffer || pdfBuffer.length === 0) {
      throw new Error('PDF conversion resulted in empty buffer');
    }

    console.log('PDF conversion successful, buffer size:', pdfBuffer.length);
    return pdfBuffer;
  } catch (error) {
    console.error('Error converting DOCX to PDF:', error);
    throw new Error(`Failed to convert document: ${error.message}`);
  }
} 