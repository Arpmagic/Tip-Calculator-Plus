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
  History,
  Sparkles,
  Edit3
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

  // Action 1: Approve & Save to History Immediately
  const handleApproveAndSaveToHistory = () => {
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
      }, 900);
    } else {
      handleSendToCalculator();
    }
  };

  // Action 2: Populate Main Calculator & Itemized Split
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

  // Action 3: Itemized Split Screen Direct Forwarding
  const handleSendToItemized = () => {
    const finalSubtotal = subtotal > 0 ? subtotal : grandTotal;
    const items = lineItems.length > 0
      ? convertOcrItemsToItemized(lineItems)
      : [{
          id: `item_${Date.now()}`,
          name: venue.trim() || t.calculator.defaultVenueName,
          price: finalSubtotal,
          assignedPersonIds: ['p1', 'p2'],
        }];

    onApplyScan({
      billAmount: finalSubtotal,
      taxAmount: taxAmount,
      venueName: venue.trim() || t.calculator.defaultVenueName,
      items,
      currency: parsedData?.detectedCurrency,
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

        {/* Torch / Flashlight Button (Tactile 44x44dp Glass Button) */}
        {torchSupported ? (
          <button
            onClick={toggleTorch}
            className={`w-11 h-11 min-w-[44px] min-h-[44px] rounded-full backdrop-blur-xl border flex items-center justify-center pointer-events-auto transition-all active:scale-90 cursor-pointer shadow-lg ${
              isTorchOn
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]'
                : 'bg-black/40 text-white/70 border-white/10 hover:text-white hover:bg-black/60'
            }`}
            title={isTorchOn ? t.scanner.torchOn : t.scanner.torchOff}
            aria-label="Toggle Flashlight"
          >
            {isTorchOn ? <Zap className="w-5 h-5 fill-amber-300" /> : <ZapOff className="w-5 h-5" />}
          </button>
        ) : (
          <div className="w-11 h-11" />
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
              <div className="absolute inset-0 bg-[#0B0F19]/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center z-30 pointer-events-auto gap-4">
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
                  className="min-h-[48px] px-6 rounded-2xl bg-white text-[#0B0F19] font-display font-bold text-sm flex items-center gap-2 hover:bg-white/90 active:scale-95 transition-all shadow-xl"
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
            <div className="mt-6 w-[86%] max-w-[340px] glass-card rounded-3xl p-5 border border-emerald-500/30 bg-[#0B0F19]/90 backdrop-blur-2xl shadow-2xl flex flex-col gap-3">
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

      {/* STATE 3 CONTROLS: Interactive Receipt Audit & Verification Modal */}
      {imagePreviewUrl && !isProcessing && parsedData && (
        <div className="relative z-30 animate-slide-up bg-[#090D16]/95 backdrop-blur-2xl border-t border-white/[0.08] rounded-t-3xl p-5 sm:p-6 shadow-[0_-16px_48px_rgba(0,0,0,0.8)] max-w-lg mx-auto w-full flex flex-col gap-3.5 pb-safe max-h-[85vh] overflow-y-auto">
          
          {/* Toast Notification Banner */}
          {toastMessage && (
            <div className="p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono flex items-center gap-2 shadow-lg animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">{toastMessage}</span>
            </div>
          )}

          {/* Header: Venue & Clean Verified Status */}
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[10px] text-[#c4c7c8]/80 uppercase tracking-widest block font-semibold">
                {t.scanner.detectedVenue}
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="bg-transparent border-none outline-none font-display font-black text-lg text-white p-0 w-full focus:ring-0 truncate"
                  placeholder={t.calculator.defaultVenueName}
                />
                <Edit3 className="w-3.5 h-3.5 text-white/30 shrink-0" />
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {parsedData.detectedCurrency && (
                <span className="inline-flex items-center bg-amber-400/15 border border-amber-400/40 text-amber-300 text-xs font-mono font-bold px-2.5 py-1 rounded-full shadow-sm">
                  <span>{parsedData.detectedCurrency}</span>
                </span>
              )}
              {parsedData.isValidated && (
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold px-2.5 py-1 rounded-full shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t.scanner.verified}</span>
                </span>
              )}
            </div>
          </div>

          {/* Extracted Line Items Section */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#c4c7c8]/80 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t.scanner.lineItemsTitle} ({lineItems.length})</span>
              </span>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[11px] font-mono text-emerald-400 hover:text-emerald-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>{t.scanner.addItem}</span>
              </button>
            </div>

            {/* Line Items List / Table */}
            {lineItems.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {lineItems.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.15] transition-all"
                  >
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => handleItemNameChange(item.id, e.target.value)}
                      placeholder={t.scanner.itemNamePlaceholder}
                      className="flex-1 bg-transparent border-none outline-none text-xs text-white placeholder-white/20 font-mono focus:ring-0 min-w-0"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-[#c4c7c8]/60 font-mono">{selectedCurrency.symbol}</span>
                      <input
                        type="number"
                        step="0.01"
                        value={item.price || ''}
                        onChange={(e) => handleItemPriceChange(item.id, e.target.value)}
                        placeholder="0.00"
                        className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-right text-xs font-mono font-bold text-white tabular-nums focus:outline-none focus:border-amber-400/50"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1 rounded-lg text-[#c4c7c8]/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title={t.scanner.deleteItem}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-3 px-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-center text-xs font-mono text-[#c4c7c8]/50">
                <span>{t.scanner.emptyItemsAudit}</span>
              </div>
            )}
          </div>

          {/* Grand Total & Tax Hero Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* Grand Total Hero Card */}
            <div className="flex flex-col p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-emerald-500/30 shadow-[0_8px_32px_rgba(0,0,0,0.36)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
              <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold tracking-wider mb-0.5 z-10">
                {t.scanner.detectedTotal}
              </span>
              <div className="flex items-baseline gap-1.5 z-10">
                <span className="text-base text-emerald-400 font-bold">{selectedCurrency.symbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={grandTotal || ''}
                  onChange={(e) => setGrandTotal(parseFloat(e.target.value) || 0)}
                  className="bg-transparent border-none outline-none font-display font-black text-xl sm:text-2xl text-white p-0 w-full tabular-nums tracking-tight"
                />
              </div>
            </div>

            {/* Extracted Tax Card */}
            <div className="flex flex-col p-3.5 rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.36)]">
              <span className="font-mono text-[10px] text-[#c4c7c8]/80 uppercase font-semibold tracking-wider mb-0.5">
                {t.scanner.detectedTax}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base text-[#c4c7c8]/70 font-bold">{selectedCurrency.symbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={taxAmount || ''}
                  onChange={(e) => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="bg-transparent border-none outline-none font-display font-extrabold text-lg sm:text-xl text-white p-0 w-full tabular-nums"
                />
              </div>
            </div>
          </div>

          {/* Subtotal Info Row */}
          <div className="flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs font-mono text-[#c4c7c8]">
            <span>{t.scanner.calculatedSubtotal}</span>
            <span className="font-bold text-white tabular-nums">
              {formatCurrency(subtotal, selectedCurrency.code, language)}
            </span>
          </div>

          {/* Three Clear 56dp Luxury Action CTAs (Zero Tedium) */}
          <div className="flex flex-col gap-2 pt-1">
            {/* CTA 1: Approve & Save to History Immediately */}
            <button
              id="btn-scanner-approve-history"
              type="button"
              onClick={handleApproveAndSaveToHistory}
              className="w-full min-h-[56px] h-14 rounded-2xl bg-gradient-to-r from-[#F5D061] via-[#E6B83D] to-[#C9971E] text-[#090D16] font-display font-black text-sm flex items-center justify-center gap-2.5 shadow-[0_4px_20px_rgba(230,184,61,0.25)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{t.scanner.approveAndSave}</span>
            </button>

            <div className="flex gap-2">
              {/* CTA 2: Send to Calculator / Split */}
              <button
                id="btn-scanner-send-calc"
                type="button"
                onClick={handleSendToCalculator}
                className="flex-1 min-h-[48px] h-12 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white font-display font-bold text-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-all border border-white/[0.12] cursor-pointer shadow-md"
              >
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>{t.scanner.sendToCalcAndSplit}</span>
              </button>

              {/* CTA 3: Reject / Retake */}
              <button
                id="btn-scanner-retake"
                type="button"
                onClick={handleRetake}
                className="min-h-[48px] h-12 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#c4c7c8] hover:text-white font-mono text-xs flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all border border-white/10 cursor-pointer"
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
