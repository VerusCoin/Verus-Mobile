import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Keyboard, Text, View, useWindowDimensions} from 'react-native';
import {useSelector} from 'react-redux';
import {DLIGHT_PRIVATE, VRPC} from '../../../../../utils/constants/intervalConstants';
import {approveCommitment, findExistingRegistration, prepareCommitment, registrationQuotesEqual, resolveRegistration} from '../../../../../utils/identityRegistration';
import {formatRegistrationAmount} from '../../../../../utils/identityRegistration/costs';
import AppTextInput from '../../../../../components/AppTextInput';
import TextAction from '../../../../../components/TextAction';
import {SelectionRow} from '../../../../../components/SelectionSheet';
import {CircleAlert} from 'lucide-react-native';
import {toIAddress} from 'verus-typescript-primitives';
import {VerusIdFormField} from '../VerusIdFormScroll';
import {registrationNameError, registrationNameCheckError, isVerusIdTransportError, verusIdErrorMessage} from '../verusIdErrors';
import {ActionButton, currencyLabel, identityLabel, NameField, NamespaceSheet, RegistrationPage, RegistrationPreviewDetails, RegistrationSkeleton, RegistrationText, SelectionField, useRegistrationStyles} from './RegistrationDesign';
import {RegistrationPayerSheet, RegistrationFunds, RegistrationHero, RegistrationInfo, RegistrationSummary, RegistrationTimeline, registrationPayerName} from './RegistrationFlowComponents';
import {preferredRegistrationFundingSource, registrationFundingSources, registrationFundingState} from './fundingSources';
import {readRegistrationName, useRegistrationBalances} from './registrationReads';
import {loadRegistrationNamespaces} from './namespaceData';
import useRegistrationPrices from './useRegistrationPrices';
import useRegistrationAction from './useRegistrationAction';
import {useRegistrationExit} from './registrationNavigation';

const choiceError = (failure, value, field) => {
  if (isVerusIdTransportError(failure)) return 'Could not reach the server. Check your connection.';
  if (failure.code === -5 || failure.code === 'IDENTITY_NOT_FOUND') return `No VerusID named ${value}.`;
  if (failure.code === 'INVALID_REFERRAL') return 'Use a VerusID from this namespace.';
  if (['REFERRAL_TOO_NEW', 'REFERRAL_NOT_CONFIRMED'].includes(failure.code)) return 'This referral must confirm before you can use it.';
  if (failure.code === 'UNSUPPORTED_REFERRAL_POLICY') return 'This namespace does not allow this referral.';
  if (failure.code === 'REFERRAL_REQUIRED') return 'Enter a referral VerusID.';
  if (failure.code === 'INVALID_AUTHORITY') return 'Use an existing VerusID that is not revoked.';
  if (failure.code === 'REVOKED_IDENTITY') return 'This VerusID is revoked. Choose another.';
  if (['INVALID_REFERRAL_HISTORY', 'REFERRAL_HISTORY_UNAVAILABLE', 'UNSUPPORTED_REFERRAL_HISTORY', 'LOOKUP_MISMATCH'].includes(failure.code))
    return 'This VerusID could not be verified. Try again.';
  if (failure.code === 'INVALID_REFERRAL_POLICY') return 'This namespace does not allow this referral.';
  return verusIdErrorMessage(failure, `${field} could not be checked.`);
};

