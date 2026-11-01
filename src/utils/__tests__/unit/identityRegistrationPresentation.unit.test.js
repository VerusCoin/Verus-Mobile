import BigNumber from 'bignumber.js';
import {
  formatRegistrationAmount,
  registrationCostRows,
} from '../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/presentation';

const SYSTEM_ID = 'native-currency';
const NAMESPACE_ID = 'namespace-token';

const sumByCurrency = rows => rows.reduce((totals, {currencyID, amount}) => ({
  ...totals,
  [currencyID]: new BigNumber(totals[currencyID] || '0').plus(amount).toFixed(0),
}), {});

describe('identity registration amount presentation', () => {
  it.each([
    ['0', '0'],
    [undefined, '0'],
    ['1', '0.00000001'],
    ['10000', '0.0001'],
    ['100000000', '1'],
    ['1000000000', '10'],
    ['123456780000', '1234.5678'],
    ['9007199254740993', '90071992.54740993'],
    ['9223372036854775807', '92233720368.54775807'],
  ])('displays %s atomic units exactly as %s', (atomic, expected) => {
    expect(formatRegistrationAmount(atomic)).toBe(expected);
  });

  it('distinguishes adjacent atomic amounts beyond JavaScript safe integer precision', () => {
    expect(formatRegistrationAmount('9007199254740992')).toBe('90071992.54740992');
    expect(formatRegistrationAmount('9007199254740993')).toBe('90071992.54740993');
  });
});

describe('identity registration cost presentation', () => {
  it('shows native referrals within the quoted registration price without adding the price twice', () => {
    const quote = Object.freeze({
      branch: 'native', systemID: SYSTEM_ID, commitmentFee: '10000',
      registrationOffer: '10000000000', nativeFee: '8000000000',
      importFee: '0', transferFee: '0',
      referralPayments: Object.freeze([
        Object.freeze({currencyID: SYSTEM_ID, amount: '1000000000', recipient: 'first-referrer'}),
        Object.freeze({currencyID: SYSTEM_ID, amount: '1000000000', recipient: 'second-referrer'}),
      ]),
      totalRequired: {[SYSTEM_ID]: '10000000000'},
      totalOperationRequired: {[SYSTEM_ID]: '10000010000'},
    });

    const rows = registrationCostRows(quote);

    expect(sumByCurrency(rows)).toEqual(quote.totalRequired);
    expect(rows[0]).toMatchObject({
      label: 'Registration charge (includes network fee)',
      amount: '8000000000', currencyID: SYSTEM_ID,
    });
    expect(rows.slice(1)).toEqual(quote.referralPayments.map(payment => ({
      label: 'Referral payment (included in registration price)', ...payment,
    })));
    expect(new BigNumber(sumByCurrency(rows)[SYSTEM_ID]).plus(quote.commitmentFee).toFixed(0))
      .toBe(quote.totalOperationRequired[SYSTEM_ID]);
  });

  it('separates token burn and referral amounts from native import and transfer fees', () => {
    const quote = {
      branch: 'token-burn', systemID: SYSTEM_ID, commitmentFee: '10000',
      registrationOffer: '8000000000', nativeFee: '10000',
      importFee: '10000', transferFee: '20000',
      issuerPayment: {
        kind: 'burn', currencyID: NAMESPACE_ID, amount: '6000000000', recipient: NAMESPACE_ID,
      },
      referralPayments: [
        {currencyID: NAMESPACE_ID, amount: '1000000000', recipient: 'first-referrer'},
        {currencyID: NAMESPACE_ID, amount: '1000000000', recipient: 'second-referrer'},
      ],
      totalRequired: {[SYSTEM_ID]: '30000', [NAMESPACE_ID]: '8000000000'},
      totalOperationRequired: {[SYSTEM_ID]: '40000', [NAMESPACE_ID]: '8000000000'},
    };

    const rows = registrationCostRows(quote);

    expect(sumByCurrency(rows)).toEqual(quote.totalRequired);
    expect(rows.filter(row => row.currencyID === SYSTEM_ID)).toEqual([
      {label: 'Network fee (includes import fee)', currencyID: SYSTEM_ID, amount: '10000', recipient: undefined},
      {label: 'Transfer fee', currencyID: SYSTEM_ID, amount: '20000', recipient: undefined},
    ]);
    expect(rows.find(row => row.recipient === NAMESPACE_ID)).toEqual({
      label: 'Namespace registration charge (burned)',
      currencyID: NAMESPACE_ID, amount: '6000000000', recipient: NAMESPACE_ID,
    });
    expect(new BigNumber(sumByCurrency(rows)[SYSTEM_ID]).plus(quote.commitmentFee).toFixed(0))
      .toBe(quote.totalOperationRequired[SYSTEM_ID]);
  });

  it('identifies an issuer payment without describing it as a burn or losing token precision', () => {
    const quote = {
      branch: 'token-payment', systemID: SYSTEM_ID, nativeFee: '10000', transferFee: '0',
      issuerPayment: {
        kind: 'payment', currencyID: NAMESPACE_ID,
        amount: '9007199254740993', recipient: NAMESPACE_ID,
      },
      totalRequired: {[SYSTEM_ID]: '10000', [NAMESPACE_ID]: '9007199254740993'},
    };

    const rows = registrationCostRows(quote);

    expect(sumByCurrency(rows)).toEqual(quote.totalRequired);
    expect(rows[1]).toEqual({
      label: 'Namespace registration payment', currencyID: NAMESPACE_ID,
      amount: '9007199254740993', recipient: NAMESPACE_ID,
    });
  });

  it('omits zero-value line items while keeping zero totals displayable', () => {
    const quote = {
      branch: 'native', systemID: SYSTEM_ID, nativeFee: '0', transferFee: '0',
      referralPayments: [{currencyID: SYSTEM_ID, amount: '0', recipient: 'referrer'}],
      totalRequired: {[SYSTEM_ID]: '0'},
    };

    expect(registrationCostRows(quote)).toEqual([]);
    expect(formatRegistrationAmount(quote.totalRequired[SYSTEM_ID])).toBe('0');
    expect(registrationCostRows(undefined)).toEqual([]);
  });
});

