/**
 * Extraherar en frame från en videofil som en JPEG Blob.
 * Seekar till 0.1s för att undvika en potentiellt svart första frame.
 */
const EXTRACT_TIMEOUT_MS = 15_000;

export function extractVideoFrame(videoFile: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    const url = URL.createObjectURL(videoFile);

    let settled = false;

    const cleanup = () => {
      clearTimeout(timeoutId);
      URL.revokeObjectURL(url);
    };

    const safeResolve = (blob: Blob) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(blob);
    };

    const safeReject = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };

    const timeoutId = setTimeout(() => {
      safeReject(new Error('extractVideoFrame: timed out after 15 seconds'));
    }, EXTRACT_TIMEOUT_MS);

    video.addEventListener('error', () => {
      safeReject(new Error('Kunde inte ladda videon'));
    });

    video.addEventListener('loadeddata', () => {
      video.currentTime = 0.1;
    });

    video.addEventListener('seeked', function onSeeked() {
      video.removeEventListener('seeked', onSeeked);

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        safeReject(new Error('Videon har ogiltiga dimensioner'));
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        safeReject(new Error('Kunde inte skapa canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            safeResolve(blob);
          } else {
            safeReject(new Error('Kunde inte generera bild från video'));
          }
        },
        'image/jpeg',
        0.85,
      );
    });

    video.src = url;
  });
}
