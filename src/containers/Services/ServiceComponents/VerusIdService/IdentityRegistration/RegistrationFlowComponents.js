import React from 'react';
import {Text, View} from 'react-native';
import BigNumber from 'bignumber.js';
import {Check, CircleAlert, Clock, X} from 'lucide-react-native';
import {useAppTheme} from '../../../../../theme/app';
import AppStatusBadge from '../../../../../components/StatusBadge';
import TextAction from '../../../../../components/TextAction';
import CopyAction from '../../../../../components/CopyAction';
import SkeletonLoader, {SkeletonBlock} from '../../../../../components/SkeletonLoader';
import SelectionSheet, {SelectionRow} from '../../../../../components/SelectionSheet';
import useSheetDismissal from '../../../../../components/useSheetDismissal';
import {InfoSheetTopic} from '../../../../../components/InfoSheetSection';
import {formatRegistrationAmount} from '../../../../../utils/identityRegistration/costs';
import {VerusIdName} from '../VerusIdCard';
import {currencyLabel, identityLabel, RegistrationText, useRegistrationStyles} from './RegistrationDesign';
import {useRegistrationFiat} from './useRegistrationPrices';
import {registrationCurrencyBalance, registrationFundingState} from './fundingSources';

export const shortRegistrationAddress = address => address ? `${address.slice(0, 5)}…${address.slice(-4)}` : '';
export const registrationPayerName = source => source?.isIdentity ? identityLabel(source.address, {[source.address]: source.fundingName}) : 'Transparent';
export const registrationAmounts = (quote, names, second = false) => Object.entries(
  (second ? quote?.totalRequired : quote?.totalOperationRequired) || {},
).map(([id, amount]) => `${formatRegistrationAmount(amount)} ${currencyLabel(id, names)}`).join(' + ');

export const RegistrationInfo = ({name = 'your VerusID', payer, children, create = false}) => <>
  <InfoSheetTopic title="How registration works">First, pay a small fee to commit your name. After 1 block confirmation, pay to create the VerusID.</InfoSheetTopic>
  <InfoSheetTopic title="Keep your app data">Keep this wallet and its app data until you finish. Your seed alone cannot restore a pending commitment.</InfoSheetTopic>
  {!!payer && <InfoSheetTopic title="Pay from">Both payments use {payer}.</InfoSheetTopic>}
  {create && <>
    <InfoSheetTopic title="Referral">A referral lowers the price.</InfoSheetTopic>
    <InfoSheetTopic title="Recovery">Can restore your VerusID if it is revoked.</InfoSheetTopic>
    <InfoSheetTopic title="Revocation">Can revoke your VerusID. Leave both empty to use {name} for both.</InfoSheetTopic>
  </>}
  {children}
</>;

export const RegistrationPayerSheet = ({visible, onClose, onSelect, sources, selectedAddress,
  quote, currencyNames, coin, coins, balances, reads, showBalance, onRetry}) => {
  const dismissal = useSheetDismissal({visible, onClose});
  const priceId = quote?.feePricingCurrencyID || quote?.issuerID;
  const valueLabel = currencyLabel(priceId, currencyNames);
  return <SelectionSheet title="Choose an address" visible={visible}
    onClose={dismissal.close} onClosed={dismissal.onClosed}>
    {sources.map(source => {
      const funding = registrationFundingState(quote, source, coin, coins, balances, reads);
      const subtitle = funding.status === 'short' ? `Not enough ${currencyLabel(funding.currencyId, currencyNames)}`
        : funding.status === 'error' ? 'Payer balances could not be checked.'
          : !source.isIdentity ? shortRegistrationAddress(source.address) : undefined;
      const balance = registrationCurrencyBalance(priceId, source, coin, coins, balances, reads);
      const value = !showBalance ? '***' : balance == null ? 'Checking…' : balance;
      return <SelectionRow key={source.address} title={registrationPayerName(source)}
        titleNumberOfLines={source.isIdentity ? 1 : undefined}
        subtitle={subtitle} subtitleMonospace={!source.isIdentity && !['short', 'error'].includes(funding.status)}
        selected={source.address === selectedAddress} disabled={funding.status !== 'enough'}
        accessibilityRole="radio" showChevron={false}
        accessibilityLabel={[registrationPayerName(source), subtitle,
          showBalance ? `${value} ${valueLabel}` : 'Balance hidden'].filter(Boolean).join(', ')}
        value={value} valueLabel={valueLabel}
        onPress={() => dismissal.dismiss(() => onSelect(source.address))} />;
    })}
    {sources.some(source => reads[source.address]?.status === 'error') && <TextAction onPress={onRetry}>Try again</TextAction>}
  </SelectionSheet>;
};

