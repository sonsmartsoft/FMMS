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
  const [isMoved, setIsMoved] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal closes/opens
  useEffect(() => {
    if (!isOpen) {
      setIsMoved(false);
      setPosition({ x: 0, y: 0 });
    }
  }, [isOpen]);

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
    
    let startX = position.x;
    let startY = position.y;
    
    if (!isMoved && modalRef.current) {
      const rect = modalRef.current.getBoundingClientRect();
      startX = rect.left;
      startY = rect.top;
      setPosition({ x: startX, y: startY });
      setIsMoved(true);
    }
    
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - startX,
      y: e.clientY - startY,
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
        left: isMoved ? `${position.x}px` : '50%',
        top: isMoved ? `${position.y}px` : '50%',
        transform: isMoved ? 'none' : 'translate(-50%, -50%)',
        touchAction: 'none',
        cursor: isDragging ? 'grabbing' : 'auto',
      }}
    >
      <div style={{ cursor: 'auto' }} className="w-full h-full flex flex-col justify-center items-center">
        {children}
      </div>
    </div>
  );
}
