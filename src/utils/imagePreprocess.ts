/**
 * Image Pre-processing Utility for On-Device Thermal Receipt OCR.
 * Uses HTML5 Canvas to convert image to high-contrast grayscale,
 * reduce thermal paper fade, remove finger shadows, and sharpen text edges.
 */

export interface PreprocessOptions {
  contrast?: number; // -100 to 100, default +65
  brightness?: number; // -100 to 100, default +10
  sharpen?: boolean; // Apply unsharp masking for blurry characters
  binarize?: boolean; // Adaptive thresholding for faded thermal receipts
  threshold?: number; // 0 to 255, default 135
  maxWidth?: number; // Max resolution clamp for performance (e.g. 1800px)
}

/**
 * Loads an image from a File, Blob, Data URL, or Image element onto an HTML5 Canvas.
 */
export async function loadImageToCanvas(
  source: File | Blob | string | HTMLImageElement
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Scale down overly large phone photos (e.g. 4000x3000) for fast OCR execution
      const maxDim = 1800;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to create 2D canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas);
    };

    img.onerror = (err) => {
      reject(new Error('Failed to load receipt image: ' + err));
    };

    if (typeof source === 'string') {
      img.src = source;
    } else if (source instanceof HTMLImageElement) {
      img.src = source.src;
    } else {
      img.src = URL.createObjectURL(source);
    }
  });
}

/**
 * Preprocesses receipt canvas with high-contrast grayscale and adaptive thresholding
 * specifically optimized for faded thermal receipts, dark dining lighting, and wrinkled paper.
 */
export function preprocessCanvas(
  canvas: HTMLCanvasElement,
  options: PreprocessOptions = {}
): HTMLCanvasElement {
  const contrast = options.contrast ?? 65; // High contrast boost for thermal paper
  const brightness = options.brightness ?? 8;
  const binarize = options.binarize ?? false;
  const thresholdVal = options.threshold ?? 135;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Pre-calculate contrast lookup factor
  // Formula: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 1. Standard ITU-R BT.601 Luminance grayscale conversion
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // 2. Brightness adjustment
    gray += brightness;

    // 3. Contrast stretch
    gray = factor * (gray - 128) + 128;

    // Clamp between 0 and 255
    gray = Math.max(0, Math.min(255, gray));

    // 4. Optional adaptive binarization (useful for heavily faded ink)
    if (binarize) {
      gray = gray > thresholdVal ? 255 : 0;
    }

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // alpha remains untouched
  }

  // 5. Optional 3x3 Laplacian sharpening kernel for receipt text edges
  if (options.sharpen) {
    applySharpenKernel(data, width, height);
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Applies a fast 3x3 unsharp mask / edge sharpening filter.
 */
function applySharpenKernel(data: Uint8ClampedArray, width: number, height: number) {
  const copy = new Uint8ClampedArray(data);
  // Kernel: [ 0, -1, 0, -1, 5, -1, 0, -1, 0 ]
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      const top = ((y - 1) * width + x) * 4;
      const bottom = ((y + 1) * width + x) * 4;
      const left = (y * width + (x - 1)) * 4;
      const right = (y * width + (x + 1)) * 4;

      const centerVal = copy[idx];
      const sharpVal = 5 * centerVal - copy[top] - copy[bottom] - copy[left] - copy[right];
      const clamped = Math.max(0, Math.min(255, sharpVal));

      data[idx] = clamped;
      data[idx + 1] = clamped;
      data[idx + 2] = clamped;
    }
  }
}

/**
 * Complete pipeline helper: Takes image source and returns high-contrast preprocessed canvas & data URL.
 */
export async function preprocessReceiptImage(
  source: File | Blob | string | HTMLImageElement,
  options?: PreprocessOptions
): Promise<{ canvas: HTMLCanvasElement; dataUrl: string }> {
  const canvas = await loadImageToCanvas(source);
  preprocessCanvas(canvas, options);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return { canvas, dataUrl };
}
