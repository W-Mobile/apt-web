import { useState, useRef, useCallback, useEffect } from 'react';
import { uploadData, getUrl } from 'aws-amplify/storage';
import { Upload, Film, X, ImageIcon, Undo2, Play, Maximize2, Download } from 'lucide-react';

interface UndoSnapshot {
  fileName: string | null;
  fileSize: number | null;
  previewUrl: string | null;
  uploadedKey: string | null;
  existingKey: string | null;
}

interface MediaUploadProps {
  label: string;
  accept: string;
  fileKeyPrefix: string;
  onUpload: (fileKey: string) => void;
  existingFileKey?: string | null;
  maxSizeMB?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileMatchesAccept(file: File, accept: string): boolean {
  const types = accept.split(',').map((t) => t.trim());
  for (const type of types) {
    if (type.endsWith('/*')) {
      const category = type.slice(0, type.indexOf('/'));
      if (file.type.startsWith(category + '/')) return true;
    } else if (file.type === type) {
      return true;
    }
  }
  return false;
}

function extractFileName(key: string): string {
  const name = key.split('/').pop() ?? key;
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

export function MediaUpload({
  label,
  accept,
  fileKeyPrefix,
  onUpload,
  existingFileKey,
  maxSizeMB,
}: MediaUploadProps) {
  const isImageAccept = accept.startsWith('image');
  const sizeLimit = maxSizeMB ?? (isImageAccept ? 10 : 100);

  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadedKey, setUploadedKey] = useState<string | null>(null);
  const [cleared, setCleared] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<UndoSnapshot | null>(null);
  const [existingPreviewUrl, setExistingPreviewUrl] = useState<string | null>(null);
  const [mediaExpanded, setMediaExpanded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);
  const suppressFilePickerRef = useRef(false);

  // Determine what to show
  const hasUploadedFile = uploadedKey !== null && fileName !== null;
  const hasExisting = !cleared && existingFileKey != null && existingFileKey !== '';
  const hasFile = hasUploadedFile || hasExisting;

  const displayName = hasUploadedFile
    ? fileName
    : hasExisting
      ? extractFileName(existingFileKey!)
      : null;

  const isImage = hasUploadedFile
    ? previewUrl !== null && !/\.(mp4|mov|webm|avi)$/i.test(fileName!)
    : hasExisting
      ? /\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i.test(existingFileKey!)
      : false;

  const isVideo = hasUploadedFile
    ? previewUrl !== null && /\.(mp4|mov|webm|avi)$/i.test(fileName!)
    : hasExisting
      ? /\.(mp4|mov|webm|avi)$/i.test(existingFileKey!)
      : false;

  const videoSrc = hasUploadedFile ? previewUrl : existingPreviewUrl;

  // Cleanup preview URL and undo timer on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  // Fetch signed URL for existing files
  useEffect(() => {
    if (!hasExisting || hasUploadedFile) {
      setExistingPreviewUrl(null);
      return;
    }

    let cancelled = false;

    getUrl({ path: existingFileKey! })
      .then(({ url }) => {
        if (!cancelled) setExistingPreviewUrl(url.toString());
      })
      .catch(() => {
        if (!cancelled) setExistingPreviewUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [existingFileKey, hasExisting, hasUploadedFile]);


  const handleFile = useCallback(
    async (file: File) => {
      // Validate type
      if (!fileMatchesAccept(file, accept)) {
        setError(`Ogiltig filtyp. Tillåtet: ${accept}`);
        return;
      }

      // Validate size
      if (file.size > sizeLimit * 1024 * 1024) {
        setError(`Filen är för stor (max ${sizeLimit} MB)`);
        return;
      }

      setError(null);
      setFileName(file.name);
      setFileSize(file.size);
      setCleared(false);

      // Clear undo state if active
      if (undoSnapshot?.previewUrl) URL.revokeObjectURL(undoSnapshot.previewUrl);
      setUndoSnapshot(null);

      // Image or video preview
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
      } else {
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      }

      setMediaExpanded(false);

      setUploading(true);
      setProgress(0);

      try {
        const fileKey = `${fileKeyPrefix}${file.name}`;
        await uploadData({
          path: fileKey,
          data: file,
          options: {
            onProgress: ({ transferredBytes, totalBytes }) => {
              if (totalBytes) {
                setProgress(Math.round((transferredBytes / totalBytes) * 100));
              }
            },
          },
        });
        setUploadedKey(fileKey);
        onUpload(fileKey);
      } catch {
        setError('Uppladdningen misslyckades. Försök igen.');
        setFileName(null);
        setFileSize(null);
        setPreviewUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
      } finally {
        setUploading(false);
      }
    },
    [accept, sizeLimit, fileKeyPrefix, onUpload, undoSnapshot],
  );

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();

    // Snapshot current state before clearing
    const snapshot: UndoSnapshot = {
      fileName,
      fileSize,
      previewUrl,
      uploadedKey,
      existingKey: hasExisting ? existingFileKey! : null,
    };

    setFileName(null);
    setFileSize(null);
    setUploadedKey(null);
    setError(null);
    setProgress(0);
    setCleared(true);
    setMediaExpanded(false);
    // Don't revoke previewUrl — keep it alive in the snapshot for undo
    setPreviewUrl(null);
    if (inputRef.current) inputRef.current.value = '';
    onUpload('');

    setUndoSnapshot(snapshot);
  }

  function handleUndo(e: React.MouseEvent) {
    e.stopPropagation();
    if (!undoSnapshot) return;

    // Restore state from snapshot
    setFileName(undoSnapshot.fileName);
    setFileSize(undoSnapshot.fileSize);
    setPreviewUrl(undoSnapshot.previewUrl);
    setUploadedKey(undoSnapshot.uploadedKey);
    setCleared(false);
    setUndoSnapshot(null);

    // Notify parent — for existing files, send '' so parent keeps passing
    // existingFileKey through; for uploaded files, restore the uploaded key.
    const restoredKey = undoSnapshot.uploadedKey ?? '';
    onUpload(restoredKey);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (dragCounter.current === 1) setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) setIsDragging(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (uploading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleClick() {
    if (uploading) return;
    if (suppressFilePickerRef.current) {
      suppressFilePickerRef.current = false;
      return;
    }
    inputRef.current?.click();
  }

  // Accept hint text
  const acceptHint = accept
    .split(',')
    .map((t) => {
      const trimmed = t.trim();
      if (trimmed === 'image/*') return 'Bilder';
      if (trimmed === 'video/*') return 'Video';
      if (trimmed === 'video/mp4') return 'MP4';
      return trimmed.replace(/^.*\//, '.').toUpperCase();
    })
    .join(', ');

  const dropZoneClass = [
    'relative rounded-xl border transition-all duration-200',
    uploading ? 'cursor-default' : 'cursor-pointer',
    isDragging
      ? 'border-[#F24E1E] bg-[#F24E1E]/5 shadow-[0_0_20px_rgba(242,78,30,0.12)] scale-[1.005]'
      : error
        ? 'border-red-500/40 bg-stone-900/50'
        : hasFile
          ? 'border-stone-700 bg-stone-900/50 hover:border-stone-600'
          : cleared
            ? 'border-dashed border-amber-600/40 bg-stone-900/30 hover:border-amber-500/50 hover:bg-stone-900/50'
            : 'border-dashed border-stone-700 bg-stone-900/30 hover:border-stone-500 hover:bg-stone-900/50',
  ].join(' ');

  return (
    <div>
      <label className="block text-base font-medium text-stone-200 mb-1.5">{label}</label>

      <div
        role="button"
        tabIndex={0}
        className={dropZoneClass}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          aria-label={label}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[#F24E1E]/5">
            <Upload className="w-6 h-6 text-[#F24E1E] mr-2" strokeWidth={2.5} />
            <span className="text-sm font-medium text-[#F24E1E]">Släpp filen här</span>
          </div>
        )}

        {/* Empty state */}
        {!hasFile && !uploading && !isDragging && (
          <div className="flex flex-col items-center gap-1.5 py-6">
            <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center mb-1">
              <Upload className="w-5 h-5 text-stone-500" />
            </div>
            <p className="text-sm text-stone-400">
              Dra och släpp eller{' '}
              <span className="text-[#F24E1E] font-medium">bläddra</span>
            </p>
            <p className="text-xs text-stone-600">
              {acceptHint} &middot; Max {sizeLimit} MB
            </p>
          </div>
        )}

        {/* File preview (existing or uploaded) */}
        {hasFile && !uploading && !isDragging && (
          <div>
            <div className="flex items-center gap-3 p-3">
              <div className="relative w-20 h-20 rounded-lg bg-stone-800 border border-stone-700 flex-shrink-0 overflow-hidden flex items-center justify-center">
                {isImage && (previewUrl || existingPreviewUrl) ? (
                  <>
                    <img
                      src={previewUrl ?? existingPreviewUrl!}
                      alt={displayName ?? ''}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        suppressFilePickerRef.current = true;
                        setMediaExpanded(!mediaExpanded);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
                      aria-label="Förstora bild"
                    >
                      <Maximize2 className="w-4 h-4 text-white" />
                    </button>
                  </>
                ) : isVideo && videoSrc ? (
                  <>
                    <video
                      src={videoSrc}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        suppressFilePickerRef.current = true;
                        setMediaExpanded(!mediaExpanded);
                      }}
                      className="absolute inset-0 flex items-center justify-center bg-black/40 hover:bg-black/50 transition-colors"
                      aria-label="Spela video"
                    >
                      <Play className="w-5 h-5 text-white" fill="white" />
                    </button>
                  </>
                ) : isImage ? (
                  <ImageIcon className="w-5 h-5 text-stone-500" />
                ) : (
                  <Film className="w-5 h-5 text-stone-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-200 truncate">{displayName}</p>
                {fileSize != null && (
                  <p className="text-xs text-stone-500">{formatFileSize(fileSize)}</p>
                )}
                {hasExisting && !hasUploadedFile && (
                  <p className="text-xs text-stone-600">Befintlig fil</p>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                {(previewUrl || existingPreviewUrl || videoSrc) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      suppressFilePickerRef.current = true;
                      const url = previewUrl ?? existingPreviewUrl ?? videoSrc;
                      if (url) {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = displayName ?? 'download';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                      }
                    }}
                    className="p-1.5 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
                    aria-label="Ladda ner fil"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors"
                  aria-label="Ta bort fil"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            {mediaExpanded && (
              <div
                className="px-3 pb-3"
                onClick={() => { suppressFilePickerRef.current = true; }}
                onKeyDown={(e) => e.stopPropagation()}
              >
                {isVideo && videoSrc ? (
                  <video
                    src={videoSrc}
                    controls
                    className="w-full rounded-lg bg-black"
                    style={{ maxHeight: '300px' }}
                  />
                ) : isImage && (previewUrl || existingPreviewUrl) ? (
                  <img
                    src={previewUrl ?? existingPreviewUrl!}
                    alt={displayName ?? ''}
                    className="w-full rounded-lg object-contain bg-stone-950"
                    style={{ maxHeight: '300px' }}
                  />
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Upload progress */}
        {uploading && (
          <div className="p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-stone-300 truncate pr-3">{fileName}</p>
              <span className="text-xs text-stone-500 tabular-nums flex-shrink-0">
                {progress}%
              </span>
            </div>
            <div className="h-1.5 bg-stone-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#F24E1E] rounded-full transition-all duration-300 ease-out relative"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent animate-progress-shimmer" />
              </div>
            </div>
            {fileSize != null && (
              <p className="text-xs text-stone-600 mt-1.5">{formatFileSize(fileSize)}</p>
            )}
          </div>
        )}
      </div>

      {/* Undo bar — visible as long as a file has been removed */}
      {cleared && undoSnapshot && !hasFile && !uploading && (
        <div className="flex items-center justify-between mt-1.5 px-3 py-2 bg-stone-800 border border-stone-700 rounded-xl text-sm animate-fade-in">
          <span className="text-amber-500">Borttagen — sparas vid nästa spara</span>
          <button
            type="button"
            onClick={handleUndo}
            className="flex items-center gap-1.5 text-[#F24E1E] font-medium hover:text-[#d93d0f] transition-colors"
          >
            <Undo2 className="w-3.5 h-3.5" />
            Ångra
          </button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-red-400 mt-1.5">{error}</p>
      )}
    </div>
  );
}
