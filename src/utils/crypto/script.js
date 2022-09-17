import {
  script,
  opcodes,
  OptCCParams,
  TransactionBuilder,
  networks,
  Transaction,
  TxDestination,
  address as addressUtils,
  ECPair,
  address
} from '@bitgo/utxo-lib';
import { IADDRESS_VERSION } from '../constants/constants';

export const generateOutputScript = (destHash, destVersion, isCC) => {
  if (isCC) {
    const outMaster = new OptCCParams(3, 0, 0, 0);
    const outParams = new OptCCParams(3, 0, 1, 1, [
      new TxDestination(
        destVersion === IADDRESS_VERSION
          ? new TxDestination().typeID
          : new TxDestination().typePKH,
        destHash,
      ),
    ]);

    return script.compile([
      outMaster.toChunk(),
      opcodes.OP_CHECKCRYPTOCONDITION,
      outParams.toChunk(),
      opcodes.OP_DROP,
    ]);
  } else {
    return address.toBase58Check(destHash, destVersion);
  }
};
