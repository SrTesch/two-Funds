import '@testing-library/jest-dom';

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
}
if (typeof global !== 'undefined') {
  Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });
}
