import { useState, useEffect, useRef, useCallback, RefObject } from 'react';

export interface UseCameraOptions {
  idealFacingMode?: 'environment' | 'user';
  idealWidth?: number;
  idealHeight?: number;
  autoStart?: boolean;
}

export interface UseCameraReturn {
  videoRef: RefObject<HTMLVideoElement | null>;
  stream: MediaStream | null;
  isStreaming: boolean;
  isLoading: boolean;
  hasCamera: boolean;
  cameraError: string | null;
  torchSupported: boolean;
  isTorchOn: boolean;
  startCamera: () => Promise<boolean>;
  stopCamera: () => void;
  toggleTorch: () => Promise<boolean>;
  captureSnapshot: () => Promise<{ blob: Blob; dataUrl: string; width: number; height: number } | null>;
}

export function useCamera({
  idealFacingMode = 'environment',
  idealWidth = 1920,
  idealHeight = 1080,
  autoStart = true,
}: UseCameraOptions = {}): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const videoTrackRef = useRef<MediaStreamTrack | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasCamera, setHasCamera] = useState<boolean>(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState<boolean>(true);
  const [isTorchOn, setIsTorchOn] = useState<boolean>(false);

  // Stop camera tracks cleanly and ensure torch is disabled
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          if (typeof (track as any).applyConstraints === 'function') {
            (track as any).applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
          }
          track.stop();
        } catch {
          // Ignore track stop error
        }
      });
      streamRef.current = null;
    }

    videoTrackRef.current = null;

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setStream(null);
    setIsStreaming(false);
    setIsTorchOn(false);
  }, []);

  // Start live WebRTC video stream
  const startCamera = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setHasCamera(false);
      setCameraError('WebRTC camera is not supported on this browser or security context (HTTPS required).');
      return false;
    }

    setIsLoading(true);
    setCameraError(null);

    // Stop any existing stream first
    stopCamera();

    const constraintConfigs: MediaStreamConstraints[] = [
      // 1. Primary: Ideal high-res back camera
      {
        audio: false,
        video: {
          facingMode: { ideal: idealFacingMode },
          width: { ideal: idealWidth },
          height: { ideal: idealHeight },
        },
      },
      // 2. Fallback: Exact environment facing mode
      {
        audio: false,
        video: {
          facingMode: idealFacingMode,
        },
      },
      // 3. Ultimate Fallback: Any available video device
      {
        audio: false,
        video: true,
      },
    ];

    let mediaStream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraints of constraintConfigs) {
      try {
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (mediaStream) break;
      } catch (err: any) {
        lastError = err;
        // Try next fallback constraint
      }
    }

    if (!mediaStream) {
      setIsLoading(false);
      setIsStreaming(false);
      setHasCamera(false);
      if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(lastError?.message || 'Unable to access camera.');
      }
      return false;
    }

    streamRef.current = mediaStream;
    setStream(mediaStream);
    setHasCamera(true);

    // Check torch / flashlight capability & store active track reference
    const track = mediaStream.getVideoTracks()[0] || null;
    videoTrackRef.current = track;

    if (track) {
      const getCapabilities = (track as any).getCapabilities;
      if (typeof getCapabilities === 'function') {
        try {
          const caps = getCapabilities.call(track);
          setTorchSupported(Boolean(caps && caps.torch));
        } catch {
          setTorchSupported(true);
        }
      } else {
        setTorchSupported(true);
      }
    }

    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      try {
        await videoRef.current.play();
      } catch {
        // Autoplay may need user gesture, but muted video usually succeeds
      }
    }

    setIsLoading(false);
    setIsStreaming(true);
    return true;
  }, [idealFacingMode, idealWidth, idealHeight, stopCamera]);

  // Toggle Torch/Flashlight with active constraint updates
  const toggleTorch = useCallback(async (): Promise<boolean> => {
    const track = videoTrackRef.current || streamRef.current?.getVideoTracks()[0];
    if (!track || typeof (track as any).applyConstraints !== 'function') return false;

    const nextState = !isTorchOn;
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setIsTorchOn(nextState);
      return true;
    } catch (err) {
      console.warn('Torch toggle failed:', err);
      return false;
    }
  }, [isTorchOn]);

  // Capture current video frame to high-res Blob & DataURL
  const captureSnapshot = useCallback(async (): Promise<{
    blob: Blob;
    dataUrl: string;
    width: number;
    height: number;
  } | null> => {
    const video = videoRef.current;
    if (!video) return null;

    const width = video.videoWidth || video.clientWidth || 1280;
    const height = video.videoHeight || video.clientHeight || 720;

    if (width <= 0 || height <= 0) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95);
    });

    if (!blob) return null;

    return { blob, dataUrl, width, height };
  }, []);

  // Auto start on mount if enabled
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStart, startCamera, stopCamera]);

  return {
    videoRef,
    stream,
    isStreaming,
    isLoading,
    hasCamera,
    cameraError,
    torchSupported,
    isTorchOn,
    startCamera,
    stopCamera,
    toggleTorch,
    captureSnapshot,
  };
}
