import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Alert, AppState, Pressable, View} from 'react-native';
import {ActivityIndicator, Text, TextInput} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {useSelector} from 'react-redux';
import {useFocusEffect} from '@react-navigation/native';
import {VRPC} from '../../../../../utils/constants/intervalConstants';
import {
  createRegistrationContext, prepareCommitment, deleteRegistration,
  getRegistrationReview, approveCommitment, prepareRegistration,
  approveRegistration, retryBroadcast, reconcileRegistration, refreshRegistrationReview, linkRegisteredIdentity,
} from '../../../../../utils/identityRegistration';
import {
  RegistrationPage, CostReview, IdentitySummary, AmountRows, ActionButton,
  Disclosure, RegistrationDetails, RegistrationSteps, RegistrationListItem,
  SelectionField, StatusBadge, currencyLabel, registrationStyles as styles,
} from './RegistrationComponents';
import {identityLabel, registrationState} from './presentation';
import {preferredRegistrationFundingSource, registrationFundingBalance, registrationFundingSources} from './fundingSources';
import {formatRegistrationAmount} from '../../../../../utils/identityRegistration/costs';
import Colors from '../../../../../globals/colors';

// A ref closes the double-tap window before React renders a disabled button.
const useRegistrationAction = () => {
  const context = useMemo(() => createRegistrationContext(), []);
  const mounted = useRef(true);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const run = useCallback(async (operation, onSuccess) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await operation(context);
      if (mounted.current && onSuccess) onSuccess(result);
    } catch (e) {
      if (mounted.current && e.code !== 'SESSION_CHANGED') {
        // A new object makes every failure visible, even when a fast retry
        // returns the same message before the cleared state renders.
        setError({message: (e.message || 'Unable to complete this step. Your saved registration is preserved.')
          .replace(/\bi[1-9A-HJ-NP-Za-km-z]{20,40}\b/g, address => identityLabel(address))});
      }
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [context]);
  return {context, busy, error, run, running};
};

const confirmRegistrationDeletion = (record, remove, close) => {
  const kind = record.deletionKind;
  if (!kind) { close(); return; }
  let message = kind === 'completed'
    ? 'Remove this finished registration from the list? Your identity stays registered and linked wallets are kept.'
    : 'Remove this saved draft? No payment has been sent.';
  if (kind === 'commitment') {
    const fee = record.commitmentFee || record.quote?.commitmentFee;
    let amount;
    try { amount = formatRegistrationAmount(fee); } catch (_) { close(); return; }
    const systemId = record.systemId || record.quote?.systemID;
    const currency = currencyLabel(systemId, {[systemId]: record.chainTicker, ...record.currencyNames});
    message = `Deleting permanently removes the saved commitment secret. The ${amount} ${currency} commitment fee will be lost forever, and you cannot finish this registration. This cannot be undone.`;
  }
  Alert.alert(`Delete ${record.displayName}?`, message, [
    {text: 'Keep registration', style: 'cancel', onPress: close},
    {text: 'Delete', style: 'destructive', onPress: () => { close(); return remove(); }},
  ], {cancelable: true, onDismiss: close});
};

