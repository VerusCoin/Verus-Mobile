import { Transaction, networks } from "@bitgo/utxo-lib";
import { BN } from "bn.js";
import { VerusIdInterface } from "verusid-ts-client";
import {
  EVALS,
  OptCCParams,
  SmartTransactionScript,
  TxDestination,
  UnknownID,
  fromBase58Check,
} from "verus-typescript-primitives";

export const BURN_CHANGE_PRICE_PARENT_TRANSACTION_FEE = 0.0001;

const RESERVE_TRANSFER_DEFAULT_PER_STEP_FEE_SATOSHIS = 10000;
const RESERVE_TRANSFER_DESTINATION_BYTE_DIVISOR = 128;
const VDXF_TAG_ADDRESS_VERSION = 137;
const VDXF_TAG_HASH_LENGTH = 20;

const addVdxfTagToBurnTransaction = (transactionHex, vdxfTag) => {
  if (vdxfTag == null || vdxfTag === "") return transactionHex;

  if (typeof vdxfTag !== "string") {
    throw new Error("Burn transaction VDXF tag must be an X-address.");
  }

  let tagHash;

  try {
    const decodedTag = fromBase58Check(vdxfTag);

    if (
      decodedTag.version !== VDXF_TAG_ADDRESS_VERSION ||
      decodedTag.hash.length !== VDXF_TAG_HASH_LENGTH
    ) {
      throw new Error("Invalid VDXF tag address.");
    }

    tagHash = decodedTag.hash;
  } catch (e) {
    throw new Error("Burn transaction VDXF tag must be a valid X-address.");
  }

  const transaction = Transaction.fromHex(transactionHex, networks.verus);

  if (transaction.outs.length !== 1) {
    throw new Error("Expected one burn transaction output.");
  }

  const burnScript = new SmartTransactionScript();
  burnScript.fromBuffer(transaction.outs[0].script);

  if (
    burnScript.paramsOptCC == null ||
    !burnScript.paramsOptCC.evalCode.eq(new BN(EVALS.EVAL_RESERVE_TRANSFER))
  ) {
    throw new Error("Expected a reserve-transfer burn output.");
  }

  const tagDestination = new TxDestination(
    new UnknownID(tagHash),
    TxDestination.TYPE_INDEX,
  );

  burnScript.masterOptCC = new OptCCParams({
    version: new BN(3),
    evalCode: new BN(EVALS.EVAL_NONE),
    m: new BN(1),
    n: new BN(1),
    destinations: [tagDestination],
  });
  transaction.outs[0].script = burnScript.toBuffer();

  return transaction.toHex();
};

export const calculateBurnChangePriceTransferFeeSatoshis = address => {
  const destinationLength = address?.destinationBytes?.length;

  if (!Number.isSafeInteger(destinationLength) || destinationLength < 0) {
    throw new Error("Burn output destination is missing or invalid.");
  }

  const baseFee = RESERVE_TRANSFER_DEFAULT_PER_STEP_FEE_SATOSHIS * 2;

  return (
    baseFee +
    baseFee *
      Math.floor(
        destinationLength / RESERVE_TRANSFER_DESTINATION_BYTE_DIVISOR,
      )
  ).toString();
};

export const validateBurnChangePriceTransferOutput = output => {
  // VerusCoin requires currency-controller authorization for burn-change-weight.
  // VerusPay invoices intentionally support burn-change-price only.
  if (output.burnweight === true) {
    throw new Error(
      "Burning while changing reserve weight is not supported.",
    );
  }

  if (
    output.burn === true &&
    (
      output.convertto != null ||
      output.exportto != null ||
      output.via != null ||
      output.mapto != null ||
      output.preconvert === true ||
      output.mintnew === true
    )
  ) {
    throw new Error(
      "Burn-change-price transfers cannot be combined with conversion, export, preconvert, mapping, or minting.",
    );
  }
};

export const createUnfundedBurnChangePriceTransaction = (
  systemId,
  output,
  expiryHeight,
) => {
  validateBurnChangePriceTransferOutput(output);

  if (output.burn !== true || output.burnweight === true) {
    throw new Error("Expected a burn-change-price transfer.");
  }

  const feesatoshis =
    output.feesatoshis ??
    calculateBurnChangePriceTransferFeeSatoshis(output.address);

  const transactionHex =
    VerusIdInterface.createUnfundedCurrencyTransferTransaction(
      systemId,
      [
        {
          currencies: {
            [output.currency]: output.satoshis,
          },
          address: output.address,
          burn: true,
          importtosource: true,
          feecurrency: output.feecurrency,
          feesatoshis,
        },
      ],
      expiryHeight,
    );

  return addVdxfTagToBurnTransaction(transactionHex, output.vdxftag);
};
