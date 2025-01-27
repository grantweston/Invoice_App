export class ClientScreenRecorder {
  private mediaStream: MediaStream | null = null;
  private isRecording: boolean = false;
  private screenshotBuffer: string[] = [];
  private screenshotCount: number = 0;
  private cleanupTimeout: NodeJS.Timeout | null = null;

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

<<<<<<< HEAD
      // Set up cleanup timeout
      this.setupCleanupTimeout();

      // Take a screenshot every second
=======
      // Take a screenshot every 5 seconds
>>>>>>> gemini-updates
      const interval = setInterval(() => {
        if (!this.isRecording) {
          console.log('⏹️ Recording stopped, clearing interval');
          clearInterval(interval);
          this.cleanupScreenshots();
          return;
        }

        try {
          ctx.drawImage(video, 0, 0);
          const base64 = canvas.toDataURL('image/jpeg', 0.5);
          this.screenshotBuffer.push(base64);
          this.screenshotCount++;
          
          // Update screenshot count in document title
          document.title = `📸 ${this.screenshotCount}/12 screenshots`;

          // Process when we have 12 screenshots (1 minute)
          if (this.screenshotCount >= 12) {
            console.log('📦 Minute complete, processing screenshots...');
            const screenshots = [...this.screenshotBuffer];
            this.cleanupScreenshots(); // Clean up before processing
            onScreenBatch(screenshots);
          }
        } catch (error) {
          console.error('❌ Failed to capture screenshot:', error);
          this.cleanupScreenshots();
        }
      }, 5000);

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      this.cleanupScreenshots();
      throw error;
    }
  }

  private setupCleanupTimeout() {
    // Clean up screenshots every 2 minutes if they haven't been processed
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
    }
    this.cleanupTimeout = setTimeout(() => {
      console.log('🧹 Cleaning up old screenshots...');
      this.cleanupScreenshots();
    }, 120000);
  }

  private cleanupScreenshots() {
    console.log(`🗑️ Cleaning up ${this.screenshotBuffer.length} screenshots`);
    this.screenshotBuffer = [];
    this.screenshotCount = 0;
    if (this.cleanupTimeout) {
      clearTimeout(this.cleanupTimeout);
      this.cleanupTimeout = null;
    }
  }

  async stopRecording() {
    console.log('🛑 Stopping recording...');
    this.isRecording = false;
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.cleanupScreenshots();
    document.title = 'Recording stopped';
    console.log('✅ Recording stopped');
  }
} 