export function IdentityRegistrationStart({navigation, route}) {
  const jobs = useSelector(state => state.channelStore_verusid.registrationJobs || {});
  const [openingJobId, setOpeningJobId] = useState(null);
  const [deletingJobId, setDeletingJobId] = useState(null);
  const deletePromptOpen = useRef(false);
  const {busy, error, run} = useRegistrationAction();
  const visible = Object.values(jobs).filter(job => job.status !== 'cancelled_tracking')
    .sort((left, right) => (right.updatedAt || right.createdAt) - (left.updatedAt || left.createdAt));
  const active = visible.filter(job => registrationState(job.status).kind !== 'complete');
  const completed = visible.filter(job => registrationState(job.status).kind === 'complete');
  const open = job => {
    const jobId = job.id;
    if (job.status === 'commitment_prepared') navigation.navigate('IdentityCommitmentReview', {jobId});
    else if (job.status === 'registration_prepared') navigation.navigate('IdentityRegistrationReview', {jobId});
    else if (['commitment_confirmed', 'registration_expired'].includes(job.status)) {
      setOpeningJobId(jobId);
      run(context => prepareRegistration({jobId}, context), () => navigation.navigate('IdentityRegistrationReview', {jobId}))
        .finally(() => setOpeningJobId(null));
    } else navigation.navigate('IdentityRegistrationProgress', {jobId});
  };
  const confirmDelete = job => {
    if (busy || deletePromptOpen.current) return;
    deletePromptOpen.current = true;
    confirmRegistrationDeletion(job, () => {
      setDeletingJobId(job.id);
      return run(context => deleteRegistration(job.id, job.deletionKind, context)).finally(() => setDeletingJobId(null));
    }, () => { deletePromptOpen.current = false; });
  };
  const renderJob = job => <RegistrationListItem key={job.id} job={job} disabled={busy}
    busy={busy && openingJobId === job.id} onPress={() => open(job)}
    onDelete={job.deletionKind ? () => confirmDelete(job) : undefined}
    deleting={busy && deletingJobId === job.id} />;
  return <RegistrationPage error={error} footer={
    <ActionButton disabled={busy} onPress={() => navigation.navigate('IdentityRegistrationCreate', route.params?.coinId ? {coinId: route.params.coinId} : undefined)}>Create a VerusID</ActionButton>
  }>
    <View style={styles.section}>
      <Text style={styles.title}>Your registrations</Text>
      <Text style={styles.muted}>Create a VerusID or continue where you left off.</Text>
    </View>
    {!active.length && !completed.length && <View style={styles.card}>
      <View style={styles.badge}><Icon name="at" size={28} color={Colors.primaryColor} accessible={false} /></View>
      <Text style={styles.subtitle}>A name that’s yours</Text>
      <Text style={styles.body}>Commit a name, then register it after confirmation. You review and approve each payment.</Text>
    </View>}
    {['Needs you', 'In progress'].map(group => {
      const items = active.filter(job => registrationState(job.status).group === group);
      return items.length > 0 && <View key={group} style={styles.section}>
        <Text style={styles.eyebrow}>{group.toUpperCase()}</Text>
        {items.map(renderJob)}
      </View>;
    })}
    {!!completed.length && <Disclosure title={`Completed (${completed.length})`}>
      {completed.map(renderJob)}
    </Disclosure>}
  </RegistrationPage>;
}