// Display quotes use atomic amounts; balances from the ledger/read API use coins.
export const RegistrationFunds = ({data, source, coin, coins, balances, reads, showBalance, funding,
  referralOnly, onRetry, prices = {}, namespace, smallDevice = false, loading = false, compact = false}) => {
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  const fiat = useRegistrationFiat();
  const enough = funding?.status === 'enough';
  // A referral-only payer sees the amount they can actually pay. The Referral
  // step still resolves the real recipient before the engine prepares anything.
  const quote = referralOnly && enough && data?.referralQuote ? data.referralQuote : data?.quote;
  const priceId = quote?.feePricingCurrencyID || quote?.issuerID || namespace?.id || coin?.system_id;
  const systemId = quote?.systemID || coin?.system_id;
  const ids = [priceId, ...(priceId !== systemId ? [systemId] : [])];
  const rows = ids.map((id, index) => ({id, label: index === 0 ? 'Price' : 'Network fees',
    amount: quote?.totalOperationRequired[id], currency: currencyLabel(id, data?.currencyNames)}));
  const problem = funding?.status === 'error' && <>
    <RegistrationText style={styles.errorText}>Payer balances could not be checked.</RegistrationText>
    <TextAction onPress={onRetry}>Try again</TextAction>
  </>;
  if (compact) {
    if (!quote) return null;
    const label = currencyLabel(funding?.currencyId || priceId, data?.currencyNames);
    const badge = enough ? referralOnly ? 'Enough with a referral' : 'Enough funds'
      : funding?.status === 'short' ? ids.length > 1 ? `Not enough ${label}` : 'Not enough funds' : null;
    return <View style={styles.section}>
      {rows.map(row => <View key={row.id} style={styles.row}>
        <Text style={styles.label}>{row.label}</Text>
        <Text style={styles.amount}>{formatRegistrationAmount(row.amount)} {row.currency}</Text>
      </View>)}
      {badge && <AppStatusBadge style={{alignSelf: 'flex-start'}} label={badge} tone={enough ? 'success' : 'danger'} />}
      {funding?.status === 'checking' && <RegistrationText muted>Checking funds…</RegistrationText>}
      {problem}
    </View>;
  }
  if (!coin || !source) return null;
  const cardStyle = [styles.fundsCard, smallDevice && styles.fundsCardSmall];
  const meterStyle = [styles.fundsMeter, smallDevice && styles.fundsMeterSmall];
  const balanceStyle = [styles.fundsBalance, smallDevice && styles.fundsBalanceSmall];
  const cardsStyle = [styles.fundsCards, smallDevice && styles.fundsCardsSmall];
  // The price loads with the first name check; nothing is loading before a name.
  if (!quote && !loading) return null;
  if (!quote) return <SkeletonLoader accessibilityLabel="Loading price and funds">
    <View style={cardsStyle}>{rows.map(row => <View key={row.id} style={cardStyle}>
      <View style={[styles.fundsTop, {alignItems: 'center'}]}>
        <Text style={styles.label}>{row.label}</Text>
        <SkeletonBlock color={theme.colors.border} height={smallDevice ? 22 : 26} width="48%" />
      </View>
      {!!fiat({[row.id]: '100000000'}, prices) && <SkeletonBlock color={theme.colors.border}
        height={smallDevice ? 18 : 20} width="24%" style={[styles.fundsFiat, smallDevice && styles.fundsFiatSmall, {alignSelf: 'flex-end'}]} />}
      <SkeletonBlock color={theme.colors.border} style={meterStyle} height={smallDevice ? 6 : 8} />
      <SkeletonBlock color={theme.colors.border} height={smallDevice ? 18 : 20} width="64%" style={balanceStyle} />
    </View>)}</View>
  </SkeletonLoader>;
  return <View style={cardsStyle}>
    {rows.map(row => {
      const value = registrationCurrencyBalance(row.id, source, coin, coins, balances, reads);
      const balance = new BigNumber(value);
      const known = value != null && balance.isFinite() && !balance.isNegative() && funding?.status !== 'error';
      const required = new BigNumber(row.amount);
      const atomicBalance = balance.times('100000000');
      const short = known && atomicBalance.lt(required);
      const fraction = known ? required.isZero() ? 1 : BigNumber.minimum(atomicBalance.div(required), 1).toNumber() : 0;
      const amount = formatRegistrationAmount(row.amount);
      const fiatValue = fiat({[row.id]: row.amount}, prices);
      const balanceText = !showBalance ? 'Balance hidden' : !known ? 'Checking…' : `You have ${value} ${row.currency}`;
      const meterText = !showBalance ? 'Balance hidden' : !known ? 'Checking…' : `${value} of ${amount} ${row.currency}`;
      return <View key={row.id} style={cardStyle}>
        <View style={styles.fundsTop}>
          <Text style={styles.label}>{row.label}</Text>
          <Text style={[styles.fundsAmount, smallDevice && styles.fundsAmountSmall]}>{amount} {row.currency}</Text>
        </View>
        {!!fiatValue && <Text style={[styles.fundsFiat, smallDevice && styles.fundsFiatSmall]}>{fiatValue}</Text>}
        <View style={meterStyle} accessible accessibilityRole="progressbar" accessibilityLabel={row.label}
          accessibilityValue={{text: meterText}}>
          {showBalance && known && <View style={[styles.fundsMeterFill, {width: `${fraction * 100}%`,
            backgroundColor: short ? theme.colors.danger : theme.colors.success}]} />}
        </View>
        <Text style={[balanceStyle, showBalance && short && (smallDevice ? styles.fundsBalanceShortSmall : styles.fundsBalanceShort)]}>{balanceText}</Text>
      </View>;
    })}
    {referralOnly && enough && <RegistrationText muted>You choose a referral in the next step.</RegistrationText>}
    {problem}
  </View>;
};

