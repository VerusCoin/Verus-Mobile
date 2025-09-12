import { Buffer as BufferPolyfill } from 'buffer';

// Make Buffer available globally
global.Buffer = BufferPolyfill;

// (Optional) expose on globalThis for libs that reference globalThis.Buffer
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = BufferPolyfill;
}