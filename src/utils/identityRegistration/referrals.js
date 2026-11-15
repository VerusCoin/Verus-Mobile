import {
  CurrencyIdentityRegistration,
  resolveIdentityRegistrationName,
} from 'verus-typescript-primitives';
import {getCurrency} from '../api/channels/verusid/requests/getCurrency';

export const registrationReferralNamespace = ({systemId, rootSystemName, name = ''}) => {
  if (!systemId) throw new Error('Select a registration network.');
  const registrationName = name.trim();
  // A bare leaf belongs to the selected native chain, including PBaaS chains.
  // Qualified sub-identities use their own namespace's registration currency.
  return registrationName.includes('.')
    ? resolveIdentityRegistrationName({
      name: registrationName,
      systemID: systemId,
      rootSystemName,
    }).parent
    : systemId;
};

// This is explanatory namespace pricing. The registration quote still verifies
// the chosen referrer's eligibility and history before any payment is approved.
export const getRegistrationReferralInfo = async ({systemId, rootSystemName, name = '', namespaceId}) => {
  const currencyID = namespaceId ?? registrationReferralNamespace({systemId, rootSystemName, name});
  const response = await getCurrency(systemId, currencyID);

  if (response?.error) {
    throw new Error(response.error.message || 'Unable to load referral amounts.');
  }

  const definition = response?.result;
  if (definition?.currencyid !== currencyID || definition?.systemid !== systemId) {
    throw new Error('The referral namespace does not match the selected registration network.');
  }

  const policy = CurrencyIdentityRegistration.fromJSON(definition);
  const enabled = policy.IDReferrals() && policy.getIDReferralLevels() > 0;

  return {
    // Integer rounding can make the discount one atom larger than the reward.
    discount: enabled
      ? policy.IDFullRegistrationAmount().sub(policy.IDReferredRegistrationAmount()).toString(10)
      : '0',
    reward: enabled ? policy.IDReferralAmount().toString(10) : '0',
    currencyID,
    currencyName: definition.fullyqualifiedname,
    enabled,
  };
};
