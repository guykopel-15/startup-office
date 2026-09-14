import React, { useEffect, useRef } from 'react';

import { DSButton } from './DSButton';

interface DSModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Buttons rendered in the footer, right-aligned. */
  footer?: React.ReactNode;
}

const ESCAPE_KEY = 'Escape';
const CLOSE_LABEL = 'Close';
const CLOSE_ICON = '×';

/** Centered dialog over a dimmed backdrop. Esc or the backdrop closes it. */
export function DSModal({ title, isOpen, onClose, children, footer }: DSModalProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect((): (() => void) | undefined => {
    if (!isOpen) return undefined;
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === ESCAPE_KEY) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();
    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="ds-modal__backdrop" onClick={handleBackdropClick} role="presentation">
      <div className="ds-modal" role="dialog" aria-modal="true" aria-labelledby="ds-modal-title" ref={panelRef} tabIndex={-1}>
        <header className="ds-modal__header">
          <h2 className="ds-modal__title" id="ds-modal-title">
            {title}
          </h2>
          <DSButton onClick={onClose} icon={CLOSE_ICON} title={CLOSE_LABEL}>
            {CLOSE_LABEL}
          </DSButton>
        </header>
        <div className="ds-modal__body">{children}</div>
        {footer !== undefined && <footer className="ds-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
