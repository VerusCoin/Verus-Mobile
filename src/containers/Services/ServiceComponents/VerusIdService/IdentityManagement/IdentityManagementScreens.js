import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Keyboard, Text, View} from 'react-native';
import {useSelector} from 'react-redux';
import {Plus} from 'lucide-react-native';
import AppAddressInput from '../../../../../components/AppAddressInput';
import AppTextInput from '../../../../../components/AppTextInput';
import ScannerScreen from '../../../../../components/BarcodeReader/ScannerScreen';
import SlideToConfirm from '../../../../../components/SlideToConfirm';
import TextAction from '../../../../../components/TextAction';
import TransactionResult from '../../../../../components/TransactionResult';
import {SelectionRow} from '../../../../../components/SelectionSheet';
import store from '../../../../../store';
import {sessionScopeIsCurrent} from '../../../../../actions/actions/updates/sessionRequests';
import {loadIdentityForUpdate, prepareIdentityUpdate, sendIdentityUpdate, validateIdentityTransfer} from '../../../../../utils/identityManagement/updateIdentity';
import {MAX_IDENTITY_PRIMARY_ADDRESSES} from '../../../../../utils/identityManagement/identityDefinition';
import {recipientFromQr} from '../../../../../utils/identityManagement/recipient';
import {unlinkUpdatedIdentity} from '../../../../../utils/identityManagement/unlinkAfterUpdate';
import {getControlFacts} from '../../../../../utils/verusid/verusIdControlFacts';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {identityManagementStyles as styles} from '../../../../../styles';
import {useIdentityManagement} from './IdentityManagementContext';
import {ManagementPage as Page, ActionButton, Body, CheckOption, DetailRow, Disclosure, LoadingIdentity, SectionTitle, SelectionField, Warning, verusIdText} from './ManagementComponents';
import {currencyLabel} from '../IdentityRegistration/RegistrationComponents';
import {identityLabel} from '../IdentityRegistration/presentation';
import {preferredRegistrationFundingSource, registrationFundingBalance} from '../IdentityRegistration/fundingSources';
import {VerusIdFormField} from '../VerusIdFormScroll';
import {VerusIdName, wrapVerusIdNames} from '../VerusIdCard';
import {isVerusIdTransportError, verusIdErrorMessage, verusIdUiError} from '../verusIdErrors';
import {changedFieldValues, signingPolicySummary} from './reviewPresentation';


const authorityName = (address, model) => address === model.identityAddress
  ? `This VerusID (${model.displayName})` : identityLabel(address, model.identityNames);

// The risk line names a VerusID only when the field holds one (a name ending in @ or an i-address).
const looksLikeVerusId = value => /@$/.test(value.trim()) || /^i[1-9A-HJ-NP-Za-km-z]{33}$/.test(value.trim());

const useAction = () => {
  const {context} = useIdentityManagement();
  const mounted = useRef(true);
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    mounted.current = true;

    return () => {
      mounted.current = false;
    };
  }, []);

  // Only the mounted flow in the originating session may receive a result.
  const run = useCallback(async (operation, onSuccess) => {
    const isCurrent = () => sessionScopeIsCurrent(store.getState(), context.sessionScope);
    if (running.current || !isCurrent()) return;

    running.current = true;
    setBusy(true);
    setError(null);

    let result;
    let succeeded = false;

    try {
      result = await operation(context);
      succeeded = true;
    } catch (failure) {
      if (mounted.current && isCurrent() && failure.code !== 'SESSION_CHANGED')
        setError(verusIdUiError(failure, 'Unable to complete this step. Please try again.'));
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }

    if (succeeded && mounted.current && isCurrent()) onSuccess?.(result);
  }, [context]);

  return {busy, error, run, running, setError};
};

const editableFields = model => ({
  ...model.fields,
  primaryaddresses: [...model.fields.primaryaddresses],
  minimumsignatures: String(model.fields.minimumsignatures),
  recoveryauthority: model.identityNames?.[model.fields.recoveryauthority]
    ? identityLabel(model.fields.recoveryauthority, model.identityNames)
    : model.fields.recoveryauthority,
  revocationauthority: model.identityNames?.[model.fields.revocationauthority]
    ? identityLabel(model.fields.revocationauthority, model.identityNames)
    : model.fields.revocationauthority,
});

