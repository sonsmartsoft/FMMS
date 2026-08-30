'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';

type ResizeDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw' | null;

const CURSOR_MAP: Record<string, string> = {
  n: 'ns-resize', s: 'ns-resize',
  e: 'ew-resize', w: 'ew-resize',
  ne: 'nesw-resize', sw: 'nesw-resize',
  nw: 'nwse-resize', se: 'nwse-resize',
};

export default function DraggableModal({
  isOpen,
  children,
  className = '',
  onClose
}: {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [isMoved, setIsMoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<ResizeDir>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, left: 0, top: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setIsMoved(false);
      setPosition({ x: 0, y: 0 });
      setSize({ w: 0, h: 0 });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // --- Drag to move ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeDir) return; // if resizing, don't drag
    const target = e.target as HTMLElement;
    if (
      target.tagName.match(/INPUT|TEXTAREA|BUTTON|SELECT|A/i) ||
      target.closest('button') || target.closest('a') ||
      target.closest('.no-drag') || target.closest('.resize-handle')
    ) return;

    let startX = position.x;
    let startY = position.y;

    if (!isMoved && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      startX = rect.left;
      startY = rect.top;
      setPosition({ x: startX, y: startY });
      setSize({ w: rect.width, h: rect.height });
      setIsMoved(true);
    }

    setIsDragging(true);
    dragStart.current = { x: e.clientX - startX, y: e.clientY - startY };
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeDir) {
      handleResizeMove(e);
      return;
    }
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
    if (resizeDir) {
      setResizeDir(null);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  // --- Resize handles ---
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>, dir: ResizeDir) => {
    e.stopPropagation();
    e.preventDefault();

    let startX = position.x;
    let startY = position.y;
    let startW = size.w;
    let startH = size.h;

    if (!isMoved && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      startX = rect.left; startY = rect.top;
      startW = rect.width; startH = rect.height;
      setPosition({ x: startX, y: startY });
      setSize({ w: startW, h: startH });
      setIsMoved(true);
    }

    setResizeDir(dir);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: startW, h: startH, left: startX, top: startY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeDir) return;
    const dx = e.clientX - resizeStart.current.x;
    const dy = e.clientY - resizeStart.current.y;
    const { w, h, left, top } = resizeStart.current;
    const MIN_W = 320, MIN_H = 200;

    let newW = w, newH = h, newX = left, newY = top;

    if (resizeDir.includes('e')) newW = Math.max(MIN_W, w + dx);
    if (resizeDir.includes('s')) newH = Math.max(MIN_H, h + dy);
    if (resizeDir.includes('w')) { newW = Math.max(MIN_W, w - dx); if (newW > MIN_W) newX = left + dx; }
    if (resizeDir.includes('n')) { newH = Math.max(MIN_H, h - dy); if (newH > MIN_H) newY = top + dy; }

    setSize({ w: newW, h: newH });
    setPosition({ x: newX, y: newY });
  };

  const ResizeHandle = ({ dir, style }: { dir: ResizeDir; style: React.CSSProperties }) => (
    <div
      className="resize-handle absolute z-10"
      style={{ cursor: CURSOR_MAP[dir!] || 'default', touchAction: 'none', ...style }}
      onPointerDown={e => handleResizePointerDown(e, dir)}
    />
  );

  const currentCursor = resizeDir ? CURSOR_MAP[resizeDir] : isDragging ? 'grabbing' : 'auto';

  return (
    <div
      ref={modalRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`fixed z-[9999] shadow-2xl ${className}`}
      style={{
        left: isMoved ? `${position.x}px` : '50%',
        top: isMoved ? `${position.y}px` : '140px',
        transform: isMoved ? 'none' : 'translateX(-50%)',
        width: isMoved && size.w > 0 ? `${size.w}px` : undefined,
        height: isMoved && size.h > 0 ? `${size.h}px` : undefined,
        touchAction: 'none',
        cursor: currentCursor,
        boxSizing: 'border-box',
      }}
    >
      {/* Resize handles — edges */}
      <ResizeHandle dir="n"  style={{ top: 0, left: 8, right: 8, height: 6 }} />
      <ResizeHandle dir="s"  style={{ bottom: 0, left: 8, right: 8, height: 6 }} />
      <ResizeHandle dir="e"  style={{ right: 0, top: 8, bottom: 8, width: 6 }} />
      <ResizeHandle dir="w"  style={{ left: 0, top: 8, bottom: 8, width: 6 }} />
      {/* Resize handles — corners */}
      <ResizeHandle dir="nw" style={{ top: 0, left: 0, width: 14, height: 14 }} />
      <ResizeHandle dir="ne" style={{ top: 0, right: 0, width: 14, height: 14 }} />
      <ResizeHandle dir="sw" style={{ bottom: 0, left: 0, width: 14, height: 14 }} />
      <ResizeHandle dir="se" style={{ bottom: 0, right: 0, width: 14, height: 14 }} />

      {/* Corner visual indicator — bottom-right only */}
      {isMoved && (
        <div
          className="absolute bottom-1 right-1 pointer-events-none"
          style={{ opacity: 0.35 }}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M11 1L1 11M11 5L5 11M11 9L9 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      )}

      <div style={{ cursor: 'auto', width: '100%', height: '100%' }} className="flex flex-col">
        {children}
      </div>
    </div>
  );
}
