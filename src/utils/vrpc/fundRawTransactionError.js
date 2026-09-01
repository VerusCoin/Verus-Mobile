import {Alert} from 'react-native';
import {openUrl} from '../linking';

export const FUND_RAW_TRANSACTION_UTXO_LIMIT = 500;
export const FUND_RAW_TRANSACTION_MANY_UTXOS_ERROR =
  'FUND_RAW_TRANSACTION_MANY_UTXOS';
export const FUND_RAW_TRANSACTION_GUIDE_URL =
  'https://wiki.verus.io/#!how-to/how-to_convert-seed-to-wif.md';
export const FUND_RAW_TRANSACTION_MANY_UTXOS_MESSAGE =
  'Your wallet has too many incoming transactions. To address this, try importing the key for this address into a wallet running Verus in native mode, such as Verus Desktop, and then send from there. Open the guide for instructions.';

const METHOD_NOT_FOUND = -32601;

const isMethodNotFound = error => {
  const code = error?.code ?? error?.error?.code;
  const message =
    typeof error === 'string'
      ? error
      : error?.message ?? error?.error?.message ?? '';

  return (
    Number(code) === METHOD_NOT_FOUND ||
    (typeof message === 'string' && /method not found/i.test(message))
  );
};

export const getManyUtxoFundRawTransactionError = (rpcError, utxos) => {
  if (
    !Array.isArray(utxos) ||
    utxos.length <= FUND_RAW_TRANSACTION_UTXO_LIMIT ||
    !isMethodNotFound(rpcError)
  ) {
    return null;
  }

  const error = new Error(FUND_RAW_TRANSACTION_MANY_UTXOS_MESSAGE);
  error.code = FUND_RAW_TRANSACTION_MANY_UTXOS_ERROR;
  error.utxoCount = utxos.length;

  return error;
};

export const isManyUtxoFundRawTransactionError = error => {
  const code = error?.code;
  const message = typeof error === 'string' ? error : error?.message;

  return (
    code === FUND_RAW_TRANSACTION_MANY_UTXOS_ERROR ||
    message === FUND_RAW_TRANSACTION_MANY_UTXOS_MESSAGE
  );
};

export const showFundRawTransactionErrorAlert = error => {
  if (!isManyUtxoFundRawTransactionError(error)) return false;

  Alert.alert(
    'Many incoming transactions',
    FUND_RAW_TRANSACTION_MANY_UTXOS_MESSAGE,
    [
      {text: 'OK', style: 'cancel'},
      {
        text: 'Open guide',
        onPress: () => openUrl(FUND_RAW_TRANSACTION_GUIDE_URL),
      },
    ],
  );

  return true;
};
