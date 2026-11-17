import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AppState, View} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {CircleAlert} from 'lucide-react-native';
import {useAppTheme} from '../../../../../theme/app';
import {
  approveCommitment, approveRegistration, deleteRegistration, getRegistrationEstimate,
  getRegistrationReview, prepareRegistration, reconcileRegistration,
  refreshRegistrationReview, registrationQuotesEqual, retryBroadcast,
} from '../../../../../utils/identityRegistration';
import {updateRegistrationUiState} from '../../../../../actions/actions/services/dispatchers/verusid/registration';
import {COMMITMENT_SLOW_AFTER_MS, registrationCommitmentWaitMessage} from '../../../../../utils/identityRegistration/progress';
import {formatRegistrationAmount} from '../../../../../utils/identityRegistration/costs';
import AcknowledgeSheet from '../../../../../components/AcknowledgeSheet';
import TextAction from '../../../../../components/TextAction';
import TransactionResult from '../../../../../components/TransactionResult';
import LinkVerusIdSheet from '../LinkVerusIdSheet';
import VerusIdCard from '../VerusIdCard';
import {isVerusIdTransportError, verusIdErrorMessage, verusIdUiError} from '../verusIdErrors';
import {ActionButton, AmountRows, currencyLabel, identityLabel, RegistrationDetails, RegistrationPage, RegistrationSkeleton, RegistrationText, useRegistrationStyles} from './RegistrationDesign';
import {RegistrationHero, RegistrationInfo, RegistrationName, RegistrationStatusPill, RegistrationSummary, RegistrationTimeline, registrationAmounts, shortRegistrationAddress} from './RegistrationFlowComponents';
import {registrationFundingState} from './fundingSources';
import {useRegistrationBalances} from './registrationReads';
import {checkRegistrationFunds} from '../../../../../utils/identityRegistration/funding';
import {registrationState} from './presentation';
import useRegistrationAction from './useRegistrationAction';
import useRegistrationPrices from './useRegistrationPrices';
import NewRegistrationFlow from './NewRegistrationFlow';
import {useRegistrationExit} from './registrationNavigation';

export const IdentityRegistrationCreate = NewRegistrationFlow;

const payerFor = review => ({address: review?.fundingAddress, signingAddress: review?.signingAddress,
  isIdentity: review?.fundingAddress !== review?.signingAddress, fundingName: review?.fundingName});
const payerLabel = review => review?.fundingAddress === review?.signingAddress
  ? `Transparent ${shortRegistrationAddress(review?.fundingAddress)}` : identityLabel(review?.fundingAddress, review?.identityNames);

const RegistrationDeleteSheet = ({review, visible, onClose, onDelete}) => {
  let message = 'No payment has been sent.';
  if (review?.deletionKind === 'commitment') message = `The ${formatRegistrationAmount(review.commitmentFee || review.quote.commitmentFee)} ${currencyLabel(review.systemId, review.currencyNames)} commitment fee is lost, and you cannot finish this registration. You cannot undo this.`;
  else if (review?.deletionKind === 'completed') message = 'This removes the saved registration. Your VerusID stays on the blockchain.';
  return <AcknowledgeSheet visible={visible} title={`Delete ${review?.displayName || 'registration'}?`} message={message}
    destructive confirmLabel="Delete" dismissLabel="Keep registration" onClose={onClose} onAcknowledged={onDelete} />;
};

