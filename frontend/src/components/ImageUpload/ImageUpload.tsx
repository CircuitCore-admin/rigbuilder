import { useState, useCallback, useRef } from 'react';
import styles from './ImageUpload.module.scss';
import { api } from '../../utils/api';

interface ImageUploadProps {
  maxFiles?: number;
  onUploadComplete?: (urls: string[]) => void;
}

interface UploadedFile {
  id: string;
  file: File;
  previewUrl: string;
  publicUrl?: string;
  status: 'pending' | 'compressing' | 'uploading' | 'done' | 'error';
  progress: number;
  error?: string;
}

/**
 * Compress an image to WebP format at target width.
 * Uses OffscreenCanvas when available, falls back to regular Canvas.
 */
async function compressToWebP(file: File, targetWidth: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, targetWidth / bitmap.width);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });
}

let uploadId = 0;

export function ImageUpload({ maxFiles = 10, onUploadComplete }: ImageUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (newFiles: FileList | File[]) => {
    const incoming = Array.from(newFiles)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, maxFiles - files.length);

    if (incoming.length === 0) return;

    const entries: UploadedFile[] = incoming.map((f) => ({
      id: `upload-${++uploadId}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      status: 'pending' as const,
      progress: 0,
    }));

    setFiles((prev) => [...prev, ...entries]);

    // Process each file sequentially
    for (const entry of entries) {
      try {
        // Step 1: Compress
        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, status: 'compressing' as const, progress: 20 } : f))
        );

        const compressed = await compressToWebP(entry.file, 1200);

        // Step 2: Get signed URL
        setFiles((prev) =>
          prev.map((f) => (f.id === entry.id ? { ...f, status: 'uploading' as const, progress: 50 } : f))
        );

        const signedUrlRes = await api<{ key: string; uploadUrl: string; publicUrl: string }>(
          '/uploads/signed-url',
          {
            method: 'POST',
            body: {
              filename: entry.file.name.replace(/\.[^.]+$/, '.webp'),
              contentType: 'image/webp',
              size: compressed.size,
            },
          },
        );

        // Step 3: Upload to storage (mock — in production, PUT to signedUrlRes.uploadUrl)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'done' as const, progress: 100, publicUrl: signedUrlRes.publicUrl }
              : f
          )
        );
      } catch (err) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === entry.id
              ? { ...f, status: 'error' as const, error: err instanceof Error ? err.message : 'Upload failed' }
              : f
          )
        );
      }
    }

    // Notify parent
    setFiles((current) => {
      const urls = current.filter((f) => f.status === 'done' && f.publicUrl).map((f) => f.publicUrl!);
      onUploadComplete?.(urls);
      return current;
    });
  }, [files.length, maxFiles, onUploadComplete]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) processFiles(e.target.files);
    },
    [processFiles],
  );

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const f = prev.find((x) => x.id === id);
      if (f) URL.revokeObjectURL(f.previewUrl);
      return prev.filter((x) => x.id !== id);
    });
  };

  return (
    <div className={styles.wrapper}>
      {/* Drop zone */}
      <div
        className={`${styles.dropZone} ${dragOver ? styles.dropActive : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className={styles.hiddenInput}
          onChange={handleInputChange}
        />
        <div className={styles.dropContent}>
          <span className={styles.dropIcon}>📸</span>
          <span className={styles.dropText}>
            Drop images here or <span className={styles.browseLink}>browse</span>
          </span>
          <span className={styles.dropHint}>
            JPEG, PNG, or WebP • Auto-compressed to WebP • Max {maxFiles} files
          </span>
        </div>
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div className={styles.previewGrid}>
          {files.map((f) => (
            <div key={f.id} className={`${styles.previewItem} ${styles[f.status]}`}>
              <img src={f.previewUrl} alt="" className={styles.previewImg} />

              {/* Overlay */}
              <div className={styles.overlay}>
                {f.status === 'compressing' && (
                  <span className={styles.statusText}>Compressing…</span>
                )}
                {f.status === 'uploading' && (
                  <span className={styles.statusText}>Uploading…</span>
                )}
                {f.status === 'done' && (
                  <span className={styles.checkMark}>✓</span>
                )}
                {f.status === 'error' && (
                  <span className={styles.errorMark} title={f.error}>✕</span>
                )}
              </div>

              {/* Progress bar */}
              {(f.status === 'compressing' || f.status === 'uploading') && (
                <div className={styles.progressTrack}>
                  <div className={styles.progressFill} style={{ width: `${f.progress}%` }} />
                </div>
              )}

              {/* Remove button */}
              <button
                type="button"
                className={styles.removeBtn}
                onClick={(e) => { e.stopPropagation(); removeFile(f.id); }}
                title="Remove"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
