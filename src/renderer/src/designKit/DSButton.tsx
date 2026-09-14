import type React from 'react';

export enum DSButtonVariant {
  Default = 'default',
  Primary = 'primary',
}

interface DSButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  isDisabled?: boolean;
  variant?: DSButtonVariant;
  title?: string;
}

export function DSButton({
  children,
  onClick,
  isDisabled = false,
  variant = DSButtonVariant.Default,
  title,
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
    >
      {children}
    </button>
  );
}
