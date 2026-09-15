import type React from 'react';

export enum DSButtonVariant {
  Default = 'default',
  Primary = 'primary',
}

interface DSButtonProps {
  /** Text label; hidden on narrow windows when `icon` is given. */
  children: string;
  /** Short glyph shown instead of the label on narrow windows. */
  icon?: string;
  onClick?: () => void;
  isDisabled?: boolean;
  variant?: DSButtonVariant;
  title?: string;
  /** For buttons that toggle a section: sets aria-expanded. */
  isExpanded?: boolean;
  shouldAutoFocus?: boolean;
}

export function DSButton({
  children,
  onClick,
  isDisabled = false,
  variant = DSButtonVariant.Default,
  title,
  icon,
  isExpanded,
  shouldAutoFocus = false,
}: DSButtonProps): React.JSX.Element {
  const handleClick = (): void => {
    if (isDisabled) return;
    onClick?.();
  };

  return (
    <button
      type="button"
      className={`ds-button ds-button--${variant}`}
      onClick={handleClick}
      disabled={isDisabled}
      title={title}
      aria-label={children}
      aria-expanded={isExpanded}
      autoFocus={shouldAutoFocus}
    >
      {icon !== undefined && (
        <span className="ds-button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className={icon === undefined ? undefined : 'ds-button__label'}>{children}</span>
    </button>
  );
}