const {identityLabel, registrationState} = require('../../../containers/Services/ServiceComponents/VerusIdService/IdentityRegistration/presentation');

describe('registration names and next actions', () => {
  it('uses friendly names and keeps unknown identity fallbacks compact', () => {
    const address = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
    expect(identityLabel(address, {[address]: 't1@'})).toBe('t1@');
    expect(identityLabel(address)).toBe('Unresolved identity (iJhCe…f2yq)');
    expect(identityLabel(address)).not.toContain(address);
  });

  it.each([
    ['VRSCTEST', 'VRSCTEST@'],
    ['Champions', 'Champions@'],
    ['friend.VRSCTEST', 'friend.VRSCTEST@'],
    ['friend.vRsCtEsT@', 'friend.vRsCtEsT@'],
    ['friend.VRSC@', 'friend@'],
    ['friend.Champions.VRSCTEST@', 'friend.Champions.VRSCTEST@'],
    ['friend.Champions', 'friend.Champions@'],
    ['friend@', 'friend@'],
    [' friend@ ', 'friend@'],
  ])('shows the identity suffix when a resolved label is %s', (name, expected) => {
    const address = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
    expect(identityLabel(address, {[address]: name})).toBe(expected);
  });

  it.each([
    ['commitment_prepared', 'Needs you', 'Review commitment', 0],
    ['commitment_broadcast', 'In progress', 'View progress', 0],
    ['commitment_confirmed', 'Needs you', 'Continue registration', 1],
    ['registration_prepared', 'Needs you', 'Review registration', 1],
    ['registration_broadcast', 'In progress', 'View progress', 1],
    ['commitment_expired', 'Needs you', 'Review replacement', 0],
    ['registration_expired', 'Needs you', 'Review registration', 1],
    ['registered', 'Needs you', 'Link to wallet', 2],
    ['complete', 'Completed', 'View details', 1],
  ])('%s has a distinct stage and next action', (status, group, action, step) => {
    expect(registrationState(status)).toMatchObject({group, action, step});
  });

  it('never describes an unconfirmed commitment as a created identity', () => {
    expect(registrationState('commitment_broadcast')).toMatchObject({
      kind: 'waiting', commitment: 'Waiting for a block', registration: 'Not started',
    });
    expect(registrationState('registration_broadcast')).toMatchObject({
      kind: 'waiting', commitment: 'Confirmed', registration: 'Waiting for a block',
    });
    expect(registrationState('complete')).toMatchObject({kind: 'complete', registration: 'Identity created'});
  });

  it('keeps both on-chain steps complete while asking to link a newly registered identity', () => {
    expect(registrationState('registered')).toMatchObject({
      kind: 'ready', group: 'Needs you', action: 'Link to wallet', step: 2,
      commitment: 'Confirmed', registration: 'Identity created', chainComplete: true,
    });
    expect(registrationState('registered').detail).toContain('isn’t linked');
    expect(registrationState('complete')).toMatchObject({kind: 'complete', group: 'Completed', chainComplete: true});
    expect(registrationState('complete').detail).toContain('linked to this wallet');
  });
});