export function IdentityRegistrationCreate({navigation, route}) {
  const coins = useSelector(state => state.coins.activeCoinsForUser);
  const account = useSelector(state => state.authentication.activeAccount);
  const linkedIds = useSelector(state => state.channelStore_verusid.watchedVerusIds || {});
  const balances = useSelector(state => state.ledger?.balances || {});
  const showBalance = useSelector(state => state.coins.showBalance !== false);
  const wallets = useMemo(() => (coins || []).filter(coin =>
    coin.system_id === coin.currency_id && account?.keys?.[coin.id]?.[VRPC]?.addresses?.length > 0,
  ), [coins, account]);
  const [coinId, setCoinId] = useState(route.params?.coinId || wallets[0]?.id);
  const selected = wallets.find(coin => coin.id === coinId);
  const fundingSources = useMemo(() => registrationFundingSources(selected, account, linkedIds), [selected, account, linkedIds]);
  const [manualFunding, setManualFunding] = useState({});
  const fundingSource = fundingSources.find(source => source.address === manualFunding[coinId]) ||
    preferredRegistrationFundingSource(fundingSources, selected, balances);
  const [name, setName] = useState('');
  const [referralID, setReferralID] = useState('');
  const [recoveryAuthority, setRecoveryAuthority] = useState('');
  const [revocationAuthority, setRevocationAuthority] = useState('');
  const [estimate, setEstimate] = useState(null);
  const {busy, error, run} = useRegistrationAction();
  useEffect(() => {
    if (wallets.length && !wallets.some(coin => coin.id === coinId)) {
      setCoinId(wallets[0].id);
    }
  }, [wallets, coinId]);
  useEffect(() => { setEstimate(null); }, [coinId, fundingSource?.address, name, referralID, recoveryAuthority, revocationAuthority]);

  const reviewCommitment = () => run(async context => {
    setEstimate(null);
    const request = {
      systemId: selected.system_id, chainTicker: selected.id,
      rootSystemName: selected.testnet ? 'VRSCTEST' : 'VRSC',
      fundingAddress: fundingSource.address, signingAddress: fundingSource.signingAddress,
      fundingName: fundingSource.fundingName, keyChannel: VRPC, name: name.trim(),
      ...(referralID.trim() ? {referralID: referralID.trim()} : {}),
      ...(recoveryAuthority.trim() ? {recoveryAuthority: recoveryAuthority.trim()} : {}),
      ...(revocationAuthority.trim() ? {revocationAuthority: revocationAuthority.trim()} : {}),
    };
    try {
      return await prepareCommitment({request}, context);
    } catch (failure) {
      // Keep the quote visible when funding needs attention, without inserting
      // another review into a successful transition to the payment screen.
      if (failure.code !== 'SESSION_CHANGED' && failure.registrationEstimate) {
        setEstimate(failure.registrationEstimate);
      }
      throw failure;
    }
  }, review => navigation.navigate(review.status === 'commitment_prepared' ? 'IdentityCommitmentReview'
    : review.status === 'registration_prepared' ? 'IdentityRegistrationReview' : 'IdentityRegistrationProgress', {jobId: review.jobId}));

  const networkName = coin => `${coin.display_ticker}${coin.testnet ? ' · Testnet' : ''}`;
  return <RegistrationPage error={error} footer={<>
    <Text style={[styles.muted, {textAlign: 'center'}]}>No payment yet.</Text>
    <ActionButton disabled={busy || !selected || !fundingSource || !name.trim()} busy={busy} onPress={reviewCommitment}>Review costs</ActionButton>
  </>}>
    <View style={styles.section}>
      <Text style={styles.title}>Choose your name</Text>
      <Text style={styles.muted}>You’ll see both costs before making a payment.</Text>
    </View>
    <View style={styles.card}>
      <TextInput mode="outlined" label="Identity name" accessibilityLabel="Identity name" placeholder="alice" value={name} onChangeText={setName}
        autoCapitalize="none" autoCorrect={false} disabled={busy} outlineColor="#b9c3d3" activeOutlineColor={Colors.primaryColor} style={{backgroundColor: '#fff'}} />
      <Text style={styles.muted}>For a sub-identity, use its full name: alice.community@</Text>
      <SelectionField label="Network" value={selected ? networkName(selected) : 'Add a network wallet to continue'} disabled={busy}
        options={wallets.map(coin => ({value: coin.id, label: networkName(coin), selected: coin.id === coinId}))}
        onSelect={setCoinId} />
      <View style={styles.divider} />
      <SelectionField label="Pay from" value={fundingSource?.fundingName || 'Choose a payment source'} disabled={busy}
        options={fundingSources.map(source => {
          const balance = registrationFundingBalance(selected, source, balances);
          return {value: source.address, label: source.fundingName, selected: source.address === fundingSource?.address,
            description: balance != null && showBalance ? `${String(balance)} ${selected.display_ticker} confirmed` : source.isIdentity ? 'Linked VerusID' : 'Your wallet balance'};
        })} onSelect={address => setManualFunding(current => ({...current, [coinId]: address}))} />
      <Text style={styles.muted}>Both payments use this source. Change returns here.</Text>
    </View>
    <View style={styles.card}>
      <Text style={styles.subtitle}>Save with a referral</Text>
      <Text style={styles.muted}>An eligible VerusID referral discounts your registration cost. You’ll see the discounted price before paying.</Text>
      <TextInput mode="outlined" label="Referral (optional)" accessibilityLabel="Referral identity, optional" placeholder="friend@" value={referralID} onChangeText={setReferralID} autoCapitalize="none" autoCorrect={false} disabled={busy} style={{backgroundColor: '#fff'}} />
    </View>
    <View style={styles.card}>
      <Disclosure title="Recovery & revocation" summary={recoveryAuthority || revocationAuthority ? 'Custom settings' : 'Optional · defaults to this identity'}>
        <TextInput mode="outlined" label="Recovery identity (optional)" accessibilityLabel="Recovery identity, optional" placeholder="alice@" value={recoveryAuthority} onChangeText={setRecoveryAuthority} autoCapitalize="none" autoCorrect={false} disabled={busy} />
        <Text style={styles.muted}>Can restore your identity if it is revoked.</Text>
        <TextInput mode="outlined" label="Revocation identity (optional)" accessibilityLabel="Revocation identity, optional" placeholder="alice@" value={revocationAuthority} onChangeText={setRevocationAuthority} autoCapitalize="none" autoCorrect={false} disabled={busy} />
        <Text style={styles.muted}>Can revoke your identity. Leave both empty to manage it yourself.</Text>
      </Disclosure>
    </View>
    {estimate && <CostReview {...estimate} stage="commitment" />}
    <Disclosure title="How registration works">
      <Text style={styles.body}>First, pay a small fee to commit your name. After a block confirmation, review a separate payment to create the identity.</Text>
      <Text style={styles.muted}>A commitment hides your name on-chain until registration, but doesn’t reserve it. The RPC server sees the name when checking availability. Sub-identities require an eligible currency namespace.</Text>
    </Disclosure>
  </RegistrationPage>;
}

