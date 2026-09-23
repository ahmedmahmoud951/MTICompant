'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';

interface AppModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Sticky bottom area (loading bar + actions) — stays visible while body scrolls */
  footer?: React.ReactNode;
  /** max width, e.g. 32rem / 40rem */
  width?: string;
  icon?: React.ReactNode;
  closeDisabled?: boolean;
}

/** Full-viewport modal portaled to document.body (avoids page overflow clipping). */
export function AppModal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 'min(100%, 40rem)',
  icon,
  closeDisabled,
}: AppModalProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !ready) return null;

  return createPortal(
    <div
      className="app-modal-overlay"
      onClick={() => {
        if (!closeDisabled) onClose();
      }}
    >
      <div
        className="app-modal-panel app-modal-panel--flex"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="app-modal-header">
          <div className="flex items-center gap-2.5 text-start min-w-0">
            {icon}
            <h3 className="text-base sm:text-lg font-bold text-white truncate">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800/80 disabled:opacity-40 flex-shrink-0"
            aria-label="Close"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
        <div className="app-modal-body">{children}</div>
        {footer ? <div className="app-modal-footer">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
