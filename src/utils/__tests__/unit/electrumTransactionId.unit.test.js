import {networks} from 'bitgo-utxo-lib';
import {
  getParsedTransactionId,
  parseAndVerifyRawTransaction,
} from '../../api/channels/electrum/transactionId';

const LEGACY_RAW_TRANSACTION =
  '010000000100000000000000000000000000000000000000000000000000000000000000000000000000ffffffff0101000000000000000000000000';
const LEGACY_TXID =
  '72d2b8825e02af7880054fd61513dcfafaf2ac58c21fb7316107af103fafb211';

describe('Electrum transaction ID verification', () => {
  it('verifies the transaction ID of a supported legacy transaction', () => {
    const transaction = parseAndVerifyRawTransaction(
      LEGACY_RAW_TRANSACTION,
      LEGACY_TXID,
      networks.ltc,
    );

    expect(getParsedTransactionId(transaction)).toBe(LEGACY_TXID);
    expect(transaction.outs[0].value).toBe(1);
  });

  it('rejects a transaction ID that does not match the legacy raw transaction', () => {
    expect(() =>
      parseAndVerifyRawTransaction(
        LEGACY_RAW_TRANSACTION,
        'f'.repeat(64),
        networks.ltc,
      ),
    ).toThrow('does not match its expected transaction ID');
  });
});
