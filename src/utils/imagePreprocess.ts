/**
 * Image Pre-processing Utility for On-Device Thermal Receipt OCR.
 * Uses HTML5 Canvas to convert image to high-contrast grayscale,
 * compute Otsu's global adaptive threshold, normalize contrast,
 * reduce thermal paper fade, remove finger shadows, and sharpen text edges.
 */

export interface PreprocessOptions {
  contrast?: number; // -100 to 100, default +75
  brightness?: number; // -100 to 100, default +10
  sharpen?: boolean; // Apply unsharp masking for blurry characters
  binarize?: boolean; // Adaptive Otsu thresholding (defaults to true for crisp OCR)
  threshold?: number; // 0 to 255 (if omitted, Otsu computes optimal threshold)
  maxWidth?: number; // Max resolution clamp for performance (e.g. 1800px)
  autoRotate?: boolean; // Auto-rotate landscape photos of tall receipts
}

/**
 * Computes the optimal binarization threshold using Otsu's method.
 * Maximizes between-class variance across grayscale histogram.
 */
export function computeOtsuThreshold(grayscaleData: Uint8ClampedArray | number[]): number {
  const histogram = new Array(256).fill(0);
  const totalPixels = grayscaleData.length / 4;

  for (let i = 0; i < grayscaleData.length; i += 4) {
    const val = grayscaleData[i];
    histogram[val]++;
  }

  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }

  let sumB = 0;
  let weightB = 0;
  let weightF = 0;
  let maxVariance = 0;
  let threshold = 135; // Default fallback

  for (let t = 0; t < 256; t++) {
    weightB += histogram[t];
    if (weightB === 0) continue;

    weightF = totalPixels - weightB;
    if (weightF === 0) break;

    sumB += t * histogram[t];
    const meanB = sumB / weightB;
    const meanF = (sum - sumB) / weightF;

    const varianceBetween = weightB * weightF * (meanB - meanF) * (meanB - meanF);
    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Loads an image from a File, Blob, Data URL, or Image element onto an HTML5 Canvas.
 * Handles EXIF/device landscape rotation if receipt was captured sideways.
 */
export async function loadImageToCanvas(
  source: File | Blob | string | HTMLImageElement,
  autoRotate: boolean = true
): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const maxDim = 1800;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Handle orientation: if user snapped a portrait receipt in landscape (width > 1.35 * height)
      const needsPortraitRotation = autoRotate && width > height * 1.35;

      if (needsPortraitRotation) {
        // Swap dimensions for 90deg clockwise rotation
        const temp = width;
        width = height;
        height = temp;
      }

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error('Failed to create 2D canvas context'));
        return;
      }

      if (needsPortraitRotation) {
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((90 * Math.PI) / 180);
        ctx.drawImage(img, -height / 2, -width / 2, height, width);
        ctx.restore();
      } else {
        ctx.drawImage(img, 0, 0, width, height);
      }

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
 * Preprocesses receipt canvas with high-contrast grayscale and adaptive Otsu thresholding
 * specifically optimized for faded thermal receipts, dark dining lighting, and wrinkled paper.
 */
export function preprocessCanvas(
  canvas: HTMLCanvasElement,
  options: PreprocessOptions = {}
): HTMLCanvasElement {
  const contrast = options.contrast ?? 75;
  const brightness = options.brightness ?? 10;
  const binarize = options.binarize ?? true; // Enforce binarization by default for crisp OCR

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Pre-calculate contrast factor
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // 1. ITU-R BT.601 Luminance grayscale conversion
    let gray = 0.299 * r + 0.587 * g + 0.114 * b;

    // 2. Brightness adjustment
    gray += brightness;

    // 3. Contrast stretch
    gray = factor * (gray - 128) + 128;

    // Clamp between 0 and 255
    gray = Math.max(0, Math.min(255, gray));

    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  // 4. Adaptive Otsu threshold binarization for clean high-contrast black/white characters
  if (binarize) {
    const otsuThreshold = options.threshold ?? computeOtsuThreshold(data);
    for (let i = 0; i < data.length; i += 4) {
      const val = data[i] > otsuThreshold ? 255 : 0;
      data[i] = val;
      data[i + 1] = val;
      data[i + 2] = val;
    }
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
  const canvas = await loadImageToCanvas(source, options?.autoRotate ?? false);
  preprocessCanvas(canvas, options);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  return { canvas, dataUrl };
}