function useIdentityForm(route, navigation, mode) {
  const {setPlan, setSourceModel, reloadVersion} = useIdentityManagement();
  const action = useAction();
  const balances = useSelector(state => state.ledger?.balances || {});
  const [model, setModel] = useState(null);
  const [fields, setFields] = useState(null);
  const [fundingAddress, setFundingAddress] = useState(null);
  const initialFields = useRef(null);
  const {chain, identityAddress} = route.params || {};

  const load = () => {
    if (action.running.current) return;

    setModel(null);
    setFields(null);

    return action.run(
      context => loadIdentityForUpdate({chain, identityAddress}, context),
      loaded => {
        const initial = editableFields(loaded);
        initialFields.current = initial;
        setFields(initial);
        setModel(loaded);
        setSourceModel(loaded);

        const coin = {id: loaded.chainTicker, system_id: loaded.systemId};
        setFundingAddress(
          preferredRegistrationFundingSource(loaded.fundingSources || [], coin, balances)?.address ||
          loaded.fundingAddress,
        );
      },
    );
  };

  useEffect(() => {
    setPlan(null);
    load();
  }, [chain, identityAddress, reloadVersion]);

  const change = (field, value) => {
    setPlan(null);
    // An edit answers the last review error. A changed VerusID still needs Reload.
    if (action.error?.code !== 'REVIEW_CHANGED') action.setError(null);
    setFields(current => ({...current, [field]: value}));
  };

  // The review is prepared from the edited fields and selected payment source.
  const review = (recipient, transferOptions = {}) => action.run(
    context => {
      Keyboard.dismiss();
      const changes = {};

      if (mode === 'modify')
        Object.keys(fields).forEach(key => {
          if (JSON.stringify(fields[key]) !== JSON.stringify(initialFields.current[key]))
            changes[key] = fields[key];
        });

      return prepareIdentityUpdate(model, {
        mode,
        ...(mode === 'modify' ? {changes} : {recipient, ...transferOptions}),
        fundingAddress,
      }, context);
    },
    prepared => {
      setPlan(prepared);
      navigation.navigate('IdentityUpdateReview');
    },
  );

  return {...action, model, fields, change, initialFields, setFields, setPlan, fundingAddress, setFundingAddress, balances, load, review};
}

function FundingSource({form}) {
  const showBalance = useSelector(state => state.coins.showBalance !== false);
  const {model, fundingAddress, setFundingAddress, busy, balances} = form;
  const sources = model.fundingSources || [];
  const coin = {id: model.chainTicker, system_id: model.systemId};
  const label = source => source?.isIdentity
    ? identityLabel(source.address, {...model.identityNames, [source.address]: source.fundingName})
    : source?.fundingName || 'Wallet address';
  const theme = useOnboardingTheme();
  return <View style={[styles.feeSource, {borderColor: theme.colors.border}]}><SelectionField label="Pay network fee from" disabled={busy}
    value={label(sources.find(source => source.address === fundingAddress))} onSelect={setFundingAddress}
    options={sources.map(source => {
      const balance = registrationFundingBalance(coin, source, balances);
      return {value: source.address, label: label(source), selected: source.address === fundingAddress,
        description: showBalance && balance != null ? `${balance} ${model.networkName || model.chainTicker} available` : undefined};
    })} /></View>;
}

// Semibold lead words inside a Body or Warning line, as in the TS2 mockup.
function Strong({children}) {
  const theme = useOnboardingTheme();
  return <Text style={{fontFamily: theme.typography.labelMd.fontFamily, fontWeight: theme.typography.labelMd.fontWeight, color: theme.colors.textPrimary}}>{children}</Text>;
}

function IdentityHeading({model, fallback}) {
  const theme = useOnboardingTheme();
  return <View style={styles.heading}>
    <VerusIdName name={model?.displayName || fallback || 'VerusID'} style={theme.typography.titleSheet}
      leafColor={theme.colors.textPrimary} restColor={theme.colors.textSecondary} />
    {!!model && <Body muted>{`${model.feeCurrency || model.networkName || model.chainTicker}${model.isTestnet ? ' · Testnet' : ''}`}</Body>}
  </View>;
}

function useFormBack(navigation, running, back, hasLocalStep) {
  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (navigation.isFocused?.() === false) return;
    if (running.current) event.preventDefault();
    else if (hasLocalStep) {event.preventDefault(); back();}
  }), [navigation, running, back, hasLocalStep]);
}

const sections = [
  {key: 'spend', title: 'Spend and sign', fields: ['primaryaddresses', 'minimumsignatures']},
  {key: 'recover', title: 'Revoke and recover', fields: ['revocationauthority', 'recoveryauthority']},
  {key: 'private', title: 'Private address', fields: ['privateaddress']},
];

export function IdentityModify(props) {
  return <IdentityModifyForm key={`${props.route.params?.chain}:${props.route.params?.identityAddress}`} {...props} />;
}

