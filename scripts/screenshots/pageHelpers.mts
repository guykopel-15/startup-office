/** Plain browser JS shared by every page script: a sleep and a React-aware input setter. */
export const PAGE_HELPERS = `const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  // React controlled inputs only notice a value set through the native setter followed by input and change events.
  const setReactValue = (element, value) => {
    Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value').set.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };`;

/** Wraps page-script statements in an async IIFE that resolves to the error message instead of throwing. */
export function pageScript(body: string): string {
  return `(async () => {
  try {
  ${PAGE_HELPERS}
  ${body}
  } catch (error) {
    return 'page script failed: ' + (error && error.message ? error.message : String(error));
  }
})();
`;
}
