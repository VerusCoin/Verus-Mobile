import {toIAddress} from 'verus-typescript-primitives';
import {getCurrency} from '../../api/channels/verusid/requests/getCurrency';
import {getRegistrationReferralInfo, registrationReferralNamespace} from '../../identityRegistration/referrals';

jest.mock('../../api/channels/verusid/requests/getCurrency', () => ({getCurrency: jest.fn()}));

const VRSC = 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV';
const VRSCTEST = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const definition = (currencyID, currencyName, fields = {}) => ({
  currencyid: currencyID,
  systemid: currencyID,
  fullyqualifiedname: currencyName,
  options: 264,
  idregistrationfees: 100,
  idreferrallevels: 3,
  idimportfees: 0.02,
  ...fields,
});

beforeEach(() => getCurrency.mockReset());

it.each([
  [VRSC, 'VRSC'],
  [VRSCTEST, 'VRSCTEST'],
])('reads the referral amounts from the selected root chain %s', async (systemId, rootSystemName) => {
  getCurrency.mockResolvedValue({result: definition(systemId, rootSystemName)});

  await expect(getRegistrationReferralInfo({systemId, rootSystemName, name: 'alice'})).resolves.toEqual({
    discount: '2000000000', reward: '2000000000', enabled: true,
    currencyID: systemId, currencyName: rootSystemName,
  });
  expect(getCurrency).toHaveBeenCalledWith(systemId, systemId);
});

it.each(['', 'alice', 'alice@'])('uses another selected native chain for a bare name %s', async name => {
  const systemId = toIAddress('example.VRSCTEST@', 'VRSCTEST');
  getCurrency.mockResolvedValue({result: definition(systemId, 'example', {
    idregistrationfees: 12, idreferrallevels: 2,
  })});

  await expect(getRegistrationReferralInfo({systemId, rootSystemName: 'VRSCTEST', name})).resolves.toMatchObject({
    discount: '300000000', reward: '300000000', currencyID: systemId, currencyName: 'example', enabled: true,
  });
  expect(getCurrency).toHaveBeenCalledWith(systemId, systemId);
});

it('uses a sub-identity namespace policy and currency instead of its host chain', async () => {
  const namespaceID = toIAddress('community.VRSC@', 'VRSC');
  getCurrency.mockResolvedValue({result: definition(namespaceID, 'community', {
    systemid: VRSC, options: 40, idregistrationfees: 10,
  })});

  await expect(getRegistrationReferralInfo({
    systemId: VRSC, rootSystemName: 'VRSC', name: ' alice.community@ ',
  })).resolves.toEqual({
    discount: '200000000', reward: '200000000', enabled: true,
    currencyID: namespaceID, currencyName: 'community',
  });
  expect(getCurrency).toHaveBeenCalledWith(VRSC, namespaceID);
});

it('can fetch a pre-resolved namespace independently of the typed leaf name', async () => {
  const namespaceId = registrationReferralNamespace({
    systemId: VRSC, rootSystemName: 'VRSC', name: 'alice.community@',
  });
  getCurrency.mockResolvedValue({result: definition(namespaceId, 'community', {systemid: VRSC})});

  await expect(getRegistrationReferralInfo({systemId: VRSC, rootSystemName: 'VRSC', namespaceId}))
    .resolves.toMatchObject({currencyID: namespaceId});
  expect(getCurrency).toHaveBeenCalledWith(VRSC, namespaceId);
});

it('keeps discount and reward rounding exact beyond JavaScript integer precision', async () => {
  getCurrency.mockResolvedValue({result: definition(VRSC, 'VRSC', {
    idregistrationfees: '90071992.54740993',
  })});

  await expect(getRegistrationReferralInfo({systemId: VRSC, rootSystemName: 'VRSC'})).resolves.toMatchObject({
    discount: '1801439850948199', reward: '1801439850948198', enabled: true,
  });
});

it.each([
  {options: 256},
  {idreferrallevels: 0},
  {options: 272},
])('does not promise economic referral benefits for an inactive policy %j', async fields => {
  getCurrency.mockResolvedValue({result: definition(VRSC, 'VRSC', fields)});

  await expect(getRegistrationReferralInfo({systemId: VRSC, rootSystemName: 'VRSC'})).resolves.toMatchObject({
    discount: '0', reward: '0', enabled: false,
  });
});

it.each([
  {error: {message: 'Currency unavailable'}},
  {},
  {result: definition(VRSCTEST, 'VRSCTEST')},
  {result: definition(VRSC, 'VRSC', {systemid: VRSCTEST})},
  {result: definition(VRSC, 'VRSC', {idregistrationfees: -1})},
])('rejects an unavailable, mismatched, or invalid policy instead of inventing amounts', async response => {
  getCurrency.mockResolvedValue(response);

  await expect(getRegistrationReferralInfo({systemId: VRSC, rootSystemName: 'VRSC'})).rejects.toThrow();
});

it('does not look up a guessed namespace when a qualified name is incomplete', async () => {
  await expect(getRegistrationReferralInfo({
    systemId: VRSC, rootSystemName: 'VRSC', name: 'alice..community@',
  })).rejects.toThrow();
  expect(getCurrency).not.toHaveBeenCalled();
});
