import {Buffer} from 'buffer';
import {
  DEST_ID,
  DEST_PKH,
  TransferDestination,
  toBase58Check,
} from 'verus-typescript-primitives';
import {I_ADDRESS_VERSION, R_ADDRESS_VERSION} from '../../constants/constants';
import {getCurrency} from '../../api/channels/verusid/callCreators';
import {
  getCurrencyDisplay,
  getIdentityFromResult,
  getIdentityPrimaryAddresses,
  toCurrencyTransferOutputs,
  toTransferDestination,
} from '../../spendableKey/claimHelpers';

jest.mock('../../api/channels/verusid/callCreators', () => ({
  getCurrency: jest.fn(),
}));

beforeEach(() => jest.resetAllMocks());

describe('identity response compatibility', () => {
  it('overlays only defined identity fields while preserving nested fields and references', () => {
    const addresses = ['current-owner'];
    const identity = Object.freeze({
      name: 'nested-name', flags: 1, contentmap: {old: true}, nestedOnly: true,
    });
    const result = Object.freeze({
      identity, name: undefined, flags: 0, contentmap: null,
      primaryaddresses: addresses, privateAddress: '', minimumSignatures: 1,
      txout: {txid: 'current'}, status: 'active', fullyqualifiedname: 'display@',
    });

    expect(getIdentityFromResult(result)).toEqual({
      ...identity, flags: 0, contentmap: null, primaryaddresses: addresses,
      privateAddress: '', minimumSignatures: 1, txout: result.txout,
    });
    expect(getIdentityFromResult(result).primaryaddresses).toBe(addresses);
    expect(getIdentityFromResult(result)).not.toBe(identity);
  });

  it.each([undefined, null, false, {}, {name: 'flat'}, {identity: null}])(
    'returns a response without a nested identity unchanged: %p', result => {
      expect(getIdentityFromResult(result)).toBe(result);
    },
  );

  it('preserves lowercase precedence, empty arrays and malformed-address handling', () => {
    const lowercase = ['lowercase'];
    const camelCase = ['camelCase'];
    const empty = [];
    expect(getIdentityPrimaryAddresses({primaryaddresses: lowercase, primaryAddresses: camelCase})).toBe(lowercase);
    expect(getIdentityPrimaryAddresses({primaryaddresses: empty, primaryAddresses: camelCase})).toBe(empty);
    expect(getIdentityPrimaryAddresses({primaryaddresses: null, primaryAddresses: camelCase})).toBe(camelCase);
    expect(getIdentityPrimaryAddresses({primaryaddresses: 'invalid', primaryAddresses: camelCase})).toEqual([]);
    expect(getIdentityPrimaryAddresses(null)).toEqual([]);
  });
});

describe('transfer destination compatibility', () => {
  it.each([[R_ADDRESS_VERSION, DEST_PKH], [I_ADDRESS_VERSION, DEST_ID]])(
    'preserves destination type and address bytes for version %s', (version, type) => {
      const hash = Buffer.alloc(20, 7);
      const address = toBase58Check(hash, version);
      const destination = toTransferDestination(address);

      expect(destination).toBeInstanceOf(TransferDestination);
      expect(destination.type.eq(type)).toBe(true);
      expect(destination.destinationBytes).toEqual(hash);
      expect(destination.getAddressString()).toBe(address);
    },
  );

  it('rejects unsupported address versions and malformed addresses', () => {
    expect(() => toTransferDestination(toBase58Check(Buffer.alloc(20, 7), 0)))
      .toThrow('Incompatible address type.');
    expect(() => toTransferDestination('invalid')).toThrow();
  });
});

describe('currency display compatibility', () => {
  it.each(['Currency.VRSC', '', undefined])(
    'retains the definition with full-name fallback for %p', async fullyqualifiedname => {
      const definition = {currencyid: 'currency', fullyqualifiedname};
      getCurrency.mockResolvedValue({result: definition});

      const display = await getCurrencyDisplay('system', 'currency');

      expect(getCurrency).toHaveBeenCalledWith('system', 'currency');
      expect(display).toEqual({currencyId: 'currency', name: fullyqualifiedname || 'currency', definition});
      expect(display.definition).toBe(definition);
    },
  );

  it.each([null, {}, {result: null}, {error: {message: 'RPC failure'}}])(
    'falls back for an unusable RPC response: %p', async response => {
      getCurrency.mockResolvedValue(response);
      await expect(getCurrencyDisplay('system', 'currency')).resolves.toEqual({
        currencyId: 'currency', name: 'currency', definition: null,
      });
    },
  );

  it('falls back on RPC rejection without propagating it', async () => {
    getCurrency.mockRejectedValue(new Error('offline'));
    await expect(getCurrencyDisplay('system', 'currency')).resolves.toEqual({
      currencyId: 'currency', name: 'currency', definition: null,
    });
  });
});

describe('currency transfer grouping compatibility', () => {
  it('preserves order, exact sums, first amount types and first destination objects', () => {
    const first = {getAddressString: () => 'destination'};
    const equivalent = {getAddressString: () => 'destination'};
    const other = {getAddressString: () => 'other'};
    const outputs = [
      {currency: 'native', satoshis: '9007199254740993', address: first, memo: 'same'},
      {currency: 'token', satoshis: 7, address: equivalent, memo: 'same'},
      {currency: 'native', satoshis: '2', address: equivalent, memo: 'same'},
      {currency: 'native', satoshis: '5', address: first, memo: 'different'},
      {currency: 'native', satoshis: '6', address: other, memo: 'same'},
    ].map(Object.freeze);
    const key = jest.fn(address => address.getAddressString());

    const grouped = toCurrencyTransferOutputs(Object.freeze(outputs), key);

    expect(grouped).toEqual([
      {memo: 'same', currencies: {native: '9007199254740995', token: 7}, address: first},
      {memo: 'different', currencies: {native: '5'}, address: first},
      {memo: 'same', currencies: {native: '6'}, address: other},
    ]);
    expect(grouped[0].address).toBe(first);
    expect(key.mock.calls.map(([address]) => address)).toEqual(outputs.map(output => output.address));
  });

  it('keeps the existing serialized option order when deciding whether outputs merge', () => {
    const address = {};
    const outputs = [
      {currency: 'coin', satoshis: '1', address, memo: 'text', fees: '2'},
      {currency: 'coin', satoshis: '3', address, fees: '2', memo: 'text'},
    ];
    expect(toCurrencyTransferOutputs(outputs, () => 'destination')).toHaveLength(2);
  });

  it('leaves fallback and errors to the supplied destination-key policy', () => {
    const outputs = [{currency: 'coin', satoshis: '1', address: null}];
    expect(toCurrencyTransferOutputs(outputs, address => JSON.stringify(address)))
      .toEqual([{currencies: {coin: '1'}, address: null}]);
    expect(() => toCurrencyTransferOutputs(outputs, address => address.getAddressString()))
      .toThrow(TypeError);
    expect(toCurrencyTransferOutputs([], () => {throw new Error('unused');})).toEqual([]);
  });
});
