'use client';
import React, { useState, useEffect, useRef } from 'react';

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
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && modalRef.current && position.x === 0 && position.y === 0) {
      const rect = modalRef.current.getBoundingClientRect();
      const w = window.innerWidth;
      const h = window.innerHeight;
      setPosition({
        x: Math.max(0, (w - rect.width) / 2),
        y: Math.max(0, (h - rect.height) / 2),
      });
    }
  }, [isOpen, position.x, position.y]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName.match(/INPUT|TEXTAREA|BUTTON|SELECT|A/i) || target.closest('button') || target.closest('a') || target.closest('.no-drag')) {
      return;
    }
    
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
    target.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.current.x;
    const newY = e.clientY - dragStart.current.y;
    setPosition({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    }
  };

  return (
    <div
      ref={modalRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      className={`fixed z-[9999] shadow-2xl ${className}`}
      style={{
        left: position.x ? `${position.x}px` : '50%',
        top: position.y ? `${position.y}px` : '50%',
        transform: position.x ? 'none' : 'translate(-50%, -50%)',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'auto',
      }}
    >
      <div style={{ cursor: 'auto' }} className="w-full h-full">
        {children}
      </div>
    </div>
  );
}
