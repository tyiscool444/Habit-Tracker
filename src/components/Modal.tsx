'use client';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  maxWidth?: string;
  children: React.ReactNode;
}

/** Full-screen backdrop that closes on outside click. */
export function Modal({ isOpen, onClose, maxWidth = 'max-w-md', children }: Props) {
  if (!isOpen) return null;
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer animate-in fade-in duration-200"
    >
      <div onClick={(e) => e.stopPropagation()} className={`cursor-default w-full ${maxWidth}`}>
        {children}
      </div>
    </div>
  );
}
