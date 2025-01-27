'use client';

<<<<<<< HEAD
=======
import { createTimeEntry } from '@/src/backend/services/timeEntryService';
import { promises as fs } from 'fs';
import path from 'path';
>>>>>>> gemini-updates
import RecordRTC from 'recordrtc';
import { useVideoStatusStore } from '@/src/store/videoStatusStore';

export class ScreenVideoService {
  private recorder: RecordRTC | null = null;
  private isRecording = false;
<<<<<<< HEAD
  private currentStatus: { state: string; message: string } = {
    state: 'idle',
    message: ''
  };

=======
  private recordingPath: string;

  constructor() {
    if (typeof window === 'undefined') {
      throw new Error('ScreenVideoService can only be used in browser environment');
    }
    this.recordingPath = path.join(process.cwd(), 'recordings');
  }

>>>>>>> gemini-updates
  async startCapturing() {
    if (this.isRecording) {
      await this.stopCapturing();
    }

    try {
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

<<<<<<< HEAD
// Only create the instance if we're in the browser
=======
// Only create instance in browser environment
>>>>>>> gemini-updates
export const screenVideo = typeof window !== 'undefined' ? new ScreenVideoService() : null;
