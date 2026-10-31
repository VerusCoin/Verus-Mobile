import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Keyboard, Pressable, View} from 'react-native';
import {Text, TextInput} from 'react-native-paper';
import {useSelector} from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import SemiModal from '../../../../../components/SemiModal';
import BarcodeReader from '../../../../../components/BarcodeReader/BarcodeReader';
import Colors from '../../../../../globals/colors';
import store from '../../../../../store';
import {sessionScopeIsCurrent} from '../../../../../actions/actions/updates/sessionRequests';
import {
  loadIdentityForUpdate,
  prepareIdentityUpdate,
  sendIdentityUpdate,
} from '../../../../../utils/identityManagement/updateIdentity';
import {MAX_IDENTITY_PRIMARY_ADDRESSES} from '../../../../../utils/identityManagement/identityDefinition';
import {recipientFromQr} from '../../../../../utils/identityManagement/recipient';
import {unlinkUpdatedIdentity} from '../../../../../utils/identityManagement/unlinkAfterUpdate';
import {useIdentityManagement} from './IdentityManagementContext';
import {
  RegistrationPage as Page,
  ActionButton,
  DetailRow,
  Disclosure,
  SelectionField,
  currencyLabel,
  registrationStyles as styles,
} from '../IdentityRegistration/RegistrationComponents';
import {identityLabel} from '../IdentityRegistration/presentation';
import {
  preferredRegistrationFundingSource,
  registrationFundingBalance,
} from '../IdentityRegistration/fundingSources';

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
        setError({
          code: failure.code,
          message: failure.message || 'Unable to complete this step. Please try again.',
        });
    } finally {
      running.current = false;
      if (mounted.current) setBusy(false);
    }

    if (succeeded && mounted.current && isCurrent()) onSuccess?.(result);
  }, [context]);

  return {busy, error, run, running, setError};
};

const Input = props => (
  <TextInput
    mode="outlined"
    autoCapitalize="none"
    autoCorrect={false}
    outlineColor="#b9c3d3"
    activeOutlineColor={Colors.primaryColor}
    style={{backgroundColor: '#fff'}}
    accessibilityLabel={props.label}
    {...props}
  />
);

const TextAction = ({children, icon, onPress, disabled, label}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={label || children}
    accessibilityState={{disabled: !!disabled}}
    disabled={disabled}
    onPress={onPress}
    style={({pressed}) => [styles.row, styles.touchRow, {opacity: disabled ? 0.5 : pressed ? 0.6 : 1}]}
  >
    {!!icon && <Icon name={icon} size={22} color={Colors.primaryColor} accessible={false} />}
    <Text style={[styles.body, {color: Colors.primaryColor, fontWeight: '600'}]}>{children}</Text>
  </Pressable>
);

const CheckOption = ({label, checked, disabled, onPress}) => (
  <Pressable
    accessibilityRole="checkbox"
    accessibilityLabel={label}
    accessibilityState={{checked, disabled: !!disabled}}
    disabled={disabled}
    onPress={onPress}
    style={[styles.row, styles.touchRow]}
  >
    <Icon
      name={checked ? 'checkbox-marked' : 'checkbox-blank-outline'}
      size={24}
      color={Colors.primaryColor}
      accessible={false}
    />
    <Text style={[styles.body, {flex: 1}]}>{label}</Text>
  </Pressable>
);

const FundRows = ({funds, empty = 'No funds held at this identity address.'}) => funds?.length
  ? funds.map(item => <DetailRow key={item.currencyId} label={currencyLabel(item.currencyId, {[item.currencyId]: item.label})}>{item.amount}</DetailRow>)
  : <Text style={styles.muted}>{empty}</Text>;

const IdentityHeading = ({model, fallback}) => <View style={styles.section}>
  <Text style={styles.title}>{model?.displayName || fallback || 'VerusID'}</Text>
  {!!model && <Text style={styles.muted}>{model.feeCurrency || currencyLabel(model.systemId, {[model.systemId]: model.networkName || model.chainTicker})}{model.isTestnet ? ' · Testnet' : ''}</Text>}
