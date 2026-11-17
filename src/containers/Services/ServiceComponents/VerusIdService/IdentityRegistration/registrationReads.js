import {useCallback, useEffect, useMemo, useState} from 'react';
import {CurrencyIdentityRegistration, resolveIdentityRegistrationName} from 'verus-typescript-primitives';
import {assertIdentityRegistrationAvailable, quoteIdentityRegistration} from 'verusid-ts-client/lib/identity/registrationPolicy';
import {readRegistrationBalances} from '../../../../../utils/identityRegistration/funding';
import VrpcProvider from '../../../../../utils/vrpc/vrpcInterface';
import {registrationRpcResult} from '../../../../../utils/api/channels/verusid/requests/registerIdentity';
import {assertRegistrationContext, normalizeRegistrationRequest} from '../../../../../utils/identityRegistration/registration';

// Display-only policy quotes. No reservation, funding plan, or approval token
// is created here. Check details always resolves the actual referral through
// the engine before either hold can approve a payment.
export const readRegistrationName = async (request, context) => {
  assertRegistrationContext(context);
  const normalized = await normalizeRegistrationRequest({...request, referralID: '', recoveryAuthority: '', revocationAuthority: ''}, context);
  const resolvedName = resolveIdentityRegistrationName({...normalized, systemID: normalized.systemId});
  const rpc = VrpcProvider.getVerusIdInterface(request.systemId).interface;
  await assertIdentityRegistrationAvailable(rpc, resolvedName.identityID);
  const nativeDefinition = registrationRpcResult(await rpc.getCurrency(request.systemId), 'Get network');
  const parentDefinition = resolvedName.parent === request.systemId ? nativeDefinition
    : registrationRpcResult(await rpc.getCurrency(resolvedName.parent), 'Get namespace');
  const info = registrationRpcResult(await rpc.getInfo(), 'Get network height');
  assertRegistrationContext(context);
  const parent = CurrencyIdentityRegistration.fromJSON(parentDefinition);
  const branch = resolvedName.parent === request.systemId ? 'native'
    : parentDefinition.proofprotocol === 2 && (!parentDefinition.endblock || info.blocks + 1 < parentDefinition.endblock)
      ? 'token-payment' : 'token-burn';
  const policy = {resolvedName, nativeDefinition, parentDefinition, branch, candidateHeight: info.blocks + 1,
    issuerID: resolvedName.parent, feePricingCurrencyID: resolvedName.parent, referralRecipients: []};
  const quote = quoteIdentityRegistration(policy);
  const referralsAllowed = parent.getIDReferralLevels() > 0 || parent.IDReferralRequired();
  // The hypothetical recipient is only used by the SDK to quote the discount.
  // It is never displayed as a referral, persisted, or passed to preparation.
  const referralQuote = referralsAllowed ? quoteIdentityRegistration({...policy,
    referralID: resolvedName.parent, referralRecipients: [resolvedName.parent]}) : null;
  return {request: normalized, policy, quote, referralQuote, referralsAllowed,
    referralRequired: parent.IDReferralRequired(),
    currencyNames: {[request.systemId]: nativeDefinition.name, [resolvedName.parent]: parentDefinition.name}};
};

export const useRegistrationBalances = (coin, sources, context, version = '') => {
  const [state, setState] = useState({key: '', reads: {}});
  const [attempt, setAttempt] = useState(0);
  const key = JSON.stringify([coin?.system_id, sources.map(source => source.address), context.sessionScope, version, attempt]);
  useEffect(() => {
    if (!coin || !sources.length) return undefined;
    let active = true;
    setState({key, reads: {}});
    sources.forEach(source => readRegistrationBalances(coin, source, context, attempt > 0).then(value => {
      if (active) setState(current => ({key, reads: {...current.reads, [source.address]: value}}));
    }, error => {
      if (active && error.code !== 'SESSION_CHANGED') setState(current => ({key,
        reads: {...current.reads, [source.address]: {status: 'error'}}}));
    }));
    return () => { active = false; };
  }, [key]);
  const retry = useCallback(() => setAttempt(value => value + 1), []);
  return useMemo(() => ({reads: state.key === key ? state.reads : {}, retry}), [key, state, retry]);
};
