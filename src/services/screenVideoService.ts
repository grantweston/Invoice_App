'use client';

import { createTimeEntry } from '@/src/backend/services/timeEntryService';
import { promises as fs } from 'fs';
import path from 'path';
import RecordRTC from 'recordrtc';
import { useVideoStatusStore } from '@/src/store/videoStatusStore';

export class ScreenVideoService {
  private recorder: RecordRTC | null = null;
  private isRecording = false;
  private recordingPath: string;

  constructor() {
    if (typeof window === 'undefined') {
      throw new Error('ScreenVideoService can only be used in browser environment');
    }
    this.recordingPath = path.join(process.cwd(), 'recordings');
  }

  async startCapturing() {
    if (this.isRecording) {
      await this.stopCapturing();
    }

    try {
      await fs.mkdir(this.recordingPath, { recursive: true });
      
      // Get screen stream
      if (!navigator.mediaDevices?.getDisplayMedia) {
        throw new Error('Screen capture is not supported in this environment');
      }

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

      useVideoStatusStore.getState().setStatus({ 
        state: 'recording', 
        message: 'Screen recording started' 
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      useVideoStatusStore.getState().setStatus({
        state: 'error',
        message: `Failed to start: ${error.message}`
      });
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
      useVideoStatusStore.getState().setStatus({
        state: 'error',
        message: `Failed to stop: ${error.message}`
      });
    }
  }

  getStatus() {
    return useVideoStatusStore.getState().status;
  }
}

// Only create instance in browser environment
export const screenVideo = typeof window !== 'undefined' ? new ScreenVideoService() : null;
