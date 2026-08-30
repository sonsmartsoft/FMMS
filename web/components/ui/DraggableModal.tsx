'use client';
import React, { useState, useEffect, useRef } from 'react';

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
  onClose,
  title,
}: {
  isOpen: boolean;
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  title?: string;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [isMoved, setIsMoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [resizeDir, setResizeDir] = useState<ResizeDir>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const preMaxSize = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const dragStart = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0, left: 0, top: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setIsMoved(false);
      setPosition({ x: 0, y: 0 });
      setSize({ w: 0, h: 0 });
      setIsMinimized(false);
      setIsMaximized(false);
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

  // Snapshot current rect to pixel coords
  const snapshotRect = () => {
    if (!isMoved && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      setPosition({ x: rect.left, y: rect.top });
      setSize({ w: rect.width, h: rect.height });
      setIsMoved(true);
      return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
    }
    return { x: position.x, y: position.y, w: size.w, h: size.h };
  };

  const handleMaximize = () => {
    if (isMinimized) setIsMinimized(false);
    if (isMaximized) {
      // restore
      setPosition({ x: preMaxSize.current.x, y: preMaxSize.current.y });
      setSize({ w: preMaxSize.current.w, h: preMaxSize.current.h });
      setIsMaximized(false);
    } else {
      const cur = snapshotRect();
      preMaxSize.current = cur;
      setIsMoved(true);
      setPosition({ x: 0, y: 0 });
      setSize({ w: window.innerWidth, h: window.innerHeight });
      setIsMaximized(true);
    }
  };

  const handleMinimize = () => {
    if (isMaximized) {
      setIsMaximized(false);
      setPosition({ x: preMaxSize.current.x, y: preMaxSize.current.y });
      setSize({ w: preMaxSize.current.w, h: preMaxSize.current.h });
    }
    setIsMinimized(prev => !prev);
  };

  // --- Drag to move ---
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeDir) return;
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
      startX = rect.left; startY = rect.top;
      setPosition({ x: startX, y: startY });
      setSize({ w: rect.width, h: rect.height });
      setIsMoved(true);
    }

    setIsDragging(true);
    dragStart.current = { x: e.clientX - startX, y: e.clientY - startY };
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (resizeDir) { handleResizeMove(e); return; }
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) { setIsDragging(false); (e.target as HTMLElement).releasePointerCapture(e.pointerId); }
    if (resizeDir) { setResizeDir(null); (e.target as HTMLElement).releasePointerCapture(e.pointerId); }
  };

  // --- Resize ---
  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>, dir: ResizeDir) => {
    e.stopPropagation(); e.preventDefault();
    let sx = position.x, sy = position.y, sw = size.w, sh = size.h;
    if (!isMoved && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      sx = rect.left; sy = rect.top; sw = rect.width; sh = rect.height;
      setPosition({ x: sx, y: sy }); setSize({ w: sw, h: sh }); setIsMoved(true);
    }
    setResizeDir(dir);
    resizeStart.current = { x: e.clientX, y: e.clientY, w: sw, h: sh, left: sx, top: sy };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleResizeMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!resizeDir) return;
    const dx = e.clientX - resizeStart.current.x;
    const dy = e.clientY - resizeStart.current.y;
    const { w, h, left, top } = resizeStart.current;
    const MIN_W = 320, MIN_H = 120;
    let newW = w, newH = h, newX = left, newY = top;
    if (resizeDir.includes('e')) newW = Math.max(MIN_W, w + dx);
    if (resizeDir.includes('s')) newH = Math.max(MIN_H, h + dy);
    if (resizeDir.includes('w')) { newW = Math.max(MIN_W, w - dx); if (newW > MIN_W) newX = left + dx; }
    if (resizeDir.includes('n')) { newH = Math.max(MIN_H, h - dy); if (newH > MIN_H) newY = top + dy; }
    setSize({ w: newW, h: newH }); setPosition({ x: newX, y: newY });
  };

  const ResizeHandle = ({ dir, style }: { dir: ResizeDir; style: React.CSSProperties }) => (
    <div
      className="resize-handle absolute z-10"
      style={{ cursor: CURSOR_MAP[dir!], touchAction: 'none', ...style }}
      onPointerDown={e => handleResizePointerDown(e, dir)}
    />
  );

  const currentCursor = resizeDir ? CURSOR_MAP[resizeDir] : isDragging ? 'grabbing' : 'auto';
  const showSize = isMoved && size.w > 0;

  return (
    <div
      ref={modalRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`fixed z-[9999] shadow-2xl overflow-hidden ${className}`}
      style={{
        left: isMoved ? `${position.x}px` : '50%',
        top: isMoved ? `${position.y}px` : '140px',
        transform: isMoved ? 'none' : 'translateX(-50%)',
        width: showSize ? `${size.w}px` : undefined,
        height: isMinimized ? '40px' : (showSize ? `${size.h}px` : undefined),
        touchAction: 'none',
        cursor: currentCursor,
        borderRadius: isMaximized ? 0 : '16px',
        transition: isMinimized ? 'height 0.18s ease' : undefined,
      }}
    >
      {/* Content */}
      <div style={{ width: '100%', height: '100%', overflow: 'auto' }} className="flex flex-col">
        {children}
      </div>

      {/* Resize handles */}
      {!isMaximized && !isMinimized && (
        <>
          <ResizeHandle dir="n"  style={{ top: 0, left: 8, right: 8, height: 5 }} />
          <ResizeHandle dir="s"  style={{ bottom: 0, left: 8, right: 8, height: 5 }} />
          <ResizeHandle dir="e"  style={{ right: 0, top: 8, bottom: 8, width: 5 }} />
          <ResizeHandle dir="w"  style={{ left: 0, top: 8, bottom: 8, width: 5 }} />
          <ResizeHandle dir="nw" style={{ top: 0, left: 0, width: 12, height: 12 }} />
          <ResizeHandle dir="ne" style={{ top: 0, right: 0, width: 12, height: 12 }} />
          <ResizeHandle dir="sw" style={{ bottom: 0, left: 0, width: 12, height: 12 }} />
          <ResizeHandle dir="se" style={{ bottom: 0, right: 0, width: 12, height: 12 }} />
          {/* Resize grip icon bottom-right */}
          {isMoved && (
            <div className="absolute bottom-1.5 right-1.5 pointer-events-none opacity-30">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M9 1L1 9M9 5L5 9M9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          )}
        </>
      )}
    </div>
  );
}
