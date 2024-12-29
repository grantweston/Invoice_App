import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const STORAGE_DIR = path.join(process.cwd(), 'storage', 'templates');

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const templateId = params.id;
    const filePath = path.join(STORAGE_DIR, `${templateId}.docx`);

    try {
      await fs.access(filePath);
      return NextResponse.json({ exists: true });
    } catch {
      return NextResponse.json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking template:', error);
    return NextResponse.json(
      { error: 'Failed to check template' },
      { status: 500 }
    );
  }
} 