jest.mock('../../../actions/actions/alert/dispatchers/alert', () => {
  let settle = () => {};
  return {
    createAlert: jest.fn(() => new Promise(resolve => { settle = resolve; })),
    resolveAlert: jest.fn(result => settle(result)),
  };
});
jest.mock('../../spendableKey/durableBroadcast', () => ({verifyPendingIdentityFunding: jest.fn()}));
const {createAlert} = require('../../../actions/actions/alert/dispatchers/alert');
const {verifiedClaimFees, confirmVerifiedClaimFees} = require('../../spendableKey/reviewFees');
const {verifyPendingIdentityFunding} = require('../../spendableKey/durableBroadcast');
const plan = () => ({transactions: [
  {type: 'identity', systemId: 'native', fundingApproval: {nativeFee: '20000', fees: {native: '20000', reserve: '50'}, explicitFees: {native: '10000'}}},
  {type: 'sweep', systemId: 'native', validation: {valid: true, fees: {native: '10000'}}},
]});

beforeEach(() => jest.clearAllMocks());
test('shows actual atomic fees by currency without double counting explicit fees or the fee cap', () => {
  expect(verifiedClaimFees(plan().transactions)).toEqual([
    {currency: 'native', atomic: '30000', coins: '0.0003'},
    {currency: 'reserve', atomic: '50', coins: '0.0000005'},
  ]);
  expect(verifyPendingIdentityFunding).toHaveBeenCalledWith(plan().transactions[0]);
});
test.each(['NaN', '-1', '0.5'])('rejects invalid fee %s', value => {
  const input = plan(); input.transactions[0].fundingApproval.nativeFee = value;
  expect(() => verifiedClaimFees(input.transactions)).toThrow(/invalid/);
});
test('cancel leaves the claim unapproved', async () => {
  const pending = confirmVerifiedClaimFees(plan(), currency => currency === 'native' ? 'VRSCTEST' : 'Reserve');
  const [, message, buttons] = createAlert.mock.calls[0];
  expect(message).toContain('0.0003 VRSCTEST');
  expect(message).toContain('0.0000005 Reserve');
  buttons[0].onPress();
  await expect(pending).resolves.toBe(false);
});
test('only explicit confirmation approves the claim', async () => {
  const pending = confirmVerifiedClaimFees(plan());
  createAlert.mock.calls[0][2][1].onPress();
  await expect(pending).resolves.toBe(true);
});
test('dismissal also cancels approval', async () => {
  // The app alert sheet runs the cancel-style action when it is dismissed.
  const pending = confirmVerifiedClaimFees(plan());
  const [, , buttons, options] = createAlert.mock.calls[0];
  expect(options.cancelable).toBe(true);
  buttons.find(button => button.style === 'cancel').onPress();
  await expect(pending).resolves.toBe(false);
});