function IdentityModifyForm({navigation, route}) {
  const form = useIdentityForm(route, navigation, 'modify');
  const {model, fields, change, busy, error, load, review, running, setError} = form;
  const [chosen, setChosen] = useState([]);
  const [step, setStep] = useState(0);
  const selected = sections.filter(section => chosen.includes(section.key));
  const section = selected[step - 1];
  const back = useCallback(() => {
    if (running.current) return;
    if (step > 0) {Keyboard.dismiss(); setError(null); setStep(value => value - 1);}
    else navigation.goBack();
  }, [navigation, running, step, setError]);
  useFormBack(navigation, running, back, step > 0);
  useEffect(() => {setStep(0); setChosen([]);}, [model]);

  const toggle = item => {
    if (busy) return;
    if (chosen.includes(item.key)) {
      // Deselecting restores the loaded values in the same form state.
      form.setPlan(null);
      form.setFields(current => ({...current, ...Object.fromEntries(item.fields.map(key => [key, form.initialFields.current[key]]))}));
      setChosen(current => current.filter(key => key !== item.key));
    } else setChosen(current => [...current, item.key]);
    setError(null);
  };
  const continueStep = () => {
    if (running.current || !model || !chosen.length) return;
    setError(null);
    Keyboard.dismiss();
    if (step === selected.length) review();
    else setStep(value => value + 1);
  };
  const title = section?.title || 'Modify VerusID';
  const selfRecovery = fields && [model?.identityAddress, model?.displayName].includes(fields.recoveryauthority.trim());
  const facts = model ? getControlFacts({identity: {identity: {...model.identity, ...model.fields, identityaddress: model.identityAddress}},
    ownedAddress: model.fields.primaryaddresses.includes(model.signingAddress), friendlyNames: model.identityNames,
    stateInfo: {state: model.locked ? 'locked' : 'active'}}) : [];
  const factFor = key => facts.find(fact => fact.key === key);
  const summaries = model ? {
    spend: [factFor('spend')?.value, factFor('spend')?.detail].filter(Boolean).join(' · '),
    recover: factFor('authorities')?.value || `Revoke: ${factFor('revoke')?.value} · Recover: ${factFor('recover')?.value}`,
    private: model.fields.privateaddress || 'None',
  } : {};
  const info = section?.key === 'spend' ? [
    ['Primary addresses', 'These addresses can sign for this VerusID. Only add addresses whose owners you trust.'],
    ['Required signatures', `Choose 1–${Math.min(fields.primaryaddresses.length, 13)} of the ${fields.primaryaddresses.length} primary addresses to require. Multiple signatures may prevent this wallet from making future updates on its own.`],
  ] : section?.key === 'recover' ? [
    ['What the roles do', 'Revocation can suspend the VerusID. Recovery can restore it and change its ownership. Choose VerusIDs you trust.'],
    ['Recovery VerusID', 'After a change, only the new recovery VerusID can authorize another change to recovery. Choose a VerusID whose owner you trust.'],
    ['Name format', 'Use a full name ending in @ or a VerusID address. Changing either role also requires this wallet to control its current authority.'],
  ] : section?.key === 'private' ? [
    ['Private receiving address', 'The address published for private payments. Changing it does not move existing funds. Leave empty to remove the VerusID’s published private addresses.'],
  ] : undefined;

  return <Page title={title} progress={(step + 1) / (Math.max(selected.length, 1) + 2)} onBack={back} busy={busy}
    info={info} infoTitle={title} error={error} footer={<ActionButton busy={busy}
      disabled={!!model && !chosen.length && error?.code !== 'REVIEW_CHANGED'}
      onPress={error?.code === 'REVIEW_CHANGED' || !model ? load : continueStep}>
      {isVerusIdTransportError(error) ? 'Try again' : error?.code === 'REVIEW_CHANGED' ? 'Reload VerusID' : !model ? 'Load VerusID' : step === selected.length && step > 0 ? 'Review changes' : 'Continue'}
    </ActionButton>}>
    {!model ? busy ? <LoadingIdentity /> : <Body muted>Load this VerusID to continue.</Body> : !section ? <>
      <Body muted>{`Choose what to change for ${model.displayName}.`}</Body>
      <View style={styles.group}>
        {sections.map(item => <SelectionRow key={item.key} title={item.title} subtitle={wrapVerusIdNames(summaries[item.key])}
          accessibilityLabel={`${item.title}, ${summaries[item.key]}`}
          subtitleMonospace={item.key === 'private' && !!model.fields.privateaddress}
          accessibilityRole="checkbox" selected={chosen.includes(item.key)} showChevron={false} disabled={busy} onPress={() => toggle(item)} />)}
      </View>
      <View style={styles.group}><FundingSource form={form} /></View>
    </> : <View style={styles.section}>
      {section.key === 'spend' && <>
        {fields.primaryaddresses.map((address, index) => <VerusIdFormField key={index}>{focusProps => <>
          <AppAddressInput label={`Primary address ${index + 1}`} accessibilityLabel={`Primary address ${index + 1}`} value={address}
            {...focusProps}
            editable={!busy} technical placeholder="R-address"
            onChangeText={value => change('primaryaddresses', fields.primaryaddresses.map((existing, at) => at === index ? value : existing))} />
          {fields.primaryaddresses.length > 1 && <TextAction disabled={busy} accessibilityLabel={`Remove primary address ${index + 1}`}
            onPress={() => change('primaryaddresses', fields.primaryaddresses.filter((_, at) => at !== index))}>Remove address</TextAction>}
        </>}</VerusIdFormField>)}
        {fields.primaryaddresses.length < MAX_IDENTITY_PRIMARY_ADDRESSES && <TextAction Icon={Plus} disabled={busy}
          onPress={() => change('primaryaddresses', [...fields.primaryaddresses, ''])}>Add primary address</TextAction>}
        <VerusIdFormField>{focusProps => <>
        <AppTextInput {...focusProps} label="Required signatures" accessibilityLabel="Required signatures" value={fields.minimumsignatures}
          keyboardType="number-pad" editable={!busy} onChangeText={value => change('minimumsignatures', value)} />
        {Number(fields.minimumsignatures) > 1 && <Warning>Multiple signatures may prevent this wallet from making future updates on its own.</Warning>}
        </>}</VerusIdFormField>
      </>}
      {section.key === 'recover' && <>
        {[
          ['revocationauthority', 'Revocation VerusID', 'Revocation identity'],
          ['recoveryauthority', 'Recovery VerusID', 'Recovery identity'],
        ].map(([key, label, accessibilityLabel]) => <VerusIdFormField key={key}>{focusProps => <>
          <AppAddressInput {...focusProps} label={label} accessibilityLabel={verusIdText(accessibilityLabel)} value={fields[key]} editable={!busy} placeholder="guardian@"
            technical={!fields[key].endsWith('@')} onChangeText={value => change(key, value)} />
          <TextAction disabled={busy} accessibilityLabel={verusIdText(`Use this identity for ${accessibilityLabel.toLowerCase()}`)}
            onPress={() => change(key, model.displayName)}>Use this VerusID</TextAction>
          {key === 'recoveryauthority' && !selfRecovery && looksLikeVerusId(fields.recoveryauthority) && <Warning>{`${fields.recoveryauthority.trim()} can take control of this VerusID.`}</Warning>}
        </>}</VerusIdFormField>)}
      </>}
      {section.key === 'private' && <>
        <VerusIdFormField>{focusProps => <>
        <AppAddressInput {...focusProps} label="Private address (optional)" accessibilityLabel="Private address (optional)" value={fields.privateaddress}
          editable={!busy} technical placeholder="zs-address" onChangeText={value => change('privateaddress', value)} />
        {!!model.walletPrivateAddress && <TextAction disabled={busy}
          onPress={() => change('privateaddress', model.walletPrivateAddress)}>Use this wallet’s private address</TextAction>}
        </>}</VerusIdFormField>
      </>}
    </View>}
  </Page>;
}

