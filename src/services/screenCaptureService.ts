import screenshot from 'screenshot-desktop';
import { promises as fs } from 'fs';
import path from 'path';
import { summarizeOneMinuteActivities } from '@/src/integrations/gemini/geminiService';

export class ScreenCaptureService {
  private captureInterval: NodeJS.Timeout | null = null;
  private isCapturing = false;
  private activities: string[] = [];

  async startCapturing() {
    if (this.isCapturing) return;
    
    this.isCapturing = true;
    console.log('Screen capture started');

    const capturesDir = path.join(process.cwd(), 'captures');
    await fs.mkdir(capturesDir, { recursive: true });

    this.captureInterval = setInterval(async () => {
      try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const imagePath = path.join(capturesDir, `capture-${timestamp}.png`);
        
        await screenshot({ filename: imagePath });
        console.log(`Screen captured: ${imagePath}`);
        
        // Add to activities array
        this.activities.push(`Screen activity at ${timestamp}`);
        
        // Every 15 captures (15 minutes), summarize and reset
        if (this.activities.length >= 15) {
          const summary = await summarizeOneMinuteActivities(this.activities);
          console.log('15-minute summary:', summary);
          this.activities = [];
        }
      } catch (error) {
        console.error('Screen capture failed:', error);
      }
    }, 60000); // Capture every minute
  }

  async stopCapturing() {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
      this.isCapturing = false;
      this.activities = [];
      console.log('Screen capture stopped');
    }
  }

  isActive() {
    return this.isCapturing;
  }
}

export const screenCapture = new ScreenCaptureService(); 