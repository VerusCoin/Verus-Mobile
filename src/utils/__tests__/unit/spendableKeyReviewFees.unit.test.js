jest.mock('react-native', () => ({Alert: {alert: jest.fn()}}));
jest.mock('../../spendableKey/durableBroadcast', () => ({verifyPendingIdentityFunding: jest.fn()}));
const {Alert} = require('react-native');
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
  const [, message, buttons] = Alert.alert.mock.calls[0];
  expect(message).toContain('0.0003 VRSCTEST');
  expect(message).toContain('0.0000005 Reserve');
  buttons[0].onPress();
  await expect(pending).resolves.toBe(false);
});
test('only explicit confirmation approves the claim', async () => {
  const pending = confirmVerifiedClaimFees(plan());
  Alert.alert.mock.calls[0][2][1].onPress();
  await expect(pending).resolves.toBe(true);
});
test('dismissal also cancels approval', async () => {
  const pending = confirmVerifiedClaimFees(plan());
  Alert.alert.mock.calls[0][3].onDismiss();
  await expect(pending).resolves.toBe(false);
});
