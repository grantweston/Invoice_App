import { getSupabase } from '@/src/backend/db/supabaseClient';
import { createTimeEntry } from '@/src/backend/services/timeEntryService';
import { promises as fs } from 'fs';
import path from 'path';
import RecordRTC from 'recordrtc';

export class ScreenVideoService {
  private recorder: RecordRTC | null = null;
  private isRecording = false;
  private recordingPath: string;
  private currentStatus: { state: string; message: string } = {
    state: 'idle',
    message: ''
  };

  constructor() {
    this.recordingPath = path.join(process.cwd(), 'recordings');
  }

  async startCapturing() {
    if (this.isRecording) {
      await this.stopCapturing();
    }

    try {
      await fs.mkdir(this.recordingPath, { recursive: true });
      
      // Get screen stream
      const stream = await navigator.mediaDevices.getDisplayMedia({ 
        video: true,
        audio: false
      });

      this.recorder = new RecordRTC(stream, {
        type: 'video',
        mimeType: 'video/webm',
        bitsPerSecond: 128000
      });

      this.recorder.startRecording();
      this.isRecording = true;
      
      // Create initial time entry
      await createTimeEntry({
        clientId: 'A', // You'll need to get these from UI/state
        projectId: 'Alpha',
        hours: 0,
        description: 'Started recording session',
        date: new Date().toISOString()
      });

      this.currentStatus = { 
        state: 'recording', 
        message: 'Screen recording started' 
      };
    } catch (error) {
      console.error('Failed to start recording:', error);
      this.currentStatus = {
        state: 'error',
        message: `Failed to start: ${error.message}`
      };
    }
  }

  async stopCapturing() {
    if (!this.isRecording || !this.recorder) return;

    try {
      return new Promise((resolve, reject) => {
        this.recorder.stopRecording(() => {
          const blob = this.recorder.getBlob();
          const file = new File([blob], 'recording.webm', { type: 'video/webm' });
          resolve(file);
        });
      });
    } catch (error) {
      console.error('Failed to stop recording:', error);
      this.currentStatus = {
        state: 'error',
        message: `Failed to stop: ${error.message}`
      };
    }
  }

  getStatus() {
    return this.currentStatus;
  }
}

export const screenVideo = new ScreenVideoService();
