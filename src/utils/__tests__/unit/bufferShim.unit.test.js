// Use Mobile's buffer package instead of Node's native Buffer. Hermes returns
// plain Uint8Arrays from the package's inherited subarray implementation.
jest.mock('buffer', () => jest.requireActual('buffer/'));
jest.mock('create-hash', () => jest.requireActual('create-hash/browser'));

const {Buffer: MobileBuffer} = require('buffer');
const originalBuffer = global.Buffer;
const originalSpecies = Object.getOwnPropertyDescriptor(MobileBuffer, Symbol.species);
const originalSubarray = Object.getOwnPropertyDescriptor(MobileBuffer.prototype, 'subarray');
let primitives;

beforeAll(() => {
  // Reproduce Hermes's missing Buffer prototype in the Node test runtime.
  Object.defineProperty(MobileBuffer, Symbol.species, {configurable: true, value: Uint8Array});
  expect(MobileBuffer.isBuffer(MobileBuffer.alloc(1).subarray(0))).toBe(false);
  require('../../../../shims/buffer');
  primitives = require('verus-typescript-primitives');
});

afterAll(() => {
  global.Buffer = originalBuffer;
  if (originalSpecies) Object.defineProperty(MobileBuffer, Symbol.species, originalSpecies);
  else delete MobileBuffer[Symbol.species];
  if (originalSubarray) Object.defineProperty(MobileBuffer.prototype, 'subarray', originalSubarray);
  else delete MobileBuffer.prototype.subarray;
});

test.each([
  [undefined, undefined], [1, 3], [-3, -1], [-99, 99], [3, 1], [99, 100],
])('Buffer subarray(%s, %s) preserves methods and bounds', (start, end) => {
  const source = MobileBuffer.from([1, 2, 3, 4]);
  const view = source.subarray(start, end);
  const expected = new Uint8Array([1, 2, 3, 4]).subarray(start, end);
  expect(MobileBuffer.isBuffer(view)).toBe(true);
  expect(view.equals(MobileBuffer.from(expected))).toBe(true);
  expect(view.buffer).toBe(source.buffer);
  expect(view.byteOffset).toBe(source.byteOffset + expected.byteOffset);
});

test('nested subarrays and slices remain shared views without changing Uint8Array', () => {
  const source = MobileBuffer.from([0, 1, 2, 3, 4, 5]);
  const view = source.subarray(1, 5).subarray(1, 3);
  expect(view.toString('hex')).toBe('0203');
  view[0] = 7;
  expect(source[2]).toBe(7);
  source[3] = 8;
  expect(view[1]).toBe(8);
  const slice = view.slice(1);
  expect(MobileBuffer.isBuffer(slice)).toBe(true);
  slice[0] = 9;
  expect(source[3]).toBe(9);
  expect(MobileBuffer.isBuffer(new Uint8Array(2).subarray(0))).toBe(false);
});

test('a real name reservation builds and restores its commitment script', () => {
  const {AdvancedNameReservation, CommitmentHash, IdentityCommitmentScript, IdentityID, KeyID, TxDestination} = primitives;
  const reservation = new AdvancedNameReservation({
    name: 'alice', parent: new IdentityID(MobileBuffer.alloc(20, 1)), salt: MobileBuffer.alloc(32, 7),
  });
  const commitment = reservation.getCommitment();
  const {createHash} = require('crypto');
  const expected = createHash('sha256').update(
    createHash('sha256').update(reservation.toBuffer()).digest(),
  ).digest('hex');
  expect(commitment.hash.toString('hex')).toBe(expected);
  expect(commitment.isValid()).toBe(true);
  expect(commitment.isAdvanced()).toBe(false);

  const controller = new TxDestination(new KeyID(MobileBuffer.alloc(20, 3)));
  const script = IdentityCommitmentScript.fromCommitment(commitment, controller);
  const encoded = script.toBuffer();
  const restored = new IdentityCommitmentScript();
  expect(restored.fromBuffer(encoded)).toBe(encoded.length);
  expect(restored.getCommitment().hash.toString('hex')).toBe(expected);

  // The compatibility fix must keep rejection of actual zero hashes intact.
  expect(() => IdentityCommitmentScript.fromCommitment(
    new CommitmentHash({hash: MobileBuffer.alloc(32)}), controller,
  )).toThrow('ordinary, nonzero commitment hash');
});