export function IdentityTransfer(props) {
  return <IdentityTransferForm key={`${props.route.params?.chain}:${props.route.params?.identityAddress}`} {...props} />;
}

function IdentityTransferForm({navigation, route}) {
  const {context} = useIdentityManagement();
  const form = useIdentityForm(route, navigation, 'transfer');
  const {model, busy, error, load, review, setError, running} = form;
  const [recipient, setRecipient] = useState('');
  const [returnFunds, setReturnFunds] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [ownerCheck, setOwnerCheck] = useState(null);
  const [checkAttempt, setCheckAttempt] = useState(0);
  const ownerValid = ownerCheck?.model === model && ownerCheck?.recipient === recipient &&
    ownerCheck?.returnFunds === returnFunds && ownerCheck?.valid === true;
  const ownerError = ownerCheck?.model === model && ownerCheck?.recipient === recipient &&
    ownerCheck?.returnFunds === returnFunds ? ownerCheck.error : null;
  const ownerInputError = ['INVALID_RECIPIENT', 'RECIPIENT_NOT_FOUND', 'RECIPIENT_IN_WALLET'].includes(ownerError?.code);
  const needsReload = error?.code === 'REVIEW_CHANGED' || ownerError?.code === 'REVIEW_CHANGED';
  const changeRecipient = value => {
    if (running.current) return;
    if (error?.code !== 'REVIEW_CHANGED') setError(null);
    setRecipient(value);
  };
  useEffect(() => {
    if (!model || !recipient.trim()) {setOwnerCheck(null); return undefined;}
    let active = true;
    setOwnerCheck(null);
    const timer = setTimeout(() => {
      validateIdentityTransfer(model, recipient, {returnFunds}, context).then(() => {
        if (active) setOwnerCheck({model, recipient, returnFunds, valid: true});
      }, failure => {
        if (active && failure.code !== 'SESSION_CHANGED')
          setOwnerCheck({model, recipient, returnFunds, error: verusIdUiError(failure)});
      });
    }, 650);
    return () => {active = false; clearTimeout(timer);};
  }, [model, recipient, returnFunds, context, checkAttempt]);
  const scanHandled = useRef(false);
  const back = useCallback(() => {
    if (running.current) return;
    if (scanning) {scanHandled.current = true; setScanning(false);}
    else navigation.goBack();
  }, [navigation, running, scanning]);
  useFormBack(navigation, running, back, scanning);
  const onScan = codes => {
    if (scanHandled.current) return;
    scanHandled.current = true;
    setScanning(false);
    try {changeRecipient(recipientFromQr(codes?.[0]?.value, model.systemId));}
    catch (failure) {setError({message: failure.message});}
  };
  if (scanning) return <ScannerScreen title="Scan recipient" onBack={back} cameraOn onScan={onScan} prompt="Scan a receiving address or VerusID" />;
  const info = [
    ['New owner', 'Enter a transparent address, or a VerusID name ending in @. VerusID addresses also work. Transfers to a transparent address clear this VerusID’s private receiving address.'],
    ['Using another VerusID?', 'We’ll copy its current primary addresses, required signatures, and private receiving address. If it has no private receiving address, this VerusID’s private receiving address will be cleared. Future changes to that VerusID won’t change this one.'],
    ['Funds held by this VerusID', `Funds held at this VerusID address on ${model?.networkName || model?.chainTicker || 'this network'} return to your main wallet in the same transaction as the transfer. We’ll show the exact amounts before you approve. Private funds and funds on other networks are not moved.`],
    ['Revoke and recover', 'The new owner also gets revoke and recover. Any outside VerusID that had these rights loses them. A transfer cannot be undone.'],
  ];
  // The error shows above the fixed footer action, as on Send Confirm, so it
  // stays in view on small phones while Review transfer is off.
  return <Page title="Transfer VerusID" onBack={back} busy={busy} error={error} info={info} infoTitle="About this transfer" infoHeight="86%"
    onRetry={model ? () => {
      setError(null);
      setCheckAttempt(value => value + 1);
    } : undefined}
    footer={<ActionButton busy={busy} disabled={!!model && !needsReload && (!ownerValid || !!error)}
      onPress={model && !needsReload ? () => {
        Keyboard.dismiss();
        if (ownerValid && !error) review(recipient.trim(), {returnFunds, returnAddress: model.signingAddress});
      } : load}>
      {needsReload ? 'Reload VerusID' : model ? 'Review transfer' : isVerusIdTransportError(error) ? 'Try again' : 'Load VerusID'}
    </ActionButton>}>
    {!model ? busy ? <LoadingIdentity /> : <Body muted>Load this VerusID to continue.</Body> : <>
      <IdentityHeading model={model} fallback={route.params?.displayName} />
      <VerusIdFormField>{focusProps => <>
        <AppAddressInput {...focusProps} label="New owner" accessibilityLabel="New owner" value={recipient} placeholder="R-address or satoshi@"
          errorText={ownerInputError ? verusIdErrorMessage(ownerError) : undefined}
          helperText={!ownerInputError && ownerError ? verusIdErrorMessage(ownerError) : undefined}
          technical={!!recipient && !recipient.endsWith('@')} editable={!busy} onChangeText={changeRecipient}
          scanAccessibilityLabel="Scan QR code" onScan={() => {Keyboard.dismiss(); scanHandled.current = false; setScanning(true);}} />
        {isVerusIdTransportError(ownerError) && <TextAction disabled={busy} onPress={() => setCheckAttempt(value => value + 1)}>Try again</TextAction>}
      </>}</VerusIdFormField>
      <View style={{marginTop: 16}}><CheckOption label="Return VerusID funds to my wallet" accessibilityLabel={verusIdText('Return identity funds to my wallet')}
        checked={returnFunds} disabled={busy} onPress={() => {if (error?.code !== 'REVIEW_CHANGED') setError(null); setReturnFunds(value => !value);}} /></View>
      {returnFunds ? <View style={styles.returnAddress}>
        <Body muted>Return to <Strong>Main wallet address</Strong></Body>
        <Body style={styles.identifier}>{model.signingAddress}</Body>
      </View> : <Warning>The new owner will receive the VerusID’s funds on this network. Those funds will be included in your total transfer cost. Leave this unchecked only if you intend to give them away.</Warning>}
      <View style={styles.group}><FundingSource form={{...form, setFundingAddress: value => {
        if (error?.code !== 'REVIEW_CHANGED') setError(null);
        form.setFundingAddress(value);
      }}} /></View>
      <Warning><Strong>A transfer cannot be undone.</Strong> The new owner also gets revoke and recover.</Warning>
    </>}
  </Page>;
}