// A saved unpaid job opens Check details directly. Its stored intent stays
// fixed; starting a different name keeps this job until explicitly deleted.
export function IdentityCommitmentReview({navigation, route}) {
  const close = useRegistrationExit(navigation);
  const {jobId} = route.params;
  const {busy, error, run, running, context} = useRegistrationAction();
  const [review, setReview] = useState(null);
  const coins = useSelector(state => state.coins.activeCoinsForUser || []);
  const balances = useSelector(state => state.ledger?.balances || {});
  const coin = coins.find(item => item.id === review?.chainTicker);
  const sources = useMemo(() => review ? [payerFor(review)] : [], [review?.fundingAddress, review?.signingAddress]);
  const funds = useRegistrationBalances(coin, sources, context, review?.approvalToken);
  const prices = useRegistrationPrices(coin, review?.quote);
  const [deleting, setDeleting] = useState(false);
  // Reading the saved review is not an action. The skeleton and the disabled
  // slide show it; the slide shows "Preparing…" only for a real action.
  const [reading, setReading] = useState(false);
  const readReview = useCallback(() => {
    if (running.current) return;
    setReading(true);
    run(requestContext => getRegistrationReview(jobId, requestContext), setReview).finally(() => setReading(false));
  }, [jobId, run, running]);
  useFocusEffect(useCallback(() => {
    readReview();
  }, [readReview]));
  const fundingState = registrationFundingState(review?.quote, sources[0], coin, coins, balances, funds.reads);
  const ready = review?.status === 'commitment_prepared' && fundingState.status === 'enough';
  const approve = () => {
    if (!ready || busy) return;
    return run(requestContext => approveCommitment(jobId, review.approvalToken, requestContext), result => {
      if (result.status === 'commitment_prepared') setReview(result);
      else navigation.replace('IdentityRegistrationProgress', {jobId});
    });
  };
  useEffect(() => {
    if (error?.code === 'REVIEW_CHANGED') readReview();
  }, [error]);
  return <RegistrationPage navigation={navigation} title="Check details" progress={1} busy={busy} busyRef={running} error={error}
    onBack={close} onRetry={() => {funds.retry(); readReview();}}
    info={dismiss => <RegistrationInfo create name={review?.displayName}>{review?.deletionKind && <TextAction destructive onPress={() => dismiss(() => setDeleting(true))}>Delete registration</TextAction>}</RegistrationInfo>}
    footer={<><ActionButton slide disabled={busy || !ready} busy={busy && !reading} onPress={approve}>Slide to start</ActionButton><ActionButton secondary disabled={busy} onPress={close}>Save for later</ActionButton></>}>
    {!review ? <RegistrationSkeleton /> : <>
      <RegistrationHero {...review} prices={prices} />
      <RegistrationTimeline review={review} check />
      <RegistrationSummary name={review.displayName} referral={review.referralID ? identityLabel(review.referralID, review.identityNames) : 'None'}
        payer={sources[0]} recovery={identityLabel(review.identity?.recoveryauthority, {...review.identityNames, [review.identityAddress]: review.displayName})}
        revocation={identityLabel(review.identity?.revocationauthority, {...review.identityNames, [review.identityAddress]: review.displayName})} />
      <RegistrationDetails review={review} />
      {!ready && <RegistrationText muted>{fundingState.status === 'error' ? 'Payer balances could not be checked.'
        : fundingState.status === 'short' ? `Not enough ${currencyLabel(fundingState.currencyId, review.currencyNames)}. Add funds to this payment address to continue.` : 'Checking funds…'}</RegistrationText>}
      {!ready && <TextAction onPress={funds.retry}>Try again</TextAction>}
      <RegistrationDeleteSheet review={review} visible={deleting} onClose={() => setDeleting(false)} onDelete={() => run(requestContext => deleteRegistration(jobId, review.deletionKind, requestContext), close)} />
    </>}
  </RegistrationPage>;
}

