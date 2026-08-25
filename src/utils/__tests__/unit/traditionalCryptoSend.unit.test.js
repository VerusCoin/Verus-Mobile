import BigNumber from 'bignumber.js';
import store from '../../../store';
import {send} from '../../api/routers/send';
import {traditionalCryptoSend} from '../../../actions/actions/send/dispatchers/traditionalCryptoSend';

jest.mock('../../api/routers/send', () => ({
  send: jest.fn(),
}));

jest.mock('../../api/routers/preflightSend', () => ({
  preflightSend: jest.fn(),
}));

jest.mock('../../api/channels/verusid/callCreators', () => ({
  extractIdentityAddress: jest.fn(),
}));

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    getState: jest.fn(),
  },
}));

jest.mock('verus-typescript-primitives', () => ({
  LOGIN_CONSENT_REQUEST_VDXF_KEY: {vdxfid: 'login'},
  VERUSPAY_INVOICE_VDXF_KEY: {vdxfid: 'invoice'},
  toLowerCaseCLocale: value => value.toLowerCase(),
}));

const COIN = {
  id: 'LTC',
  decimals: 8,
  display_ticker: 'LTC',
  fee: 10000,
};

describe('traditional crypto send errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    store.getState.mockReturnValue({
      authentication: {
        activeAccount: {id: 'profile'},
      },
      settings: {
        coinSettings: {
          LTC: {verificationLvl: 2},
        },
      },
    });
  });

  it('preserves structured ambiguous broadcast errors for the UI', async () => {
    const ambiguousError = new Error('Broadcast status is unknown.');
    ambiguousError.code = 'ELECTRUM_AMBIGUOUS_BROADCAST';
    ambiguousError.ambiguousBroadcast = true;
    ambiguousError.localTxid = 'd'.repeat(64);
    send.mockRejectedValue(ambiguousError);

    await expect(
      traditionalCryptoSend(
        COIN,
        'electrum',
        'destination',
        BigNumber('0.0009'),
        null,
        null,
      ),
    ).rejects.toBe(ambiguousError);
  });

  it('passes Electrum reconciliation options through the router params', async () => {
    const onReconciliationStatus = jest.fn();
    const reconciliationOptions = {
      onReconciliationStatus,
      propagationDelayMs: 30000,
    };
    send.mockResolvedValue({
      err: false,
      result: {
        fee: '0.0001',
        fromAddress: 'source',
        memo: null,
        toAddress: 'confirmed-destination',
        txid: 'd'.repeat(64),
        value: '0.0008',
      },
    });

    const result = await traditionalCryptoSend(
      COIN,
      'electrum',
      'destination',
      BigNumber('0.0009'),
      'new memo',
      null,
      false,
      {reconciliationOptions},
    );

    expect(send.mock.calls[0][5]).toEqual(
      expect.objectContaining({
        reconciliationOptions,
      }),
    );
    expect(result).toMatchObject({
      toAddress: 'confirmed-destination',
      finalTxAmount: '0.0008',
      memo: null,
    });
  });

  it('passes disabled UTXO verification from wallet settings', async () => {
    store.getState.mockReturnValue({
      authentication: {
        activeAccount: {id: 'profile'},
      },
      settings: {
        coinSettings: {
          LTC: {verificationLvl: 0},
        },
      },
    });
    send.mockResolvedValue({
      err: false,
      result: {
        fee: '0.0001',
        fromAddress: 'source',
        memo: null,
        toAddress: 'destination',
        txid: 'd'.repeat(64),
        value: '0.0008',
      },
    });

    await traditionalCryptoSend(
      COIN,
      'electrum',
      'destination',
      BigNumber('0.0009'),
      null,
      null,
    );

    expect(send.mock.calls[0][5]).toEqual(
      expect.objectContaining({
        verifyMerkle: false,
        verifyTxid: false,
      }),
    );
  });
});