export function IdentityUpdateReview({navigation}) {
  const theme = useOnboardingTheme();
  const {plan, sourceModel, setPlan, setResult, setReloadVersion} = useIdentityManagement();
  const {busy, error, run, running} = useAction();
  const [acknowledgedPlan, setAcknowledgedPlan] = useState(null);
  const [keepLinkedPlan, setKeepLinkedPlan] = useState(null);
  const completedPlan = useRef(null);
  const review = plan?.review;
  const walletAddresses = useSelector(state => state.authentication.activeAccount?.keys?.[review?.chainTicker]?.vrpc?.addresses);
  const transfer = review?.mode === 'transfer';
  const assignsExternalRecovery = !transfer && !!review &&
    review.before.recoveryauthority !== review.after.recoveryauthority &&
    review.after.recoveryauthority !== review.identityAddress;
  const needsAcknowledgement = transfer || assignsExternalRecovery || review?.losesControl || Number(review?.after?.minimumsignatures) > 1;
  const stale = error?.code === 'REVIEW_CHANGED';
  const acknowledged = !!plan && acknowledgedPlan === plan;
  const unlinkAfterSend = !!review?.losesControl && keepLinkedPlan !== plan;

  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (running.current) event.preventDefault();
  }), [navigation, running]);

  const send = () => {
    if (!plan || completedPlan.current === plan || (needsAcknowledgement && !acknowledged)) return;

    return run(
      async context => {
        let sent;

        try {
          sent = await sendIdentityUpdate(plan, context);
        } catch (failure) {
          if (failure.code !== 'BROADCAST_UNKNOWN') throw failure;

          completedPlan.current = plan;
          return {txid: failure.txid, review, deliveryUnknown: true};
        }

        completedPlan.current = plan;
        const result = {...sent, review, unlinkRequested: unlinkAfterSend, unlinked: false};

        if (unlinkAfterSend) {
          try {
            await unlinkUpdatedIdentity(review, context);
            result.unlinked = true;
          } catch (failure) {
            if (failure.code === 'SESSION_CHANGED') throw failure;

            // Broadcast succeeded. Local cleanup must never send the user back
            // to a payment button or cause another transaction to be prepared.
            result.unlinkError = failure.message || 'Unable to refresh the identity link.';
          }
        }

        return result;
      },
      result => {
        setPlan(null);
        setResult(result);
        navigation.reset({index: 0, routes: [{name: 'IdentityUpdateResult'}]});
      },
    );
  };

  const leave = () => {if (!running.current) navigation.goBack();};
  if (!review) return <Page title="Review changes" onBack={leave} footer={<ActionButton onPress={leave}>Back</ActionButton>}>
    <Body>Choose your changes to prepare a new review.</Body>
  </Page>;

  const changed = Object.keys(fieldLabels).filter(key => JSON.stringify(review.before[key]) !== JSON.stringify(review.after[key]));
  const policy = !transfer && changed.some(key => ['primaryaddresses', 'minimumsignatures'].includes(key))
    ? signingPolicySummary(review, walletAddresses || []) : null;
  const leavingFunds = transfer && !review.returnFunds;
  const transferredTokens = (review.transferredFunds || []).filter(item => item.currencyId !== review.systemId);
  const funds = leavingFunds ? review.transferredFunds : review.returnedFunds;
  const info = [
    ['Total cost', leavingFunds ? 'Includes the network fee and funds given to the new owner.' : 'Network fee only. No VerusID registration charge.'],
    ['Payment change', leavingFunds && review.fundingAddress === review.identityAddress
      ? 'Remaining payment funds stay with the VerusID for its new owner and are included above.'
      : review.changeAddress === review.signingAddress ? 'Payment change returns to your main wallet address.' : 'Unspent change returns to this payment address.'],
    ...(transfer ? [
      ['VerusID funds', leavingFunds ? 'Included in the total cost above. You give up these funds when you transfer the VerusID.' : 'These funds return to your main wallet in the same transaction. They are not a cost.'],
      ['New owner', 'The new primary addresses will control this VerusID. Check every address before approving.'],
      ['Recovery and revocation', 'Both roles are set to this VerusID. Previous external authorities will no longer be able to revoke or recover it.'],
      ['Private receiving address', review.after.privateaddress
        ? `Private payments will use the address published by ${review.recipientName}. Existing private funds are not moved.`
        : review.before.privateaddress ? 'The private receiving address will be cleared. Existing private funds are not moved.' : 'No private receiving address is published.'],
    ] : []),
    ...(review.losesControl ? [['Unlink after sending', 'This wallet will no longer be able to sign for the VerusID on its own. Unlinking removes its wallet cards; it does not delete the VerusID. Uncheck to keep viewing it here.']] : []),
    ...(assignsExternalRecovery ? [['Recovery VerusID', 'Only that VerusID will be able to authorize future changes to the recovery VerusID.']] : []),
    ['Other VerusID details', 'The VerusID’s name, content and any existing lock are preserved.'],
  ];
  return <Page title="Review changes" progress={transfer ? undefined : 1} onBack={leave} busy={busy} error={error}
    onRetry={leave}
    info={info} infoTitle="About these changes" footer={<>
      {needsAcknowledgement && <CheckOption label="I understand who will control this VerusID."
        accessibilityLabel={verusIdText('I understand who will control this identity')} checked={acknowledged} disabled={busy}
        onPress={() => setAcknowledgedPlan(value => value === plan ? null : plan)} />}
      {stale ? <ActionButton onPress={() => {
        setPlan(null); setReloadVersion(version => version + 1); navigation.goBack();
      }}>Reload VerusID</ActionButton> : <SlideToConfirm
        disabled={busy || (needsAcknowledgement && !acknowledged)}
        loading={busy} loadingText="Sending…" onPress={send}
        label={transfer ? 'Slide to pay & transfer' : 'Slide to pay & save'} />}
    </>}>
    <IdentityHeading model={review} />
    {!!policy && <View style={[styles.section, {marginBottom: 24}]}>
      <Body style={theme.typography.titleRow}>{policy.summary}</Body>
      <Body muted>{policy.meaning}</Body>
    </View>}
    <Body muted>Total cost</Body>
    <Text style={[theme.typography.headlineMd, {color: theme.colors.textPrimary}]}>
      {review.nativeTotalCost || review.fee} {review.feeCurrency || review.chainTicker}
    </Text>
    {leavingFunds && transferredTokens.length > 0 && <FundRows funds={transferredTokens} />}
    <View style={{marginTop: 12}}>
      <DetailRow label="Fee paid from">{review.fundingAddress === review.signingAddress ? review.fundingName || 'Wallet address'
        : identityLabel(review.fundingAddress, {...review.identityNames, ...(review.fundingName ? {[review.fundingAddress]: review.fundingName} : {})})}</DetailRow>
    </View>
    {transfer && <View style={styles.group}>
      <SectionTitle>{leavingFunds ? 'Funds given to the new owner' : 'Funds returned to you'}</SectionTitle>
      <FundRows funds={funds} />
      {!leavingFunds && <DetailRow technical label="Return address">{review.returnAddress}</DetailRow>}
      {!leavingFunds && review.fundingChange?.length > 0 && <Disclosure title="Additional payment change">
        <FundRows funds={review.fundingChange} />
        <DetailRow label="Change returns to">{review.changeName}</DetailRow>
        <Body muted>Unused funds from the fee payment source return to that payment address.</Body>
      </Disclosure>}
      <Warning><Text style={theme.typography.labelMd}>Transfer ownership{'\n'}</Text>
        {review.recipientName ? `New owner: ${review.recipientName}` : 'The new primary addresses will control this VerusID.'}
        {review.losesControl ? '\nThis wallet will no longer have primary control.' : ''}
      </Warning>
    </View>}
    {!transfer && review.losesControl && <Warning>These changes remove this wallet’s ability to control the VerusID on its own.</Warning>}
    {assignsExternalRecovery && <Warning>{`${authorityName(review.after.recoveryauthority, review)} will be able to take control of this VerusID.`}</Warning>}
    {review.losesControl && <CheckOption label="Unlink from my wallet after sending" checked={unlinkAfterSend} disabled={busy}
      onPress={() => setKeepLinkedPlan(value => value === plan ? null : plan)} />}
    {Number(review.after.minimumsignatures) > 1 && <Warning>{`Future updates require ${review.after.minimumsignatures} signatures. This wallet cannot collect signatures from other owners.`}</Warning>}
    <View style={styles.group}>
      <SectionTitle>{transfer ? 'New signing policy' : 'Changes to approve'}</SectionTitle>
      {transfer ? <>
        {review.after.primaryaddresses.map((address, index) => <DetailRow technical key={address} label={`Primary address ${index + 1}`}>{address}</DetailRow>)}
        <DetailRow label="Required signatures">{`${review.after.minimumsignatures} of ${review.after.primaryaddresses.length}`}</DetailRow>
        <Disclosure title="Current ownership">
          <DetailRow technical label="Primary addresses">{review.before.primaryaddresses.join('\n')}</DetailRow>
          <DetailRow label="Required signatures">{`${review.before.minimumsignatures} of ${review.before.primaryaddresses.length}`}</DetailRow>
        </Disclosure>
      </> : changed.map(key => <View key={key} style={[styles.changePanel, {backgroundColor: theme.colors.surfaceMuted}]}>
        <Text style={[theme.typography.labelMd, {color: theme.colors.textPrimary}]}>{fieldLabels[key]}</Text>
        {key === 'minimumsignatures' ? <Body>{`${review.before[key]} → ${review.after[key]}`}</Body>
          : changedFieldValues(review.before[key], review.after[key]).map(({value, status}) =>
            <DetailRow key={`${status || 'unchanged'}:${value}`} status={status}
              technical={key === 'primaryaddresses' || key === 'privateaddress'}>{fieldValue(key, value, review)}</DetailRow>)}
      </View>)}
    </View>
    {transfer && <View style={styles.group}>
      <SectionTitle>Recovery & revocation</SectionTitle>
      <DetailRow label="Revocation VerusID">{authorityName(review.after.revocationauthority, review)}</DetailRow>
      <DetailRow label="Recovery VerusID">{authorityName(review.after.recoveryauthority, review)}</DetailRow>
      <DetailRow technical={!!review.after.privateaddress} label="Private receiving address">{review.after.privateaddress || (review.before.privateaddress ? 'Cleared' : 'None')}</DetailRow>
      {review.after.privateaddress && review.before.privateaddress !== review.after.privateaddress &&
        <DetailRow technical label="Previous private receiving address">{review.before.privateaddress || 'None'}</DetailRow>}
      {(review.before.revocationauthority !== review.after.revocationauthority || review.before.recoveryauthority !== review.after.recoveryauthority) && <Disclosure title="Previous authorities">
        <DetailRow label="Revocation VerusID">{authorityName(review.before.revocationauthority, review)}</DetailRow>
        <DetailRow label="Recovery VerusID">{authorityName(review.before.recoveryauthority, review)}</DetailRow>
      </Disclosure>}
    </View>}
    {(review.warnings || []).map((warning, index) => <Warning key={index}>{verusIdText(warning)}</Warning>)}
    <View style={styles.group}>
      <Disclosure title="Transaction details">
        <DetailRow label="Network fee">{`${review.fee} ${review.feeCurrency || review.chainTicker}`}</DetailRow>
        <DetailRow technical label="VerusID address">{review.identityAddress}</DetailRow>
        <DetailRow technical label="Payment address">{review.fundingAddress}</DetailRow>
        <DetailRow technical label="Change address">{review.changeAddress || review.fundingAddress}</DetailRow>
      </Disclosure>
      {!transfer && <Disclosure title="Other VerusID details">
        <Body muted>The name, namespace, content, and any existing lock stay as they are.</Body>
        <DetailRow technical label="VerusID address">{review.identityAddress}</DetailRow>
        {!!sourceModel?.identity?.parent && <DetailRow label="Namespace">{identityLabel(sourceModel.identity.parent, review.identityNames)}</DetailRow>}
      </Disclosure>}
    </View>
  </Page>;
}