const PaymentReview = ({navigation, route, stage}) => {
  const {jobId} = route.params;
  const [review, setReview] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState(false);
  const {busy, error, run, running} = useRegistrationAction();
  useFocusEffect(useCallback(() => {
    setAccepted(false);
    run(context => getRegistrationReview(jobId, context), setReview);
  }, [jobId, run]));
  const isCommitment = stage === 'commitment';
  const ready = review?.status === `${stage}_prepared`;
  const refresh = async (fromPull = false) => {
    if (busy) return;
    setAccepted(false);
    // Starting the native pull indicator from a button halfway down the page
    // changes the scroll offset and can hide an error when refreshing ends.
    setRefreshing(fromPull);
    try {
      await run(context => refreshRegistrationReview(jobId, context), setReview);
    } finally {
      setRefreshing(false);
    }
  };
  const approve = () => {
    if (running.current) return;
    setApproving(true);
    return run(context => isCommitment ? approveCommitment(jobId, review.approvalToken, context) : approveRegistration(jobId, review.approvalToken, context), result => {
      setAccepted(false);
      navigation.replace('IdentityRegistrationProgress', {jobId: result.jobId});
    }).finally(() => setApproving(false));
  };
  const paymentAction = <>
    {!!review && <Pressable accessibilityRole="checkbox" accessibilityLabel={isCommitment ? 'I approve the commitment fee shown above.' : 'I approve this identity and registration payment.'}
      accessibilityState={{checked: accepted, disabled: busy || !ready || !!error}}
      onPress={() => setAccepted(!accepted)} disabled={busy || !ready || !!error}
      style={({pressed}) => [styles.row, styles.touchRow, {alignItems: 'flex-start', opacity: pressed ? 0.6 : 1}]}>
      <Icon name={accepted ? 'checkbox-marked' : 'checkbox-blank-outline'} color={Colors.primaryColor} size={26} accessible={false} />
      <Text style={[styles.body, styles.flexible]}>{isCommitment ? 'I approve the commitment fee shown above.' : 'I approve this identity and registration payment.'}</Text>
    </Pressable>}
    <ActionButton onPress={approve} disabled={busy || !accepted || !ready || !!error} busy={approving}>{isCommitment ? 'Pay & commit name' : 'Pay & register identity'}</ActionButton>
  </>;
  return <RegistrationPage error={error} refreshing={refreshing} onRefresh={refresh} footer={
    !review && error ? <ActionButton disabled={busy} onPress={() => run(context => getRegistrationReview(jobId, context), setReview)}>Try again</ActionButton> : paymentAction
  }>
    <View style={styles.section}>
      <Text style={styles.eyebrow}>STEP {isCommitment ? '1' : '2'} OF 2</Text>
      <Text style={styles.title}>{isCommitment ? 'Commit your name' : 'Create your identity'}</Text>
    </View>
    {!review && busy && <ActivityIndicator accessibilityLabel="Loading costs" color={Colors.primaryColor} />}
    {review && <>
      <IdentitySummary review={review} />
      <CostReview quote={review.quote} currencyNames={review.currencyNames} identityNames={review.identityNames} stage={stage} />
      <View style={[styles.notice, isCommitment && styles.warning]}>
        <Text style={styles.body}>{isCommitment ? 'The commitment fee is non-refundable. It does not reserve your name.' : 'This payment creates your identity after confirmation.'}</Text>
        {isCommitment && <Text style={styles.muted}>Keep this wallet and its app data until you finish. Your seed alone cannot restore a pending commitment.</Text>}
      </View>
      <RegistrationDetails review={review} />
      {!!error && <ActionButton secondary disabled={busy} onPress={() => refresh()}>Refresh review</ActionButton>}
      <ActionButton secondary disabled={busy} onPress={() => navigation.navigate('IdentityRegistrationStart')}>Save for later</ActionButton>
    </>}
  </RegistrationPage>;
};

