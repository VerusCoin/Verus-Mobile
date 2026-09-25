export const sendWithBalanceCheck = async (send, getBalance) => {
  // Capture a fresh balance before submitting anything to the network.
  const balanceBefore = await getBalance();

  try {
    return await send();
  } catch (e) {
    if (e.code === 'INSUFFICIENT_FUNDS' || e.code === 'ACTION_REJECTED') {
      throw e;
    }

    let balanceMessage = 'Your balance could not be checked.';
    try {
      const balanceAfter = await getBalance();
      balanceMessage = balanceAfter !== balanceBefore
        ? 'Your balance changed, so funds may have been sent.'
        : 'Your balance has not changed yet, but the payment may still be pending.';
    } catch (_) {
      // A failed lookup does not make it safe to submit another payment.
    }

    const error = new Error(
      `The send response could not be confirmed. ${balanceMessage} Do not send again until you have checked your transaction history.`,
    );
    error.ambiguousBroadcast = true;
    throw error;
  }
};
