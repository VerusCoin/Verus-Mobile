import {Alert} from 'react-native';
import {openUrl} from '../../linking';
import {
  FUND_RAW_TRANSACTION_GUIDE_URL,
  FUND_RAW_TRANSACTION_MANY_UTXOS_ERROR,
  FUND_RAW_TRANSACTION_MANY_UTXOS_MESSAGE,
  getManyUtxoFundRawTransactionError,
  isManyUtxoFundRawTransactionError,
  showFundRawTransactionErrorAlert,
} from '../../vrpc/fundRawTransactionError';

jest.mock('../../linking', () => ({
  openUrl: jest.fn(),
}));

const utxos = count => Array.from({length: count}, (_, index) => ({
  txid: String(index),
  voutnum: 0,
}));

describe('fundrawtransaction large-wallet errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates the friendly error for method not found with over 500 UTXOs', () => {
    const error = getManyUtxoFundRawTransactionError(
      {code: -32601, message: 'Method not found'},
      utxos(501),
    );

    expect(error).toMatchObject({
      code: FUND_RAW_TRANSACTION_MANY_UTXOS_ERROR,
      message: FUND_RAW_TRANSACTION_MANY_UTXOS_MESSAGE,
      utxoCount: 501,
    });
  });

  it('recognizes a case-insensitive method-not-found message', () => {
    expect(
      getManyUtxoFundRawTransactionError(
        {message: 'RPC METHOD NOT FOUND'},
        utxos(501),
      ),
    ).not.toBeNull();
  });

  it('does not replace errors at 500 UTXOs or for another RPC error', () => {
    expect(
      getManyUtxoFundRawTransactionError(
        {code: -32601, message: 'Method not found'},
        utxos(500),
      ),
    ).toBeNull();
    expect(
      getManyUtxoFundRawTransactionError(
        {code: -32603, message: 'Internal error'},
        utxos(501),
      ),
    ).toBeNull();
  });

  it('keeps recognizing the error after preflight serializes it to a message', () => {
    expect(
      isManyUtxoFundRawTransactionError(
        new Error(FUND_RAW_TRANSACTION_MANY_UTXOS_MESSAGE),
      ),
    ).toBe(true);
  });

  it('shows an Open guide action for the friendly error', () => {
    const error = getManyUtxoFundRawTransactionError(
      {code: -32601, message: 'Method not found'},
      utxos(501),
    );

    expect(showFundRawTransactionErrorAlert(error)).toBe(true);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Many incoming transactions',
      FUND_RAW_TRANSACTION_MANY_UTXOS_MESSAGE,
      expect.any(Array),
    );

    const buttons = Alert.alert.mock.calls[0][2];
    expect(buttons.map(button => button.text)).toEqual(['OK', 'Open guide']);

    buttons[1].onPress();

    expect(openUrl).toHaveBeenCalledWith(FUND_RAW_TRANSACTION_GUIDE_URL);
  });

  it('leaves ordinary errors for the existing alert path', () => {
    expect(showFundRawTransactionErrorAlert(new Error('Insufficient funds')))
      .toBe(false);
    expect(Alert.alert).not.toHaveBeenCalled();
  });
});
