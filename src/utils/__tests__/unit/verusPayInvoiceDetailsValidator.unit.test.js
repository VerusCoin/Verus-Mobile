const mockGetBasicCoinObj = jest.fn();
const mockInitEndpoint = jest.fn();
const mockGetInfo = jest.fn();
const mockGetCurrency = jest.fn();

jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    getBasicCoinObj: (...args) => mockGetBasicCoinObj(...args),
  },
}));

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    initEndpoint: (...args) => mockInitEndpoint(...args),
  },
}));

jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getInfo: (...args) => mockGetInfo(...args),
}));

jest.mock('../../api/channels/verusid/callCreators', () => ({
  getCurrency: (...args) => mockGetCurrency(...args),
}));

import {
  BigNumber,
  CompactAddressObject,
  CompactXAddressObject,
  DEST_PKH,
  TransferDestination,
  VerusPayInvoiceDetails,
  toBase58Check,
} from 'verus-typescript-primitives';
import {
  validateVerusPayInvoiceDetails,
  validateVerusPayInvoiceVDXFObject,
} from '../../deeplink/validator/verusPayInvoiceDetailsValidator';
import {IS_TOKEN_FLAG} from '../../constants/currencies';

const SYSTEM_ID = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const TESTNET_SYSTEM_ID = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const TAG_ADDRESS = toBase58Check(Buffer.alloc(20, 0x42), 137);

const makeDetails = (tag, flags = {}) => {
  const details = new VerusPayInvoiceDetails({
    amount: new BigNumber(100000000),
    destination: new TransferDestination({
      type: DEST_PKH,
      destinationBytes: Buffer.alloc(20, 0x24),
    }),
    requestedcurrencyid: flags.isTestnet ? TESTNET_SYSTEM_ID : SYSTEM_ID,
    tag,
  });
  details.setFlags({isTagged: true, ...flags});
  return details;
};

const requestForNetworks = (requestIsTestnet, detailIsTestnet) => ({
  isTestnet: () => requestIsTestnet,
  getDetails: () => ({
    data: {
      isTestnet: () => detailIsTestnet,
    },
  }),
});

describe('VerusPay tagged invoice validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBasicCoinObj.mockImplementation(network => ({
      system_id: network === 'VRSCTEST' ? TESTNET_SYSTEM_ID : SYSTEM_ID,
      vrpc_endpoints: ['https://example.invalid'],
    }));
    mockGetInfo.mockResolvedValue({result: {longestchain: 100}});
    mockGetCurrency.mockImplementation(async systemId => ({
      result: {options: IS_TOKEN_FLAG, systemid: systemId},
    }));
  });

  it.each([
    ['VRSC', false, 'X-address'],
    ['VRSC', false, 'data key'],
    ['VRSCTEST', true, 'X-address'],
    ['VRSCTEST', true, 'data key'],
  ])('accepts a parsed %s invoice (testnet=%s) with a %s tag', async (root, isTestnet, format) => {
    const tag = format === 'X-address'
      ? CompactXAddressObject.fromAddress(TAG_ADDRESS, root)
      : CompactXAddressObject.fromDataKey('merchant.invoice::order', root);
    const original = makeDetails(tag, {isTestnet});
    const parsed = new VerusPayInvoiceDetails();
    parsed.fromBuffer(original.toBuffer());

    await expect(validateVerusPayInvoiceVDXFObject({
      isTestnet: () => isTestnet,
      getDetails: () => ({data: parsed}),
    }, 0)).resolves.toBeUndefined();

    expect(parsed.tag.toXAddress()).toBe(tag.toXAddress());
    expect(mockGetBasicCoinObj).toHaveBeenCalledWith(root);
  });

  it('accepts a tagged burn invoice', async () => {
    await expect(validateVerusPayInvoiceDetails(makeDetails(
      CompactXAddressObject.fromAddress(TAG_ADDRESS),
      {isBurnChangePrice: true},
    ))).resolves.toBeUndefined();
  });

  it('keeps untagged invoices valid', async () => {
    await expect(validateVerusPayInvoiceDetails(
      makeDetails(undefined, {isTagged: false}),
    )).resolves.toBeUndefined();
  });

  it.each([
    ['missing', () => undefined],
    ['empty', () => CompactXAddressObject.fromAddress('')],
    ['malformed X-address', () => CompactXAddressObject.fromAddress('not-an-address')],
    ['malformed data key', () => CompactXAddressObject.fromDataKey('invoice@@')],
    ['wrong address version', () => CompactXAddressObject.fromAddress(SYSTEM_ID)],
    ['unsupported compact type', () => new CompactXAddressObject({
      type: CompactAddressObject.TYPE_I_ADDRESS,
      address: SYSTEM_ID,
    })],
    ['unsupported compact version', () => new CompactXAddressObject({
      version: new BigNumber(2),
      type: CompactAddressObject.TYPE_X_ADDRESS,
      address: TAG_ADDRESS,
    })],
  ])('rejects a %s tag before RPC calls', async (description, makeTag) => {
    await expect(validateVerusPayInvoiceDetails(makeDetails(makeTag())))
      .rejects.toThrow('Invalid VerusPay invoice tag');

    expect(mockInitEndpoint).not.toHaveBeenCalled();
    expect(mockGetInfo).not.toHaveBeenCalled();
    expect(mockGetCurrency).not.toHaveBeenCalled();
  });

  it('keeps Sapling destinations unsupported for tagged invoices', async () => {
    await expect(validateVerusPayInvoiceDetails(makeDetails(
      CompactXAddressObject.fromAddress(TAG_ADDRESS),
      {destinationIsSaplingPaymentAddress: true},
    ))).rejects.toThrow('Sapling invoice destinations not yet supported');
  });
});

describe('VerusPay invoice details network validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each([
    [false, true, 'testnet', 'mainnet'],
    [true, false, 'mainnet', 'testnet'],
  ])(
    'rejects %s envelope and %s invoice detail mismatch before RPC setup',
    (requestIsTestnet, detailIsTestnet, detailNetwork, requestNetwork) => {
      const request = requestForNetworks(requestIsTestnet, detailIsTestnet);

      expect(() => validateVerusPayInvoiceVDXFObject(request, 0)).toThrow(
        `Invoice details are for ${detailNetwork}, but the enclosing request is for ${requestNetwork}.`,
      );
      expect(mockGetBasicCoinObj).not.toHaveBeenCalled();
      expect(mockInitEndpoint).not.toHaveBeenCalled();
      expect(mockGetInfo).not.toHaveBeenCalled();
      expect(mockGetCurrency).not.toHaveBeenCalled();
    },
  );
});