export const IdentityCommitmentReview = props => <PaymentReview {...props} stage="commitment" />;
export const IdentityRegistrationReview = props => <PaymentReview {...props} stage="registration" />;

export function IdentityRegistrationProgress({navigation, route}) {
  const {jobId} = route.params;
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const promptOpen = useRef(false);
  const focused = useRef(false);
  const resultVersion = useRef(0);
  const background = useRef(null);
  const currentReview = useRef(null);
  const {context, busy, error, run, running} = useRegistrationAction();
  const updateReview = useCallback(value => {
    currentReview.current = value;
    setReview(value);
    setLoadError(null);
  }, []);
  const refreshBackground = useCallback(() => {
    if (!focused.current || running.current || promptOpen.current || background.current) return;
    const version = resultVersion.current;
    const controller = new AbortController();
    const task = {controller};
    background.current = task;
    task.promise = (async () => {
      try {
        const result = await reconcileRegistration(jobId, {...context,
          registrationBackground: true, signal: controller.signal});
        if (focused.current && !controller.signal.aborted && version === resultVersion.current) updateReview(result);
      } catch (failure) {
        if (focused.current && !controller.signal.aborted && version === resultVersion.current &&
          failure.code !== 'SESSION_CHANGED' && !currentReview.current) {
          setLoadError({message: failure.message || 'Unable to check registration. Try again.'});
        }
      } finally {
        if (background.current === task) background.current = null;
        if (focused.current && version === resultVersion.current) setLoading(false);
      }
    })();
    return task.promise;
  }, [context, jobId, running, updateReview]);
  const runForeground = useCallback((operation, onSuccess = updateReview) => {
    if (running.current) return;
    const version = ++resultVersion.current;
    const pending = background.current;
    pending?.controller.abort();
    return run(async requestContext => {
      // Let an aborted passive read release the job lock before a foreground
      // action starts. Its result can no longer replace the action's state.
      await pending?.promise;
      try { return await operation(requestContext); } finally {
        if (focused.current && version === resultVersion.current) setLoading(false);
      }
    }, result => {
      if (focused.current && version === resultVersion.current) onSuccess(result);
    });
  }, [run, running, updateReview]);
  const refresh = useCallback(() => runForeground(requestContext => reconcileRegistration(jobId, requestContext)),
    [jobId, runForeground]);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    const version = ++resultVersion.current;
    const start = async () => {
      await background.current?.promise;
      if (focused.current && version === resultVersion.current) refreshBackground();
    };
    start();
    const poll = () => {
      if (AppState.currentState !== 'active' || ![
        'commitment_signed', 'commitment_broadcast', 'commitment_broadcast_unknown',
        'registration_signed', 'registration_broadcast', 'registration_broadcast_unknown',
      ].includes(currentReview.current?.status)) return;
      refreshBackground();
    };
    const timer = setInterval(poll, 20000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') poll(); });
    return () => {
      focused.current = false;
      ++resultVersion.current;
      background.current?.controller.abort();
      clearInterval(timer);
      listener.remove();
    };
  }, [refreshBackground]));
  const continueRegistration = () => runForeground(requestContext => prepareRegistration({jobId}, requestContext), () => navigation.navigate('IdentityRegistrationReview', {jobId}));
  const status = review?.status;
  const state = registrationState(status);
  const canContinue = ['commitment_confirmed', 'registration_prepared', 'registration_expired'].includes(status);
  const canRetry = ['commitment_signed', 'commitment_broadcast_unknown', 'registration_signed', 'registration_broadcast_unknown'].includes(status);
  const confirmLink = () => {
    if (running.current || promptOpen.current) return;
    promptOpen.current = true;
    const closePrompt = () => { promptOpen.current = false; };
    Alert.alert('Link identity to this wallet?',
      `${review.displayName} will appear in your wallet cards and addresses. Your wallets will refresh. Linking is free.`, [
        {text: 'Not now', style: 'cancel', onPress: closePrompt},
        {text: 'Link identity', onPress: () => { closePrompt(); return runForeground(requestContext => linkRegisteredIdentity(jobId, requestContext)); }},
      ], {cancelable: true, onDismiss: closePrompt});
  };
  const openOverview = () => navigation.navigate('IdentityRegistrationStart');
  const confirmDelete = () => {
    if (running.current || promptOpen.current) return;
    promptOpen.current = true;
    confirmRegistrationDeletion(review,
      () => runForeground(requestContext => deleteRegistration(jobId, review.deletionKind, requestContext), openOverview),
      () => { promptOpen.current = false; });
  };
  let action = {label: state.kind === 'complete' ? 'Done' : 'Done for now', onPress: openOverview};
  if (status === 'commitment_prepared') action = {label: 'Review commitment', onPress: () => navigation.navigate('IdentityCommitmentReview', {jobId})};
  else if (status === 'commitment_expired') action = {label: 'Review replacement', onPress: () => runForeground(requestContext => refreshRegistrationReview(jobId, requestContext), () => navigation.navigate('IdentityCommitmentReview', {jobId}))};
  else if (canContinue) action = {label: 'Continue registration', onPress: continueRegistration};
  else if (status === 'registered') action = {label: 'Link to wallet', onPress: confirmLink};
  else if (canRetry) action = {label: 'Retry sending', onPress: () => runForeground(requestContext => retryBroadcast(jobId, requestContext))};
  else if (state.kind === 'attention') action = {label: 'Check status', onPress: refresh};
  return <RegistrationPage error={error || loadError} footer={review
    ? <ActionButton disabled={busy} busy={busy} onPress={action.onPress}>{action.label}</ActionButton>
    : <ActionButton disabled={busy || !loadError} busy={busy} onPress={refresh}>Check status</ActionButton>
  }>
    {!review && loading && <ActivityIndicator accessibilityLabel="Loading registration" color={Colors.primaryColor} />}
    {review && <>
      <StatusBadge status={status} />
      <View style={styles.section}>
        <Text style={styles.title}>{review.displayName}</Text>
        <Text style={styles.body}>{state.detail}</Text>
      </View>
      <RegistrationSteps status={status} />
      {state.kind === 'waiting' && <Text style={[styles.muted, {textAlign: 'center'}]}>You can leave this screen. Follow progress from your home screen.</Text>}
      {canRetry && <Text style={styles.muted}>Retry sends the saved transaction. It does not create another payment.</Text>}
      {review.quote && <View style={styles.card}>
        <AmountRows currencyNames={review.currencyNames} label={state.chainComplete || review.commitmentHeight ? 'Commitment paid' : review.commitmentTxid ? 'Commitment sent' : 'Commitment fee'} amounts={{[review.quote.systemID]: review.quote.commitmentFee}} />
        <AmountRows currencyNames={review.currencyNames} label={state.chainComplete ? 'Registration paid' : review.registrationTxid ? 'Registration sent' : 'Register later (estimated)'} amounts={review.quote.totalRequired} total />
        {!review.registrationTxid && <Text style={styles.muted}>You’ll review the current registration price before paying.</Text>}
      </View>}
      <RegistrationDetails review={review} />
      {!!review.lastError && <View style={[styles.notice, styles.warning]}><Text style={styles.muted}>{(typeof review.lastError === 'string' ? review.lastError : review.lastError.message)?.replace(/\bi[1-9A-HJ-NP-Za-km-z]{20,40}\b/g, address => identityLabel(address, review.identityNames))}</Text></View>}
      {!state.chainComplete && action.label !== 'Check status' && <ActionButton secondary disabled={busy} onPress={refresh}>Check status</ActionButton>}
      {action.onPress !== openOverview && <ActionButton secondary disabled={busy} onPress={openOverview}>All registrations</ActionButton>}
      {!!review.deletionKind && <ActionButton secondary disabled={busy} onPress={confirmDelete}>Delete saved registration</ActionButton>}
    </>}
  </RegistrationPage>;
}
