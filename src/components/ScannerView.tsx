import React, { useState, useRef, useEffect } from 'react';
import { CurrencyRate, ItemizedItem, CalculationHistoryItem } from '../types';
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
  CameraOff,
  Trash2,
  Plus,
  Eye,
  EyeOff,
  Edit3,
  Sparkles,
  Info
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';
import { useCamera } from '../hooks/useCamera';
import { 
  scanReceiptWithTesseract, 
  ParsedReceiptData, 
  ExtractedLineItem,
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
    currency?: string;
  }) => void;
  onSaveHistory?: (item: CalculationHistoryItem) => void;
}

export const ScannerView: React.FC<ScannerViewProps> = ({
  onClose,
  selectedCurrency,
  onApplyScan,
  onSaveHistory,
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showRawOcr, setShowRawOcr] = useState<boolean>(false);

  // Editable parsed values
  const [venue, setVenue] = useState<string>('');
  const [grandTotal, setGrandTotal] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [subtotal, setSubtotal] = useState<number>(0);
  const [lineItems, setLineItems] = useState<ExtractedLineItem[]>([]);

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
    setToastMessage(null);
    setShowRawOcr(false);
    setProgressInfo({ status: t.scanner.extractingTotals, progress: 0 });
    setVenue('');
    setGrandTotal(0);
    setTaxAmount(0);
    setSubtotal(0);
    setLineItems([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    startCamera();
  };

  // Run OCR on an image source (Blob or File)
  const processImageSource = async (source: Blob | File, previewUrl: string) => {
    setErrorMessage(null);
    setIsProcessing(true);
    setParsedData(null);
    setShowRawOcr(false);
    setImagePreviewUrl(previewUrl);

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
      setLineItems(result.lineItems || []);
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

  // Item Management Handlers
  const handleItemNameChange = (id: string, newName: string) => {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item))
    );
  };

  const handleItemPriceChange = (id: string, newPriceStr: string) => {
    const newPrice = parseFloat(newPriceStr) || 0;
    setLineItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, price: newPrice } : item
      );
      const newItemsSum = updated.reduce((acc, it) => acc + it.price, 0);
      if (newItemsSum > 0) {
        setSubtotal(parseFloat(newItemsSum.toFixed(2)));
        setGrandTotal(parseFloat((newItemsSum + taxAmount).toFixed(2)));
      }
      return updated;
    });
  };

  const handleDeleteItem = (id: string) => {
    setLineItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      const newItemsSum = filtered.reduce((acc, it) => acc + it.price, 0);
      if (newItemsSum > 0) {
        setSubtotal(parseFloat(newItemsSum.toFixed(2)));
        setGrandTotal(parseFloat((newItemsSum + taxAmount).toFixed(2)));
      }
      return filtered;
    });
  };

  const handleAddItem = () => {
    const newItem: ExtractedLineItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: '',
      price: 0,
      quantity: 1,
    };
    setLineItems((prev) => [...prev, newItem]);
  };

  // Action 1: Confirm & Save to History Directly (1-tap Gold Button)
  const handleConfirmAndSave = () => {
    const finalSubtotal = subtotal > 0 ? subtotal : grandTotal;
    const finalGrandTotal = grandTotal > 0 ? grandTotal : finalSubtotal + taxAmount;
    const now = new Date();

    const formattedItems: ItemizedItem[] = lineItems.length > 0
      ? convertOcrItemsToItemized(lineItems)
      : [{
          id: `item_${Date.now()}`,
          name: venue.trim() || t.calculator.defaultVenueName,
          price: finalSubtotal,
          assignedPersonIds: ['p1'],
        }];

    const historyEntry: CalculationHistoryItem = {
      id: `calc_${Date.now()}`,
      venueName: venue.trim() || t.calculator.defaultVenueName,
      date: now.toLocaleDateString(language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      time: now.toLocaleTimeString(language === 'uk' ? 'uk-UA' : language === 'ru' ? 'ru-RU' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      mealType: 'Dinner',
      currency: parsedData?.detectedCurrency || selectedCurrency.code,
      billAmount: finalSubtotal,
      taxAmount: taxAmount,
      tipPercent: 0,
      tipAmount: 0,
      totalBill: finalGrandTotal,
      splitCount: 1,
      totalPerPerson: finalGrandTotal,
      isItemized: formattedItems.length > 0,
      itemizedData: {
        items: formattedItems,
        people: [{ id: 'p1', name: 'You', avatarColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40', initials: 'Y' }],
        taxRatePercent: finalSubtotal > 0 ? parseFloat(((taxAmount / finalSubtotal) * 100).toFixed(1)) : 0,
        tipPercent: 0,
        subtotal: finalSubtotal,
        taxAmount: taxAmount,
        tipAmount: 0,
        grandTotal: finalGrandTotal,
      },
    };

    if (onSaveHistory) {
      onSaveHistory(historyEntry);
      setToastMessage(t.scanner.savedToHistoryToast);
      setTimeout(() => {
        onClose();
      }, 750);
    } else {
      handleSendToCalculator();
    }
  };

  // Action 2: Send to Calculator & Itemized Split (Frosted Glass Button)
  const handleSendToCalculator = () => {
    const finalSubtotal = subtotal > 0 ? subtotal : grandTotal;
    const finalItems = lineItems.length > 0 ? convertOcrItemsToItemized(lineItems) : undefined;

    onApplyScan({
      billAmount: finalSubtotal,
      taxAmount: taxAmount,
      venueName: venue.trim() || t.calculator.defaultVenueName,
      items: finalItems,
      currency: parsedData?.detectedCurrency,
    });
    onClose();
  };

  const currencySymbol = parsedData?.detectedCurrency || selectedCurrency.code;

  return (
    <div className="fixed inset-0 z-50 bg-[#05070E] text-white flex flex-col justify-between overflow-hidden select-none h-[100dvh] w-full">
      
      {/* Hidden File Input for Device Photo Library */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelected}
        accept="image/*"
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* 1. TOP MINIMALIST HEADER CAPSULE                                           */}
      {/* ========================================================================= */}
      <header className="absolute top-0 inset-x-0 z-40 pt-safe px-4 py-3 flex items-center justify-between pointer-events-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-11 h-11 rounded-full bg-white/[0.05] hover:bg-white/[0.1] active:scale-90 backdrop-blur-xl border border-white/[0.08] flex items-center justify-center text-white pointer-events-auto transition-all shadow-md cursor-pointer"
          aria-label={t.common.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand / Security Pill */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-md pointer-events-auto">
          <ReceiptIcon className="w-3.5 h-3.5 text-[#F0C05A]" />
          <span className="font-display font-semibold text-xs tracking-tight text-white">{t.scanner.title}</span>
          <span className="w-1 h-1 rounded-full bg-white/30" />
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <Lock className="w-2.5 h-2.5" />
            <span>On-Device</span>
          </span>
        </div>

        {/* Torch / Flashlight Button */}
        {torchSupported ? (
          <button
            onClick={toggleTorch}
            className={`w-11 h-11 rounded-full backdrop-blur-xl border flex items-center justify-center pointer-events-auto transition-all shadow-md cursor-pointer ${
              isTorchOn 
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.4)]' 
                : 'bg-white/[0.05] hover:bg-white/[0.1] text-white border-white/[0.08]'
            }`}
            title={isTorchOn ? t.scanner.torchOff : t.scanner.torchOn}
            aria-label="Toggle Flashlight"
          >
            {isTorchOn ? <Zap className="w-5 h-5 fill-amber-300 stroke-amber-400" /> : <ZapOff className="w-5 h-5" />}
          </button>
        ) : (
          <div className="w-11 h-11" />
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. VIEWFINDER & OCR SCAN CANVAS                                           */}
      {/* ========================================================================= */}
      <div className="relative flex-1 w-full h-full flex flex-col items-center justify-center overflow-hidden">
        
        {/* STATE 1: LIVE WEBRTC CAMERA STREAM */}
        {!imagePreviewUrl && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Subtle Gradient Framing Overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 pointer-events-none" />

            {/* Minimalist Viewfinder Reticle */}
            <div className="relative z-10 w-[84%] max-w-[340px] aspect-[9/14] sm:aspect-[3/4] rounded-3xl border border-white/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] pointer-events-none flex flex-col justify-between p-4">
              {/* Corner Indicators */}
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-2 border-l-2 border-[#F0C05A] rounded-tl-lg" />
                <div className="w-6 h-6 border-t-2 border-r-2 border-[#F0C05A] rounded-tr-lg" />
              </div>

              <div className="text-center">
                <span className="inline-block px-3 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-mono text-white/80">
                  {t.scanner.viewfinderGuide}
                </span>
              </div>

              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-2 border-l-2 border-[#F0C05A] rounded-bl-lg" />
                <div className="w-6 h-6 border-b-2 border-r-2 border-[#F0C05A] rounded-br-lg" />
              </div>
            </div>

            {/* Camera Permission / Error Fallback Prompt */}
            {(!hasCamera || cameraError) && (
              <div className="absolute inset-0 bg-[#05070E]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 pointer-events-auto gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.05] border border-white/[0.1] flex items-center justify-center text-white/70">
                  <CameraOff className="w-7 h-7" />
                </div>
                <div className="space-y-1 max-w-xs">
                  <h3 className="font-display font-bold text-base text-white">{t.scanner.cameraDenied}</h3>
                  <p className="text-xs font-mono text-[#c4c7c8] leading-relaxed">
                    {t.scanner.cameraDeniedDesc}
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] px-6 rounded-xl bg-[#F0C05A] text-[#05070E] font-display font-bold text-sm flex items-center gap-2 hover:bg-[#E2B248] active:scale-95 transition-all shadow-lg cursor-pointer"
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
          <div className="absolute inset-0 z-20 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 animate-fade-in">
            
            <div className="relative w-[86%] max-w-[320px] aspect-[9/14] rounded-3xl overflow-hidden border border-[#F0C05A]/40 shadow-[0_0_30px_rgba(240,192,90,0.2)]">
              {/* Sweeping Laser Beam */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#F0C05A] to-transparent shadow-[0_0_20px_#F0C05A] animate-laser" />
            </div>

            {/* Floating Glass Progress Card */}
            <div className="mt-6 w-[86%] max-w-[320px] rounded-2xl p-4 border border-white/[0.08] bg-[#0B0F19]/95 backdrop-blur-2xl shadow-2xl flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-mono">
                <span className="text-white font-medium">{progressInfo.status}</span>
                <span className="text-[#F0C05A] font-bold tabular-nums">{progressInfo.progress}%</span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F0C05A] to-[#E2B248] rounded-full transition-all duration-300"
                  style={{ width: `${progressInfo.progress}%` }}
                />
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ========================================================================= */}
      {/* 3. BOTTOM THUMB ZONE CONTROLS                                             */}
      {/* ========================================================================= */}
      
      {/* Error Banner */}
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

      {/* STATE 1 CONTROLS: Camera Shutter & Gallery Picker */}
      {!imagePreviewUrl && (
        <footer className="relative z-30 pb-safe px-6 pt-4 pb-8 flex items-center justify-around max-w-md mx-auto w-full">
          {/* Photo Library Picker */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-13 h-13 min-w-[48px] min-h-[48px] rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-90 backdrop-blur-xl border border-white/[0.08] flex items-center justify-center text-white transition-all shadow-md cursor-pointer"
            title={t.scanner.galleryTooltip}
            aria-label="Upload from gallery"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* iOS-Style Tactile Shutter Button */}
          <button
            id="btn-camera-shutter"
            onClick={handleCaptureSnapshot}
            disabled={!isStreaming || isCameraLoading}
            className="w-20 h-20 min-w-[72px] min-h-[72px] rounded-full border-4 border-white/90 p-1 flex items-center justify-center shadow-[0_0_24px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-90 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label={t.scanner.takeSnapshot}
          >
            <div className="w-full h-full bg-white rounded-full transition-transform active:scale-95 shadow-inner" />
          </button>

          {/* Refresh Camera Stream */}
          <button
            onClick={startCamera}
            className="w-13 h-13 min-w-[48px] min-h-[48px] rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] active:scale-90 backdrop-blur-xl border border-white/[0.08] flex items-center justify-center text-white transition-all shadow-md cursor-pointer"
            title="Refresh Camera"
            aria-label="Refresh Camera"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </footer>
      )}

      {/* STATE 3 CONTROLS: 2026 Luxury Fintech Result Card (Slide-Up Sheet) */}
      {imagePreviewUrl && !isProcessing && parsedData && (
        <div className="relative z-30 animate-slide-up bg-[#0B0F19]/98 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-3xl p-5 sm:p-6 shadow-[0_-16px_48px_rgba(0,0,0,0.85)] max-w-lg mx-auto w-full flex flex-col gap-3.5 pb-safe max-h-[88vh] overflow-y-auto">
          
          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-lg animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{toastMessage}</span>
            </div>
          )}

          {/* 1. Header: Venue & Status Badges */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[10px] text-white/50 uppercase tracking-widest block font-medium">
                {t.scanner.detectedVenue}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="bg-transparent border-none outline-none font-display font-bold text-lg text-white p-0 w-full focus:ring-0 truncate"
                  placeholder={t.calculator.defaultVenueName}
                />
                <Edit3 className="w-3.5 h-3.5 text-white/30 shrink-0" />
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center bg-white/[0.05] border border-white/[0.08] text-white/90 text-xs font-mono font-semibold px-2.5 py-1 rounded-lg shadow-sm">
                <span>{currencySymbol}</span>
              </span>
              {parsedData.isValidated && (
                <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.scanner.verified}</span>
                </span>
              )}
            </div>
          </div>

          {/* 2. Hero Grand Total Monetary Display */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.07] backdrop-blur-xl flex flex-col gap-1 text-center items-center">
            <span className="font-mono text-[11px] text-white/60 uppercase font-medium tracking-wider">
              {t.scanner.detectedTotal}
            </span>
            <div className="flex items-baseline justify-center gap-2 w-full">
              <input
                type="number"
                step="0.01"
                value={grandTotal || ''}
                onChange={(e) => setGrandTotal(parseFloat(e.target.value) || 0)}
                className="bg-transparent border-none outline-none text-4xl font-bold font-mono tracking-tight text-white text-center p-0 w-full max-w-[240px] tabular-nums focus:ring-0"
              />
              <span className="text-xl font-mono font-semibold text-[#F0C05A]">{currencySymbol}</span>
            </div>
          </div>

          {/* 3. Simple 2-Column Financial Breakdown */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Pre-Tax Subtotal */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-0.5">
              <span className="font-mono text-[10px] text-white/50 uppercase font-medium">
                {t.scanner.detectedSubtotal}
              </span>
              <div className="flex items-baseline justify-between">
                <input
                  type="number"
                  step="0.01"
                  value={subtotal || ''}
                  onChange={(e) => setSubtotal(parseFloat(e.target.value) || 0)}
                  className="bg-transparent border-none outline-none text-base font-semibold font-mono text-white p-0 w-full tabular-nums"
                />
                <span className="text-xs font-mono text-white/50">{currencySymbol}</span>
              </div>
            </div>

            {/* Extracted / Derived Tax */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-white/50 uppercase font-medium">
                  {t.scanner.detectedTax}
                </span>
                {parsedData.isEstimatedTax && (
                  <span className="text-[9px] font-mono text-amber-400/90 bg-amber-400/10 px-1.5 py-0.5 rounded">
                    Est.
                  </span>
                )}
              </div>
              <div className="flex items-baseline justify-between">
                <input
                  type="number"
                  step="0.01"
                  value={taxAmount || ''}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="bg-transparent border-none outline-none text-base font-semibold font-mono text-white p-0 w-full tabular-nums"
                />
                <span className="text-xs font-mono text-white/50">{currencySymbol}</span>
              </div>
            </div>
          </div>

          {/* 4. Line Items Table */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-white/70 font-semibold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#F0C05A]" />
                <span>{t.scanner.lineItemsTitle} ({lineItems.length})</span>
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[11px] font-mono text-[#F0C05A] hover:text-[#E2B248] flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/[0.03] border border-white/[0.08] transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{t.scanner.addItem}</span>
              </button>
            </div>

            {lineItems.length > 0 ? (
              <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                {lineItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.02] border border-white/[0.05] hover:border-white/[0.1] transition-all"
                  >
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemNameChange(item.id, e.target.value)}
                      placeholder={t.scanner.itemNamePlaceholder}
                      className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-white/20 font-mono focus:ring-0 min-w-0"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-white/40 font-mono">{currencySymbol}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price || ''}
                        onChange={(e) => handleItemPriceChange(item.id, e.target.value)}
                        placeholder="0.00"
                        className="w-16 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-0.5 text-right text-xs font-mono font-bold text-white tabular-nums focus:outline-none focus:border-[#F0C05A]/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded-lg text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title={t.scanner.deleteItem}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2.5 px-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center text-xs font-mono text-white/40">
                <span>{t.scanner.emptyItemsAudit}</span>
              </div>
            )}
          </div>

          {/* 5. Raw OCR Debug Transcript Toggle */}
          <div className="pt-0.5">
            <button
              type="button"
              onClick={() => setShowRawOcr(!showRawOcr)}
              className="text-[10px] font-mono text-white/50 hover:text-white/80 flex items-center gap-1.5 transition-colors cursor-pointer py-1"
            >
              {showRawOcr ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{showRawOcr ? '✕ Hide Raw Extracted Text' : '👁 Show Raw Extracted Text'}</span>
            </button>

            {showRawOcr && (
              <div className="mt-1.5 p-3 rounded-2xl bg-black/80 border border-white/[0.1] text-[10px] font-mono text-white/90 max-h-32 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed">
                {parsedData.rawText || '(No OCR text returned)'}
              </div>
            )}
          </div>

          {/* 6. Direct 1-Tap Thumb Action Buttons (2026 Solid Gold & Frosted Glass) */}
          <div className="flex flex-col gap-2 pt-1">
            {/* CTA 1: Solid Champagne Gold CTA */}
            <button
              id="btn-scanner-confirm-save"
              type="button"
              onClick={handleConfirmAndSave}
              className="w-full min-h-[56px] h-14 rounded-2xl bg-[#F3C350] hover:bg-[#E2B240] text-[#060810] font-display font-bold text-sm tracking-tight flex items-center justify-center gap-2 shadow-[0_4px_24px_rgba(243,195,80,0.2)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[2.5]" />
              <span>Confirm & Save</span>
            </button>

            <div className="flex gap-2">
              {/* CTA 2: Send to Calculator (Frosted Glass CTA) */}
              <button
                id="btn-scanner-send-calc"
                type="button"
                onClick={handleSendToCalculator}
                className="flex-1 min-h-[48px] h-12 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white font-display font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-white/[0.1] cursor-pointer shadow-sm"
              >
                <Layers className="w-4 h-4 text-[#F3C350]" />
                <span>Send to Calculator</span>
              </button>

              {/* CTA 3: Retake */}
              <button
                id="btn-scanner-retake"
                type="button"
                onClick={handleRetake}
                className="min-h-[48px] h-12 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] text-white/60 hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all border border-white/[0.08] cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t.scanner.retake}</span>
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