export const RegistrationSummary = ({name, referral, payer, recovery, revocation, onName, onReferral, onPayer, onRecovery, disabled = false}) => {
  const styles = useRegistrationStyles();
  const rows = [['Name', name, onName], ...(referral != null ? [['Referral', referral || 'None', onReferral]] : []),
    ['Pay from', registrationPayerName(payer), onPayer, !payer?.isIdentity ? shortRegistrationAddress(payer?.address) : null],
    ['Recovery', recovery || name, onRecovery], ['Revocation', revocation || name, onRecovery]];
  return <View>{rows.map(([label, value, change, address]) => <View key={label} style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text><View style={styles.flexible}>
      <RegistrationText style={styles.amount}>{value}</RegistrationText>
      {!!address && <Text style={styles.identifier}>{address}</Text>}
    </View>{change && <TextAction disabled={disabled} onPress={change}>Change</TextAction>}
  </View>)}</View>;
};

const quoteParts = (quote, names) => {
  const rows = [];
  const add = (label, id, amount, kind) => { if (new BigNumber(amount || 0).gt(0)) rows.push({label, id, amount, kind}); };
  if (quote.branch === 'native') add('Registration fee', quote.systemID, quote.nativeFee);
  else {
    add(quote.issuerPayment?.kind === 'burn' ? 'Namespace charge · Burned' : 'Namespace charge', quote.issuerPayment?.currencyID, quote.issuerPayment?.amount);
  }
  (quote.referralPayments || []).forEach((payment, i) => add(`${identityLabel(payment.recipient, names)}${i === 0 ? ' · Referral payment' : ''}`, payment.currencyID, payment.amount, 'referral'));
  if (quote.branch !== 'native') add('Network fee', quote.systemID, new BigNumber(quote.nativeFee).plus(quote.transferFee).toFixed(0), 'network');
  return rows;
};