</View>;

const authorityName = (address, model) => address === model.identityAddress
  ? `This identity (${model.displayName})`
  : identityLabel(address, model.identityNames);

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
  const {setPlan, reloadVersion} = useIdentityManagement();
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

    return action.run(
      context => loadIdentityForUpdate({chain, identityAddress}, context),
      loaded => {
        const initial = editableFields(loaded);
        initialFields.current = initial;
        setFields(initial);
        setModel(loaded);

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

  return {...action, model, fields, change, fundingAddress, setFundingAddress, balances, load, review};
}

function FundingSource({form}) {
  const showBalance = useSelector(state => state.coins.showBalance !== false);
  const {model, fundingAddress, setFundingAddress, busy, balances} = form;
  const sources = model.fundingSources || [];
  const coin = {id: model.chainTicker, system_id: model.systemId};
  const label = source => source?.isIdentity
    ? identityLabel(source.address, {...model.identityNames, [source.address]: source.fundingName})
    : source?.fundingName || 'Wallet address';

  return <View style={styles.card}>
    <SelectionField
      label="Pay network fee from"
      value={label(sources.find(source => source.address === fundingAddress))}
      disabled={busy}
      onSelect={setFundingAddress}
      options={sources.map(source => {
        const balance = registrationFundingBalance(coin, source, balances);

        return {
          value: source.address,
          label: label(source),
          selected: source.address === fundingAddress,
          description: showBalance && balance != null
            ? `${balance} ${currencyLabel(model.systemId)} available`
            : undefined,
        };
      })}
    />
    <Text style={styles.muted}>You’ll review the exact network fee before paying.</Text>
  </View>;
}

const LoadingIdentity = ({busy}) => <View style={styles.card}>
  <Text style={styles.body}>{busy ? 'Loading identity…' : 'Load this identity to continue.'}</Text>
</View>;

export function IdentityModify(props) {
  return <IdentityModifyForm key={`${props.route.params?.chain}:${props.route.params?.identityAddress}`} {...props} />;
}

function IdentityModifyForm({navigation, route}) {
  const form = useIdentityForm(route, navigation, 'modify');
  const {model, fields, change, busy, error, load, review} = form;

  return <Page error={error} footer={<>
    <Text style={[styles.muted, {textAlign: 'center'}]}>No changes are sent until you approve.</Text>
    <ActionButton busy={busy} onPress={model && error?.code !== 'REVIEW_CHANGED' ? () => review() : load}>
      {error?.code === 'REVIEW_CHANGED' ? 'Reload identity' : model ? 'Review changes' : 'Load identity'}
    </ActionButton>
  </>}>
    <IdentityHeading model={model} fallback={route.params?.displayName} />
    {!model ? <LoadingIdentity busy={busy} /> : <>
      <View style={styles.card}>
        <Text style={styles.subtitle}>Ownership</Text>
        <Text style={styles.muted}>These addresses can sign for this identity. Only add addresses whose owners you trust.</Text>
        {fields.primaryaddresses.map((address, index) => <View key={index} style={styles.section}>
          <Input label={`Primary address ${index + 1}`} value={address} disabled={busy} multiline
            placeholder="R-address" onChangeText={value => change('primaryaddresses', fields.primaryaddresses.map((existing, at) => at === index ? value : existing))} />
          {fields.primaryaddresses.length > 1 && <TextAction icon="minus-circle-outline" disabled={busy}
            label={`Remove primary address ${index + 1}`} onPress={() => change('primaryaddresses', fields.primaryaddresses.filter((_, at) => at !== index))}>
            Remove address
          </TextAction>}
        </View>)}
        {fields.primaryaddresses.length < MAX_IDENTITY_PRIMARY_ADDRESSES && <TextAction icon="plus-circle-outline" disabled={busy}
          onPress={() => change('primaryaddresses', [...fields.primaryaddresses, ''])}>Add primary address</TextAction>}
        <Input label="Required signatures" value={fields.minimumsignatures} keyboardType="number-pad"
          disabled={busy} onChangeText={value => change('minimumsignatures', value)} />
        <Text style={styles.muted}>Choose 1–{Math.min(fields.primaryaddresses.length, 13)} of the {fields.primaryaddresses.length} primary addresses to require. Multiple signatures may prevent this wallet from making future updates on its own.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.subtitle}>Recovery & revocation</Text>
        <Text style={styles.muted}>Revocation can suspend the identity. Recovery can restore it and change its ownership. Choose identities you trust.</Text>
        {[
          ['revocationauthority', 'Revocation identity'],
          ['recoveryauthority', 'Recovery identity'],
        ].map(([key, label]) => <View key={key} style={styles.section}>
          <Input label={label} value={fields[key]} disabled={busy} placeholder="guardian@"
            onChangeText={value => change(key, value)} />
          <TextAction disabled={busy} label={`Use this identity for ${label.toLowerCase()}`}
            onPress={() => change(key, model.displayName)}>Use this identity</TextAction>
          {key === 'recoveryauthority' && <Text style={styles.muted}>The recovery identity can take control of this identity. After a change, only the new recovery identity can authorize another change to recovery. Choose an identity whose owner you trust.</Text>}
        </View>)}
        <Text style={styles.muted}>Use a full name ending in @ or an identity address. Changing either role also requires this wallet to control its current authority.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.subtitle}>Private receiving address</Text>
        <Input label="Private address (optional)" value={fields.privateaddress} disabled={busy} multiline
          placeholder="zs-address" onChangeText={value => change('privateaddress', value)} />
        {!!model.walletPrivateAddress && <TextAction disabled={busy}
          onPress={() => change('privateaddress', model.walletPrivateAddress)}>Use this wallet’s private address</TextAction>}
        <Text style={styles.muted}>The address published for private payments. Changing it does not move existing funds. Leave empty to remove the identity’s published private addresses.</Text>
      </View>
      <FundingSource form={form} />
      <View style={styles.card}>
        <Disclosure title="Other identity details" summary="Name, content and identity address">
          <Text style={styles.muted}>The name, namespace, content, and any existing lock stay as they are.</Text>
          <DetailRow label="Identity address">{model.identityAddress}</DetailRow>
          {!!model.identity?.parent && <DetailRow label="Namespace">{identityLabel(model.identity.parent, model.identityNames)}</DetailRow>}
        </Disclosure>
      </View>
    </>}
  </Page>;
}

