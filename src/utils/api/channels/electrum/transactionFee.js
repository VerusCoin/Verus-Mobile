import BigNumber from "bignumber.js";

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

export const calculatePotentialTransactionFee = (
  inputs,
  spendValue,
  changeValue,
) => {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new Error("Cannot calculate transaction fee without inputs.");
  }

  const inputTotal = inputs.reduce((total, input) => {
    if (input == null || input.verifiedValueSats == null) {
      throw new Error(
        "Cannot verify transaction fee without verified input values.",
      );
    }

    return total.plus(
      toSatoshiAmount(input.verifiedValueSats, "verified input"),
    );
  }, BigNumber(0));

  const outputTotal = toSatoshiAmount(spendValue, "spend output").plus(
    toSatoshiAmount(changeValue, "change output"),
  );

  return inputTotal.minus(outputTotal);
};

export const assertSanePotentialTransactionFee = (
  inputs,
  spendValue,
  changeValue,
  expectedFee,
) => {
  const calculatedFee = calculatePotentialTransactionFee(
    inputs,
    spendValue,
    changeValue,
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
