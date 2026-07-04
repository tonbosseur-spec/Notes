import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, RotateCw, Check, X, Move, ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCropperModalProps {
  imageSrc: string;
  onCrop: (croppedImageBase64: string) => void;
  onClose: () => void;
}

export default function ImageCropperModal({ imageSrc, onCrop, onClose }: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Auto-reset when imageSrc changes
  useEffect(() => {
    setZoom(1);
    setRotation(0);
    setPosX(0);
    setPosY(0);
  }, [imageSrc]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStart.current = { x: e.clientX - posX, y: e.clientY - posY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosX(e.clientX - dragStart.current.x);
    setPosY(e.clientY - dragStart.current.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStart.current = { 
        x: e.touches[0].clientX - posX, 
        y: e.touches[0].clientY - posY 
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPosX(e.touches[0].clientX - dragStart.current.x);
    setPosY(e.touches[0].clientY - dragStart.current.y);
  };

  const handleSave = () => {
    const img = imageRef.current;
    if (!img) return;

    // Create off-screen canvas to perform high quality crop
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 256, 256);

    // Set origin to center of canvas for rotation and scale
    ctx.translate(128, 128);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);

    // Compute size matching 128 width/height offset
    // The visual crop circle has a radius of 80px in a 220px box (approx 72%)
    // Let's calibrate so the crop captures exactly what is inside the visual circle
    const visualCircleRadius = 80;
    const containerHalfSize = 110;
    
    // Scale factor between visual preview and canvas
    const cropScale = 128 / visualCircleRadius;

    // Position of image relative to crop center
    const drawX = (posX - (containerHalfSize - visualCircleRadius)) * cropScale;
    const drawY = (posY - (containerHalfSize - visualCircleRadius)) * cropScale;

    // We want the natural size of the image scaled down to fit the preview crop circle
    // Let's calculate proper default width/height
    const minDim = Math.min(img.naturalWidth, img.naturalHeight) || 200;
    const renderWidth = (img.naturalWidth / minDim) * 200;
    const renderHeight = (img.naturalHeight / minDim) * 200;

    // Offset coordinates to align image center
    ctx.drawImage(
      img,
      -renderWidth / 2 + posX * cropScale,
      -renderHeight / 2 + posY * cropScale,
      renderWidth,
      renderHeight
    );

    try {
      const croppedBase64 = canvas.toDataURL('image/jpeg', 0.9);
      onCrop(croppedBase64);
    } catch (err) {
      console.error("Canvas export failed:", err);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl max-w-md w-full p-6 shadow-2xl flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-50">Modifier votre photo</h2>
          <button 
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-xs text-stone-500 dark:text-stone-400 text-center">
          Faites glisser l'image pour la centrer, et utilisez les curseurs ci-dessous pour l'ajuster.
        </p>

        {/* Visual Cropper Area */}
        <div className="flex justify-center py-2">
          <div 
            ref={containerRef}
            className="w-[220px] h-[220px] rounded-2xl bg-stone-100 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 relative overflow-hidden cursor-move select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            {/* The Image */}
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Source"
              draggable={false}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) translate(${posX}px, ${posY}px) rotate(${rotation}deg) scale(${zoom})`,
                maxWidth: 'none',
                width: '180px',
                height: 'auto',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              }}
            />

            {/* Dark Mask for cropped region */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div 
                className="w-[160px] h-[160px] rounded-full border-2 border-indigo-500 shadow-[0_0_0_999px_rgba(0,0,0,0.5)]" 
                style={{ content: '""' }}
              />
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="space-y-4">
          {/* Zoom */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
              <span className="flex items-center gap-1"><ZoomIn className="w-3.5 h-3.5" /> Zoom ({zoom.toFixed(1)}x)</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="3"
              step="0.1"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none h-1.5 cursor-pointer"
            />
          </div>

          {/* Rotation */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-semibold text-stone-600 dark:text-stone-400">
              <span className="flex items-center gap-1"><RotateCw className="w-3.5 h-3.5" /> Rotation ({rotation}°)</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={rotation}
              onChange={(e) => setRotation(parseInt(e.target.value))}
              className="w-full accent-indigo-500 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none h-1.5 cursor-pointer"
            />
          </div>

          {/* X/Y Offset fine tune */}
          <div className="grid grid-cols-2 gap-4 pt-1">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-400">Décalage X</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={posX}
                onChange={(e) => setPosX(parseInt(e.target.value))}
                className="w-full accent-stone-500 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none h-1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-400">Décalage Y</label>
              <input
                type="range"
                min="-100"
                max="100"
                value={posY}
                onChange={(e) => setPosY(parseInt(e.target.value))}
                className="w-full accent-stone-500 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none h-1"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-700 dark:text-stone-300 font-semibold rounded-xl transition-all text-xs"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all text-xs flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Valider
          </button>
        </div>
      </div>
    </div>
  );
}
