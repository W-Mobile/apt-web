import { useState, useRef } from 'react';
import { uploadData } from 'aws-amplify/storage';

interface MediaUploadProps {
  label: string;
  accept: string;
  fileKeyPrefix: string;
  onUpload: (fileKey: string) => void;
}

export function MediaUpload({ label, accept, fileKeyPrefix, onUpload }: MediaUploadProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileName(file.name);
    setUploading(true);
    try {
      const fileKey = `${fileKeyPrefix}${file.name}`;
      await uploadData({ key: fileKey, data: file });
      onUpload(fileKey);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm text-stone-300 mb-1">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        aria-label={label}
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        className="text-sm text-stone-400"
      />
      {fileName && <p className="text-xs text-stone-500 mt-1">{uploading ? 'Laddar upp...' : fileName}</p>}
    </div>
  );
}
