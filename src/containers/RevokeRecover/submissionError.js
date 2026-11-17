// Only classify known funding failures. Never show server text on the review.
export const revokeRecoverSubmissionError = (error, operation) => {
  const message = String(error?.message || '');
  const fundingChanged = /insufficient funds|not enough funds|missing(?: or spent)? inputs|inputs?.*(?:spent|no longer available)|funds.*changed|bad-txns-inputs-missingorspent/i.test(message);
  return fundingChanged
    ? `The ${operation} was not sent. The identity address needs funds for the network fee. Go back and review it again.`
    : `The ${operation} was not sent. The funds it uses may have changed. Go back and review it again.`;
};
