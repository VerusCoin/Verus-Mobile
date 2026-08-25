export const getSingleSendCurrencyOutput = transaction => {
  if (
    transaction == null ||
    !Array.isArray(transaction.outs) ||
    transaction.outs.length !== 1
  ) {
    throw new Error(
      "Expected sendcurrency transaction to contain exactly one output.",
    );
  }

  return transaction.outs[0];
};
