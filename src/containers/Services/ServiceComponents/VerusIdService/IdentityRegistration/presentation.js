import BigNumber from 'bignumber.js';
import {convertFqnToDisplayFormat} from '../../../../../utils/fullyqualifiedname';

// All SDK amounts are atomic integer strings. Never convert through Number.
export const formatRegistrationAmount = amount => new BigNumber(amount || '0')
  .dividedBy('100000000').toFixed(8).replace(/\.?0+$/, '');

export const registrationCostRows = quote => {
  if (!quote) return [];
  const rows = [];
  const add = (label, currencyID, amount, recipient) => {
    if (new BigNumber(amount || '0').isGreaterThan(0)) {
      rows.push({label, currencyID, amount, recipient});
    }
  };
  add(quote.branch === 'native' ? 'Registration charge (includes network fee)' : 'Network fee (includes import fee)',
    quote.systemID, quote.nativeFee);
  if (quote.issuerPayment) {
    const payment = quote.issuerPayment;
    add(payment.kind === 'burn' ? 'Namespace registration charge (burned)' : 'Namespace registration payment',
      payment.currencyID, payment.amount, payment.recipient);
  }
  for (const payment of quote.referralPayments || []) {
    add('Referral payment (included in registration price)', payment.currencyID, payment.amount, payment.recipient);
  }
  add('Transfer fee', quote.systemID, quote.transferFee);
  return rows;
};

// Labels are display-only. Full addresses remain available in explicit details.
export const identityLabel = (address, names = {}, fallback = 'Unresolved identity') => {
  if (!address) return fallback;
  const name = typeof names?.[address] === 'string' ? names[address].trim() : '';
  // Currency definitions may provide a bare name for the same i-address. An
  // identity recipient still needs its @ suffix, including the root identity.
  if (name && name !== address) return convertFqnToDisplayFormat(name);
  if (/^i[1-9A-HJ-NP-Za-km-z]{20,}$/.test(address)) return `${fallback} (${address.slice(0, 5)}…${address.slice(-4)})`;
  return address;
};

const states = {
  commitment_prepared: {title: 'Ready to commit', action: 'Review commitment', kind: 'ready', group: 'Needs you', step: 0,
    detail: 'Review the first payment to commit your name.', commitment: 'Ready for your approval', registration: 'After the commitment confirms'},
  commitment_confirmed: {title: 'Ready to register', action: 'Continue registration', kind: 'ready', group: 'Needs you', step: 1,
    detail: 'Your commitment is confirmed. One payment remains to create your identity.', commitment: 'Confirmed', registration: 'Ready for your approval'},
  registration_prepared: {title: 'Ready to register', action: 'Review registration', kind: 'ready', group: 'Needs you', step: 1,
    detail: 'Review the final payment to create your identity.', commitment: 'Confirmed', registration: 'Ready for your approval'},
  commitment_expired: {title: 'Commitment expired', action: 'Review replacement', kind: 'attention', group: 'Needs you', step: 0,
    detail: 'The commitment did not confirm. Review a replacement to continue.', commitment: 'Expired before confirmation', registration: 'Not started'},
  registration_expired: {title: 'Registration expired', action: 'Review registration', kind: 'attention', group: 'Needs you', step: 1,
    detail: 'Your commitment is saved. Review a new registration transaction to continue.', commitment: 'Confirmed', registration: 'Expired before confirmation'},
  registered: {title: 'Ready to link', action: 'Link to wallet', kind: 'ready', group: 'Needs you', step: 2, chainComplete: true,
    detail: 'Your identity is registered but isn’t linked to this wallet yet.', commitment: 'Confirmed', registration: 'Identity created'},
};

export const registrationState = status => {
  if (states[status]) return {...states[status], icon: states[status].kind === 'attention' ? 'alert-circle-outline' : 'arrow-right-circle-outline'};
  if (status === 'complete') return {title: 'Registered', action: 'View details', icon: 'check-circle-outline', kind: 'complete', group: 'Completed', step: 1, chainComplete: true,
    detail: 'Your identity is ready and linked to this wallet.', commitment: 'Confirmed', registration: 'Identity created'};
  if (['commitment_signed', 'commitment_broadcast_unknown', 'registration_signed', 'registration_broadcast_unknown'].includes(status)) {
    const registration = status.startsWith('registration_');
    return {title: 'Check delivery', action: 'Check progress', icon: 'cloud-sync-outline', kind: 'attention', group: 'Needs you', step: registration ? 1 : 0,
      detail: 'Your transaction is saved. Check its status or safely retry sending it.', commitment: registration ? 'Confirmed' : 'Checking delivery', registration: registration ? 'Checking delivery' : 'Not started'};
  }
  if (status === 'commitment_spent') return {
    title: 'Needs attention', action: 'Review progress', icon: 'alert-circle-outline', kind: 'attention', group: 'Needs you', step: 0,
    detail: 'We need to check this registration before you can continue. Your saved record is safe.', commitment: 'Checking status', registration: 'Waiting for commitment'};
  const registration = status === 'registration_broadcast';
  return {title: registration ? 'Confirming registration' : 'Confirming commitment', action: 'View progress', icon: 'clock-outline', kind: 'waiting', group: 'In progress', step: registration ? 1 : 0,
    detail: registration ? 'Your payment is sent. The identity will be ready after a block confirmation.' : 'Your name commitment is sent. Registration becomes available after a block confirmation.',
    commitment: registration ? 'Confirmed' : 'Waiting for a block', registration: registration ? 'Waiting for a block' : 'Not started'};
};

export const registrationStatusText = status => registrationState(status).title;
