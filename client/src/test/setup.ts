import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom doesn't implement vibrate
if (!('vibrate' in navigator)) {
  Object.defineProperty(navigator, 'vibrate', { value: () => true, writable: true });
}

// jsdom doesn't implement scrollIntoView either
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

afterEach(() => {
  cleanup();
});
