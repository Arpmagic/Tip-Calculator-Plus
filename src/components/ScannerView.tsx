import React, { useState, useRef, useEffect } from 'react';
import { CurrencyRate, ItemizedItem } from '../types';
import { 
  X, 
  Zap, 
  ZapOff, 
  Image as ImageIcon, 
  Receipt as ReceiptIcon, 
  Lock, 
  Check, 
  Layers, 
  RotateCcw, 
  AlertCircle,
  CheckCircle2,
  CameraOff
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCamera } from '../hooks/useCamera';
import { 
  scanReceiptWithTesseract, 
  ParsedReceiptData, 
  convertOcrItemsToItemized,
  OcrProgressInfo
} from '../services/ocrService';
import { formatCurrency } from '../utils/i18nFormatter';

export interface ScannerViewProps {
  onClose: () => void;
  selectedCurrency: CurrencyRate;
  onApplyScan: (result: {
    billAmount: number;
    taxAmount: number;
    venueName: string;
    items?: ItemizedItem[];
  }) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onClose,
  selectedCurrency,
  onApplyScan,
}) => {
  const { language, t } = useLanguage();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hook into live WebRTC Camera Stream
  const {
    videoRef,
    isStreaming,
    isLoading: isCameraLoading,
    hasCamera,
    cameraError,
    torchSupported,
    isTorchOn,
    startCamera,
    stopCamera,
    toggleTorch,
    captureSnapshot,
  } = useCamera({
    idealFacingMode: 'environment',
    idealWidth: 1920,
    idealHeight: 1080,
    autoStart: true,
  });

  // State Management
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressInfo, setProgressInfo] = useState<OcrProgressInfo>({
    status: t.scanner.extractingTotals,
    progress: 0,
  });
  const [parsedData, setParsedData] = useState<ParsedReceiptData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Editable parsed values
  const [venue, setVenue] = useState<string>('');
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
      stopCamera();
    };
  }, [imagePreviewUrl, stopCamera]);

  // Restart camera and reset to Live Viewfinder
  const handleRetake = () => {
    if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(imagePreviewUrl);
    }
    setImagePreviewUrl(null);
    setIsProcessing(false);
    setParsedData(null);
    setErrorMessage(null);
    setProgressInfo({ status: t.scanner.extractingTotals, progress: 0 });
    setVenue('');
    setGrandTotal(0);
    setTaxAmount(0);
    setSubtotal(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    startCamera();
  };

  // Run OCR on an image source (Blob or File)
  const processImageSource = async (source: Blob | File, previewUrl: string) => {
    setErrorMessage(null);
    setIsProcessing(true);
    setParsedData(null);
    setImagePreviewUrl(previewUrl);

    // Stop active camera stream during OCR processing to save battery & memory
    stopCamera();

    try {
      const result = await scanReceiptWithTesseract(source, (prog) => {
        setProgressInfo(prog);
      });

      setParsedData(result);
      setVenue(result.venueName || t.calculator.defaultVenueName);
      setGrandTotal(result.grandTotal);
      setTaxAmount(result.taxAmount);
      setSubtotal(result.subtotal > 0 ? result.subtotal : Math.max(0, result.grandTotal - result.taxAmount));
    } catch (err: any) {
      console.error('OCR Processing error:', err);
      setErrorMessage(err?.message || t.scanner.processingError);
    } finally {
      setIsProcessing(false);
    }
  };

  // Instant Snapshot Trigger from Live Video
  const handleCaptureSnapshot = async () => {
    if (!isStreaming || isProcessing) return;

    try {
      const snapshot = await captureSnapshot();
      if (!snapshot) {
        setErrorMessage('Failed to capture frame from camera.');
        return;
      }
      await processImageSource(snapshot.blob, snapshot.dataUrl);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error capturing photo.');
    }
  };

  // Gallery / Photo Library file picker
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage(t.scanner.invalidImageError);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    processImageSource(file, objectUrl);
  };

  // Action: Populate Main Calculator
  const handleSendToCalculator = () => {
    onApplyScan({
      billAmount: subtotal > 0 ? subtotal : grandTotal,
      taxAmount: taxAmount,
      venueName: venue.trim() || t.calculator.defaultVenueName,
    });
    onClose();
  };

  // Action: Itemized Split
  const handleSendToItemized = () => {
    const items = parsedData?.lineItems && parsedData.lineItems.length > 0
      ? convertOcrItemsToItemized(parsedData.lineItems)
      : [{
          id: `item_${Date.now()}`,
          name: venue.trim() || t.calculator.defaultVenueName,
          price: subtotal > 0 ? subtotal : grandTotal,
          assignedPersonIds: ['p1', 'p2'],
        }];

    onApplyScan({
      billAmount: subtotal > 0 ? subtotal : grandTotal,
      taxAmount: taxAmount,
      venueName: venue.trim() || t.calculator.defaultVenueName,
      items,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between overflow-hidden select-none h-[100dvh] w-full">
      
      {/* Hidden File Input for Device Photo Library */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/*"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* 1. TOP FLOATING APP BAR (Titanium Glassmorphism Capsule)                   */}
      {/* ========================================================================= */}
      <header className="absolute top-0 inset-x-0 z-40 pt-safe px-4 py-3 flex items-center justify-between pointer-events-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-12 h-12 min-w-[48px] min-h-[48px] rounded-full bg-black/50 hover:bg-black/70 active:scale-90 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white pointer-events-auto transition-all shadow-lg"
          aria-label={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand/Security Pill */}
        <div className="bg-black/50 backdrop-blur-xl border border-white/15 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg pointer-events-auto">
          <ReceiptIcon className="w-4 h-4 text-emerald-400" />
          <span className="font-display font-bold text-xs tracking-tight text-white">{t.scanner.title}</span>
          <span className="w-1 h-1 rounded-full bg-white/40" />
          <span className="text-[10px] font-mono text-emerald-300 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            <span>100% Private</span>
          </span>
        </div>

        {/* Torch / Flashlight Button (if supported) */}
        {torchSupported ? (
          <button
            onClick={toggleTorch}
            className={`w-12 h-12 min-w-[48px] min-h-[48px] rounded-full backdrop-blur-xl border flex items-center justify-center pointer-events-auto transition-all active:scale-90 shadow-lg ${
              isTorchOn
                ? 'bg-amber-400 text-[#0c1324] border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                : 'bg-black/50 text-white/80 hover:text-white border-white/20'
            }`}
            title={isTorchOn ? t.scanner.torchOn : t.scanner.torchOff}
            aria-label="Toggle Flashlight"
          >
            {isTorchOn ? <Zap className="w-5 h-5 fill-current" /> : <ZapOff className="w-5 h-5" />}
          </button>
        ) : (
          <div className="w-12 h-12" />
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. CAMERA VIEWPORT & VIEWFINDER OVERLAY                                   */}
      {/* ========================================================================= */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
        
        {/* Live Video Feed */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
            isStreaming && !imagePreviewUrl ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        />

        {/* Frozen Snapshot Image (during Processing & Results) */}
        {imagePreviewUrl && (
          <img
            src={imagePreviewUrl}
            alt="Receipt snapshot"
            className="absolute inset-0 w-full h-full object-cover filter brightness-90 animate-fade-in"
          />
        )}

        {/* STATE 1: LIVE VIEWFINDER WITH SLEEK CORNER BRACKETS */}
        {!imagePreviewUrl && (
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-6 pointer-events-none">
            
            {/* Viewfinder Target Bounding Box */}
            <div className="relative w-[86%] max-w-[340px] aspect-[9/15] sm:aspect-[3/4] rounded-3xl transition-all duration-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              
              {/* Glowing Corner Brackets */}
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl shadow-[0_0_12px_#10b981]" />
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl shadow-[0_0_12px_#10b981]" />
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl shadow-[0_0_12px_#10b981]" />
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl shadow-[0_0_12px_#10b981]" />

              {/* Viewfinder Center Crosshair Hint */}
              <div className="absolute inset-x-0 top-4 flex justify-center">
                <span className="px-3.5 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono text-white/90 tracking-wide shadow-md">
                  {t.scanner.alignReceiptInFrame}
                </span>
              </div>
            </div>

            {/* Camera Permission / Error Fallback Prompt */}
            {(!hasCamera || cameraError) && (
              <div className="absolute inset-0 bg-[#0c1324]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 pointer-events-auto gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-[#c4c7c8]">
                  <CameraOff className="w-8 h-8" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="font-display font-bold text-base text-white">{t.scanner.cameraDenied}</h3>
                  <p className="text-xs font-mono text-[#c4c7c8] leading-relaxed">
                    {t.scanner.cameraDeniedDesc}
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] px-6 rounded-2xl bg-white text-[#0c1324] font-display font-bold text-sm flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all shadow-xl"
                >
                  <ImageIcon className="w-4 h-4" />
                  <span>{t.scanner.uploadFromLibrary}</span>
                </button>
              </div>
            )}

          </div>
        )}

        {/* STATE 2: PROCESSING STATE (Laser Scan Line & Progress Card) */}
        {imagePreviewUrl && isProcessing && (
          <div className="absolute inset-0 z-20 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fade-in">
            
            {/* Viewfinder Target with Active Sweeping Laser Beam */}
            <div className="relative w-[86%] max-w-[340px] aspect-[9/15] sm:aspect-[3/4] rounded-3xl overflow-hidden border border-emerald-400/40 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              {/* Sweeping Laser Beam */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_24px_#10b981] animate-laser" />
            </div>

            {/* Floating Glass Progress Card */}
            <div className="mt-6 w-[86%] max-w-[340px] glass-card rounded-3xl p-5 border border-emerald-500/30 bg-[#0c1324]/90 backdrop-blur-2xl shadow-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-white font-bold">{progressInfo.status}</span>
                <span className="text-emerald-400 font-bold tabular-nums">{progressInfo.progress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5 border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                  style={{ width: `${progressInfo.progress}%` }}
                />
              </div>

              {/* Skeleton Pulse */}
              <div className="space-y-1.5 pt-1">
                <div className="h-2.5 bg-white/10 rounded-md w-3/4 animate-pulse" />
                <div className="h-2.5 bg-white/10 rounded-md w-1/2 animate-pulse" />
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM THUMB ZONE CONTROLS                                             */}
      {/* ========================================================================= */}
      
      {/* Error Banner if OCR failed */}
      {errorMessage && (
        <div className="absolute bottom-28 inset-x-4 max-w-md mx-auto z-40 p-4 rounded-2xl bg-rose-500/20 backdrop-blur-xl border border-rose-500/40 text-rose-200 text-xs font-mono flex items-center gap-3 shadow-2xl">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <div className="flex-1">
            <span className="font-bold block">{t.scanner.recognitionIssue}</span>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={handleRetake}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold shrink-0"
          >
            {t.scanner.retake}
          </button>
        </div>
      )}

      {/* STATE 1 CONTROLS: Camera Shutter Button & Library Picker */}
      {!imagePreviewUrl && (
        <footer className="relative z-30 pb-safe px-6 pt-4 pb-8 flex items-center justify-around max-w-md mx-auto w-full">
          
          {/* Photo Library Glass Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-14 h-14 min-w-[48px] min-h-[48px] rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition-all shadow-lg"
            title={t.scanner.galleryTooltip}
            aria-label="Upload from gallery"
          >
            <ImageIcon className="w-6 h-6" />
          </button>

          {/* Large Tactile Circular Shutter Button (Apple Camera Style) */}
          <button
            id="btn-camera-shutter"
            onClick={handleCaptureSnapshot}
            disabled={!isStreaming || isCameraLoading}
            className="w-20 h-20 min-w-[72px] min-h-[72px] rounded-full border-4 border-white/90 p-1 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t.scanner.takeSnapshot}
          >
            <div className="w-full h-full bg-white rounded-full transition-transform active:scale-95 shadow-inner" />
          </button>

          {/* Retake/Restart Camera stream */}
          <button
            onClick={startCamera}
            className="w-14 h-14 min-w-[48px] min-h-[48px] rounded-2xl bg-white/10 hover:bg-white/20 active:scale-90 backdrop-blur-xl border border-white/20 flex items-center justify-center text-white transition-all shadow-lg"
            title="Refresh Camera"
            aria-label="Refresh Camera"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

        </footer>
      )}

      {/* STATE 3 CONTROLS: Actionable Result Sheet (Slide-Up Modal) */}
      {imagePreviewUrl && !isProcessing && parsedData && (
        <div className="relative z-30 animate-slide-up bg-[#0c1324]/95 backdrop-blur-2xl border-t border-white/15 rounded-t-3xl p-5 sm:p-6 shadow-[0_-12px_36px_rgba(0,0,0,0.7)] max-w-lg mx-auto w-full flex flex-col gap-4 pb-safe">
          
          {/* Header: Venue & Verified Status */}
          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex-1">
              <span className="font-mono text-[10px] text-[#c4c7c8] uppercase tracking-wider block font-semibold">
                {t.scanner.detectedVenue}
              </span>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                className="bg-transparent border-none outline-none font-display font-extrabold text-lg text-white p-0 w-full focus:ring-0"
                placeholder={t.calculator.defaultVenueName}
              />
            </div>

            {parsedData.isValidated ? (
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-bold px-3 py-1.5 rounded-full shrink-0">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{t.scanner.verified}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-sky-500/20 border border-sky-500/40 text-sky-300 text-xs font-mono px-3 py-1.5 rounded-full shrink-0">
                <span>{t.scanner.parsed}</span>
              </span>
            )}
          </div>

          {/* Grand Total & Tax Hero Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Grand Total */}
            <div className="flex flex-col p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
              <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-0.5">
                {t.scanner.detectedTotal}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base text-emerald-400 font-bold">{selectedCurrency.symbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={grandTotal || ''}
                  onChange={(e) => setGrandTotal(parseFloat(e.target.value) || 0)}
                  className="bg-transparent border-none outline-none font-display font-black text-2xl sm:text-3xl text-white p-0 w-full tabular-nums"
                />
              </div>
            </div>

            {/* Extracted Tax */}
            <div className="flex flex-col p-3.5 rounded-2xl bg-white/5 border border-white/10">
              <span className="font-mono text-[10px] text-[#c4c7c8] uppercase font-semibold tracking-wider mb-0.5">
                {t.scanner.detectedTax}
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-base text-[#c4c7c8]/70 font-bold">{selectedCurrency.symbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={taxAmount || ''}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="bg-transparent border-none outline-none font-display font-extrabold text-xl sm:text-2xl text-white p-0 w-full tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Subtotal Info Pill */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5 text-xs font-mono text-[#c4c7c8]">
            <span>{t.scanner.calculatedSubtotal}</span>
            <span className="font-bold text-white tabular-nums">
              {formatCurrency(subtotal, selectedCurrency.code, language)}
            </span>
          </div>

          {/* 56dp Luxury Action CTAs (Thumb Zone) */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
            <button
              id="btn-scanner-send-calc"
              onClick={handleSendToCalculator}
              className="flex-1 min-h-[56px] h-14 rounded-2xl bg-white text-[#0c1324] font-display font-black text-sm flex items-center justify-center gap-2.5 hover:bg-white/90 active:scale-[0.97] transition-all shadow-xl cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>{t.scanner.applyToCalc}</span>
            </button>

            <button
              id="btn-scanner-send-itemized"
              onClick={handleSendToItemized}
              className="flex-1 min-h-[56px] h-14 rounded-2xl glass-button text-white font-display font-black text-sm flex items-center justify-center gap-2.5 hover:bg-white/15 active:scale-[0.97] transition-all border border-white/15 cursor-pointer"
            >
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>{t.scanner.applyToItemized}</span>
            </button>
          </div>

          {/* Retake CTA */}
          <button
            onClick={handleRetake}
            className="w-full text-center text-xs font-mono text-[#c4c7c8] hover:text-white flex items-center justify-center gap-1.5 py-1 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{t.scanner.retake}</span>
          </button>

        </div>
      )}

    </div>
  );
};
