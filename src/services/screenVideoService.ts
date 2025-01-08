'use client';

import RecordRTC from 'recordrtc';

export class ScreenVideoService {
  private recorder: RecordRTC | null = null;
  private isRecording = false;
  private currentStatus: { state: string; message: string } = {
    state: 'idle',
    message: ''
  };

  async startCapturing() {
    if (this.isRecording) {
      await this.stopCapturing();
    }

    try {
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

// Only create the instance if we're in the browser
export const screenVideo = typeof window !== 'undefined' ? new ScreenVideoService() : null;