// One progress surface owns both payments and every saved-transaction retry.
export function IdentityRegistrationProgress({navigation, route}) {
  const close = useRegistrationExit(navigation);
  const {jobId} = route.params;
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [locked, setLocked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [linkTarget, setLinkTarget] = useState(null);
  const [funding, setFunding] = useState({status: 'checking'});
  const focused = useRef(false);
  const promptOpen = useRef(false);
  promptOpen.current = deleting || !!linkTarget;
  const resultVersion = useRef(0);
  const background = useRef(null);
  const currentReview = useRef(null);
  const lockRetry = useRef(null);
  const preparedOnce = useRef(null);
  const recheckFunds = useRef(null);
  const {context, busy, error, run, running, setError} = useRegistrationAction();
  const coins = useSelector(state => state.coins.activeCoinsForUser || []);
  const updateReview = useCallback(value => {
    currentReview.current = value;
    setReview(value); setLoadError(null); setLocked(false);
    clearTimeout(lockRetry.current); lockRetry.current = null;
  }, []);
  const refreshBackground = useCallback((readSaved = false, operation) => {
    if (!focused.current || running.current || promptOpen.current || background.current) return;
    const version = resultVersion.current;
    const controller = new AbortController();
    const task = {controller};
    background.current = task;
    const isCurrent = () => focused.current && !controller.signal.aborted && version === resultVersion.current;
    const requestContext = {...context, registrationBackground: true, signal: controller.signal};
    task.promise = (async () => {
      try {
        if (readSaved || !currentReview.current) {
          const saved = await getRegistrationReview(jobId, requestContext);
          if (isCurrent()) updateReview(saved);
        }
        const result = operation ? await operation(requestContext, isCurrent) : await reconcileRegistration(jobId, requestContext);
        if (isCurrent() && result) updateReview(result);
      } catch (failure) {
        if (isCurrent() && failure.code !== 'SESSION_CHANGED') {
          if (failure.code === 'REGISTRATION_BUSY') {
            setLocked(true);
            clearTimeout(lockRetry.current);
            lockRetry.current = setTimeout(() => { if (AppState.currentState === 'active') refreshBackground(); }, 1000);
          } else setLoadError(verusIdUiError(failure, 'Could not reach the server. Your registration is saved.'));
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
      await pending?.promise;
      try { return await operation(requestContext); }
      finally { if (focused.current && version === resultVersion.current) setLoading(false); }
    }, result => { if (focused.current && version === resultVersion.current) onSuccess(result); });
  }, [run, running, updateReview]);
  const checkFunds = (value, requestContext) => checkRegistrationFunds(value, coins, requestContext);
  const handleChangedFunds = async (failure, requestContext) => {
    if (!['FUNDING_SPENT', 'STALE_CHAIN_CONTEXT'].includes(failure.code)) throw failure;
    const saved = await getRegistrationReview(jobId, requestContext);
    if (!['commitment_confirmed', 'registration_prepared', 'registration_expired'].includes(saved.status)) throw failure;
    setFunding({status: 'checking'});
    // This transient state belongs to this screen, not the saved Home notice.
    // A later check only rebuilds the review; payment still needs a new slide.
    return {...saved, registrationProblem: 'funds_changing'};
  };
  const approveSecondPayment = async (token, requestContext) => {
    try { return await approveRegistration(jobId, token, requestContext); }
    catch (failure) { return handleChangedFunds(failure, requestContext); }
  };
  const prepareSecond = async requestContext => {
    let saved = await getRegistrationReview(jobId, requestContext);
    try {
      const estimate = await getRegistrationEstimate(jobId, requestContext);
      const funds = await checkFunds(estimate, requestContext);
      setFunding(funds);
      if (funds.status !== 'enough') {
        await updateRegistrationUiState(jobId, {registrationProblem: 'insufficient_funds'}, requestContext);
        return {...estimate, registrationProblem: 'insufficient_funds'};
      }
      const prepared = saved.status === 'registration_prepared'
        ? await refreshRegistrationReview(jobId, requestContext) : await prepareRegistration({jobId}, requestContext);
      const exactFunds = await checkFunds(prepared, requestContext);
      setFunding(exactFunds);
      const registrationProblem = exactFunds.status === 'short' ? 'insufficient_funds' : null;
      await updateRegistrationUiState(jobId, {registrationProblem}, requestContext);
      return {...prepared, registrationProblem};
    } catch (failure) {
      if (['FUNDING_SPENT', 'STALE_CHAIN_CONTEXT'].includes(failure.code)) return handleChangedFunds(failure, requestContext);
      if (failure.code === 'IDENTITY_EXISTS') {
        await updateRegistrationUiState(jobId, {registrationProblem: 'name_taken'}, requestContext);
        return {...saved, registrationProblem: 'name_taken'};
      }
      // A changed review was persisted by the engine. Show it before another
      // slide; the failed slide is never treated as approval of that new plan.
      if (failure.code === 'REVIEW_CHANGED') saved = await getRegistrationReview(jobId, requestContext);
      updateReview(saved);
      throw failure;
    }
  };
  const refresh = () => runForeground(async requestContext => {
    const value = await reconcileRegistration(jobId, requestContext);
    if (['commitment_confirmed', 'registration_prepared', 'registration_expired'].includes(value.status)) return prepareSecond(requestContext);
    return value;
  });
  recheckFunds.current = async () => {
    const version = resultVersion.current;
    let enough = false;
    await refreshBackground(false, async (requestContext, isCurrent) => {
      const saved = await getRegistrationReview(jobId, requestContext);
      if (!['commitment_confirmed', 'registration_prepared', 'registration_expired'].includes(saved.status) ||
          saved.registrationProblem === 'name_taken') return saved;
      try {
        const estimate = await getRegistrationEstimate(jobId, requestContext);
        const funds = await checkFunds(estimate, requestContext);
        if (!isCurrent()) return;
        setFunding(funds);
        if (funds.status === 'enough') { enough = true; return; }
        await updateRegistrationUiState(jobId, {registrationProblem: 'insufficient_funds'}, requestContext);
        return {...estimate, registrationProblem: 'insufficient_funds'};
      } catch (failure) {
        if (failure.code !== 'IDENTITY_EXISTS') throw failure;
        if (!isCurrent()) return;
        await updateRegistrationUiState(jobId, {registrationProblem: 'name_taken'}, requestContext);
        return {...saved, registrationProblem: 'name_taken'};
      }
    });
    // Only rebuilding the payable review blocks navigation. The passive read
    // shares the reconcile task's cancellation and foreground wait guards.
    if (enough && focused.current && version === resultVersion.current && AppState.currentState === 'active' &&
        !lockRetry.current && !running.current && !promptOpen.current && !background.current) runForeground(prepareSecond);
  };
  useFocusEffect(useCallback(() => {
    focused.current = true; preparedOnce.current = null;
    const version = ++resultVersion.current;
    (async () => { await background.current?.promise; if (focused.current && version === resultVersion.current) refreshBackground(true); })();
    const poll = () => {
      if (!focused.current || AppState.currentState !== 'active' || lockRetry.current || running.current || promptOpen.current || background.current) return;
      const saved = currentReview.current;
      if (['insufficient_funds', 'funds_changing'].includes(saved?.registrationProblem) && ['commitment_confirmed', 'registration_prepared', 'registration_expired'].includes(saved.status)) recheckFunds.current();
      else if (['commitment_signed', 'commitment_broadcast', 'commitment_broadcast_unknown', 'registration_signed', 'registration_broadcast', 'registration_broadcast_unknown'].includes(saved?.status)) refreshBackground();
    };
    const timer = setInterval(poll, 20000);
    const listener = AppState.addEventListener('change', state => { if (state === 'active') poll(); });
    return () => {
      focused.current = false; ++resultVersion.current; background.current?.controller.abort();
      clearTimeout(lockRetry.current); lockRetry.current = null; clearInterval(timer); listener.remove();
    };
  }, [refreshBackground]));
  const status = review?.status;
  useEffect(() => {
    if (!focused.current || locked || busy || loadError || error || preparedOnce.current || !['commitment_confirmed', 'registration_prepared'].includes(status)) return;
    preparedOnce.current = true;
    runForeground(prepareSecond);
  }, [review, status, locked, busy, loadError, error]);
  const [waitTime, setWaitTime] = useState(Date.now);
  useEffect(() => {
    setWaitTime(Date.now());
    if (status !== 'commitment_broadcast' || !Number.isFinite(review?.commitmentBroadcastAt)) return undefined;
    const remaining = review.commitmentBroadcastAt + COMMITMENT_SLOW_AFTER_MS - Date.now();
    if (remaining <= 0) return undefined;
    const timer = setTimeout(() => setWaitTime(Date.now()), remaining);
    return () => clearTimeout(timer);
  }, [status, review?.commitmentBroadcastAt]);
  useEffect(() => {
    if (error?.code === 'REVIEW_CHANGED') runForeground(prepareSecond);
    if (error?.code === 'IDENTITY_EXISTS') runForeground(async requestContext => {
      await updateRegistrationUiState(jobId, {registrationProblem: 'name_taken'}, requestContext);
      return {...await getRegistrationReview(jobId, requestContext), registrationProblem: 'name_taken'};
    });
  }, [error]);
  const state = registrationState(status);
  const problem = review?.registrationProblem;
  const shortage = problem === 'insufficient_funds';
  const fundsChanging = problem === 'funds_changing';
  const taken = problem === 'name_taken';
  const delivery = ['commitment_signed', 'commitment_broadcast_unknown', 'registration_signed', 'registration_broadcast_unknown'].includes(status);
  const ready = status === 'registration_prepared' && funding.status === 'enough' && !problem;
  const firstFailed = status === 'commitment_expired';
  const secondFailed = status === 'registration_expired';
  const approveSecond = () => {
    if (!ready || busy || locked || error || loadError) return;
    const shownToken = review.approvalToken;
    return runForeground(async requestContext => {
      const funds = await checkFunds(review, requestContext);
      setFunding(funds);
      if (funds.status !== 'enough') {
        await updateRegistrationUiState(jobId, {registrationProblem: 'insufficient_funds'}, requestContext);
        return {...review, registrationProblem: 'insufficient_funds'};
      }
      return approveSecondPayment(shownToken, requestContext);
    });
  };
  const replacePayment = () => runForeground(async requestContext => {
    const next = firstFailed ? await refreshRegistrationReview(jobId, requestContext) : await prepareSecond(requestContext);
    if (!registrationQuotesEqual(review.quote, next.quote) || next.registrationProblem) return next;
    return firstFailed ? approveCommitment(jobId, next.approvalToken, requestContext) : approveSecondPayment(next.approvalToken, requestContext);
  });
  const approveFirst = () => {
    if (busy || locked || status !== 'commitment_prepared') return;
    return runForeground(requestContext => approveCommitment(jobId, review.approvalToken, requestContext));
  };
  const attentionLabel = shortage ? `Not enough ${review?.quote?.branch !== 'native' && funding.currencyId ? currencyLabel(funding.currencyId, review.currencyNames) : 'funds'}` : taken ? 'Name taken' : null;
  const pill = fundsChanging ? 'Checking funds' : attentionLabel || state.title;
  const firstText = firstFailed ? 'The network did not confirm it in time. You did not pay it.'
    : status?.startsWith('commitment_') && delivery ? 'Sent, but the network has not seen it yet.'
      : status === 'commitment_broadcast' ? registrationCommitmentWaitMessage(review?.commitmentBroadcastAt, waitTime) : state.step > 0 ? 'Confirmed.' : state.commitment;
  const secondText = fundsChanging ? 'The funds for this payment changed. This updates after 1 block confirmation.'
    : taken ? `Someone else registered ${review.displayName} first. You did not pay this.`
    : secondFailed ? 'The network did not confirm it in time. You did not pay it.'
      : status?.startsWith('registration_') && delivery ? 'Sent, but the network has not seen it yet.'
        : status === 'registration_broadcast' ? 'Sent. Needs 1 block confirmation.' : 'Not paid yet.';
  const oldQuote = review?.initialQuote;
  const changed = !!oldQuote && !!review && !registrationQuotesEqual(oldQuote, review.quote);
  const shortageText = shortage && funding.currencyId ? `${payerLabel(review)} has ${funding.balance} ${currencyLabel(funding.currencyId, review.currencyNames)}. Add ${formatRegistrationAmount(funding.missing)} ${currencyLabel(funding.currencyId, review.currencyNames)} to it to continue.` : null;
  const deleteAction = review?.deletionKind && <TextAction destructive onPress={() => setDeleting(true)} disabled={busy}>Delete registration</TextAction>;
  const details = review && <RegistrationDetails review={review} />;
  const errorValue = error || loadError;
  const connectionError = isVerusIdTransportError(errorValue);
  const notice = errorValue && <View style={[styles.row, {alignItems: 'flex-start', gap: 8}]} accessibilityRole="alert">
    <CircleAlert size={16} color={theme.colors.dangerText} /><RegistrationText style={[styles.errorText, {flex: 1}]}>{connectionError ? 'Could not reach the server. Your registration is saved.' : verusIdErrorMessage(errorValue)}</RegistrationText>
  </View>;
  const linkDone = () => navigation.getParent().reset({index: 0, routes: [{name: 'Identity'}]});
  if (review && state.chainComplete) return <>
    <TransactionResult title="VerusID created" success description={status === 'registered' ? 'It is not in this wallet yet.' : null}
      amount={<VerusIdCard name={review.displayName} networkName={currencyLabel(review.systemId, review.currencyNames)}
        showNetwork={!review.displayName.toLowerCase().endsWith(`.${currencyLabel(review.systemId, review.currencyNames).toLowerCase()}@`)} />}
      details={<View style={styles.section}><AmountRows label="You paid" amounts={review.quote.totalOperationRequired} currencyNames={review.currencyNames} />{details}</View>}
      actions={[{label: 'Link VerusID', onPress: () => setLinkTarget({jobId, name: review.displayName}), disabled: !!linkTarget}, {label: 'Not now', onPress: close, disabled: !!linkTarget}]} />
    <LinkVerusIdSheet target={linkTarget} onClose={() => setLinkTarget(null)} onDone={linkDone} />
  </>;
  return <RegistrationPage navigation={navigation} busy={busy} busyRef={running} onRefresh={refresh}
    info={dismiss => <RegistrationInfo name={review?.displayName} payer={review ? payerLabel(review) : null}>
      {review?.deletionKind && <TextAction destructive disabled={busy} onPress={() => dismiss(() => setDeleting(true))}>Delete registration</TextAction>}
    </RegistrationInfo>}
    footer={<>
      {notice}
      {delivery && <RegistrationText muted>Retry sends the saved transaction. It does not create another payment.</RegistrationText>}
      {state.kind === 'waiting' && !errorValue && <RegistrationText muted>You can leave. Home shows when it is ready.</RegistrationText>}
      {errorValue ? <ActionButton disabled={busy || locked} onPress={() => {setError(null); refresh();}}>Try again</ActionButton>
        : taken ? <ActionButton disabled={busy} onPress={() => navigation.replace('IdentityRegistrationCreate', {coinId: review.chainTicker,
          namespace: {id: review.identity.parent, parentName: review.parentName, suffix: review.identity.parent === review.systemId ? '@' : `.${review.parentName?.replace(/@$/, '')}@`}})}>Choose another name</ActionButton>
          : delivery ? <ActionButton disabled={busy || locked} busy={busy} onPress={() => runForeground(requestContext => retryBroadcast(jobId, requestContext))}>Retry sending</ActionButton>
            : firstFailed || secondFailed ? <ActionButton slide disabled={busy || locked || fundsChanging} busy={busy} onPress={replacePayment}>{firstFailed ? 'Slide to start' : 'Slide to create'}</ActionButton>
              : status === 'commitment_prepared' ? <ActionButton slide disabled={busy || locked} busy={busy} onPress={approveFirst}>Slide to start</ActionButton>
                : status === 'commitment_spent' ? <ActionButton disabled={busy || locked} onPress={refresh}>Check status</ActionButton>
              : status !== 'registration_broadcast' && <ActionButton slide disabled={busy || locked || !ready} busy={busy} onPress={approveSecond}>Slide to create</ActionButton>}
      {taken && deleteAction ? deleteAction : <ActionButton secondary disabled={busy} onPress={close}>Done for now</ActionButton>}
    </>}>
    {!review && loading && <RegistrationSkeleton label="Loading registration" />}
    {review && <>
      <RegistrationStatusPill label={pill} waiting={fundsChanging || state.kind === 'waiting'} tone={attentionLabel || firstFailed || secondFailed ? 'danger' : delivery || state.kind === 'attention' ? 'warning' : ready ? 'success' : 'neutral'} />
      <RegistrationName name={review.displayName} />
      <RegistrationTimeline review={review} commitmentText={firstText} registrationText={secondText} changed={changed}
        oldPrice={changed ? registrationAmounts(oldQuote, review.currencyNames, true) : null} shortage={shortageText} />
      {details}
      {status === 'commitment_spent' && <RegistrationText muted>{state.detail}</RegistrationText>}
      <RegistrationDeleteSheet review={review} visible={deleting} onClose={() => setDeleting(false)}
        onDelete={() => runForeground(requestContext => deleteRegistration(jobId, review.deletionKind, requestContext), close)} />
    </>}
  </RegistrationPage>;
}
