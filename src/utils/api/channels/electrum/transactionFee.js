import BigNumber from "bignumber.js";

export const DEFAULT_MAX_FEE_RATE_PER_BYTE = 2500;

const toSatoshiAmount = (value, label) => {
  const amount = BigNumber(value);

  if (
    !amount.isFinite() ||
    !amount.isInteger() ||
    amount.isLessThan(BigNumber(0))
  ) {
    throw new Error(`Invalid ${label} amount.`);
  }

  return amount;
};

/**
 * Fail closed unless every candidate input is tied to a hash-verified previous
 * transaction and the Electrum-reported value agrees with that transaction.
 * The returned input objects always use the verified value for coin selection
 * and for chains whose signature hash commits the input amount.
 */
export const assertAndUseVerifiedInputValues = inputs => {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("Cannot construct a transaction without verified inputs.");
  }

  return inputs.map(input => {
    if (input == null || input.verifiedTxid !== true) {
      throw new Error(
        "Cannot construct a transaction without hash-verified previous transactions.",
      );
    }

    if (input.verifiedValueSats == null) {
      throw new Error(
        "Cannot construct a transaction without verified input values.",
      );
    }

    const verifiedValue = toSatoshiAmount(
      input.verifiedValueSats,
      "verified input",
    );
    const reportedValueSource =
      input.reportedValueSats == null
        ? input.amountSats
        : input.reportedValueSats;

    if (reportedValueSource == null) {
      throw new Error("Cannot cross-check a missing Electrum input value.");
    }

    const reportedValue = toSatoshiAmount(
      reportedValueSource,
      "Electrum-reported input",
    );

    if (!verifiedValue.isEqualTo(reportedValue)) {
      throw new Error(
        "Electrum-reported input value does not match the hash-verified previous transaction.",
      );
    }

    const authoritativeValue = verifiedValue.toNumber();

    if (!Number.isSafeInteger(authoritativeValue)) {
      throw new Error("Verified input value exceeds the safe integer range.");
    }

    return {
      ...input,
      amountSats: authoritativeValue,
      reportedValueSats: reportedValue.toNumber(),
      value: authoritativeValue,
      verifiedValueSats: authoritativeValue,
    };
  });
};

export const assertAndUseReportedInputValues = inputs => {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("Cannot construct a transaction without inputs.");
  }

  return inputs.map(input => {
    const reportedValueSource =
      input?.reportedValueSats == null
        ? input?.amountSats ?? input?.value
        : input.reportedValueSats;

    if (reportedValueSource == null) {
      throw new Error(
        "Cannot construct a transaction without Electrum-reported input values.",
      );
    }

    const reportedValue = toSatoshiAmount(
      reportedValueSource,
      "Electrum-reported input",
    ).toNumber();

    if (!Number.isSafeInteger(reportedValue)) {
      throw new Error(
        "Electrum-reported input value exceeds the safe integer range.",
      );
    }

    return {
      ...input,
      amountSats: reportedValue,
      reportedValueSats: reportedValue,
      value: reportedValue,
    };
  });
};

export const calculatePotentialTransactionFee = (
  inputs,
  spendValue,
  changeValue,
  additionalInputValue = 0,
  requireVerifiedInputs = true,
) => {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("Cannot calculate transaction fee without inputs.");
  }

  const inputTotal = inputs.reduce((total, input) => {
    const inputValue = requireVerifiedInputs
      ? input?.verifiedValueSats
      : input?.reportedValueSats ?? input?.amountSats ?? input?.value;

    if (inputValue == null) {
      throw new Error(
        requireVerifiedInputs
          ? "Cannot verify transaction fee without verified input values."
          : "Cannot calculate transaction fee without Electrum-reported input values.",
      );
    }

    return total.plus(
      toSatoshiAmount(
        inputValue,
        requireVerifiedInputs ? "verified input" : "Electrum-reported input",
      ),
    );
  }, BigNumber(0));

  const adjustedInputTotal = inputTotal.plus(
    toSatoshiAmount(additionalInputValue, "additional input"),
  );
  const outputTotal = toSatoshiAmount(spendValue, "spend output").plus(
    toSatoshiAmount(changeValue, "change output"),
  );

  return adjustedInputTotal.minus(outputTotal);
};

export const assertSanePotentialTransactionFee = (
  inputs,
  spendValue,
  changeValue,
  expectedFee,
  additionalInputValue = 0,
  requireVerifiedInputs = true,
) => {
  const calculatedFee = calculatePotentialTransactionFee(
    inputs,
    spendValue,
    changeValue,
    additionalInputValue,
    requireVerifiedInputs,
  );
  const expectedFeeAmount = toSatoshiAmount(expectedFee, "expected fee");

  if (calculatedFee.isLessThan(BigNumber(0))) {
    throw new Error(
      "Previous transaction values are lower than the potential transaction outputs.",
    );
  }

  if (!calculatedFee.isEqualTo(expectedFeeAmount)) {
    throw new Error(
      "Potential transaction fee does not match the planned fee. The Electrum server may have returned incorrect input values.",
    );
  }

  return calculatedFee;
};

export const estimateLegacyTransactionByteSize = (
  inputCount,
  outputCount,
) => {
  if (
    !Number.isSafeInteger(inputCount) ||
    inputCount <= 0 ||
    !Number.isSafeInteger(outputCount) ||
    outputCount <= 0
  ) {
    throw new Error("Invalid transaction input or output count.");
  }

  // Conservative byte-size estimate for the legacy P2PKH transaction path.
  return 10 + (inputCount * 148) + (outputCount * 34);
};

export const assertFeeWithinLimits = (
  fee,
  transactionSize,
  {
    maxAbsoluteFee = null,
    maxFeeRatePerByte = DEFAULT_MAX_FEE_RATE_PER_BYTE,
  } = {},
) => {
  const feeAmount = toSatoshiAmount(fee, "transaction fee");

  if (!Number.isSafeInteger(transactionSize) || transactionSize <= 0) {
    throw new Error("Invalid transaction size for fee validation.");
  }

  const maximumFeeRate = toSatoshiAmount(
    maxFeeRatePerByte,
    "maximum fee rate",
  );

  if (maximumFeeRate.isZero()) {
    throw new Error("Maximum fee rate must be greater than zero.");
  }

  if (maxAbsoluteFee != null) {
    const maximumAbsoluteFee = toSatoshiAmount(
      maxAbsoluteFee,
      "maximum absolute fee",
    );

    if (feeAmount.isGreaterThan(maximumAbsoluteFee)) {
      throw new Error(
        "Transaction fee exceeds the configured absolute fee limit.",
      );
    }
  }

  const feeRate = feeAmount.dividedBy(transactionSize);

  if (feeRate.isGreaterThan(maximumFeeRate)) {
    throw new Error(
      "Transaction fee rate exceeds the configured maximum fee rate.",
    );
  }

  return {fee: feeAmount, feeRate};
};