export function IdentityTransfer(props) {
  return <IdentityTransferForm key={`${props.route.params?.chain}:${props.route.params?.identityAddress}`} {...props} />;
}

function IdentityTransferForm({navigation, route}) {
  const form = useIdentityForm(route, navigation, 'transfer');
  const {model, busy, error, load, review, setError} = form;
  const [recipient, setRecipient] = useState('');
  const [returnFunds, setReturnFunds] = useState(true);
  const [scanning, setScanning] = useState(false);
  const scanHandled = useRef(false);

  const closeScanner = () => {
    scanHandled.current = true;
    setScanning(false);
  };

  const onScan = codes => {
    if (scanHandled.current) return;

    scanHandled.current = true;
    setScanning(false);

    try {
      setRecipient(recipientFromQr(codes?.[0]?.value, model.systemId));
      setError(null);
    } catch (failure) {
      setError({message: failure.message});
    }
  };

  return <>
    <Page error={error} footer={<>
      <Text style={[styles.muted, {textAlign: 'center'}]}>Review the new owner and fee before transferring.</Text>
      <ActionButton busy={busy} disabled={!!model && !recipient.trim() && error?.code !== 'REVIEW_CHANGED'}
        onPress={model && error?.code !== 'REVIEW_CHANGED' ? () => review(recipient.trim(), {returnFunds, returnAddress: model.signingAddress}) : load}>
        {error?.code === 'REVIEW_CHANGED' ? 'Reload identity' : model ? 'Review transfer' : 'Load identity'}
      </ActionButton>
    </>}>
      <IdentityHeading model={model} fallback={route.params?.displayName} />
      {!model ? <LoadingIdentity busy={busy} /> : <>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Who should own this identity?</Text>
          <Input label="New owner" value={recipient} placeholder="R-address or satoshi@" multiline disabled={busy}
            onChangeText={setRecipient} />
          <TextAction icon="qrcode-scan" disabled={busy} onPress={() => {
            Keyboard.dismiss();
            scanHandled.current = false;
            setScanning(true);
          }}>Scan QR code</TextAction>
          <Text style={styles.muted}>Enter a transparent address, or a VerusID name ending in @. Identity addresses also work.</Text>
        </View>
        <View style={styles.notice}>
          <Text style={styles.body}>Using another VerusID?</Text>
          <Text style={styles.muted}>We’ll copy its current primary addresses, required signatures, and private receiving address if it has one. Future changes to that VerusID won’t change this one.</Text>
        </View>
        <View style={styles.card}>
          <CheckOption label="Return identity funds to my wallet" checked={returnFunds} disabled={busy}
            onPress={() => setReturnFunds(value => !value)} />
          {returnFunds ? <>
            <Text style={styles.muted}>Funds held at this identity address on {currencyLabel(model.systemId, {[model.systemId]: model.networkName || model.chainTicker})} return to your main wallet in the same transaction as the transfer.</Text>
            <DetailRow label="Return to">Main wallet address</DetailRow>
            <Text selectable style={styles.muted}>{model.signingAddress}</Text>
            <Text style={styles.muted}>We’ll show the exact amounts before you approve. Private funds and funds on other networks are not moved.</Text>
          </> : <View style={[styles.notice, styles.warning]}>
            <Text style={styles.body}>The new owner will receive the identity’s funds on this network.</Text>
            <Text style={styles.muted}>Those funds will be included in your total transfer cost. Leave this unchecked only if you intend to give them away.</Text>
          </View>}
        </View>
        <FundingSource form={form} />
        <View style={[styles.notice, styles.warning]}>
          <Text style={styles.body}>Recovery and revocation transfer too</Text>
          <Text style={styles.muted}>Both roles will be set to this identity, so its previous external authorities cannot retain these powers. Review carefully: a transfer cannot simply be undone.</Text>
        </View>
      </>}
    </Page>
    <SemiModal
      visible={scanning}
      title="Scan recipient"
      animationType="slide"
      flexHeight={3}
      onRequestClose={closeScanner}
    >
      {scanning && <BarcodeReader
        cameraOn={scanning}
        onScan={onScan}
        prompt="Scan a receiving address or VerusID"
        button={() => (
          <View style={{padding: 16}}>
            <ActionButton secondary onPress={closeScanner}>Cancel</ActionButton>
          </View>
        )}
      />}
    </SemiModal>
  </>;
}