export const RegistrationSplit = ({quote, names}) => {
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  const rows = quoteParts(quote, names);
  const colors = [theme.colors.textSubtle, theme.colors.primary, theme.colors.link, theme.colors.textSecondary];
  const price = new BigNumber(quote.registrationOffer);
  return <View style={styles.section}>
    <View style={styles.splitBar}>{rows.filter(row => row.kind !== 'network').map((row, i) => <View key={`${i}`} style={{
      flex: price.gt(0) ? new BigNumber(row.amount).div(price).toNumber() : 1, backgroundColor: colors[i % colors.length], marginRight: 1}} />)}</View>
    {rows.map((row, i) => <View key={`${i}`} style={[styles.row, {gap: 8, alignItems: 'flex-start'}]}>
      <View style={[styles.swatch, {backgroundColor: row.kind === 'network' ? theme.colors.background : colors[i % colors.length], borderColor: theme.colors.textSubtle}]} />
      <Text style={[styles.label, {color: theme.colors.textPrimary}]}>{row.label}</Text>
      <Text style={[styles.amount, theme.typography.labelMd]}>{formatRegistrationAmount(row.amount)}{quote.branch !== 'native' ? ` ${currencyLabel(row.id, names)}` : ''}</Text>
    </View>)}
  </View>;
};

export const RegistrationHero = ({quote, currencyNames, prices}) => {
  const styles = useRegistrationStyles();
  const fiat = useRegistrationFiat()(quote.totalOperationRequired, prices);
  const id = quote.feePricingCurrencyID || quote.issuerID;
  return <View style={styles.section}>
    <RegistrationText muted>You pay</RegistrationText>
    {/* Android measured "80 USD" as two lines but drew one, leaving a 36 dp gap
        on 360 dp phones. One line, as in the Send amount, keeps the box exact. */}
    <Text adjustsFontSizeToFit minimumFontScale={0.6} numberOfLines={1} style={styles.heroAmount}>
      {formatRegistrationAmount(quote.totalOperationRequired[id])} {currencyLabel(id, currencyNames)}
    </Text>
    {id !== quote.systemID ? <RegistrationText muted>+ {formatRegistrationAmount(quote.totalOperationRequired[quote.systemID])} {currencyLabel(quote.systemID, currencyNames)} in network fees</RegistrationText>
      : fiat && <RegistrationText muted>≈ {fiat}</RegistrationText>}
  </View>;
};

