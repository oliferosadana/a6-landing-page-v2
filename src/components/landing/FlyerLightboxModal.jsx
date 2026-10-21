import React, { useState, useEffect, useRef, useCallback } from 'react';

export default function FlyerLightboxModal({ item, onClose }) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const canvasRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const touchStartRef = useRef({ distance: 0, startScale: 1, startX: 0, startY: 0, posX: 0, posY: 0 });

  // 1. Lock document body scroll while modal is active so background page NEVER moves
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, []);

  // 2. Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Zoom handlers for image only
  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(4, Number((prev + 0.35).toFixed(2))));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(1, Number((prev - 0.35).toFixed(2)));
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const resetZoom = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 3. Mouse Wheel Zoom (Zooms ONLY the image, prevents browser page zoom)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e) => {
      e.preventDefault(); // Stop entire page from zooming or scrolling
      const delta = e.deltaY < 0 ? 0.25 : -0.25;
      setScale((prevScale) => {
        const nextScale = Math.min(4, Math.max(1, Number((prevScale + delta).toFixed(2))));
        if (nextScale === 1) setPosition({ x: 0, y: 0 });
        return nextScale;
      });
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, []);

  // 4. Touch Gestures: Pinch to zoom image ONLY & Pan when zoomed
  const getTouchDistance = (touches) => {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        touchStartRef.current.distance = getTouchDistance(e.touches);
        touchStartRef.current.startScale = scale;
      } else if (e.touches.length === 1 && scale > 1) {
        touchStartRef.current.startX = e.touches[0].clientX;
        touchStartRef.current.startY = e.touches[0].clientY;
        touchStartRef.current.posX = position.x;
        touchStartRef.current.posY = position.y;
      }
    };

    const handleTouchMove = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Stop browser viewport from zooming!
        const currentDist = getTouchDistance(e.touches);
        const ratio = currentDist / (touchStartRef.current.distance || 1);
        const newScale = Math.min(4, Math.max(1, Number((touchStartRef.current.startScale * ratio).toFixed(2))));
        setScale(newScale);
        if (newScale === 1) setPosition({ x: 0, y: 0 });
      } else if (e.touches.length === 1 && scale > 1) {
        e.preventDefault();
        const dx = e.touches[0].clientX - touchStartRef.current.startX;
        const dy = e.touches[0].clientY - touchStartRef.current.startY;
        setPosition({
          x: touchStartRef.current.posX + dx,
          y: touchStartRef.current.posY + dy,
        });
      }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [scale, position]);

  // 5. Mouse Drag Panning when zoomed in
  const handleMouseDown = (e) => {
    if (scale <= 1 || e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handleMouseMove = (e) => {
    if (!isDragging || scale <= 1) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPosition({
      x: dragStartRef.current.posX + dx,
      y: dragStartRef.current.posY + dy,
    });
  };

  const handleMouseUp = () => {
    if (isDragging) setIsDragging(false);
  };

  // 6. Double click to toggle zoom (1x <-> 2.2x)
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (scale > 1) {
      resetZoom();
    } else {
      setScale(2.2);
    }
  };

  if (!item) return null;

  return (
    <div
      id="flyer-lightbox-modal"
      className="flyer-lightbox-modal active"
      onClick={onClose}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      role="dialog"
      aria-modal="true"
      aria-label="Tampilan Gambar Penuh"
    >
      {/* Floating Minimalist Top Action Bar */}
      <div className="lightbox-floating-header" onClick={(e) => e.stopPropagation()}>
        {/* Compact Zoom Controls */}
        <div className="lightbox-zoom-toolbar">
          <button
            type="button"
            className="zoom-btn"
            onClick={zoomOut}
            title="Perkecil (&minus;)"
            aria-label="Perkecil"
          >
            <i className="fa-solid fa-minus"></i>
          </button>
          <button
            type="button"
            className="zoom-btn zoom-level-btn"
            onClick={resetZoom}
            title="Reset Ukuran (100%)"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            className="zoom-btn"
            onClick={zoomIn}
            title="Perbesar (+)"
            aria-label="Perbesar"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        {/* Clean Floating Close Button */}
        <button
          type="button"
          className="lightbox-clean-close-btn"
          onClick={onClose}
          title="Tutup (Esc)"
          aria-label="Tutup"
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Main Clean Image Canvas - Only the image transforms, background never shifts */}
      <div
        ref={canvasRef}
        className="lightbox-clean-canvas"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
      >
        <img
          id="lightbox-img"
          src={item.image}
          alt={item.title || item.name || 'Amanda Brownies'}
          draggable="false"
          onDoubleClick={handleDoubleClick}
          title={scale > 1 ? 'Klik ganda untuk reset ukuran | Drag untuk geser' : 'Klik ganda untuk perbesar'}
          style={{
            transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            transformOrigin: 'center center',
            transition: isDragging ? 'none' : 'transform 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in',
            willChange: 'transform'
          }}
        />
      </div>
    </div>
  );
}
