import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  Building,
  CheckCircle2,
  Loader2,
  Receipt,
  Sparkles,
  AlertCircle,
  Crop,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Crosshair,
  Maximize2,
  Scan,
  Plus,
  Trash2,
  Edit3,
  ArrowRight,
  MousePointer,
  Layers,
  ListPlus,
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

export interface OCRBoundingBox {
  id: string;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  w: number; // percentage 0-100
  h: number; // percentage 0-100
  extractedName?: string;
  extractedPrice?: number;
  rawText?: string;
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

  // Multi-Bounding Box Cropping State (percentages 0-100)
  const [isCropping, setIsCropping] = useState<boolean>(false);
  const [boxes, setBoxes] = useState<OCRBoundingBox[]>([
    { id: 'box-1', x: 5, y: 35, w: 90, h: 12 },
  ]);
  const [activeBoxId, setActiveBoxId] = useState<string | null>('box-1');

  // Zoom & Pan State
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [activeTool, setActiveTool] = useState<'crop' | 'pan'>('crop');

  // Drag interaction refs and state
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageElementRef = useRef<HTMLImageElement>(null);
  const imageWrapperRef = useRef<HTMLDivElement>(null);

  const [dragMode, setDragMode] = useState<
    'draw' | 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w' | 'pan' | null
  >(null);

  const [dragAnchor, setDragAnchor] = useState<{
    startClientX: number;
    startClientY: number;
    boxId: string;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
    initPanX: number;
    initPanY: number;
  } | null>(null);

  // Pinch-to-zoom tracking ref
  const pinchRef = useRef<{ initialDist: number; initialZoom: number } | null>(null);

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

