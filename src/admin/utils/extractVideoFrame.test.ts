import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractVideoFrame } from './extractVideoFrame';

describe('extractVideoFrame', () => {
  let mockVideo: Partial<HTMLVideoElement>;
  let mockCanvas: Partial<HTMLCanvasElement>;
  let mockContext: Partial<CanvasRenderingContext2D>;
  const fakeBlob = new Blob(['fake-image'], { type: 'image/jpeg' });

  beforeEach(() => {
    mockContext = {
      drawImage: vi.fn(),
    };

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn((callback: BlobCallback) => callback(fakeBlob)),
      width: 0,
      height: 0,
    };

    mockVideo = {
      src: '',
      currentTime: 0,
      videoWidth: 1920,
      videoHeight: 1080,
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (event === 'seeked') {
          setTimeout(() => handler(new Event('seeked')), 0);
        }
      }),
      removeEventListener: vi.fn(),
      load: vi.fn(),
    };

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') return mockVideo as HTMLVideoElement;
      if (tag === 'canvas') return mockCanvas as HTMLCanvasElement;
      return document.createElement(tag);
    });
  });

  it('returnerar en JPEG Blob från en videofil', async () => {
    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const result = await extractVideoFrame(videoFile);
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
  });

  it('ställer in canvas-dimensioner till videons dimensioner', async () => {
    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    await extractVideoFrame(videoFile);
    expect(mockCanvas.width).toBe(1920);
    expect(mockCanvas.height).toBe(1080);
  });

  it('ritar videon till canvas', async () => {
    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    await extractVideoFrame(videoFile);
    expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 1920, 1080);
  });

  it('seekar till 0.1 sekunder för att undvika svart frame', async () => {
    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    await extractVideoFrame(videoFile);
    expect(mockVideo.currentTime).toBe(0.1);
  });
});