export default function NewRegistrationFlow({navigation, route}) {
  const exit = useRegistrationExit(navigation);
  const styles = useRegistrationStyles();
  const {height} = useWindowDimensions();
  const smallDevice = height <= 667;
  const coins = useSelector(state => state.coins.activeCoinsForUser || []);
  const account = useSelector(state => state.authentication.activeAccount);
  const linked = useSelector(state => state.channelStore_verusid.watchedVerusIds || {});
  const balances = useSelector(state => state.ledger?.balances || {});
  const showBalance = useSelector(state => state.coins.showBalance !== false);
  const wallets = useMemo(() => coins.filter(coin => coin.system_id === coin.currency_id &&
    account?.keys?.[coin.id]?.[VRPC]?.addresses?.length), [coins, account]);
  const [coinId, setCoinId] = useState(route.params?.coinId || wallets[0]?.id);
  const coin = wallets.find(item => item.id === coinId);
  const sources = useMemo(() => registrationFundingSources(coin, account, linked), [coin, account, linked]);
  const [name, setName] = useState('');
  const [namespace, setNamespace] = useState(route.params?.namespace || null);
  const [namespaceVisible, setNamespaceVisible] = useState(false);
  const [namespaces, setNamespaces] = useState([]);
  const [namespaceLoading, setNamespaceLoading] = useState(false);
  const [namespaceError, setNamespaceError] = useState(null);
  const [namespaceAttempt, setNamespaceAttempt] = useState(0);
  const [step, setStep] = useState('name');
  const [referralChoice, setReferral] = useState(null);
  const [referralName, setReferralName] = useState('');
  const [recovery, setRecovery] = useState('');
  const [revocation, setRevocation] = useState('');
  const [payerAddress, setPayerAddress] = useState(null);
  const [payerVisible, setPayerVisible] = useState(false);
  const [nameResult, setNameResult] = useState(null);
  const [fundsResult, setFundsResult] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [nameError, setNameError] = useState(null);
  const [previewResult, setPreviewResult] = useState(null);
  const [fieldsError, setFieldsError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const {context, busy, error, run, running, setError} = useRegistrationAction();
  const baseRequest = useMemo(() => coin && sources[0] ? {
    systemId: coin.system_id, chainTicker: coin.id, rootSystemName: coin.testnet ? 'VRSCTEST' : 'VRSC',
    fundingAddress: sources[0].address, signingAddress: sources[0].signingAddress, fundingName: 'Transparent', keyChannel: VRPC,
    name: name.trim(), ...(namespace ? {parent: namespace.id, parentName: namespace.parentName} : {}),
    ...(account?.keys?.[coin.id]?.[DLIGHT_PRIVATE]?.addresses?.[0] ? {privateAddress: account.keys[coin.id][DLIGHT_PRIVATE].addresses[0]} : {}),
  } : null, [coin, sources, name, namespace, account]);
  const nameKey = JSON.stringify(baseRequest);
  const data = nameResult?.key === nameKey ? nameResult.value : null;
  // Keep only display prices across name edits. Name availability and engine
  // previews remain bound to their complete request keys below.
  const fundsKey = JSON.stringify([context.sessionScope, coin?.id, coin?.system_id,
    namespace?.id, namespace?.parentName, sources.map(source => [source.address, source.signingAddress])]);
  const fundsData = data?.quote ? data : fundsResult?.key === fundsKey ? fundsResult.value : null;
  const sourceReads = useRegistrationBalances(coin, sources, context);
  const defaultSource = preferredRegistrationFundingSource(sources, coin, balances,
    fundsData?.referralRequired ? fundsData.referralQuote : fundsData?.quote, coins, sourceReads.reads);
  const payer = sources.find(source => source.address === payerAddress) || defaultSource;
  const referralRequired = data?.referralRequired || namespace?.referralRequired;
  const referralsAllowed = data?.referralsAllowed ?? (referralRequired || namespace?.referralsAllowed !== false);
  const foundationReferralAvailable = ['VRSC', 'VRSCTEST'].includes(coin?.id) &&
    (!namespace || namespace.id === coin.system_id) && referralsAllowed;
  const referralAffordable = registrationFundingState(data?.referralQuote, defaultSource, coin, coins, balances, sourceReads.reads).status === 'enough';
  const fullAffordable = registrationFundingState(data?.quote, defaultSource, coin, coins, balances, sourceReads.reads).status === 'enough';
  const referral = referralChoice ?? (foundationReferralAvailable && referralAffordable ? 'foundation'
    : !fullAffordable && referralAffordable ? 'other' : 'none');
  const referralID = referralRequired || referral === 'other' ? referralName.trim() : referral === 'foundation' ? 'Verus Coin Foundation@' : '';
  const authorityValue = value => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    try { if (data?.policy?.resolvedName?.identityID === toIAddress(trimmed, baseRequest.rootSystemName)) return ''; }
    catch (_) { /* The engine reports invalid input under this field. */ }
    return trimmed;
  };
  const request = useMemo(() => baseRequest && payer ? {...baseRequest,
    fundingAddress: payer.address, signingAddress: payer.signingAddress, fundingName: registrationPayerName(payer),
    ...(referralID ? {referralID} : {}), ...(authorityValue(recovery) ? {recoveryAuthority: authorityValue(recovery)} : {}),
    ...(authorityValue(revocation) ? {revocationAuthority: authorityValue(revocation)} : {}),
  } : null, [baseRequest, payer, referralID, recovery, revocation, data]);
  const requestKey = JSON.stringify(request);
  const currentKey = useRef(requestKey);
  currentKey.current = requestKey;
  const preview = previewResult?.key === requestKey ? previewResult.value : null;
  const prices = useRegistrationPrices(coin, preview?.quote || fundsData?.quote || {
    totalOperationRequired: {[namespace?.id || coin?.system_id]: '0', [coin?.system_id]: '0'},
  });
  const ownName = (preview?.policy ? identityLabel(preview.policy.resolvedName.identityID, preview.identityNames)
    : `${name.trim()}${namespace?.suffix || '@'}`);
  const steps = ['name', ...(referralsAllowed ? ['referral'] : []), 'check'];
  const fullState = source => registrationFundingState(fundsData?.quote, source, coin, coins, balances, sourceReads.reads);
  const refState = source => registrationFundingState(fundsData?.referralQuote, source, coin, coins, balances, sourceReads.reads);
  const fullEnough = sources.some(source => fullState(source).status === 'enough');
  const referralEnough = !!fundsData?.referralQuote && sources.some(source => refState(source).status === 'enough');
  const nameCandidates = sources.flatMap(source => [
    ...(!referralRequired ? [fullState(source)] : []), ...(fundsData?.referralQuote ? [refState(source)] : []),
  ]);
  const nameFunding = fullEnough && !referralRequired ? {status: 'enough'} : referralEnough ? {status: 'enough'}
    : nameCandidates.some(value => value.status === 'checking') ? {status: 'checking'}
      : nameCandidates.some(value => value.status === 'error') ? {status: 'error'}
        : (referralRequired || fundsData?.referralQuote ? refState(defaultSource) : fullState(defaultSource));
  const activeQuote = preview?.quote || ((referralID || referralRequired) ? data?.referralQuote : data?.quote);
  const payerState = source => registrationFundingState(activeQuote, source, coin, coins, balances, sourceReads.reads);

  useEffect(() => {
    if (!wallets.some(item => item.id === coinId) && wallets.length) setCoinId(wallets[0].id);
  }, [wallets, coinId]);
  useEffect(() => {
    setNameResult(null); setNameError(null); setAvailability(baseRequest?.name ? 'checking' : null);
    setError(null);
    if (!baseRequest?.name) return undefined;
    const invalid = registrationNameError(baseRequest.name);
    if (invalid) { setAvailability(null); setNameError(invalid); return undefined; }
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const saved = await findExistingRegistration(baseRequest, context);
        const value = saved ? {savedReview: saved} : await readRegistrationName(baseRequest, context);
        if (active) {
          setNameResult({key: nameKey, value});
          if (value.quote) setFundsResult({key: fundsKey, value: {
            quote: value.quote, referralQuote: value.referralQuote,
            currencyNames: value.currencyNames, referralRequired: value.referralRequired,
          }});
          setAvailability(saved ? 'saved' : 'available');
        }
      } catch (failure) {
        if (!active || failure.code === 'SESSION_CHANGED') return;
        setAvailability(failure.code === 'IDENTITY_EXISTS' ? 'taken' : null);
        if (failure.code !== 'IDENTITY_EXISTS') setNameError(registrationNameCheckError(failure));
      }
    }, 650);
    return () => { active = false; clearTimeout(timer); };
  }, [nameKey, fundsKey, context, attempt]);

  useEffect(() => {
    setPreviewResult(null); setFieldsError(null); setError(null);
    if (!data || data.savedReview || !request || (referralRequired && !referralID) || (referral === 'other' && !referralID)) return undefined;
    let active = true;
    const timer = setTimeout(() => resolveRegistration(request, context).then(value => {
      if (active) setPreviewResult({key: requestKey, value});
    }, failure => {
      if (!active || failure.code === 'SESSION_CHANGED') return;
      const field = failure.field || (String(failure.code).includes('REFERRAL') || referralID ? 'referralID' : 'form');
      const value = field === 'recoveryAuthority' ? recovery : field === 'revocationAuthority' ? revocation : referralID;
      setFieldsError({field, message: choiceError(failure, value, field), retryable: isVerusIdTransportError(failure) ||
        ['REFERRAL_HISTORY_UNAVAILABLE', 'INVALID_REFERRAL_HISTORY', 'LOOKUP_MISMATCH'].includes(failure.code)});
      if (failure.code === 'IDENTITY_EXISTS') {setAvailability('taken'); setNameResult(null); setStep('name');}
    }), 450);
    return () => { active = false; clearTimeout(timer); };
  }, [requestKey, data, context, attempt]);

  useEffect(() => {
    if (!namespaceVisible || !coin) return undefined;
    let active = true;
    setNamespaceLoading(true); setNamespaceError(null);
    loadRegistrationNamespaces(coin, sources[0]?.signingAddress, prices[coin.system_id]).then(items => {
      if (active) setNamespaces(items);
    }, () => { if (active) setNamespaceError('Namespaces could not be loaded. Try again.'); })
      .finally(() => { if (active) setNamespaceLoading(false); });
    return () => { active = false; };
  }, [namespaceVisible, coin, namespaceAttempt, sources[0]?.signingAddress, prices[coin?.system_id]]);

  const go = next => { if (running.current) return; Keyboard.dismiss(); setError(null); setStep(next); };
  const back = () => go(step === 'recovery' ? 'check' : steps[Math.max(0, steps.indexOf(step) - 1)]);
  const openSaved = saved => navigation.replace(saved.status === 'commitment_prepared' ? 'IdentityCommitmentReview' : 'IdentityRegistrationProgress', {jobId: saved.jobId});
  const continueStep = () => {
    if (busy) return;
    if (step === 'name' && data?.savedReview) { openSaved(data.savedReview); return; }
    go(steps[steps.indexOf(step) + 1] || 'check');
  };
  const retry = () => { setAttempt(value => value + 1); sourceReads.retry(); };
  const shown = preview;
  const enoughSelected = payerState(payer).status === 'enough';
  const ready = !busy && (step === 'name' ? !!data && (data.savedReview || nameFunding.status === 'enough')
    : step === 'referral' ? !!preview && enoughSelected && !fieldsError
      : step === 'recovery' ? !!preview && !fieldsError
      : !!shown && enoughSelected && !fieldsError);
  const start = () => {
    if (!ready || step !== 'check' || !shown) return;
    const heldKey = requestKey;
    return run(async requestContext => {
      const review = await prepareCommitment({request}, requestContext);
      if (heldKey !== currentKey.current) return review;
      if (review.status !== 'commitment_prepared') return review;
      const normalized = preview?.request;
      const equal = normalized &&
        registrationQuotesEqual(preview.quote, review.quote) && review.identityAddress === preview.policy.resolvedName.identityID &&
        review.fundingAddress === normalized.fundingAddress && review.signingAddress === normalized.signingAddress &&
        (review.referralID || null) === (normalized.referralID || null) &&
        review.identity.recoveryauthority === (normalized.recoveryAuthority || review.identityAddress) &&
        review.identity.revocationauthority === (normalized.revocationAuthority || review.identityAddress) &&
        (review.identity.privateaddress || null) === (normalized.privateAddress || null);
      if (!equal) return review;
      return approveCommitment(review.jobId, review.approvalToken, requestContext);
    }, review => {
      if (review.status === 'commitment_prepared') navigation.replace('IdentityCommitmentReview', {jobId: review.jobId});
      else navigation.replace('IdentityRegistrationProgress', {jobId: review.jobId});
    });
  };
  const save = () => { if (ready) run(() => prepareCommitment({request}, context), exit); };
  const authorityWarning = (id, value) => authorityValue(value)
    ? preview?.request[id] ? identityLabel(preview.request[id], preview.identityNames) : value.trim() : null;
  const recoveryWarning = authorityWarning('recoveryAuthority', recovery);
  const revocationWarning = authorityWarning('revocationAuthority', revocation);
  const field = (label, value, setValue, placeholder, helper, id, warning) => <VerusIdFormField>{focusProps => <>
    <AppTextInput {...focusProps} label={label} value={value} editable={!busy} onChangeText={setValue}
      placeholder={placeholder} helperText={helper} invalid={fieldsError?.field === id} />
    {warning && <View style={styles.notice}><Text style={styles.warningText}>{warning} can take control of {ownName}.</Text></View>}
    {fieldsError?.field === id && <View style={[styles.row, {gap: 6, alignItems: 'flex-start'}]} accessibilityRole="alert">
      <CircleAlert size={14} color={styles.errorText.color} /><Text style={[styles.errorText, {flex: 1}]}>{fieldsError.message}</Text>
    </View>}
  </>}</VerusIdFormField>;
  const referralField = field('Referral VerusID', referralName, setReferralName,
    namespace?.suffix && namespace.suffix !== '@' ? `name${namespace.suffix}` : 'friend@', undefined, 'referralID');
  const referralRowProps = quote => {
    const funding = registrationFundingState(quote, defaultSource, coin, coins, balances, sourceReads.reads);
    const id = quote?.feePricingCurrencyID || quote?.issuerID;
    return {value: formatRegistrationAmount(quote?.totalOperationRequired[id] || '0'),
      valueLabel: currencyLabel(id, data?.currencyNames), accessibilityRole: 'radio', showChevron: false,
      subtitle: funding.status === 'short' ? `Not enough ${currencyLabel(funding.currencyId, data?.currencyNames)}` : undefined};
  };
  const referralOnly = !fullEnough || !!(fundsData?.referralRequired || namespace?.referralRequired);
  const fundsSource = referralOnly && referralEnough
    ? preferredRegistrationFundingSource(sources, coin, balances, fundsData?.referralQuote, coins, sourceReads.reads) : defaultSource;
  const funds = compact => <RegistrationFunds compact={compact} data={fundsData} coin={coin} coins={coins} balances={balances} reads={sourceReads.reads}
    source={fundsSource} showBalance={showBalance} funding={nameFunding} referralOnly={referralOnly} onRetry={sourceReads.retry}
    prices={prices} namespace={namespace} smallDevice={smallDevice} loading={availability === 'checking'} />;
  const summary = shown && <RegistrationSummary name={ownName} referral={referralsAllowed
    ? preview?.request.referralID ? identityLabel(preview.request.referralID, {...preview.currencyNames, ...preview.identityNames}) : '' : null}
    payer={payer} recovery={preview?.request.recoveryAuthority ? identityLabel(preview.request.recoveryAuthority, preview.identityNames) : ownName}
    revocation={preview?.request.revocationAuthority ? identityLabel(preview.request.revocationAuthority, preview.identityNames) : ownName}
    disabled={busy} onName={() => go('name')}
    onReferral={() => go('referral')} onPayer={sources.length > 1 ? () => setPayerVisible(true) : undefined} onRecovery={() => go('recovery')} />;
  const pageError = fieldsError?.field === 'form' ? fieldsError : error;
  return <RegistrationPage navigation={navigation} title={{name: 'New VerusID', referral: 'Referral', check: 'Check details', recovery: 'Recovery'}[step]}
    keepKeyboardOnScroll={step === 'name'} busy={busy} busyRef={running} error={pageError} onRetry={retry} onBack={step !== 'name' ? back : undefined}
    progress={step === 'recovery' ? undefined : (steps.indexOf(step) + 1) / steps.length}
    info={<RegistrationInfo create name={ownName}><RegistrationPreviewDetails preview={preview} /></RegistrationInfo>}
    footer={({compactKeyboard}) => <>
      {compactKeyboard && step !== 'name' && step !== 'recovery' && data && <RegistrationFunds compact data={{...data, quote: activeQuote, referralQuote: null}} source={payer}
        coin={coin} coins={coins} balances={balances} reads={sourceReads.reads} showBalance={showBalance} funding={payerState(payer)} onRetry={sourceReads.retry} />}
      <ActionButton disabled={!ready} busy={busy} slide={step === 'check'} onPress={step === 'check' ? start : step === 'recovery' ? () => go('check') : continueStep}>
        {step === 'check' ? 'Slide to start' : step === 'recovery' ? 'Done' : 'Continue'}
      </ActionButton>
      {step === 'check' && !compactKeyboard && <ActionButton secondary disabled={!ready} onPress={save}>Save for later</ActionButton>}
    </>}>{({compactKeyboard}) => <>
      {step === 'name' && <>
        <View style={{gap: smallDevice ? 18 : 32}}>
          <NameField name={name} setName={setName} namespace={namespace} onNamespace={() => {Keyboard.dismiss(); setNamespaceVisible(true);}}
            busy={busy} availability={availability} previewError={nameError} onRetry={retry} />
          {funds(false)}
        </View>
        {!coin && <RegistrationText muted>Add a network wallet to continue.</RegistrationText>}
        {wallets.length > 1 && <SelectionField label="Network" value={`${coin?.display_ticker}${coin?.testnet ? ' · Testnet' : ''}`} disabled={busy}
          options={wallets.map(item => ({value: item.id, label: `${item.display_ticker}${item.testnet ? ' · Testnet' : ''}`, selected: item.id === coinId}))}
          onSelect={id => {setNamespace(null); setPayerAddress(null); setReferral(null); setReferralName(''); setCoinId(id);}} />}
      </>}
      {step === 'referral' && <>
        <RegistrationText muted>{referralRequired ? `Names in ${namespace?.suffix?.slice(1) || 'this namespace'} need a referral from a ${namespace?.suffix?.slice(1) || 'matching'} VerusID.`
          : namespace?.id && namespace.id !== coin.system_id ? `A ${namespace.suffix.slice(1)} referral lowers the price.` : 'A referral lowers the price.'}</RegistrationText>
        {referralRequired ? referralField : <>
          <View>
            {foundationReferralAvailable && <SelectionRow title="Verus Coin Foundation@"
              {...referralRowProps(data?.referralQuote)} selected={referral === 'foundation' && referralAffordable}
              disabled={!referralAffordable} onPress={() => setReferral('foundation')} />}
            <SelectionRow title="Someone else" {...referralRowProps(data?.referralQuote)} selected={referral === 'other' && referralAffordable}
              disabled={!referralAffordable} onPress={() => setReferral('other')} />
            <SelectionRow title="No referral" {...referralRowProps(data?.quote)} selected={referral === 'none' && fullAffordable}
              disabled={!fullAffordable} onPress={() => setReferral('none')} />
          </View>
          {referral === 'other' && referralField}
        </>}
        {fieldsError?.retryable && <TextAction onPress={retry}>Try again</TextAction>}
        {data?.quote && data.quote.branch !== 'native' && <RegistrationText muted>You also pay a small network fee in {currencyLabel(coin.system_id, data.currencyNames)}.</RegistrationText>}
      </>}
      {step === 'check' && (shown ? <>
        <RegistrationHero quote={shown.quote} currencyNames={shown.currencyNames} prices={prices} />
        <RegistrationTimeline check review={{status: 'commitment_prepared', ...preview}} />
        {summary}
      </> : <RegistrationSkeleton label="Checking registration details" />)}
      {step === 'recovery' && <View style={{gap: 24}}>
        {field('Recovery VerusID (optional)', recovery, setRecovery, ownName, 'Can restore your VerusID if it is revoked.', 'recoveryAuthority', recoveryWarning)}
        {field('Revocation VerusID (optional)', revocation, setRevocation, ownName, `Can revoke your VerusID. Leave both empty to use ${ownName} for both.`, 'revocationAuthority', revocationWarning !== recoveryWarning ? revocationWarning : null)}
        {fieldsError?.retryable && <TextAction onPress={retry}>Try again</TextAction>}
      </View>}
      <RegistrationPayerSheet visible={payerVisible} onClose={() => setPayerVisible(false)}
        onSelect={address => {if (!running.current) setPayerAddress(address);}} sources={sources} selectedAddress={payer?.address}
        quote={activeQuote} currencyNames={preview?.currencyNames || data?.currencyNames} coin={coin} coins={coins}
        balances={balances} reads={sourceReads.reads} showBalance={showBalance} onRetry={sourceReads.retry} />
      <NamespaceSheet visible={namespaceVisible} onClose={() => setNamespaceVisible(false)} namespaces={namespaces} selectedId={namespace?.id || coin?.system_id}
        onSelect={item => {setNamespace(item); setReferral(null); setReferralName('');}} loading={namespaceLoading} error={namespaceError} onRetry={() => setNamespaceAttempt(value => value + 1)} />
    </>}
  </RegistrationPage>;
}
