import React, { useEffect, useId, useRef } from 'react';

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
const TAB_KEY = 'Tab';
const CLOSE_LABEL = 'Close';
const CLOSE_ICON = '×';
const FOCUSABLE_SELECTOR = 'input, select, textarea, button, [tabindex]:not([tabindex="-1"])';

function focusableChildren(panel: HTMLElement): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element: HTMLElement): boolean => !element.hasAttribute('disabled'));
}

/** Keeps Tab inside the panel. */
function cycleFocus(panel: HTMLElement, event: KeyboardEvent): void {
  const children = focusableChildren(panel);
  const first = children[0];
  const last = children[children.length - 1];
  if (first === undefined || last === undefined) return;
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
    return;
  }
  if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

/** Centered dialog over a dimmed backdrop. Esc or a click that starts and ends on the backdrop closes it. */
export function DSModal({ title, isOpen, onClose, children, footer }: DSModalProps): React.JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const isPressOnBackdropRef = useRef(false);
  const titleId = useId();
  onCloseRef.current = onClose;

  useEffect((): (() => void) | undefined => {
    if (!isOpen) return undefined;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const firstField = panel === null ? undefined : focusableChildren(panel).find((element: HTMLElement): boolean => element.tagName !== 'BUTTON');
    (firstField ?? panel)?.focus();
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === ESCAPE_KEY) onCloseRef.current();
      if (event.key === TAB_KEY && panel !== null) cycleFocus(panel, event);
    };
    window.addEventListener('keydown', handleKeyDown);
    return (): void => {
      window.removeEventListener('keydown', handleKeyDown);
      opener?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>): void => {
    isPressOnBackdropRef.current = event.target === event.currentTarget;
  };

  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>): void => {
    if (isPressOnBackdropRef.current && event.target === event.currentTarget) onClose();
    isPressOnBackdropRef.current = false;
  };

  return (
    <div className="ds-modal__backdrop" onMouseDown={handleBackdropMouseDown} onClick={handleBackdropClick} role="presentation">
      <div className="ds-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={panelRef} tabIndex={-1}>
        <header className="ds-modal__header">
          <h2 className="ds-modal__title" id={titleId}>
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
