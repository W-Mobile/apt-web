import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractVideoFrame } from './extractVideoFrame';

describe('extractVideoFrame', () => {
  let mockVideo: Partial<HTMLVideoElement>;
  let mockCanvas: Partial<HTMLCanvasElement>;
  let mockContext: Partial<CanvasRenderingContext2D>;
  const fakeBlob = new Blob(['fake-image'], { type: 'image/jpeg' });

  beforeEach(() => {
    vi.useFakeTimers();

    mockContext = {
      drawImage: vi.fn(),
    };

    mockCanvas = {
      getContext: vi.fn().mockReturnValue(mockContext),
      toBlob: vi.fn((callback: BlobCallback) => callback(fakeBlob)),
      width: 0,
      height: 0,
    };

    const eventHandlers: Record<string, EventListener[]> = {};

    mockVideo = {
      src: '',
      currentTime: 0,
      preload: '',
      videoWidth: 1920,
      videoHeight: 1080,
      addEventListener: vi.fn((event: string, handler: EventListener) => {
        if (!eventHandlers[event]) eventHandlers[event] = [];
        eventHandlers[event].push(handler);
      }),
      removeEventListener: vi.fn((event: string, handler: EventListener) => {
        if (eventHandlers[event]) {
          eventHandlers[event] = eventHandlers[event].filter((h) => h !== handler);
        }
      }),
    };

    // When src is set, fire loadeddata; when currentTime is set, fire seeked
    Object.defineProperty(mockVideo, 'src', {
      set(_value: string) {
        // Fire loadeddata after a tick
        setTimeout(() => {
          eventHandlers['loadeddata']?.forEach((h) => h(new Event('loadeddata')));
        }, 0);
      },
      get() { return ''; },
    });

    const originalCurrentTime = { value: 0 };
    Object.defineProperty(mockVideo, 'currentTime', {
      set(value: number) {
        originalCurrentTime.value = value;
        // Fire seeked after a tick
        setTimeout(() => {
          eventHandlers['seeked']?.forEach((h) => h(new Event('seeked')));
        }, 0);
      },
      get() { return originalCurrentTime.value; },
    });

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'video') return mockVideo as HTMLVideoElement;
      if (tag === 'canvas') return mockCanvas as HTMLCanvasElement;
      return document.createElement(tag);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returnerar en JPEG Blob från en videofil', async () => {
    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const promise = extractVideoFrame(videoFile);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
  });

  it('ställer in canvas-dimensioner till videons dimensioner', async () => {
    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const promise = extractVideoFrame(videoFile);
    await vi.runAllTimersAsync();
    await promise;
    expect(mockCanvas.width).toBe(1920);
    expect(mockCanvas.height).toBe(1080);
  });

  it('ritar videon till canvas', async () => {
    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const promise = extractVideoFrame(videoFile);
    await vi.runAllTimersAsync();
    await promise;
    expect(mockContext.drawImage).toHaveBeenCalledWith(mockVideo, 0, 0, 1920, 1080);
  });

  it('seekar till 0.1 sekunder för att undvika svart frame', async () => {
    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const promise = extractVideoFrame(videoFile);
    await vi.runAllTimersAsync();
    await promise;
    expect(mockVideo.currentTime).toBe(0.1);
  });

  it('anropar toBlob med image/jpeg och kvalitet 0.85', async () => {
    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const promise = extractVideoFrame(videoFile);
    await vi.runAllTimersAsync();
    await promise;
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/jpeg',
      0.85,
    );
  });

  it('rejectar när video error-event avfyras', async () => {
    const errorHandlers: Record<string, EventListener[]> = {};
    mockVideo.addEventListener = vi.fn((event: string, handler: EventListener) => {
      if (!errorHandlers[event]) errorHandlers[event] = [];
      errorHandlers[event].push(handler);
    });

    // Fire error when src is set
    Object.defineProperty(mockVideo, 'src', {
      set() {
        setTimeout(() => {
          errorHandlers['error']?.forEach((h) => h(new Event('error')));
        }, 0);
      },
      get() { return ''; },
      configurable: true,
    });

    const videoFile = new File(['corrupt-video'], 'corrupt.mp4', { type: 'video/mp4' });
    const assertion = expect(extractVideoFrame(videoFile)).rejects.toThrow('Kunde inte ladda videon');
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('rejectar när toBlob returnerar null', async () => {
    mockCanvas.toBlob = vi.fn((callback: BlobCallback) => callback(null));

    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const assertion = expect(extractVideoFrame(videoFile)).rejects.toThrow('Kunde inte generera bild från video');
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('rejectar när canvas context är null', async () => {
    mockCanvas.getContext = vi.fn().mockReturnValue(null);

    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const assertion = expect(extractVideoFrame(videoFile)).rejects.toThrow('Kunde inte skapa canvas context');
    await vi.runAllTimersAsync();
    await assertion;
  });

  it('rejectar med timeout-fel om varken seeked eller error avfyras', async () => {
    // Override addEventListener so neither loadeddata nor error fires
    mockVideo.addEventListener = vi.fn();
    Object.defineProperty(mockVideo, 'src', {
      set() { /* noop — don't fire any events */ },
      get() { return ''; },
      configurable: true,
    });

    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const assertion = expect(extractVideoFrame(videoFile)).rejects.toThrow('extractVideoFrame: timed out after 15 seconds');

    // Advance time past the 15-second timeout
    await vi.advanceTimersByTimeAsync(15_001);

    await assertion;
  });

  it('rejectar när videon har 0-dimensioner', async () => {
    mockVideo.videoWidth = 0;
    mockVideo.videoHeight = 0;

    const videoFile = new File(['fake-video'], 'test.mp4', { type: 'video/mp4' });
    const assertion = expect(extractVideoFrame(videoFile)).rejects.toThrow('Videon har ogiltiga dimensioner');
    await vi.runAllTimersAsync();
    await assertion;
  });
});
