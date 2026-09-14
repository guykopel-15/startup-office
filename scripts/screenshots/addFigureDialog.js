// Runs inside the renderer before a screenshot: opens the Add figure dialog and fills it in.
// Usage: STARTUP_OFFICE_SCREENSHOT=out.png STARTUP_OFFICE_SCRIPT=scripts/screenshots/addFigureDialog.js npx electron out/main/index.js
(async () => {
  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const setReactValue = (element, value) => {
    const prototype = Object.getPrototypeOf(element);
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value').set;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  };
  document.querySelector('[aria-label="Add figure"]').click();
  await wait(200);
  setReactValue(document.getElementById('figure-name'), 'Ella');
  setReactValue(document.getElementById('figure-job'), 'Mobile dev');
  setReactValue(document.getElementById('figure-room'), 'sales');
  setReactValue(document.getElementById('figure-hair'), 'long');
  setReactValue(document.getElementById('figure-accessory'), 'headphones');
  setReactValue(document.getElementById('figure-topColor'), '#ff6f91');
  setReactValue(document.getElementById('figure-accessoryColor'), '#ffd866');
})();
