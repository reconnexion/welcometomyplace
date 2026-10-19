const canvasToBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>(resolve => canvas.toBlob(resolve, type, quality));

export const compressImage = async (file: File, maxSize = 1024 * 1024, dimensions = [2560, 2048, 1600, 1280, 1024]) => {
  if (file.size <= maxSize || !file.type.startsWith('image/') || file.type === 'image/svg+xml') return file;

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch (e) {
    return file;
  }

  let best: Blob | null = null;
  for (const dimension of dimensions) {
    const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d')!;
    // JPEG has no transparency
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    for (const quality of [0.85, 0.75]) {
      const blob = await canvasToBlob(canvas, 'image/jpeg', quality);
      if (blob && (!best || blob.size < best.size)) best = blob;
      if (best && best.size <= maxSize) break;
    }
    if (best && best.size <= maxSize) break;
  }
  bitmap.close();

  if (!best || best.size >= file.size) return file;
  return new File([best], file.name.replace(/\.[^.]*$/, '') + '.jpg', { type: 'image/jpeg' });
};