export const RegistrationTimeline = ({review, check = false, changed, oldPrice, commitmentText, registrationText, shortage}) => {
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  const {quote, currencyNames, identityNames, status} = review;
  const priceId = quote.feePricingCurrencyID || quote.issuerID;
  const firstDone = ['commitment_confirmed', 'registration_prepared', 'registration_expired', 'registration_broadcast', 'registered', 'complete'].includes(status) || status?.startsWith('registration_');
  const rows = [
    {title: 'Commitment', amount: quote.commitmentFee, id: quote.systemID, done: firstDone, text: check ? 'Hides the name. Does not reserve it.' : commitmentText},
    {title: 'Registration', amount: quote.totalRequired[priceId], id: priceId, done: ['registered', 'complete'].includes(status), text: registrationText},
  ];
  return <View style={styles.section}>{rows.map((row, i) => {
    const stage = i === 0 ? 'commitment' : 'registration';
    const failed = status === `${stage}_expired` || (i === 1 && review.registrationProblem === 'name_taken');
    const uncertain = [`${stage}_signed`, `${stage}_broadcast_unknown`].includes(status);
    const active = status === `${stage}_broadcast` || (i === 1 && ['commitment_confirmed', 'registration_prepared'].includes(status));
    const fill = row.done ? theme.colors.successText : failed ? theme.colors.destructive : uncertain ? theme.colors.warningText
      : check && i === 0 || active && status !== `${stage}_broadcast` ? theme.colors.primary : theme.colors.background;
    return <View key={row.title} style={[styles.row, {alignItems: 'stretch', gap: 12}]}>
    <View style={{width: check ? 14 : 24, alignItems: 'center'}}>
      <View style={[styles.timelineNode, check && {width: 14, height: 14, marginTop: 4}, {borderColor: active ? theme.colors.primary : fill !== theme.colors.background ? fill : theme.colors.textSubtle,
        backgroundColor: fill}]}>
        {row.done && <Check size={14} color={theme.colors.background} />}
        {failed && <X size={14} color={theme.colors.onDestructive} />}
        {uncertain && <CircleAlert size={14} color={theme.colors.background} />}
      </View>
      {i === 0 && <View style={[styles.timelineConnector, {backgroundColor: row.done ? theme.colors.successText : theme.colors.borderStrong}]} />}
    </View>
    <View style={[styles.flexible, {paddingBottom: i === 0 ? 10 : 0, gap: 4}]}>
      <View style={[styles.row, {flexWrap: 'wrap', gap: 8}]}><Text style={styles.amount}>{row.title}</Text>
        {check && <AppStatusBadge label={i === 0 ? 'Now' : 'After 1 block'} tone="neutral" />}
        {!check && i === 1 && changed && <AppStatusBadge label="Changed" tone="warning" />}
        <Text style={[styles.amount, {marginLeft: 'auto'}]}>{formatRegistrationAmount(row.amount)}{!check || quote.branch !== 'native' ? ` ${currencyLabel(row.id, currencyNames)}` : ''}</Text>
      </View>
      {!!row.text && <RegistrationText muted>{row.text}</RegistrationText>}
      {i === 1 && !shortage && !!oldPrice && <RegistrationText muted>The price was {oldPrice}.</RegistrationText>}
      {i === 1 && !!shortage && <View style={styles.section}>
        <RegistrationText muted>{shortage}</RegistrationText>
        <View style={styles.row}><Text style={{...theme.typography.labelMd, color: theme.colors.link}}>Copy address</Text><CopyAction value={review.fundingAddress} accessibilityLabel="Copy address" color={theme.colors.link} /></View>
      </View>}
      {i === 1 && !shortage && (check || status === 'registration_prepared') && <RegistrationSplit quote={quote} names={{...currencyNames, ...identityNames}} />}
    </View>
  </View>;
  })}</View>;
};

export const RegistrationStatusPill = ({label, tone = 'neutral', waiting = false}) => {
  const theme = useAppTheme();
  const Icon = waiting ? Clock : tone === 'success' ? Check : CircleAlert;
  const color = waiting ? theme.colors.link : theme.colors[`${tone}Text`] || theme.colors.textSecondary;
  const backgroundColor = waiting ? theme.colors.primaryBackground : theme.colors[`${tone}Background`] || theme.colors.surfaceMuted;
  return <View style={{alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingLeft: 8, borderRadius: 99, backgroundColor}}>
    <Icon size={14} color={color} /><AppStatusBadge label={label} tone={waiting ? 'info' : tone} />
  </View>;
};

export const RegistrationName = ({name}) => {
  const styles = useRegistrationStyles();
  const theme = useAppTheme();
  return <VerusIdName name={name} style={styles.title} leafColor={theme.colors.textPrimary} restColor={theme.colors.textSecondary} />;
};
