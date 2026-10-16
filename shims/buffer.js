import { Buffer as BufferPolyfill } from 'buffer';

// Hermes returns a plain Uint8Array from buffer@6's inherited subarray().
// Restore Buffer methods for SDK readers and commitment validation while
// preserving the shared memory and bounds of the original view.
if (!BufferPolyfill.isBuffer(BufferPolyfill.alloc(0).subarray(0))) {
  BufferPolyfill.prototype.subarray = function (start, end) {
    const view = Uint8Array.prototype.subarray.call(this, start, end);
    Object.setPrototypeOf(view, BufferPolyfill.prototype);
    return view;
  };
}

// Make Buffer available globally
global.Buffer = BufferPolyfill;

// (Optional) expose on globalThis for libs that reference globalThis.Buffer
if (typeof globalThis.Buffer === 'undefined') {
  globalThis.Buffer = BufferPolyfill;
}
