import { VerusIdInterface } from "verusid-ts-client";

export const BURN_CHANGE_PRICE_PARENT_TRANSACTION_FEE = 0.0001;

const RESERVE_TRANSFER_DEFAULT_PER_STEP_FEE_SATOSHIS = 10000;
const RESERVE_TRANSFER_DESTINATION_BYTE_DIVISOR = 128;

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

  return VerusIdInterface.createUnfundedCurrencyTransferTransaction(
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
        vdxftag: output.vdxftag,
      },
    ],
    expiryHeight,
  );
};