  // Helper to extract coordinates relative to the underlying image (0 to 100%)
  const getImagePercentCoords = useCallback((clientX: number, clientY: number) => {
    if (!imageElementRef.current) return { x: 0, y: 0 };
    const rect = imageElementRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return { x: 0, y: 0 };

    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));
    return { x, y, rect };
  }, []);

  // Global mousemove / touchmove listeners for fluid dragging
  useEffect(() => {
    if (!dragMode || !dragAnchor) return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!imageElementRef.current) return;
      const rect = imageElementRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const deltaXPercent = ((clientX - dragAnchor.startClientX) / rect.width) * 100;
      const deltaYPercent = ((clientY - dragAnchor.startClientY) / rect.height) * 100;

      if (dragMode === 'pan') {
        const dx = clientX - dragAnchor.startClientX;
        const dy = clientY - dragAnchor.startClientY;
        setPanOffset({
          x: dragAnchor.initPanX + dx / zoomLevel,
          y: dragAnchor.initPanY + dy / zoomLevel,
        });
        return;
      }

      setBoxes((prevBoxes) =>
        prevBoxes.map((b) => {
          if (b.id !== dragAnchor.boxId) return b;

          if (dragMode === 'draw') {
            const currentX = Math.max(0, Math.min(100, dragAnchor.initX + deltaXPercent));
            const currentY = Math.max(0, Math.min(100, dragAnchor.initY + deltaYPercent));
            const newX = Math.min(dragAnchor.initX, currentX);
            const newY = Math.min(dragAnchor.initY, currentY);
            const newW = Math.max(4, Math.abs(currentX - dragAnchor.initX));
            const newH = Math.max(3, Math.abs(currentY - dragAnchor.initY));
            return { ...b, x: newX, y: newY, w: Math.min(100 - newX, newW), h: Math.min(100 - newY, newH) };
          }

          if (dragMode === 'move') {
            const newX = Math.max(0, Math.min(100 - b.w, dragAnchor.initX + deltaXPercent));
            const newY = Math.max(0, Math.min(100 - b.h, dragAnchor.initY + deltaYPercent));
            return { ...b, x: newX, y: newY };
          }

          let { initX, initY, initW, initH } = dragAnchor;
          let newX = initX;
          let newY = initY;
          let newW = initW;
          let newH = initH;

          // Corner / Edge Resizing
          if (dragMode.includes('e')) {
            newW = Math.max(4, Math.min(100 - initX, initW + deltaXPercent));
          }
          if (dragMode.includes('s')) {
            newH = Math.max(3, Math.min(100 - initY, initH + deltaYPercent));
          }
          if (dragMode.includes('w')) {
            const proposedX = initX + deltaXPercent;
            const clampedX = Math.max(0, Math.min(initX + initW - 4, proposedX));
            newW = initW + (initX - clampedX);
            newX = clampedX;
          }
          if (dragMode.includes('n')) {
            const proposedY = initY + deltaYPercent;
            const clampedY = Math.max(0, Math.min(initY + initH - 3, proposedY));
            newH = initH + (initY - clampedY);
            newY = clampedY;
          }

          return { ...b, x: newX, y: newY, w: newW, h: newH };
        })
      );
    };

    const onMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && pinchRef.current) {
        // Multi-touch pinch zoom
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = dist / pinchRef.current.initialDist;
        const targetZoom = Math.max(1, Math.min(3.5, pinchRef.current.initialZoom * scale));
        setZoomLevel(targetZoom);
        return;
      }

      if (e.touches.length === 1) {
        handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onPointerUp = () => {
      setDragMode(null);
      setDragAnchor(null);
      pinchRef.current = null;
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onPointerUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onPointerUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onPointerUp);
    };
  }, [dragMode, dragAnchor, zoomLevel]);

  // Desktop Mouse Wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    setZoomLevel((prev) => {
      const next = Math.max(1, Math.min(3.5, prev * zoomFactor));
      if (next === 1) {
        setPanOffset({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Touch Start on Viewport (supports pinch zoom and tap-drag creation)
  const handleViewportTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchRef.current = {
        initialDist: dist,
        initialZoom: zoomLevel,
      };
      setDragMode(null);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (activeTool === 'pan' || zoomLevel > 1.05) {
        setDragMode('pan');
        setDragAnchor({
          startClientX: touch.clientX,
          startClientY: touch.clientY,
          boxId: activeBoxId || '',
          initX: 0,
          initY: 0,
          initW: 0,
          initH: 0,
          initPanX: panOffset.x,
          initPanY: panOffset.y,
        });
      } else {
        const { x, y } = getImagePercentCoords(touch.clientX, touch.clientY);
        const newId = `box-${Date.now()}`;
        const newBox: OCRBoundingBox = { id: newId, x, y, w: 8, h: 5 };
        setBoxes((prev) => [...prev, newBox]);
        setActiveBoxId(newId);
        setDragMode('draw');
        setDragAnchor({
          startClientX: touch.clientX,
          startClientY: touch.clientY,
          boxId: newId,
          initX: x,
          initY: y,
          initW: 8,
          initH: 5,
          initPanX: panOffset.x,
          initPanY: panOffset.y,
        });
      }
    }
  };

  // Mouse Down in Viewport backdrop (draws a new selection box)
  const handleViewportMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;

    if (activeTool === 'pan') {
      setDragMode('pan');
      setDragAnchor({
        startClientX: e.clientX,
        startClientY: e.clientY,
        boxId: activeBoxId || '',
        initX: 0,
        initY: 0,
        initW: 0,
        initH: 0,
        initPanX: panOffset.x,
        initPanY: panOffset.y,
      });
      return;
    }

    const { x, y } = getImagePercentCoords(e.clientX, e.clientY);
    const newId = `box-${Date.now()}`;
    const newBox: OCRBoundingBox = { id: newId, x, y, w: 8, h: 5 };
    setBoxes((prev) => [...prev, newBox]);
    setActiveBoxId(newId);
    setDragMode('draw');
    setDragAnchor({
      startClientX: e.clientX,
      startClientY: e.clientY,
      boxId: newId,
      initX: x,
      initY: y,
      initW: 8,
      initH: 5,
      initPanX: panOffset.x,
      initPanY: panOffset.y,
    });
  };

  // Start dragging a specific selection box
  const handleBoxPointerDown = (box: OCRBoundingBox, clientX: number, clientY: number, e: React.UIEvent) => {
    e.stopPropagation();
    setActiveBoxId(box.id);
    setDragMode('move');
    setDragAnchor({
      startClientX: clientX,
      startClientY: clientY,
      boxId: box.id,
      initX: box.x,
      initY: box.y,
      initW: box.w,
      initH: box.h,
      initPanX: panOffset.x,
      initPanY: panOffset.y,
    });
  };

  // Start dragging a handle (corner or edge) for the active box
  const handleHandlePointerDown = (
    box: OCRBoundingBox,
    mode: 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w',
    clientX: number,
    clientY: number,
    e: React.UIEvent
  ) => {
    e.stopPropagation();
    setActiveBoxId(box.id);
    setDragMode(mode);
    setDragAnchor({
      startClientX: clientX,
      startClientY: clientY,
      boxId: box.id,
      initX: box.x,
      initY: box.y,
      initW: box.w,
      initH: box.h,
      initPanX: panOffset.x,
      initPanY: panOffset.y,
    });
  };

  // Delete a specific bounding box
  const handleDeleteBox = (boxId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setBoxes((prev) => {
      const filtered = prev.filter((b) => b.id !== boxId);
      if (filtered.length > 0) {
        setActiveBoxId(filtered[0].id);
      } else {
        setActiveBoxId(null);
      }
      return filtered;
    });
  };

  // Add a new bounding box in visible center
  const handleAddBox = () => {
    const newId = `box-${Date.now()}`;
    const newBox: OCRBoundingBox = {
      id: newId,
      x: 10,
      y: Math.min(80, 20 + boxes.length * 15),
      w: 80,
      h: 12,
    };
    setBoxes((prev) => [...prev, newBox]);
    setActiveBoxId(newId);
  };

  // Clear all bounding boxes
  const handleClearBoxes = () => {
    setBoxes([]);
    setActiveBoxId(null);
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
      setBoxes([{ id: 'box-1', x: 5, y: 35, w: 90, h: 12 }]);
      setActiveBoxId('box-1');
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
    }
    stopWebcam();
  };

  // Handle file explorer upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    stopWebcam();
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setImagePreview(dataUrl);
      setIsCropping(true);
      setBoxes([
        { id: 'box-1', x: 5, y: 35, w: 90, h: 12 },
        { id: 'box-2', x: 5, y: 50, w: 90, h: 12 },
      ]);
      setActiveBoxId('box-1');
      setZoomLevel(1);
      setPanOffset({ x: 0, y: 0 });
      setParsedResult(null);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Run Multi-Bounding Box OCR on all drawn selection boxes
  const handleStartOCR = async () => {
    if (!imagePreview) {
      setErrorMsg('Please capture or upload an image first.');
      return;
    }

    if (boxes.length === 0) {
      setErrorMsg('Please draw at least one bounding box over the receipt items.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setProgressMsg(`Processing ${boxes.length} bounding box${boxes.length > 1 ? 'es' : ''}...`);

    try {
      const updatedBoxes: OCRBoundingBox[] = [];

      // 1. Scan each bounding box individually for Item Name and Price
      for (let i = 0; i < boxes.length; i++) {
        const box = boxes[i];
        setProgressMsg(`Scanning Box #${i + 1} of ${boxes.length}...`);

        const croppedDataUrl = await cropImageRegion(imagePreview, box);
        const boxRawText = await performOCR(croppedDataUrl, (pct, status) => {
          setProgressMsg(`Box #${i + 1}: ${status} (${pct}%)`);
        });

        const lineItem = parseLineItemFromText(boxRawText);
        updatedBoxes.push({
          ...box,
          extractedName: lineItem.name,
          extractedPrice: lineItem.price,
          rawText: boxRawText,
        });
      }

      setBoxes(updatedBoxes);

      // 2. Scan top header of receipt to extract date & vendor
      setProgressMsg('Detecting vendor and date...');
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

      // Sum all prices extracted across bounding boxes
      const totalAmount = updatedBoxes.reduce((sum, b) => sum + (b.extractedPrice || 0), 0);

      const parsed: ParsedTransactionData = {
        name: headerVendor,
        amount: totalAmount > 0 ? totalAmount : undefined,
        date: headerDate,
        type: headerType,
        suggestedCategory: headerCategory,
        rawText: updatedBoxes.map((b) => b.rawText).join('\n---\n'),
        confidence: totalAmount > 0 ? 95 : 60,
      };

      setParsedResult(parsed);
      setIsCropping(false);

      if (totalAmount === 0) {
        setErrorMsg('Could not detect price figures in the selected boxes. You can adjust the boxes or enter the amounts manually.');
      }
    } catch (err: any) {
      console.error('Scan error:', err);
      setErrorMsg('Failed to process image bounding boxes. Please try adjusting the selection boxes.');
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  // Apply single line item to form
  const handleApplySingleItem = (box: OCRBoundingBox) => {
    onAutoFill({
      name: box.extractedName || parsedResult?.name || 'Receipt Item',
      amount: box.extractedPrice || 0,
      date: parsedResult?.date || new Date().toISOString().split('T')[0],
      type: parsedResult?.type || 'expense',
      category: parsedResult?.suggestedCategory || 'Food',
      description: `Item from ${parsedResult?.name || 'Receipt'}: ${box.extractedName || ''} (${currencySymbol} ${(box.extractedPrice || 0).toLocaleString()})`,
    });
    handleReset();
    onClose();
  };

  // Apply all line items combined to form
  const handleApplyAllItems = () => {
    if (!parsedResult) return;

    const validBoxes = boxes.filter((b) => (b.extractedPrice || 0) > 0 || (b.extractedName || '').length > 0);
    const totalAmount = validBoxes.reduce((sum, b) => sum + (b.extractedPrice || 0), 0) || parsedResult.amount || 0;

    const breakdownNote = validBoxes
      .map((b) => `${b.extractedName || 'Item'} (${currencySymbol} ${(b.extractedPrice || 0).toLocaleString()})`)
      .join(', ');

    onAutoFill({
      name: validBoxes.length === 1 ? validBoxes[0].extractedName || parsedResult.name || 'Receipt Item' : parsedResult.name || 'Receipt Purchase',
      amount: totalAmount,
      date: parsedResult.date || new Date().toISOString().split('T')[0],
      type: parsedResult.type,
      category: parsedResult.suggestedCategory,
      description: breakdownNote ? `Line items: ${breakdownNote}` : undefined,
    });
    handleReset();
    onClose();
  };

  const handleReset = () => {
    stopWebcam();
    setImagePreview(null);
    setIsCropping(false);
    setBoxes([{ id: 'box-1', x: 5, y: 35, w: 90, h: 12 }]);
    setActiveBoxId('box-1');
    setParsedResult(null);
    setIsProcessing(false);
    setProgressMsg('');
    setErrorMsg(null);
    setWebcamError(null);
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Update item name or price in box state
  const handleUpdateBoxItem = (boxId: string, field: 'name' | 'price', value: string) => {
    setBoxes((prev) =>
      prev.map((b) => {
        if (b.id !== boxId) return b;
        if (field === 'name') {
          return { ...b, extractedName: value };
        } else {
          return { ...b, extractedPrice: parseFloat(value) || 0 };
        }
      })
    );
  };

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
            <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-600 flex items-center justify-center text-emerald-400">
              <Scan className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-sm sm:text-base text-white">Receipt Capture &amp; OCR Engine</h2>
                <span className="text-[10px] bg-emerald-600/30 text-emerald-300 border border-emerald-600 px-2 py-0.5 rounded font-mono font-bold">
                  MULTI-BOUNDING BOX
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono hidden sm:block">
                Draw multiple selection boxes simultaneously to extract item names and prices for line-item logging
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Document Type Selector Toggle */}
            <div className="flex items-center bg-neutral-900 border border-neutral-700 p-0.5 rounded-lg text-xs">
              <button
                type="button"
                onClick={() => setDocType('receipt')}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  docType === 'receipt'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Receipt className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Purchase Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setDocType('bank_transaction')}
                className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 cursor-pointer ${
                  docType === 'bank_transaction'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Bank Transaction</span>
              </button>
            </div>

            <button
              onClick={() => {
                handleReset();
                onClose();
              }}
              className="text-neutral-400 hover:text-white p-1.5 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 p-3 sm:p-5 flex flex-col overflow-hidden">
          {/* ================= STATE 1: INITIAL UPLOAD OR CAMERA START ================= */}
          {!imagePreview && !isWebcamActive && (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-6 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-emerald-400 shadow-xl">
                <Scan className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Capture or Upload Financial Document
                </h3>
                <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
                  Draw multiple bounding boxes over line items to extract individual item names and prices with high-accuracy OCR.
                </p>
              </div>

              {webcamError && (
                <div className="p-3 bg-red-950/80 border border-red-700 text-red-200 rounded-lg text-xs flex items-center gap-2 max-w-md text-left">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{webcamError}</span>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
                <button
                  type="button"
                  onClick={handleStartWebcam}
                  className="w-full sm:flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer text-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Use Device Webcam</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 border border-neutral-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer text-sm"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Image File</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          )}

          {/* ================= STATE 2: LIVE WEBCAM VIEWFINDER ================= */}
          {isWebcamActive && (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <div className="relative w-full max-w-3xl aspect-4/3 bg-black rounded-xl overflow-hidden border border-neutral-700 shadow-2xl flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-8 border-2 border-dashed border-emerald-400/70 rounded-lg pointer-events-none flex items-center justify-center">
                  <span className="bg-black/60 text-emerald-300 font-mono text-xs px-3 py-1 rounded backdrop-blur-xs">
                    Position receipt clearly inside frame
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center gap-2 transition cursor-pointer text-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Photo &amp; Select Items</span>
                </button>
                <button
                  type="button"
                  onClick={stopWebcam}
                  className="px-4 py-3 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold rounded-xl transition cursor-pointer text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* ================= STATE 3: MULTI-BOUNDING BOX CROP & ZOOM CANVAS ================= */}
          {imagePreview && isCropping && (
            <div className="flex-1 flex flex-col overflow-hidden space-y-3">
              {/* Interactive Toolbar: Multi-box controls, Zoom, Pan, Drawing */}
              <div className="bg-[#212529] p-2.5 rounded-xl border border-neutral-700 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 select-none">
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={handleAddBox}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                    title="Draw an additional bounding box over a receipt line item"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Selection Box</span>
                  </button>

                  {boxes.length > 0 && activeBoxId && (
                    <button
                      type="button"
                      onClick={() => activeBoxId && handleDeleteBox(activeBoxId)}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-red-950/60 hover:text-red-300 text-neutral-300 border border-neutral-700 rounded-lg font-medium flex items-center gap-1.5 transition cursor-pointer"
                      title="Delete currently selected bounding box"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Box</span>
                    </button>
                  )}

                  {boxes.length > 1 && (
                    <button
                      type="button"
                      onClick={handleClearBoxes}
                      className="px-2.5 py-1.5 text-neutral-400 hover:text-white transition cursor-pointer text-[11px]"
                    >
                      Clear All ({boxes.length})
                    </button>
                  )}

                  <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded-md border border-emerald-800">
                    {boxes.length} Box{boxes.length === 1 ? '' : 'es'} Drawn
                  </span>
                </div>

                {/* Viewport Zoom & Mode Controls */}
                <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-700 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setActiveTool('crop')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                      activeTool === 'crop'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Click and drag to draw or adjust selection boxes"
                  >
                    <Crop className="w-3.5 h-3.5" />
                    <span>Draw Boxes</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTool('pan')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                      activeTool === 'pan'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                    title="Pan and drag zoomed canvas"
                  >
                    <Move className="w-3.5 h-3.5" />
                    <span>Pan</span>
                  </button>
                  <div className="w-px h-4 bg-neutral-700 mx-1" />
                  <button
                    type="button"
                    onClick={() => setZoomLevel((z) => Math.min(3.5, z + 0.25))}
                    className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded cursor-pointer"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] font-mono w-10 text-center text-neutral-300">
                    {Math.round(zoomLevel * 100)}%
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setZoomLevel((z) => {
                        const next = Math.max(1, z - 0.25);
                        if (next === 1) setPanOffset({ x: 0, y: 0 });
                        return next;
                      })
                    }
                    className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded cursor-pointer"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setZoomLevel(1);
                      setPanOffset({ x: 0, y: 0 });
                    }}
                    className="p-1 text-neutral-300 hover:text-white hover:bg-neutral-800 rounded cursor-pointer"
                    title="Reset view"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isProcessing || boxes.length === 0}
                    onClick={handleStartOCR}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg shadow-md flex items-center gap-1.5 transition cursor-pointer text-xs"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Scanning...</span>
                      </>
                    ) : (
                      <>
                        <Scan className="w-3.5 h-3.5" />
                        <span>Scan Selected Boxes ({boxes.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Viewport Canvas with Multi-Bounding Boxes */}
              <div
                ref={viewportRef}
                onWheel={handleWheel}
                onMouseDown={handleViewportMouseDown}
                onTouchStart={handleViewportTouchStart}
                className="flex-1 bg-[#101213] border border-neutral-700 rounded-xl relative overflow-hidden flex items-center justify-center select-none"
                style={{
                  cursor: activeTool === 'pan' ? 'grab' : 'crosshair',
                  touchAction: 'none',
                }}
              >
                <div
                  ref={imageWrapperRef}
                  className="relative transition-transform duration-75 inline-block"
                  style={{
                    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <img
                    ref={imageElementRef}
                    src={imagePreview}
                    alt="Uploaded Document"
                    draggable={false}
                    className="max-h-[62vh] xl:max-h-[70vh] w-auto max-w-full object-contain pointer-events-none select-none rounded shadow-2xl"
                  />

                  {/* Render All Custom Multi-Selection Bounding Boxes */}
                  {boxes.map((box, index) => {
                    const isActive = box.id === activeBoxId;
                    return (
                      <div
                        key={box.id}
                        onMouseDown={(e) => handleBoxPointerDown(box, e.clientX, e.clientY, e)}
                        onTouchStart={(e) => {
                          if (e.touches.length === 1) {
                            handleBoxPointerDown(box, e.touches[0].clientX, e.touches[0].clientY, e);
                          }
                        }}
                        className={`absolute select-none pointer-events-auto cursor-move transition-colors ${
                          isActive
                            ? 'border-2 border-emerald-400 bg-emerald-500/25 ring-2 ring-emerald-300/40 shadow-2xl z-20'
                            : 'border-2 border-amber-400/90 bg-amber-500/15 hover:border-amber-300 z-10'
                        }`}
                        style={{
                          left: `${box.x}%`,
                          top: `${box.y}%`,
                          width: `${box.w}%`,
                          height: `${box.h}%`,
                          touchAction: 'none',
                        }}
                      >
                        {/* Box Header Badge with Number and Delete Button */}
                        <div className="absolute -top-6 left-0 flex items-center gap-1 z-30 pointer-events-auto">
                          <span
                            className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shadow-md uppercase tracking-wider ${
                              isActive
                                ? 'bg-emerald-600 text-white'
                                : 'bg-neutral-800 text-neutral-200 border border-neutral-600'
                            }`}
                          >
                            Box #{index + 1}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteBox(box.id, e)}
                            className="w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white flex items-center justify-center text-[10px] shadow-md transition cursor-pointer"
                            title="Remove this selection box"
                          >
                            ×
                          </button>
                        </div>

                        {/* Corner & Edge Handles (Active Box Only) */}
                        {isActive && (
                          <>
                            <div
                              onMouseDown={(e) => handleHandlePointerDown(box, 'nw', e.clientX, e.clientY, e)}
                              onTouchStart={(e) => {
                                if (e.touches.length === 1) {
                                  handleHandlePointerDown(box, 'nw', e.touches[0].clientX, e.touches[0].clientY, e);
                                }
                              }}
                              className="absolute -top-2.5 -left-2.5 w-5 h-5 flex items-center justify-center cursor-nwse-resize z-20"
                              style={{ touchAction: 'none' }}
                            >
                              <div className="w-3 h-3 bg-white border-2 border-emerald-600 rounded-full shadow-lg" />
                            </div>

                            <div
                              onMouseDown={(e) => handleHandlePointerDown(box, 'ne', e.clientX, e.clientY, e)}
                              onTouchStart={(e) => {
                                if (e.touches.length === 1) {
                                  handleHandlePointerDown(box, 'ne', e.touches[0].clientX, e.touches[0].clientY, e);
                                }
                              }}
                              className="absolute -top-2.5 -right-2.5 w-5 h-5 flex items-center justify-center cursor-nesw-resize z-20"
                              style={{ touchAction: 'none' }}
                            >
                              <div className="w-3 h-3 bg-white border-2 border-emerald-600 rounded-full shadow-lg" />
                            </div>

                            <div
                              onMouseDown={(e) => handleHandlePointerDown(box, 'se', e.clientX, e.clientY, e)}
                              onTouchStart={(e) => {
                                if (e.touches.length === 1) {
                                  handleHandlePointerDown(box, 'se', e.touches[0].clientX, e.touches[0].clientY, e);
                                }
                              }}
                              className="absolute -bottom-2.5 -right-2.5 w-5 h-5 flex items-center justify-center cursor-nwse-resize z-20"
                              style={{ touchAction: 'none' }}
                            >
                              <div className="w-3 h-3 bg-white border-2 border-emerald-600 rounded-full shadow-lg" />
                            </div>

                            <div
                              onMouseDown={(e) => handleHandlePointerDown(box, 'sw', e.clientX, e.clientY, e)}
                              onTouchStart={(e) => {
                                if (e.touches.length === 1) {
                                  handleHandlePointerDown(box, 'sw', e.touches[0].clientX, e.touches[0].clientY, e);
                                }
                              }}
                              className="absolute -bottom-2.5 -left-2.5 w-5 h-5 flex items-center justify-center cursor-nesw-resize z-20"
                              style={{ touchAction: 'none' }}
                            >
                              <div className="w-3 h-3 bg-white border-2 border-emerald-600 rounded-full shadow-lg" />
                            </div>

                            {/* North handle */}
                            <div
                              onMouseDown={(e) => handleHandlePointerDown(box, 'n', e.clientX, e.clientY, e)}
                              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-3 flex items-center justify-center cursor-ns-resize z-10"
                            >
                              <div className="w-3 h-1 bg-emerald-300 rounded-full" />
                            </div>
                            {/* South handle */}
                            <div
                              onMouseDown={(e) => handleHandlePointerDown(box, 's', e.clientX, e.clientY, e)}
                              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-6 h-3 flex items-center justify-center cursor-ns-resize z-10"
                            >
                              <div className="w-3 h-1 bg-emerald-300 rounded-full" />
                            </div>
                            {/* West handle */}
                            <div
                              onMouseDown={(e) => handleHandlePointerDown(box, 'w', e.clientX, e.clientY, e)}
                              className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-6 flex items-center justify-center cursor-ew-resize z-10"
                            >
                              <div className="w-1 h-3 bg-emerald-300 rounded-full" />
                            </div>
                            {/* East handle */}
                            <div
                              onMouseDown={(e) => handleHandlePointerDown(box, 'e', e.clientX, e.clientY, e)}
                              className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-6 flex items-center justify-center cursor-ew-resize z-10"
                            >
                              <div className="w-1 h-3 bg-emerald-300 rounded-full" />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
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
                    <span>Re-Draw / Adjust Boxes ({boxes.length})</span>
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

              {/* Right Column: Multi-Box Extracted Line Items & Financial Data */}
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
                        {boxes.length} Bounding Box{boxes.length > 1 ? 'es' : ''} Configured
                      </h3>
                      <p className="text-xs text-neutral-400 max-w-md mx-auto">
                        OCR will scan specifically inside your drawn boxes to isolate each item name and its corresponding price.
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
                          <span>Scan Line Items ({boxes.length})</span>
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
                            {boxes.length} Line Item{boxes.length > 1 ? 's' : ''} Extracted
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-emerald-900/60 text-emerald-300 border border-emerald-700 uppercase">
                        {parsedResult.type === 'income' ? 'Inflow (Income)' : 'Outflow (Expense)'}
                      </span>
                    </div>

                    {/* Extracted Line Items Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
                        <span className="font-semibold text-neutral-300 uppercase tracking-wider text-[10px]">
                          Extracted Line Items (Click to edit)
                        </span>
                        <span>Price ({currencySymbol})</span>
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {boxes.map((box, idx) => (
                          <div
                            key={box.id}
                            className="p-2.5 bg-neutral-950 rounded-lg border border-neutral-800 hover:border-neutral-700 flex items-center gap-2 transition"
                          >
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 shrink-0">
                              #{idx + 1}
                            </span>

                            <input
                              type="text"
                              value={box.extractedName || ''}
                              placeholder="Item Name"
                              onChange={(e) => handleUpdateBoxItem(box.id, 'name', e.target.value)}
                              className="flex-1 bg-neutral-900 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:outline-emerald-500"
                            />

                            <div className="relative w-28 shrink-0">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-400 text-xs font-mono">
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                step="any"
                                value={box.extractedPrice ?? ''}
                                placeholder="0.00"
                                onChange={(e) => handleUpdateBoxItem(box.id, 'price', e.target.value)}
                                className="w-full pl-6 pr-2 py-1 bg-neutral-900 border border-neutral-700 rounded text-xs font-mono font-bold text-emerald-400 text-right focus:outline-emerald-500"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleApplySingleItem(box)}
                              className="px-2 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 hover:text-white rounded text-[11px] font-semibold transition shrink-0 cursor-pointer"
                              title="Log specifically this line item"
                            >
                              Use Item
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Summary Metadata Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-neutral-800">
                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Vendor / Store</span>
                        <span className="font-bold text-white text-xs truncate block mt-0.5">
                          {parsedResult.name || 'Store Vendor'}
                        </span>
                      </div>

                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Combined Total</span>
                        <span className="font-mono font-bold text-emerald-400 text-sm block mt-0.5">
                          {currencySymbol}{' '}
                          {boxes.reduce((s, b) => s + (b.extractedPrice || 0), 0).toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>

                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Document Date</span>
                        <span className="font-mono text-neutral-200 text-xs block mt-0.5">
                          {parsedResult.date || 'Today'}
                        </span>
                      </div>

                      <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
                        <span className="text-[9px] text-neutral-400 uppercase font-semibold block">Suggested Category</span>
                        <span className="font-semibold text-neutral-200 text-xs block mt-0.5 truncate">
                          {parsedResult.suggestedCategory || 'Food'}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApplyAllItems}
                        className="w-full sm:flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition cursor-pointer text-xs sm:text-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Auto-Fill All Items ({currencySymbol}{' '}
                          {boxes.reduce((s, b) => s + (b.extractedPrice || 0), 0).toLocaleString(undefined, {
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
                        Adjust Boxes
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
