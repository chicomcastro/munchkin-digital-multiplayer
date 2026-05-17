import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { setLocale } from '../i18n';

// jsdom doesn't implement vibrate
if (!('vibrate' in navigator)) {
  Object.defineProperty(navigator, 'vibrate', { value: () => true, writable: true });
}

// jsdom doesn't implement scrollIntoView either
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function () {};
}

// Force pt-BR before each test so component string assertions are stable.
beforeEach(() => {
  setLocale('pt-BR');
});

afterEach(() => {
  cleanup();
});
