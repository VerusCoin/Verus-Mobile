import React, {useEffect, useRef, useState} from 'react';
import {Keyboard, KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View, useWindowDimensions} from 'react-native';
import {ActivityIndicator, Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useHeaderHeight} from '@react-navigation/elements';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {CoinDirectory} from '../../../../../utils/CoinData/CoinDirectory';
import Colors from '../../../../../globals/colors';
import {buttonLabel, roundedButton} from '../../../../../styles/buttons.styles';
import {formatRegistrationAmount, registrationCostRows, identityLabel, registrationState} from './presentation';

export const registrationStyles = StyleSheet.create({
  page: {flex: 1, backgroundColor: '#fff'},
  scroll: {flex: 1},
  content: {padding: 16, gap: 20, width: '100%', maxWidth: 600, alignSelf: 'center'},
  footer: {flexShrink: 0, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#e3e7ed'},
  footerContent: {width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12, gap: 12},
  title: {fontSize: 28, fontWeight: '700', color: '#172033', flexShrink: 1},
  subtitle: {fontSize: 19, fontWeight: '600', color: '#172033', flexShrink: 1},
  body: {fontSize: 16, lineHeight: 23, color: '#172033', flexShrink: 1},
  muted: {fontSize: 14, lineHeight: 21, color: '#596579', flexShrink: 1},
  eyebrow: {fontSize: 13, fontWeight: '600', color: '#596579', marginBottom: 5},
  card: {backgroundColor: '#fff', borderWidth: 1, borderColor: '#e3e7ed', borderRadius: 18, padding: 18, gap: 14, minWidth: 0},
  row: {flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0},
  flexible: {flex: 1, minWidth: 0, gap: 4},
  divider: {height: StyleSheet.hairlineWidth, backgroundColor: '#dce1e9'},
  section: {gap: 10, minWidth: 0},
  label: {fontSize: 15, lineHeight: 22, color: '#596579', flex: 1, minWidth: 0},
  amount: {fontSize: 16, lineHeight: 23, fontWeight: '600', color: '#172033', flexShrink: 1},
  total: {fontWeight: '700', color: '#172033'},
  heroAmount: {fontSize: 32, fontWeight: '700', color: '#172033', flexShrink: 1},
  heroCurrency: {fontSize: 17, color: '#596579', flexShrink: 1},
  button: {...roundedButton, minHeight: 52, paddingVertical: 13, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center'},
  buttonLabel,
  touchRow: {minHeight: 48, paddingVertical: 10, minWidth: 0},
  notice: {backgroundColor: '#eaf0fc', padding: 14, borderRadius: 12, gap: 8},
  warning: {backgroundColor: '#fff3df'},
  error: {backgroundColor: '#fff0f0'},
  badge: {width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eaf0fc'},
  progressDot: {width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#edf0f5'},
});
const styles = registrationStyles;

export const currencyLabel = (currencyID, currencyNames = {}) => {
  const name = typeof currencyNames?.[currencyID] === 'string' ? currencyNames[currencyID].trim() : '';
  const fallback = name && name !== currencyID ? name : identityLabel(currencyID, {}, 'Unknown currency');
  try {
    const coin = CoinDirectory.findCoinObj(currencyID);
    return (coin?.display_ticker || coin?.display_name || fallback).replace(/@$/, '');
  } catch (_) {
    return fallback.replace(/@$/, '');
  }
};

const paymentSourceLabel = review => review.fundingAddress === review.signingAddress
  ? review.fundingName || 'Wallet address'
  : identityLabel(review.fundingAddress, {...review.identityNames,
    ...(review.fundingName ? {[review.fundingAddress]: review.fundingName} : {})});

export const RegistrationPage = ({children, error, refreshing = false, onRefresh, footer}) => {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const scrollView = useRef(null);
  useEffect(() => {
    if (error && !refreshing) {
      Keyboard.dismiss();
      scrollView.current?.scrollTo({y: 0, animated: true});
    }
  }, [error, refreshing]);
  return (
    <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={headerHeight}>
      <ScrollView ref={scrollView} style={styles.scroll} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic"
        alwaysBounceVertical={!!onRefresh}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={() => onRefresh(true)}
          tintColor={Colors.primaryColor} colors={[Colors.primaryColor]} /> : undefined}
        accessibilityActions={onRefresh ? [{name: 'refresh', label: 'Refresh costs'}] : undefined}
        onAccessibilityAction={onRefresh ? event => { if (event.nativeEvent.actionName === 'refresh') onRefresh(); } : undefined}
        contentContainerStyle={[styles.content, {paddingBottom: footer ? 16 : Math.max(insets.bottom, 16) + 16}]}>
        {!!error && <View style={[styles.notice, styles.error]} accessibilityRole="alert" accessibilityLiveRegion="assertive">
          <Text style={styles.body}>{error.message}</Text>
        </View>}
        {children}
      </ScrollView>
      {!!footer && <View testID="registration-footer" style={styles.footer}>
        <View style={[styles.footerContent, {paddingBottom: Math.max(insets.bottom, 16)}]}>{footer}</View>
      </View>}
    </KeyboardAvoidingView>
  );
};

export const ActionButton = ({children, onPress, disabled, busy, secondary = false, accessibilityLabel}) => (
  <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel || (typeof children === 'string' ? children : undefined)}
    accessibilityState={{disabled: !!disabled || !!busy, busy: !!busy}} disabled={disabled || busy} onPress={onPress}
    style={({pressed}) => [styles.button, {backgroundColor: secondary ? '#EBF6FF' : Colors.primaryColor, opacity: disabled || busy ? 0.5 : pressed ? 0.75 : 1}]}>
    {busy ? <ActivityIndicator color={secondary ? Colors.primaryColor : '#fff'} /> :
      <Text style={[styles.buttonLabel, {color: secondary ? Colors.primaryColor : '#fff'}]}>{children}</Text>}
  </Pressable>
);

export const Disclosure = ({title, summary, children, initiallyOpen = false}) => {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={styles.section}>
    <Pressable accessibilityRole="button" accessibilityLabel={summary && !open ? `${title}. ${summary}` : title}
      accessibilityState={{expanded: open}} onPress={() => setOpen(!open)}
      style={({pressed}) => [styles.row, styles.touchRow, {opacity: pressed ? 0.6 : 1}]}>
      <View style={styles.flexible}>
        <Text style={[styles.body, {fontWeight: '600'}]}>{title}</Text>
        {!!summary && !open && <Text style={styles.muted}>{summary}</Text>}
      </View>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color="#596579" accessible={false} />
    </Pressable>
    {open && children}
  </View>;
};

export const SelectionField = ({label, value, options, onSelect, disabled}) => {
  const [open, setOpen] = useState(false);
  return <View style={styles.section}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} accessibilityState={{expanded: open, disabled: !!disabled}}
      disabled={disabled} onPress={() => setOpen(!open)} style={({pressed}) => [styles.row, styles.touchRow, {opacity: pressed ? 0.6 : 1}]}>
      <View style={styles.flexible}><Text style={styles.eyebrow}>{label}</Text><Text style={styles.body}>{value}</Text></View>
      <Icon name={open ? 'chevron-up' : 'chevron-down'} size={22} color="#596579" accessible={false} />
    </Pressable>
    {open && options.map(option => <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={option.label}
      accessibilityState={{selected: option.selected, disabled: !!disabled}} disabled={disabled} onPress={() => { onSelect(option.value); setOpen(false); }}
      style={({pressed}) => [styles.row, styles.touchRow, {opacity: pressed ? 0.6 : 1}]}>
      <Icon name={option.selected ? 'radiobox-marked' : 'radiobox-blank'} size={24} color={option.selected ? Colors.primaryColor : '#596579'} accessible={false} />
      <View style={styles.flexible}>
        <Text style={styles.body}>{option.label}</Text>
        {!!option.description && <Text style={styles.muted}>{option.description}</Text>}
      </View>
    </Pressable>)}
  </View>;
};

export const DetailRow = ({label, children}) => <View style={styles.section}>
  <Text style={styles.eyebrow}>{label}</Text>
  <Text selectable style={styles.body}>{children}</Text>
</View>;

export const AmountRows = ({amounts, label, total = false, currencyNames}) => {
  const {width, fontScale} = useWindowDimensions();
  const stacked = width < 360 || fontScale > 1.2;
  return <View style={styles.section}>
    {Object.entries(amounts || {}).map(([currencyID, amount], index) => (
      <View key={currencyID} style={[styles.row, {alignItems: 'flex-start'}, stacked && {flexDirection: 'column', gap: 3}]}>
        {(index === 0 || !stacked) && <Text style={[styles.label, total && styles.total, stacked && {flex: 0}]}>{index === 0 ? label : ' '}</Text>}
        <Text selectable style={[styles.amount, total && styles.total, !stacked && {flex: 1, textAlign: 'right'}]}>
          {formatRegistrationAmount(amount)} {currencyLabel(currencyID, currencyNames)}
        </Text>
      </View>
    ))}
  </View>;
};

export const CostReview = ({quote, stage, currencyNames, identityNames = {}}) => {
  if (!quote) return null;
  const commitment = stage === 'commitment';
  const now = commitment ? {[quote.systemID]: quote.commitmentFee} : quote.totalRequired;
  return <View style={styles.card}>
    <View style={styles.section}>
      <Text style={styles.eyebrow}>PAY NOW</Text>
      {Object.entries(now).map(([id, amount]) => <View key={id} style={{flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 8}}>
        <Text selectable style={styles.heroAmount}>{formatRegistrationAmount(amount)}</Text>
        <Text style={styles.heroCurrency}>{currencyLabel(id, currencyNames)}</Text>
      </View>)}
      <Text style={styles.muted}>{commitment ? 'Name commitment · network fee' : 'Identity registration · fees included'}</Text>
    </View>
    <View style={styles.divider} />
    {commitment ? <>
      <AmountRows label="Register later (estimated)" amounts={quote.totalRequired} currencyNames={currencyNames} />
      <AmountRows label="Estimated total" amounts={quote.totalOperationRequired} total currencyNames={currencyNames} />
      <Text style={styles.muted}>You approve the registration payment separately after confirmation. Its price may change.</Text>
    </> : <>
      <AmountRows label="Commitment already paid" amounts={{[quote.systemID]: quote.commitmentFee}} currencyNames={currencyNames} />
      <AmountRows label="Total for both steps" amounts={quote.totalOperationRequired} total currencyNames={currencyNames} />
    </>}
    <Disclosure title="Fee breakdown">
      {registrationCostRows(quote).map((row, index) => <View key={index} style={styles.section}>
        <AmountRows currencyNames={currencyNames} label={row.label} amounts={{[row.currencyID]: row.amount}} />
        {!!row.recipient && <Text style={styles.muted}>To {identityLabel(row.recipient, {...currencyNames, ...identityNames})}</Text>}
      </View>)}
      {commitment && <Text style={styles.muted}>These are the estimated costs of the later registration payment.</Text>}
    </Disclosure>
  </View>;
};

export const IdentitySummary = ({review}) => <View style={styles.card}>
  <View style={[styles.row, {alignItems: 'flex-start'}]}>
    <View style={styles.badge}><Icon name="at" size={26} color={Colors.primaryColor} accessible={false} /></View>
    <View style={styles.flexible}>
      <Text selectable style={styles.subtitle}>{review.displayName}</Text>
      <Text style={styles.muted}>{currencyLabel(review.systemId, review.currencyNames)}</Text>
    </View>
  </View>
  <View style={styles.divider} />
  <Text style={styles.muted}>Paying from <Text style={styles.total}>{paymentSourceLabel(review)}</Text></Text>
  {!!review.registrationAuthority && <Text style={styles.muted}>Registration authorized by <Text style={styles.total}>{identityLabel(review.registrationAuthority, {...review.currencyNames, ...review.identityNames})}</Text></Text>}
</View>;

export const RegistrationDetails = ({review}) => {
  const names = {...review.currencyNames, ...review.identityNames, [review.identityAddress]: review.displayName};
  const authority = address => address === review.identityAddress ? 'This identity' : identityLabel(address, names);
  return <View style={styles.card}>
    <Disclosure title="Identity details" summary="Ownership, recovery and transaction details">
      <DetailRow label="Controlled by">This wallet</DetailRow>
      {!!review.identity?.privateaddress && <DetailRow label="Private address">{review.identity.privateaddress}</DetailRow>}
      <DetailRow label="Namespace">{identityLabel(review.identity?.parent, names)}</DetailRow>
      <DetailRow label="Referral">{review.referralID ? identityLabel(review.referralID, names) : 'None'}</DetailRow>
      <DetailRow label="Recovery">{authority(review.identity?.recoveryauthority)}</DetailRow>
      <DetailRow label="Revocation">{authority(review.identity?.revocationauthority)}</DetailRow>
      <Text style={styles.muted}>Change returns to {paymentSourceLabel(review)}. Required signatures: {review.identity?.minimumsignatures || 1}.</Text>
      <Disclosure title="Addresses & transactions">
        {[
          ['Identity address', review.identityAddress], ['Payment address', review.fundingAddress],
          ['Control address', review.signingAddress],
          ['Commitment transaction', review.commitmentTxid], ['Registration transaction', review.registrationTxid],
        ].filter(([, value]) => value).map(([label, value]) => <DetailRow key={label} label={label}>{value}</DetailRow>)}
      </Disclosure>
    </Disclosure>
  </View>;
};

export const RegistrationSteps = ({status}) => {
  const state = registrationState(status);
  return <View style={styles.card} accessibilityLabel="Registration steps">
    {[
      ['Commit name', state.commitment], ['Register identity', state.registration],
    ].map(([label, detail], index) => <View key={label} accessible accessibilityLabel={`Step ${index + 1}. ${label}. ${detail}`} style={[styles.row, {alignItems: 'flex-start'}]}>
      <View style={[styles.progressDot, (index < state.step || state.kind === 'complete') && {backgroundColor: '#e3f2e8'}]}>
        {index < state.step || state.kind === 'complete'
          ? <Icon name="check" size={18} color="#22713e" accessible={false} />
          : <Icon name={index === 0 ? 'numeric-1' : 'numeric-2'} size={22} color="#596579" accessible={false} />}
      </View>
      <View style={styles.flexible}>
        <Text style={[styles.body, {fontWeight: '600'}]}>{label}</Text>
        <Text style={styles.muted}>{detail}</Text>
      </View>
    </View>)}
  </View>;
};

export const StatusBadge = ({status}) => {
  const state = registrationState(status);
  const color = state.kind === 'complete' ? '#22713e' : state.kind === 'attention' ? '#87540d' : Colors.primaryColor;
  return <View style={styles.row} accessible accessibilityLabel={state.title}>
    <Icon name={state.icon} size={20} color={color} accessible={false} />
    <Text style={[styles.muted, {color, fontWeight: '600'}]}>{state.title}</Text>
  </View>;
};

export const RegistrationListItem = ({job, onPress, disabled, busy, onDelete, deleteDisabled, deleting}) => {
  const state = registrationState(job.status);
  const cannotDelete = !!disabled || !!deleteDisabled || !!deleting;
  return <View style={styles.card}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${job.displayName || job.name}. ${state.title}. ${busy ? 'Opening registration' : state.action}`}
      disabled={disabled || deleting} accessibilityState={{disabled: !!disabled || !!deleting, busy: !!busy}}
      onPress={onPress} style={({pressed}) => [styles.section, {opacity: pressed ? 0.7 : 1}]}>
      <Text style={styles.subtitle} numberOfLines={2}>{job.displayName || job.name}</Text>
      <StatusBadge status={job.status} />
      <View style={styles.row}>
        {busy && <ActivityIndicator size="small" color={Colors.primaryColor} />}
        <Text style={[styles.body, {color: Colors.primaryColor, fontWeight: '600'}]}>{busy ? 'Opening registration…' : `${state.action} ›`}</Text>
      </View>
    </Pressable>
    {!!onDelete && <>
      <View style={styles.divider} />
      <Pressable accessibilityRole="button" accessibilityLabel={`Delete saved registration for ${job.displayName || job.name}`}
        accessibilityState={{disabled: cannotDelete, busy: !!deleting}} disabled={cannotDelete} onPress={onDelete}
        style={({pressed}) => [styles.row, styles.touchRow, {alignSelf: 'flex-start', opacity: cannotDelete ? 0.5 : pressed ? 0.7 : 1}]}>
        {deleting ? <ActivityIndicator size="small" color="#b42318" /> : <Icon name="delete-outline" size={20} color="#b42318" accessible={false} />}
        <Text style={[styles.body, {color: '#b42318'}]}>{deleting ? 'Deleting…' : 'Delete'}</Text>
      </Pressable>
    </>}
  </View>;
};
