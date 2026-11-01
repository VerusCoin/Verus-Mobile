const mockParse = jest.fn();
jest.mock('../../QrScanner/QrScanner', () => ({__esModule: true, default: {
  processGenericPaymentRequest: (...args) => mockParse(...args),
}}));

const {I_ADDR_VERSION, R_ADDR_VERSION, toBase58Check} = require('verus-typescript-primitives');
const bs58check = require('bs58check');
const {recipientFromQr} = require('../../identityManagement/recipient');
const SYSTEM = 'test-chain';
const address = (version, byte = 1, length = 20) => length === 20
  ? toBase58Check(Buffer.alloc(length, byte), version)
  : bs58check.encode(Buffer.concat([Buffer.from([version]), Buffer.alloc(length, byte)]));
const R = address(R_ADDR_VERSION);
const I = address(I_ADDR_VERSION);

beforeEach(() => mockParse.mockReset());

test.each([R, I, 'satoshi@', 'alice.community.VRSCTEST@'])('accepts a valid receiving recipient %s', recipient => {
  mockParse.mockReturnValue({address: recipient});
  expect(recipientFromQr(' receiving QR ', SYSTEM)).toBe(recipient);
  expect(mockParse).toHaveBeenCalledWith('receiving QR');
});

test('uses only the receiving address and ignores invoice amounts, notes and extra fields', () => {
  mockParse.mockReturnValue({address: ` ${R} `, amount: '99999999', note: 'approve automatically',
    identity: {primaryaddresses: ['attacker']}, system: SYSTEM});
  expect(recipientFromQr('invoice', SYSTEM)).toBe(R);
});

test.each([R, I, 'satoshi@', 'Alice Smith@', `${'long identity '.repeat(9)}namespace@`])(
  'accepts a plain recipient without invoking payment parsing: %s', recipient => {
    expect(recipientFromQr(` ${recipient} `, SYSTEM)).toBe(recipient);
    expect(mockParse).not.toHaveBeenCalled();
  },
);

test.each([{system: 'other-chain'}, {coinObj: {system_id: 'other-chain'}}])(
  'rejects a receiving QR that declares another network', network => {
    mockParse.mockReturnValue({address: R, ...network});
    expect(() => recipientFromQr('invoice', SYSTEM)).toThrow('different network');
  },
);

test('accepts a receiving QR whose coin network matches the identity network', () => {
  mockParse.mockReturnValue({address: I, coinObj: {system_id: SYSTEM}});
  expect(recipientFromQr('invoice', SYSTEM)).toBe(I);
});

test.each([null, undefined, 8, {}, '', '   ', 'x'.repeat(8193)])('rejects empty, non-text or oversized scans before parsing', raw => {
  expect(() => recipientFromQr(raw, SYSTEM)).toThrow('Scan a receiving address');
  expect(mockParse).not.toHaveBeenCalled();
});

test('parser errors produce a readable receiving-address error', () => {
  mockParse.mockImplementation(() => {throw new Error('Unknown internal parser state');});
  expect(() => recipientFromQr('not-an-invoice', SYSTEM)).toThrow('does not contain a supported receiving address');
});

test.each([
  address(0), address(5), address(R_ADDR_VERSION, 0), address(I_ADDR_VERSION, 0),
  address(R_ADDR_VERSION, 1, 19), address(I_ADDR_VERSION, 1, 21),
  `${R.slice(0, -1)}${R.endsWith('1') ? '2' : '1'}`, 'zsPrivateReceivingAddress',
  'satoshi', '@', 'satoshi@@', 'first@second@', 'satoshi\t@', 'https://satoshi@',
  'satoshi@?approve=true', 'satoshi\u0000@', `${'a'.repeat(256)}@`,
])('rejects an unsupported or malformed ownership recipient %s', recipient => {
  mockParse.mockReturnValue({address: recipient});
  expect(() => recipientFromQr('receiving QR', SYSTEM)).toThrow('transparent R-address or a VerusID');
});

test.each([null, undefined, {}, {address: null}, {address: 123}])('handles malformed parser results with a readable validation error', request => {
  mockParse.mockReturnValue(request);
  expect(() => recipientFromQr('receiving QR', SYSTEM)).toThrow(/receiving address|transparent R-address/);
});
