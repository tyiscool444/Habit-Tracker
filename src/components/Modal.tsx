'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}

/**
 * Full-screen backdrop that closes on outside click or Escape. Portalled to <body>
 * so it always stacks above the page, even when opened from inside a sticky panel.
 */
export function Modal({ isOpen, onClose, maxWidth = 'max-w-md', children }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
    >
      <div onClick={(e) => e.stopPropagation()} className={`cursor-default w-full ${maxWidth}`}>
        {children}
      </div>
    </div>,
    document.body
  );
}
