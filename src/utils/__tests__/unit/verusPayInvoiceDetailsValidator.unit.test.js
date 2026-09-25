const mockGetBasicCoinObj = jest.fn();
const mockInitEndpoint = jest.fn();
const mockGetInfo = jest.fn();
const mockGetCurrency = jest.fn();

jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {
    getBasicCoinObj: mockGetBasicCoinObj,
  },
}));

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {
    initEndpoint: mockInitEndpoint,
  },
}));

jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getInfo: mockGetInfo,
}));

jest.mock('../../api/channels/verusid/callCreators', () => ({
  getCurrency: mockGetCurrency,
}));

import {validateVerusPayInvoiceVDXFObject} from '../../deeplink/validator/verusPayInvoiceDetailsValidator';

const requestForNetworks = (requestIsTestnet, detailIsTestnet) => ({
  isTestnet: () => requestIsTestnet,
  getDetails: () => ({
    data: {
      isTestnet: () => detailIsTestnet,
    },
  }),
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