const fieldLabels = {
  primaryaddresses: 'Primary addresses',
  minimumsignatures: 'Required signatures',
  privateaddress: 'Private receiving address',
  recoveryauthority: 'Recovery identity',
  revocationauthority: 'Revocation identity',
};

const fieldValue = (field, value, review) => {
  if (field.endsWith('authority')) return authorityName(value, review);
  if (Array.isArray(value)) return value.join('\n');

  return value === '' || value == null ? 'None' : String(value);
};

export function IdentityUpdateReview({navigation}) {
  const {plan, setPlan, setResult, setReloadVersion} = useIdentityManagement();
  const {busy, error, run, running} = useAction();
  const [acknowledgedPlan, setAcknowledgedPlan] = useState(null);
  const [keepLinkedPlan, setKeepLinkedPlan] = useState(null);
  const completedPlan = useRef(null);
  const review = plan?.review;
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

  if (!review) return <Page footer={<ActionButton onPress={() => navigation.goBack()}>Back</ActionButton>}>
    <Text style={styles.body}>Choose your changes to prepare a new review.</Text>
  </Page>;

  const changed = Object.keys(fieldLabels).filter(key => JSON.stringify(review.before[key]) !== JSON.stringify(review.after[key]));
  const leavingFunds = transfer && !review.returnFunds;
  const transferredTokens = (review.transferredFunds || []).filter(item => item.currencyId !== review.systemId);

  return <Page error={error} footer={<>
    {needsAcknowledgement && <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{checked: acknowledged, disabled: busy}}
      accessibilityLabel="I understand who will control this identity"
      disabled={busy}
      onPress={() => setAcknowledgedPlan(value => value === plan ? null : plan)}
      style={[styles.row, styles.touchRow]}
    >
      <Icon name={acknowledged ? 'checkbox-marked' : 'checkbox-blank-outline'} size={24} color={Colors.primaryColor} accessible={false} />
      <Text style={[styles.muted, {flex: 1}]}>I understand who will control this identity.</Text>
    </Pressable>}
    <ActionButton
      busy={busy}
      disabled={!stale && needsAcknowledgement && !acknowledged}
      onPress={stale ? () => {
        setPlan(null);
        setReloadVersion(version => version + 1);
        navigation.goBack();
      } : send}
    >
      {stale ? 'Reload identity' : transfer ? 'Pay & transfer identity' : 'Pay & save changes'}
    </ActionButton>
  </>}>
    <IdentityHeading model={review} />
    <View style={styles.card}>
      <Text style={styles.eyebrow}>Total cost</Text>
      <Text style={styles.heroAmount}>{review.nativeTotalCost || review.fee} <Text style={styles.heroCurrency}>{review.feeCurrency || review.chainTicker}</Text></Text>
      {leavingFunds && transferredTokens.length > 0 && <FundRows funds={transferredTokens} />}
      <Text style={styles.muted}>{leavingFunds ? 'Includes the network fee and funds given to the new owner.' : 'Network fee only. No identity registration charge.'}</Text>
      <View style={styles.divider} />
      <DetailRow label="Network fee">{review.fee} {review.feeCurrency || review.chainTicker}</DetailRow>
      <DetailRow label="Fee paid from">{review.fundingName || (review.fundingAddress === review.signingAddress ? 'Wallet address' : identityLabel(review.fundingAddress, review.identityNames))}</DetailRow>
      <Text style={styles.muted}>{leavingFunds && review.fundingAddress === review.identityAddress
        ? 'Remaining payment funds stay with the identity for its new owner and are included above.'
        : review.changeAddress === review.signingAddress ? 'Payment change returns to your main wallet address.' : 'Unspent change returns to this payment address.'}</Text>
    </View>
    {transfer && <View style={[styles.card, leavingFunds && styles.warning]}>
      <Text style={styles.subtitle}>{leavingFunds ? 'Funds given to the new owner' : 'Funds returned to you'}</Text>
      <FundRows funds={leavingFunds ? review.transferredFunds : review.returnedFunds} />
      <Text style={styles.muted}>{leavingFunds
        ? 'Included in the total cost above. You give up these funds when you transfer the identity.'
        : 'These funds return to your main wallet in the same transaction. They are not a cost.'}</Text>
      {!leavingFunds && <DetailRow label="Return address">{review.returnAddress}</DetailRow>}
      {!leavingFunds && review.fundingChange?.length > 0 && <Disclosure title="Additional payment change">
        <FundRows funds={review.fundingChange} />
        <DetailRow label="Change returns to">{review.changeName}</DetailRow>
        <Text style={styles.muted}>Unused funds from the fee payment source return to that payment address.</Text>
      </Disclosure>}
    </View>}
    {transfer && <View style={[styles.notice, styles.warning]}>
      <Text style={styles.subtitle}>Transfer ownership</Text>
      {!!review.recipientName && <DetailRow label="New owner">{review.recipientName}</DetailRow>}
      <Text style={styles.body}>The new primary addresses will control this identity. Check every address before approving.</Text>
      {review.losesControl && <Text style={styles.muted}>This wallet will no longer have primary control.</Text>}
    </View>}
    {!transfer && review.losesControl && <View style={[styles.notice, styles.warning]}>
      <Text style={styles.body}>These changes remove this wallet’s ability to control the identity on its own.</Text>
    </View>}
    {assignsExternalRecovery && <View style={[styles.notice, styles.warning]}>
      <Text style={styles.subtitle}>Recovery gives control</Text>
      <Text style={styles.body}>{authorityName(review.after.recoveryauthority, review)} will be able to take control of this identity. Only that identity will be able to authorize future changes to the recovery identity.</Text>
    </View>}
    {review.losesControl && <View style={styles.card}>
      <CheckOption label="Unlink from my wallet after sending" checked={unlinkAfterSend} disabled={busy}
        onPress={() => setKeepLinkedPlan(value => value === plan ? null : plan)} />
      <Text style={styles.muted}>This wallet will no longer be able to sign for the identity on its own. Unlinking removes its wallet cards; it does not delete the identity. Uncheck to keep viewing it here.</Text>
    </View>}
    {Number(review.after.minimumsignatures) > 1 && <View style={[styles.notice, styles.warning]}>
      <Text style={styles.body}>Future updates require {review.after.minimumsignatures} signatures. This wallet cannot collect signatures from other owners.</Text>
    </View>}
    <View style={styles.card}>
      <Text style={styles.subtitle}>{transfer ? 'New signing policy' : 'Changes to approve'}</Text>
      {transfer ? <>
        {review.after.primaryaddresses.map((address, index) => <DetailRow key={address} label={`Primary address ${index + 1}`}>{address}</DetailRow>)}
        <DetailRow label="Required signatures">{review.after.minimumsignatures} of {review.after.primaryaddresses.length}</DetailRow>
        <Disclosure title="Current ownership">
          <DetailRow label="Primary addresses">{review.before.primaryaddresses.join('\n')}</DetailRow>
          <DetailRow label="Required signatures">{review.before.minimumsignatures} of {review.before.primaryaddresses.length}</DetailRow>
        </Disclosure>
      </> : changed.map(key => <View key={key} style={styles.section}>
        <Text style={[styles.body, {fontWeight: '600'}]}>{fieldLabels[key]}</Text>
        <DetailRow label="Currently">{fieldValue(key, review.before[key], review)}</DetailRow>
        <DetailRow label="After update">{fieldValue(key, review.after[key], review)}</DetailRow>
        <View style={styles.divider} />
      </View>)}
    </View>
    {transfer && <View style={styles.card}>
      <Text style={styles.subtitle}>Recovery & revocation</Text>
      <DetailRow label="Revocation identity">{authorityName(review.after.revocationauthority, review)}</DetailRow>
      <DetailRow label="Recovery identity">{authorityName(review.after.recoveryauthority, review)}</DetailRow>
      <Text style={styles.muted}>Both roles are set to this identity. Previous external authorities will no longer be able to revoke or recover it.</Text>
      {(review.before.revocationauthority !== review.after.revocationauthority || review.before.recoveryauthority !== review.after.recoveryauthority) && <Disclosure title="Previous authorities">
        <DetailRow label="Revocation identity">{authorityName(review.before.revocationauthority, review)}</DetailRow>
        <DetailRow label="Recovery identity">{authorityName(review.before.recoveryauthority, review)}</DetailRow>
      </Disclosure>}
      {review.after.privateaddress ? <>
        <DetailRow label={review.usesRecipientPrivateAddress ? 'Recipient’s private receiving address' : 'Private receiving address retained'}>{review.after.privateaddress}</DetailRow>
        {review.usesRecipientPrivateAddress ? <>
          <Text style={styles.muted}>Private payments will use the address published by {review.recipientName}. Existing private funds are not moved.</Text>
          {review.before.privateaddress !== review.after.privateaddress && <DetailRow label="Previous private receiving address">{review.before.privateaddress || 'None'}</DetailRow>}
        </> : <Text style={styles.muted}>Private payments still go to this address’s existing owner. The transfer does not give the recipient its private key. Modify the identity first if this address should be removed or changed.</Text>}
      </> : <Text style={styles.muted}>No private receiving address is published.</Text>}
    </View>}
    {(review.warnings || []).map((warning, index) => <View key={index} style={[styles.notice, styles.warning]}>
      <Text style={styles.body}>{warning}</Text>
    </View>)}
    <View style={styles.card}>
      <Disclosure title="Transaction details">
        <DetailRow label="Identity address">{review.identityAddress}</DetailRow>
        <DetailRow label="Payment address">{review.fundingAddress}</DetailRow>
        <DetailRow label="Change address">{review.changeAddress || review.fundingAddress}</DetailRow>
        <Text style={styles.muted}>The identity’s name, content and any existing lock are preserved.</Text>
      </Disclosure>
    </View>
  </Page>;
}

