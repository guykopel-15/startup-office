import type React from 'react';

export const ENTER_KEY = 'Enter';
export const ESCAPE_KEY = 'Escape';

/** A key handler that submits on Enter, but not while an IME is still composing the text. */
export function submitOnEnter(submit: () => void): (event: React.KeyboardEvent<HTMLElement>) => void {
  return (event: React.KeyboardEvent<HTMLElement>): void => {
    if (event.key === ENTER_KEY && !event.nativeEvent.isComposing) submit();
  };
}
