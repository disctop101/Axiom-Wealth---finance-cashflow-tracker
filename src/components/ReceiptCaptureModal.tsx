import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  Loader2,
  Sparkles,
  AlertCircle,
  Crop,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Scan,
  Trash2,
  Edit3,
  MousePointer,
  Paintbrush,
  Undo2,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  DocumentType,
  performOCR,
  parseTransactionFromText,
  parseLineItemFromText,
  cropImageRegion,
  ParsedTransactionData,
} from '../services/receiptOcrService';
import { Tooltip } from './Tooltip';

export interface Point {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface HighlightStroke {
  id: string;
  points: Point[];
  bbox: {
    x: number; // percentage 0-100
    y: number; // percentage 0-100
    w: number; // percentage 0-100
    h: number; // percentage 0-100
  };
  extractedName?: string;
  extractedPrice?: number;
  rawText?: string;
  selected?: boolean; // checkbox selection state
}

interface ReceiptCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  currencySymbol: string;
  onAutoFill: (data: {
    name: string;
    amount: number;
    date: string;
    type: 'income' | 'expense';
    category?: string;
    description?: string;
  }) => void;
}

function pointsToSvgPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.1} ${points[0].y + 0.1}`;
  }
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    path += ` L ${points[i].x} ${points[i].y}`;
  }
  return path;
}

function computeBoundingBox(points: Point[]): { x: number; y: number; w: number; h: number } {
  if (points.length === 0) return { x: 0, y: 0, w: 0, h: 0 };
  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  // Add a slight padding (1.5% horiz, 1.2% vert) so text isn't clipped
  const padX = 1.5;
  const padY = 1.2;
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const w = Math.min(100 - x, maxX - minX + padX * 2);
  const h = Math.min(100 - y, maxY - minY + padY * 2);

  return { x, y, w, h };
}

export const ReceiptCaptureModal: React.FC<ReceiptCaptureModalProps> = ({
  isOpen,
  onClose,
  currencySymbol,
  onAutoFill,
}) => {
  const [docType, setDocType] = useState<DocumentType>('receipt');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [parsedResult, setParsedResult] = useState<ParsedTransactionData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Webcam live state
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Freehand Highlighter Canvas State
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<HighlightStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const [activeTool, setActiveTool] = useState<'highlight' | 'pan'>('highlight');

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Pan dragging state
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const panStartRef = useRef<{ clientX: number; clientY: number; initPanX: number; initPanY: number } | null>(null);

  // Refs for element sizing
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop webcam stream helper
  const stopWebcam = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsWebcamActive(false);
  }, []);

  // Cleanup webcam on modal close or unmount
  useEffect(() => {
    return () => {
      stopWebcam();
    };
  }, [stopWebcam]);

  // Convert client pointer coordinates into 0-100 percentage relative to the rendered image
  const getImagePercentCoords = useCallback((clientX: number, clientY: number): Point | null => {
    if (!imageElementRef.current) return null;
    const rect = imageElementRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y };
  }, []);

  // Pointer Down (Mouse or Touch)
  const handlePointerDown = (clientX: number, clientY: number, button = 0) => {
    if (button !== 0) return;

    if (activeTool === 'pan') {
      setIsPanning(true);
      panStartRef.current = {
        clientX,
        clientY,
        initPanX: panOffset.x,
        initPanY: panOffset.y,
      };
      return;
    }

    // Highlighter Mode: start new stroke
    const coords = getImagePercentCoords(clientX, clientY);
    if (!coords) return;
    setCurrentStroke([coords]);
  };

  // Pointer Move (Mouse or Touch)
  const handlePointerMove = (clientX: number, clientY: number) => {
    if (isPanning && panStartRef.current) {
      const deltaX = clientX - panStartRef.current.clientX;
      const deltaY = clientY - panStartRef.current.clientY;
      setPanOffset({
        x: panStartRef.current.initPanX + deltaX,
        y: panStartRef.current.initPanY + deltaY,
      });
      return;
    }

    if (currentStroke) {
      const coords = getImagePercentCoords(clientX, clientY);
      if (!coords) return;
      setCurrentStroke((prev) => (prev ? [...prev, coords] : [coords]));
    }
  };

  // Pointer Up (Mouse or Touch)
  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      panStartRef.current = null;
    }

    if (currentStroke && currentStroke.length > 0) {
      const bbox = computeBoundingBox(currentStroke);
      // Only keep strokes that have meaningful dimensions (not accidental clicks)
      if (bbox.w > 2 || bbox.h > 1.5 || currentStroke.length > 2) {
        const newStroke: HighlightStroke = {
          id: `stroke-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          points: currentStroke,
          bbox,
          selected: true,
        };
        setStrokes((prev) => [...prev, newStroke]);
      }
      setCurrentStroke(null);
    }
  };

  // Global window listeners for pointer release so strokes aren't stuck if mouse leaves window
  useEffect(() => {
    const onWindowMouseUp = () => {
      if (currentStroke || isPanning) {
        handlePointerUp();
      }
    };
    window.addEventListener('mouseup', onWindowMouseUp);
    window.addEventListener('touchend', onWindowMouseUp);
    return () => {
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.removeEventListener('touchend', onWindowMouseUp);
    };
  }, [currentStroke, isPanning]);

  // Undo last stroke
  const handleUndoStroke = () => {
    setStrokes((prev) => prev.slice(0, -1));
  };

  // Clear all strokes
  const handleClearStrokes = () => {
    setStrokes([]);
    setCurrentStroke(null);
  };

  // Toggle selection checkbox for a line item
  const handleToggleSelectStroke = (strokeId: string) => {
    setStrokes((prev) =>
      prev.map((s) => (s.id === strokeId ? { ...s, selected: s.selected === false ? true : false } : s))
    );
  };

  // Toggle select all items
  const handleToggleSelectAll = () => {
    const allSelected = strokes.every((s) => s.selected !== false);
    setStrokes((prev) => prev.map((s) => ({ ...s, selected: !allSelected })));
  };

  // Start device webcam
  const handleStartWebcam = async () => {
    setWebcamError(null);
    setErrorMsg(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam API is not supported in this browser.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      mediaStreamRef.current = stream;
      setIsWebcamActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch((e) => console.warn('Video play error:', e));
      }
    } catch (err: any) {
      console.error('Webcam access error:', err);
      setWebcamError(
        err?.message?.includes('Permission denied') || err?.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in browser settings or upload an image.'
          : 'Could not connect to camera device. Please upload an image file instead.'
      );
      stopWebcam();
    }
  };

  // Capture snapshot from active video stream
  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      setImagePreview(dataUrl);
      setIsCropping(true);
      setStrokes([]);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
    stopWebcam();
  };

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopWebcam();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      setIsCropping(true);
      setStrokes([]);
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setParsedResult(null);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Run OCR on all highlighted strokes
  const handleStartOCR = async () => {
    if (!imagePreview) {
      setErrorMsg('Please capture or upload an image first.');
      return;
    }

    if (strokes.length === 0) {
      setErrorMsg('Please highlight at least one item on the receipt using the highlighter tool.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg(`Processing ${strokes.length} highlighted item${strokes.length > 1 ? 's' : ''}...`);

    try {
      const updatedStrokes: HighlightStroke[] = [];

      // 1. Scan each stroke's bounding region for Item Name and Price
      for (let i = 0; i < strokes.length; i++) {
        const stroke = strokes[i];
        setProgressMsg(`Scanning Item #${i + 1} of ${strokes.length}...`);

        const croppedDataUrl = await cropImageRegion(imagePreview, stroke.bbox);
        const boxRawText = await performOCR(croppedDataUrl, (pct, status) => {
          setProgressMsg(`Item #${i + 1}: ${status} (${pct}%)`);
        });

        const lineItem = parseLineItemFromText(boxRawText);
        updatedStrokes.push({
          ...stroke,
          extractedName: lineItem.name,
          extractedPrice: lineItem.price,
          rawText: boxRawText,
          selected: true,
        });
      }

      setStrokes(updatedStrokes);

      // 2. Scan top header of receipt to extract date & vendor
      setProgressMsg('Detecting vendor and date from document header...');
      let headerVendor = 'Scanned Purchase Receipt';
      let headerDate = new Date().toISOString().split('T')[0];
      let headerType: 'income' | 'expense' = 'expense';
      let headerCategory = 'Food';

      try {
        const headerCropUrl = await cropImageRegion(imagePreview, { x: 0, y: 0, w: 100, h: 35 });
        const headerText = await performOCR(headerCropUrl);
        const headerParsed = parseTransactionFromText(headerText, docType);
        if (headerParsed.name) headerVendor = headerParsed.name;
        if (headerParsed.date) headerDate = headerParsed.date;
        if (headerParsed.type) headerType = headerParsed.type;
        if (headerParsed.suggestedCategory) headerCategory = headerParsed.suggestedCategory;
      } catch {
        // Fallback to defaults
      }

      const totalAmount = updatedStrokes.reduce((sum, s) => sum + (s.extractedPrice || 0), 0);

      const parsed: ParsedTransactionData = {
        name: headerVendor,
        amount: totalAmount > 0 ? totalAmount : undefined,
        date: headerDate,
        type: headerType,
        suggestedCategory: headerCategory,
        rawText: updatedStrokes.map((s) => s.rawText).join('\n---\n'),
        confidence: totalAmount > 0 ? 95 : 60,
      };

      setParsedResult(parsed);
      setIsCropping(false);

      if (totalAmount === 0) {
        setErrorMsg('Could not detect price figures in the highlighted strokes. You can adjust the strokes or enter amounts manually.');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMsg('Failed to process image highlights. Please try re-highlighting the receipt items.');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  // Apply single line item to form (safe execution without premature reset)
  const handleApplySingleItem = (stroke: HighlightStroke) => {
    onAutoFill({
      name: stroke.extractedName || parsedResult?.name || 'Receipt Item',
      amount: stroke.extractedPrice || 0,
      date: parsedResult?.date || new Date().toISOString().split('T')[0],
      type: parsedResult?.type || 'expense',
      category: parsedResult?.suggestedCategory || 'Food',
      description: `Item from ${parsedResult?.name || 'Receipt'}: ${stroke.extractedName || ''} (${currencySymbol} ${(stroke.extractedPrice || 0).toLocaleString()})`,
    });
    onClose();
  };

  // Apply all selected line items combined to form (safe execution without premature reset)
  const handleApplySelectedItems = () => {
    const selectedStrokes = strokes.filter((s) => s.selected !== false);
    if (selectedStrokes.length === 0) {
      setErrorMsg('Please select at least one line item to auto-fill.');
      return;
    }

    const totalAmount = selectedStrokes.reduce((sum, s) => sum + (s.extractedPrice || 0), 0) || parsedResult?.amount || 0;

    const breakdownNote = selectedStrokes
      .map((s) => `${s.extractedName || 'Item'} (${currencySymbol} ${(s.extractedPrice || 0).toLocaleString()})`)
      .join(', ');

    onAutoFill({
      name: selectedStrokes.length === 1
        ? selectedStrokes[0].extractedName || parsedResult?.name || 'Receipt Item'
        : parsedResult?.name || 'Receipt Purchase',
      amount: totalAmount,
      date: parsedResult?.date || new Date().toISOString().split('T')[0],
      type: parsedResult?.type || 'expense',
      category: parsedResult?.suggestedCategory || 'Food',
      description: breakdownNote ? `Line items: ${breakdownNote}` : undefined,
    });
    onClose();
  };

  // Delete a specific line item
  const handleDeleteStroke = (strokeId: string) => {
    setStrokes((prev) => prev.filter((s) => s.id !== strokeId));
  };

  // Update item name or price in stroke state
  const handleUpdateStrokeItem = (strokeId: string, field: 'name' | 'price', value: string) => {
    setStrokes((prev) =>
      prev.map((s) => {
        if (s.id !== strokeId) return s;
        if (field === 'name') {
          return { ...s, extractedName: value };
        } else {
          return { ...s, extractedPrice: parseFloat(value) || 0 };
        }
      })
    );
  };

  const handleReset = () => {
    stopWebcam();
    setImagePreview(null);
    setIsCropping(false);
    setStrokes([]);
    setCurrentStroke(null);
    setParsedResult(null);
    setIsProcessing(false);
    setProgressMsg('');
    setErrorMsg(null);
    setWebcamError(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  if (!isOpen) return null;

  // Compute total of selected items
  const selectedStrokes = strokes.filter((s) => s.selected !== false);
  const selectedTotal = selectedStrokes.reduce((sum, s) => sum + (s.extractedPrice || 0), 0);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs animate-in fade-in duration-150"
    >
      {/* Maximum Available Screen Real Estate on Desktop */}
      <div className="bg-[#181a1b] text-white w-full max-w-[96vw] xl:max-w-7xl h-[94vh] max-h-[94vh] rounded-2xl shadow-2xl border border-neutral-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Top Header Bar */}
        <div className="px-5 py-3.5 bg-[#212529] text-white flex items-center justify-between border-b border-neutral-700 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-600 flex items-center justify-center text-emerald-400 shrink-0">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-bold text-sm sm:text-base text-white">Receipt Capture &amp; OCR Engine</h2>
                <span className="text-[10px] bg-emerald-600/30 text-emerald-300 border border-emerald-600 px-2 py-0.5 rounded font-mono font-bold">
                  FREEHAND HIGHLIGHTER
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono hidden sm:block">
                Paint highlighter strokes over text rows to selectively isolate item names and prices
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Document Type Selector Toggle */}
            <div className="flex items-center bg-neutral-900 border border-neutral-700 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setDocType('receipt')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  docType === 'receipt'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Purchase Receipt
              </button>
              <button
                type="button"
                onClick={() => setDocType('bank_transaction')}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition cursor-pointer ${
                  docType === 'bank_transaction'
                    ? 'bg-emerald-600 text-white font-bold shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                Bank Slip
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-3 sm:p-5 overflow-hidden flex flex-col min-h-0 bg-[#121415]">
          {/* ================= STATE 1: UPLOAD / CAMERA CHOICE ================= */}
          {!imagePreview && !isWebcamActive && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-emerald-950/80 border border-emerald-600 flex items-center justify-center text-emerald-400 shadow-xl">
                <Paintbrush className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white">Capture or Upload Receipt</h3>
                <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
                  Take a photo with your webcam or upload a clear receipt image. Use the freehand highlighter to paint over specific items to extract line items and prices.
                </p>
              </div>

              {webcamError && (
                <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 rounded-xl text-xs flex items-center gap-2 max-w-md text-left">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{webcamError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  type="button"
                  onClick={handleStartWebcam}
                  className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition shadow-lg cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Activate Camera / Webcam</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 py-3.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-100 border border-neutral-600 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Upload Image File</span>
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* ================= STATE 2: ACTIVE LIVE WEBCAM FEED ================= */}
          {isWebcamActive && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black max-w-3xl max-h-[60vh] flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="max-h-[60vh] w-auto object-contain block"
                />
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center">
                  <span className="text-xs text-emerald-300 font-mono">Live Camera Feed Active</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Snapshot</span>
                </button>
                <button
                  type="button"
                  onClick={stopWebcam}
                  className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ================= STATE 3: FREEHAND HIGHLIGHTER CANVAS ================= */}
          {imagePreview && isCropping && (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Highlighter Toolbar Header */}
              <div className="px-3 py-2 bg-neutral-900 border border-neutral-700 rounded-xl flex flex-wrap items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  {/* Tool Mode: Highlight vs Pan */}
                  <div className="flex items-center bg-neutral-950 p-0.5 rounded-lg border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setActiveTool('highlight')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        activeTool === 'highlight'
                          ? 'bg-yellow-500 text-neutral-950 font-bold shadow-xs'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Paintbrush className="w-3.5 h-3.5" />
                      <span>Highlight Marker</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTool('pan')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        activeTool === 'pan'
                          ? 'bg-neutral-800 text-white font-bold shadow-xs'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Move className="w-3.5 h-3.5" />
                      <span>Pan / Zoom</span>
                    </button>
                  </div>

                  {/* Undo Stroke Button */}
                  <button
                    type="button"
                    disabled={strokes.length === 0}
                    onClick={handleUndoStroke}
                    className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-300 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-neutral-700"
                    title="Undo last painted highlight"
                  >
                    <Undo2 className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Undo</span>
                  </button>

                  {/* Clear All Highlights Button */}
                  {strokes.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearStrokes}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-red-900/60 text-neutral-300 hover:text-red-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition cursor-pointer border border-neutral-700"
                      title="Clear all highlight strokes"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear All</span>
                    </button>
                  )}

                  <span className="text-xs font-mono text-emerald-400 font-bold bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-700/60">
                    {strokes.length} Highlighted Item{strokes.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Right controls: Zoom & Scan CTA */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-neutral-950 px-1 py-0.5 rounded-lg border border-neutral-800 text-xs">
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
                      className="p-1 hover:text-white text-neutral-400 cursor-pointer"
                      title="Zoom Out"
                    >
                      <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 font-mono text-[11px] text-neutral-300">
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => setZoomLevel((z) => Math.min(3, z + 0.25))}
                      className="p-1 hover:text-white text-neutral-400 cursor-pointer"
                      title="Zoom In"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setZoomLevel(1);
                        setPanOffset({ x: 0, y: 0 });
                      }}
                      className="p-1 hover:text-white text-neutral-400 ml-1 cursor-pointer"
                      title="Reset View"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={isProcessing || strokes.length === 0}
                    onClick={handleStartOCR}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg font-bold text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="w-3.5 h-3.5" />
                        <span>Scan Highlighted Items ({strokes.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Viewport & Highlighter Canvas Area */}
              <div
                ref={viewportRef}
                className={`relative flex-1 bg-neutral-950 rounded-xl overflow-hidden border border-neutral-800 flex items-center justify-center select-none ${
                  activeTool === 'highlight' ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'
                }`}
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY, e.button)}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerUp}
                onTouchStart={(e) => {
                  if (e.touches.length === 1) {
                    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchMove={(e) => {
                  if (e.touches.length === 1) {
                    handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
                  }
                }}
                onTouchEnd={handlePointerUp}
              >
                {/* Floating guidance overlay */}
                <div className="absolute top-3 left-3 z-20 pointer-events-none bg-neutral-900/90 backdrop-blur-xs text-neutral-200 px-3 py-1.5 rounded-lg border border-neutral-700/80 text-[11px] font-mono flex items-center gap-2 shadow-lg">
                  <Paintbrush className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Paint highlighter marker strokes over each line item to extract</span>
                </div>

                {/* Scaled & Panned Image + SVG Overlay Container */}
                <div
                  className="relative transition-transform duration-75 origin-center inline-block"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                  }}
                >
                  <img
                    ref={imageElementRef}
                    src={imagePreview}
                    alt="Receipt for OCR"
                    draggable={false}
                    className="max-h-[66vh] w-auto max-w-full object-contain block pointer-events-none rounded shadow-2xl"
                  />

                  {/* SVG Overlay for Freehand Highlighter Strokes */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                  >
                    {/* Render saved completed strokes */}
                    {strokes.map((stroke, idx) => (
                      <g key={stroke.id}>
                        {/* Semi-transparent highlighter brush stroke */}
                        <path
                          d={pointsToSvgPath(stroke.points)}
                          stroke="rgba(250, 204, 21, 0.6)"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />

                        {/* Subtle bounding region box */}
                        <rect
                          x={stroke.bbox.x}
                          y={stroke.bbox.y}
                          width={stroke.bbox.w}
                          height={stroke.bbox.h}
                          fill="rgba(16, 185, 129, 0.08)"
                          stroke="rgba(16, 185, 129, 0.75)"
                          strokeWidth="0.4"
                          strokeDasharray="1,1"
                          rx="0.5"
                        />

                        {/* Number badge pill */}
                        <rect
                          x={stroke.bbox.x}
                          y={Math.max(0.5, stroke.bbox.y - 2.8)}
                          width="3.2"
                          height="2.4"
                          fill="#10b981"
                          rx="0.5"
                        />
                        <text
                          x={stroke.bbox.x + 1.6}
                          y={Math.max(2.0, stroke.bbox.y - 1.3)}
                          fontSize="1.6"
                          fill="#ffffff"
                          fontWeight="bold"
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          #{idx + 1}
                        </text>
                      </g>
                    ))}

                    {/* Render active in-progress drawing stroke */}
                    {currentStroke && (
                      <path
                        d={pointsToSvgPath(currentStroke)}
                        stroke="rgba(250, 204, 21, 0.85)"
                        strokeWidth="3.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                      />
                    )}
                  </svg>
                </div>
              </div>
            </div>
          )}

          {/* ================= STATE 4: PARSED RESULTS REVIEW & LINE-ITEM LOGGING ================= */}
          {imagePreview && !isCropping && (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 overflow-y-auto">
              {/* Left Column: Image Snapshot */}
              <div className="lg:w-5/12 bg-neutral-900 border border-neutral-700 rounded-xl p-3 flex flex-col items-center justify-center relative">
                <img
                  src={imagePreview}
                  alt="Scanned Receipt Snapshot"
                  className="max-h-[48vh] lg:max-h-[64vh] w-auto max-w-full object-contain rounded-lg"
                />
                <div className="flex items-center gap-2 mt-3 w-full">
                  <button
                    type="button"
                    onClick={() => setIsCropping(true)}
                    className="flex-1 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Crop className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Re-Paint / Adjust Highlights ({strokes.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-2 text-neutral-400 hover:text-red-400 text-xs transition cursor-pointer"
                  >
                    Re-Upload
                  </button>
                </div>
              </div>

              {/* Right Column: Multi-Stroke Extracted Line Items & Financial Data */}
              <div className="lg:w-7/12 flex flex-col justify-center space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-amber-950/80 border border-amber-600 text-amber-200 rounded-xl text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* Scan Button when OCR hasn't run yet */}
                {!parsedResult && (
                  <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 text-center space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-950 border border-emerald-600 flex items-center justify-center text-emerald-400 mx-auto">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-white">
                        {strokes.length} Highlighted Item{strokes.length > 1 ? 's' : ''} Ready
                      </h3>
                      <p className="text-xs text-neutral-400 max-w-md mx-auto">
                        OCR will scan specifically inside your highlighted strokes to isolate each item name and its corresponding price.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleStartOCR}
                      className="w-full max-w-sm mx-auto py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer text-sm"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-white" />
                          <span>{progressMsg || 'Processing document OCR...'}</span>
                        </>
                      ) : (
                        <>
                          <Scan className="w-4 h-4" />
                          <span>Scan Highlighted Items ({strokes.length})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Parsed Result Card with Individual Line Items */}
                {parsedResult && (
                  <div className="bg-neutral-900 border border-emerald-700/80 rounded-xl p-4 sm:p-5 space-y-4 shadow-xl animate-in fade-in">
                    <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <div>
                          <span className="font-bold text-sm text-white block">Detected Financial Data</span>
                          <span className="text-[11px] text-neutral-400 font-mono">
                            {selectedStrokes.length} of {strokes.length} Items Selected
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          className="text-[11px] text-neutral-300 hover:text-white px-2 py-1 rounded bg-neutral-800 border border-neutral-700 cursor-pointer"
                        >
                          {strokes.every((s) => s.selected !== false) ? 'Deselect All' : 'Select All'}
                        </button>
                        <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700 uppercase">
                          {parsedResult?.type === 'income' ? 'Inflow (Income)' : 'Outflow (Expense)'}
                        </span>
                      </div>
                    </div>

                    {/* Extracted Line Items Table with Selection Checkboxes */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                        <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[10px]">
                          Select Items to Log (Click to edit text/price)
                        </span>
                        <span>Price ({currencySymbol})</span>
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {strokes.map((stroke, idx) => {
                          const isSelected = stroke.selected !== false;

                          return (
                            <div
                              key={stroke.id}
                              className={`p-2.5 rounded-lg border flex items-center gap-2 transition ${
                                isSelected
                                  ? 'bg-neutral-950 border-emerald-800/80 hover:border-emerald-700'
                                  : 'bg-neutral-950/50 border-neutral-800 opacity-60'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <button
                                type="button"
                                onClick={() => handleToggleSelectStroke(stroke.id)}
                                className="p-0.5 text-neutral-400 hover:text-white cursor-pointer shrink-0"
                                title={isSelected ? 'Deselect row' : 'Select row'}
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-neutral-500" />
                                )}
                              </button>

                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
                                #{idx + 1}
                              </span>

                              <input
                                type="text"
                                value={stroke.extractedName || ''}
                                placeholder="Item Name"
                                onChange={(e) => handleUpdateStrokeItem(stroke.id, 'name', e.target.value)}
                                className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-emerald-500"
                              />

                              <div className="relative w-28 shrink-0">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-mono">
                                  {currencySymbol}
                                </span>
                                <input
                                  type="number"
                                  step="any"
                                  value={stroke.extractedPrice ?? ''}
                                  placeholder="0.00"
                                  onChange={(e) => handleUpdateStrokeItem(stroke.id, 'price', e.target.value)}
                                  className="w-full pl-6 pr-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono font-bold text-emerald-400 text-right focus:outline-emerald-500"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleApplySingleItem(stroke)}
                                className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded text-[11px] font-semibold transition shrink-0 cursor-pointer"
                                title="Log specifically this line item"
                              >
                                Use Item
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteStroke(stroke.id)}
                                className="p-1 text-neutral-500 hover:text-red-400 rounded transition shrink-0 cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Summary Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-neutral-800">
                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Vendor / Store</span>
                        <span className="font-bold text-white text-xs truncate block mt-0.5">
                          {parsedResult?.name || 'Store Vendor'}
                        </span>
                      </div>

                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Selected Total</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm block mt-0.5">
                          {currencySymbol}{' '}
                          {selectedTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Document Date</span>
                        <span className="font-mono text-neutral-200 text-xs block mt-0.5">
                          {parsedResult?.date || 'Today'}
                        </span>
                      </div>

                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Suggested Category</span>
                        <span className="font-semibold text-neutral-200 text-xs block mt-0.5 truncate">
                          {parsedResult?.suggestedCategory || 'Food'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        disabled={selectedStrokes.length === 0}
                        onClick={handleApplySelectedItems}
                        className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer text-xs sm:text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Auto-Fill Selected Items ({selectedStrokes.length} items · {currencySymbol}{' '}
                          {selectedTotal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                          )
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setParsedResult(null);
                          setIsCropping(true);
                        }}
                        className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl transition cursor-pointer text-xs"
                      >
                        Adjust Highlights
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