export function IdentityUpdateResult({navigation}) {
  const {result, setResult} = useIdentityManagement();
  const {busy, error, run, running} = useAction();
  const review = result?.review;
  const deliveryUnknown = !!result?.deliveryUnknown;

  useEffect(() => navigation.addListener('beforeRemove', event => {
    if (running.current) event.preventDefault();
  }), [navigation, running]);

  // Retrying local cleanup never repeats the identity transaction.
  const retryUnlink = () => run(
    context => unlinkUpdatedIdentity(review, context),
    () => {
      setResult({...result, unlinked: true, unlinkError: null});
    },
  );

  return <Page error={error} footer={<>
    {!!result?.unlinkError && <ActionButton secondary busy={busy} onPress={retryUnlink}>Retry unlink</ActionButton>}
    <ActionButton disabled={busy} onPress={() => navigation.getParent().goBack()}>{deliveryUnknown ? 'Close' : 'Done'}</ActionButton>
  </>}>
    <View style={styles.badge}>
      <Icon name={deliveryUnknown ? 'clock-outline' : 'check'} size={26} color={Colors.primaryColor} accessible={false} />
    </View>
    <Text style={styles.title}>{deliveryUnknown ? 'Delivery not confirmed' : result ? 'Update sent' : 'Identity update'}</Text>
    {deliveryUnknown && <>
      <Text style={styles.body}>The network may have received this identity update. Check the transaction’s status before starting a new review.</Text>
      <Text style={styles.muted}>This screen will not send the transaction again. The identity remains linked to your wallet.</Text>
      <View style={styles.card}>
        <DetailRow label="Transaction ID">{result.txid}</DetailRow>
      </View>
    </>}
    {result && !deliveryUnknown && <>
      <Text style={styles.body}>{review?.displayName} is waiting for network confirmation.</Text>
      {result.unlinked ? <Text style={styles.muted}>The identity has been unlinked and your wallet cards refreshed.</Text>
        : result.unlinkError ? <View style={[styles.notice, styles.warning]} accessibilityRole="alert">
          <Text style={styles.body}>Your update was sent, but unlinking needs another try.</Text>
          <Text style={styles.muted}>{result.unlinkError} Retry unlink only refreshes this wallet; it does not send another transaction.</Text>
        </View> : <Text style={styles.muted}>{review?.losesControl
          ? 'The identity stays linked for viewing. You can unlink it from VerusID whenever you’re ready.'
          : 'You can view the updated details from VerusID. Wait for confirmation before making another change.'}</Text>}
      {review?.mode === 'transfer' && (review.returnedFunds?.length > 0 || review.transferredFunds?.length > 0) && <Text style={styles.muted}>{review.returnFunds
        ? 'The returned identity funds will appear at your main wallet address as this transaction confirms.'
        : 'The funds shown in your review remain with the identity for its new owner.'}</Text>}
      <View style={styles.card}>
        <DetailRow label="Transaction ID">{result.txid}</DetailRow>
        <DetailRow label="Network fee">{review?.fee} {review?.feeCurrency || review?.chainTicker}</DetailRow>
      </View>
    </>}
  </Page>;
}
