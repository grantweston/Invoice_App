export class ClientScreenRecorder {
  private mediaStream: MediaStream | null = null;
  private isRecording: boolean = false;
  private screenshotBuffer: string[] = [];
  private screenshotCount: number = 0;

  async startRecording(onScreenBatch: (screenshots: string[]) => void) {
    try {
      console.log('🎥 Requesting screen share...');
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({ 
        video: { 
          frameRate: 1,
          width: 1280,
          height: 720
        } 
      });
      console.log('✅ Screen share granted');
      
      this.isRecording = true;
      this.screenshotBuffer = [];
      this.screenshotCount = 0;

      const video = document.createElement('video');
      video.srcObject = this.mediaStream;
      video.muted = true;
      
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => {
            console.log('🎬 Video stream started', { width: video.videoWidth, height: video.videoHeight });
            resolve();
          });
        };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      console.log('🖼️ Canvas initialized', { width: canvas.width, height: canvas.height });
      console.log('📸 Starting screenshot capture...');

      // Take a screenshot every second
      const interval = setInterval(() => {
        if (!this.isRecording) {
          console.log('⏹️ Recording stopped, clearing interval');
          clearInterval(interval);
          return;
        }

        try {
          ctx.drawImage(video, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.5);
          this.screenshotBuffer.push(base64);
          this.screenshotCount++;
          
          // Update screenshot count in document title
          document.title = `📸 ${this.screenshotCount}/60 screenshots`;

          // Process when we have 60 screenshots (1 minute)
          if (this.screenshotCount >= 60) {
            console.log('📦 Minute complete, processing screenshots...');
            onScreenBatch([...this.screenshotBuffer]);
            this.screenshotBuffer = [];
            this.screenshotCount = 0;
          }
        } catch (error) {
          console.error('❌ Failed to capture screenshot:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw error;
    }
  }

  async stopRecording() {
    console.log('🛑 Stopping recording...');
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    document.title = 'Recording stopped';
    console.log('✅ Recording stopped');
  }
} 