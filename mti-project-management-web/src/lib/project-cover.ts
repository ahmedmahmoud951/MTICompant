/** Resize/crop image to landscape cover (mock card ratio ~ 16:9). Returns JPEG data URL. */
export async function resizeToProjectCover(
  file: File,
  targetW = 960,
  targetH = 540,
  quality = 0.78
): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unsupported');

  const srcRatio = bitmap.width / bitmap.height;
  const dstRatio = targetW / targetH;
  let sx = 0;
  let sy = 0;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (srcRatio > dstRatio) {
    sw = bitmap.height * dstRatio;
    sx = (bitmap.width - sw) / 2;
  } else {
    sh = bitmap.width / dstRatio;
    sy = (bitmap.height - sh) / 2;
  }
  ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, targetW, targetH);
  bitmap.close();
  return canvas.toDataURL('image/jpeg', quality);
}

export const DEFAULT_PROJECT_COVER = '/images/project-default.png';

export function resolveProjectCover(url?: string | null): string {
  if (url && String(url).trim()) return String(url).trim();
  return DEFAULT_PROJECT_COVER;
}
