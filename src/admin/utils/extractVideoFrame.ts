/**
 * Extraherar en frame från en videofil som en JPEG Blob.
 * Seekar till 0.1s för att undvika en potentiellt svart första frame.
 */
export function extractVideoFrame(videoFile: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.currentTime = 0.1;

    video.addEventListener('seeked', function onSeeked() {
      video.removeEventListener('seeked', onSeeked);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Kunde inte skapa canvas context'));
        return;
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Kunde inte generera bild från video'));
          }
        },
        'image/jpeg',
        0.85,
      );
    });

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Kunde inte ladda videon'));
    });

    video.load();
  });
}