const fieldLabels = {
  primaryaddresses: 'Primary addresses', minimumsignatures: 'Required signatures',
  privateaddress: 'Private receiving address', recoveryauthority: 'Recovery VerusID', revocationauthority: 'Revocation VerusID',
};
const fieldValue = (field, value, review) => {
  if (field.endsWith('authority')) return authorityName(value, review);
  if (Array.isArray(value)) return value.join('\n');
  return value === '' || value == null ? 'None' : String(value);
};
const FundRows = ({funds}) => funds?.length ? funds.map(item => <DetailRow key={item.currencyId} label={item.label || currencyLabel(item.currencyId)}>{item.amount}</DetailRow>)
  : <Body muted>No funds held at this VerusID address.</Body>;

export function IdentityUpdateResult({navigation}) {
  const {result, setResult} = useIdentityManagement();
  const {busy, error, run, running} = useAction();
  const review = result?.review;
  const deliveryUnknown = !!result?.deliveryUnknown;
  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (running.current) event.preventDefault();
  }), [navigation, running]);
  const retryUnlink = () => run(context => unlinkUpdatedIdentity(review, context),
    () => setResult({...result, unlinked: true, unlinkError: null}));
  const captions = deliveryUnknown
    ? ['This screen will not send the transaction again. The VerusID remains linked to your wallet.']
    : [result?.unlinked ? 'The VerusID has been unlinked and your wallet cards refreshed.'
        : result?.unlinkError ? 'Retry unlink only refreshes this wallet; it does not send another transaction.'
        : review?.losesControl ? 'The VerusID stays linked for viewing. You can unlink it from VerusID whenever you’re ready.'
        : 'You can view the updated details from VerusID. Wait for confirmation before making another change.',
      review?.mode === 'transfer' && (review.returnedFunds?.length > 0 || review.transferredFunds?.length > 0)
        ? review.returnFunds ? 'The returned VerusID funds will appear at your main wallet address as this transaction confirms.'
          : 'The funds shown in your review remain with the VerusID for its new owner.' : null];
  return <TransactionResult title={deliveryUnknown ? 'Delivery not confirmed' : result ? 'Update sent' : 'VerusID update'}
    success={!!result && !deliveryUnknown}
    description={deliveryUnknown ? 'The network may have received this VerusID update. Check the transaction’s status before starting a new review.'
      : result ? wrapVerusIdNames(`${review?.displayName} is waiting for network confirmation.`) : null}
    details={!deliveryUnknown && result ? <DetailRow label="Network fee">{`${review?.fee} ${review?.feeCurrency || review?.chainTicker}`}</DetailRow> : null}
    transactions={result ? [{txid: result.txid}] : []} caption={captions.filter(Boolean)}
    warning={result?.unlinkError ? isVerusIdTransportError(result.unlinkError) ? verusIdErrorMessage(result.unlinkError)
      : verusIdText(`Unlinking needs another try. ${result.unlinkError}`) : null}
    above={error && !(isVerusIdTransportError(error) && isVerusIdTransportError(result?.unlinkError))
      ? <Body>{verusIdErrorMessage(error)}</Body> : null}
    actions={[
      ...(result?.unlinkError ? [{label: busy ? 'Retrying unlink…' : 'Retry unlink', disabled: busy, onPress: retryUnlink}] : []),
      // An unlinked VerusID has no page left to return to, so Done goes to the VerusID list (upstream lands there too).
      {label: deliveryUnknown ? 'Close' : 'Done', disabled: busy, onPress: () => result?.unlinked
        ? navigation.getParent().popToTop() : navigation.getParent().goBack()},
    ]} />;
}
