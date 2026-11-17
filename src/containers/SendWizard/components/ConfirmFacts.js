import React from 'react';
import {Platform, StyleSheet, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import ImpactRow from './ImpactRow';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import {FeeValue} from './NetworkFeeSheet';
import {FlatRow} from './WizardUI';
import {CopyableText} from '../../../components/CopyFeedback';

// The flat fact list under the pay and receive nodes on Confirm. The recipient
// shows here once, in full; the nodes carry only the amounts. The caller decides
// which optional facts apply; this only draws them in order. An export's
// total is not in this list: `ConfirmTotal` shows it above the slide.
const ConfirmFacts = ({
  arrives,
  compact = false,
  destinationNetwork,
  fees,
  feesCopyValue,
  feesMoney,
  exportFees,
  impact,
  onOpenFees,
  networkFee,
  feeLoading,
  leadingRows = [],
  memo,
  note,
  recipient,
  recipientCaption,
  resolvedRecipient,
  routeRows = [],
  trailingRows = [],
}) => {
  const theme = useOnboardingTheme();

  return (
    <View style={[styles.rows, compact && styles.rowsCompact, {borderTopColor: theme.colors.border}]}>
      {leadingRows.map(row => (
        <FlatRow key={row.label} {...row} />
      ))}
      <RecipientRow caption={recipientCaption} recipient={recipient} resolvedAddress={resolvedRecipient} />
      {memo ? <FlatRow copyValue={memo} label="Memo" numberOfLines={0} value={memo} /> : null}
      {note ? <FlatRow copyValue={note} label="Note" numberOfLines={0} value={note} /> : null}
      {destinationNetwork ? (
        <FlatRow copyValue={destinationNetwork} label="Destination network" value={destinationNetwork} />
      ) : null}
      {routeRows.map(row => (
        <FlatRow key={row.label} numberOfLines={0} {...row} />
      ))}
      {impact ? (
        <ImpactRow
          impact={impact.impact}
          level={impact.level}
          lossText={impact.lossText}
          onPress={impact.onPress}
          pay={impact.pay}
        />
      ) : null}
      {exportFees ? (
        <>
          <FlatRow copyValue={exportFees.bridgeCopyValue} label="Bridge fee">
            <MoneyValue money={exportFees.bridgeMoney} value={exportFees.bridge} />
          </FlatRow>
          <FlatRow copyValue={exportFees.networkCopyValue} label="Network fee" onPress={exportFees.onOpenNetwork}>
            <MoneyValue money={exportFees.networkMoney} value={exportFees.network} />
          </FlatRow>
        </>
      ) : networkFee ? (
        <FlatRow copyValue={feeLoading ? null : networkFee.copyValue} label="Network fee" onPress={onOpenFees}>
          {feeLoading ? <FeeSkeleton /> : <FeeValue amount={networkFee.amount} caption={networkFee.caption} />}
        </FlatRow>
      ) : (
        <FlatRow copyValue={feesCopyValue} label="Fees" onPress={onOpenFees}>
          <MoneyValue money={feesMoney} value={fees} />
        </FlatRow>
      )}
      <FlatRow copyValue={feeLoading || arrives === '—' ? null : arrives} label="Arrives" value={arrives}>
        {feeLoading ? <FeeSkeleton /> : null}
      </FlatRow>
      {trailingRows.map(row => (
        <FlatRow key={row.label} {...row} />
      ))}
    </View>
  );
};

// A coin value with its money value before it: "≈ €6,98  12.15552225 VRSC".
// The money is quieter than the coin value it belongs to. Both wrap and never
// truncate.
export const MoneyValue = ({money, style, value}) => {
  const theme = useOnboardingTheme();

  return (
    <Text style={[theme.typography.labelMd, styles.moneyValue, {color: theme.colors.textPrimary}, style]}>
      {money ? (
        <Text style={[styles.money, {color: theme.colors.textSecondary}]}>{`${money}  `}</Text>
      ) : null}
      {value}
    </Text>
  );
};

// An export's total, directly above the slide on every window size. A normal
// payment shows it as a quiet row. When the fees are higher than the amount
// (`loud`), it is the largest number on the screen. `items` lists each paid
// currency once.
export const ConfirmTotal = ({copyValue, items = [], loading = false, loud = false, money}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;
  const single = items.length === 1 ? items[0] : null;
  const coins = items.map(item => `${item.amount} ${item.currency}`).join(' + ');

  return (
    <FlatRow copyValue={loading ? null : copyValue} divider={false} label="Total" strong={loud}>
      {loading ? (
        <FeeSkeleton label="Preparing total" />
      ) : loud && single ? (
        <View style={styles.totalLoud}>
          {money ? (
            <Text style={[theme.typography.caption, styles.totalMoney, {color: colors.textSecondary}]}>
              {money}
            </Text>
          ) : null}
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.6}
            numberOfLines={1}
            style={[
              styles.totalAmount,
              String(single.amount).length > 11 && styles.totalAmountLong,
              {color: colors.textPrimary},
            ]}>
            {single.amount}
          </Text>
          <Text numberOfLines={1} style={[styles.totalTicker, {color: colors.textSecondary}]}>
            {' '}
            {single.currency}
          </Text>
        </View>
      ) : (
        <MoneyValue money={money} value={coins} />
      )}
    </FlatRow>
  );
};

// "To" with the full address. A pre-conversion adds one line under it: a
// failed launch refunds the same address.
export const RecipientRow = ({caption, recipient, resolvedAddress, resolvingAddress = false}) => {
  const theme = useOnboardingTheme();
  const addressStyle = recipient.includes('@') ? null : styles.address;

  if (!caption && !resolvedAddress && !resolvingAddress) {
    return (
      <FlatRow copyValue={recipient} label="To" numberOfLines={0} value={recipient} valueStyle={addressStyle} />
    );
  }
  return (
    <FlatRow label="To">
      <View style={styles.recipientValue}>
        <CopyableText copyValue={recipient} style={[styles.recipient, {color: theme.colors.textPrimary}, addressStyle]}>
          {recipient}
        </CopyableText>
        {resolvingAddress ? (
          <View style={styles.addressSkeleton}>
            <SkeletonLoader accessibilityLabel="Resolving recipient">
              <SkeletonBlock width={200} height={14} radius={4} />
            </SkeletonLoader>
          </View>
        ) : resolvedAddress ? (
          <CopyableText copyValue={resolvedAddress} style={[styles.recipientCaption, styles.address, {color: theme.colors.textSecondary}]}>
            {resolvedAddress}
          </CopyableText>
        ) : null}
        {caption ? (
          <Text style={[theme.typography.caption, styles.recipientCaption, {color: theme.colors.textSecondary}]}>
            {caption}
          </Text>
        ) : null}
      </View>
    </FlatRow>
  );
};

const FeeSkeleton = ({label = 'Preparing network fee'}) => (
  <SkeletonLoader accessibilityLabel={label}>
    <SkeletonBlock width={112} height={15} radius={4} />
  </SkeletonLoader>
);

// A notice from preflight, for example a centrally controlled currency.
export const ConfirmNotice = ({children}) => {
  const theme = useOnboardingTheme();

  return (
    <View style={[styles.notice, {backgroundColor: theme.colors.surfaceMuted}]}>
      <MaterialCommunityIcons
        name="alert-circle-outline"
        size={19}
        color={theme.colors.warning}
      />
      <Text style={[styles.noticeText, {color: theme.colors.textPrimary}]}>
        {children}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  rows: {marginTop: 24, marginBottom: 16, borderTopWidth: StyleSheet.hairlineWidth},
  rowsCompact: {marginTop: 16, marginBottom: 0},
  moneyValue: {flexShrink: 1, textAlign: 'right'},
  money: {...fontStyle('regular')},
  totalLoud: {flexShrink: 1, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'flex-end'},
  totalMoney: {marginRight: 8},
  // The pay and receive nodes' amount and ticker sizes.
  totalAmount: {flexShrink: 1, fontSize: 20, lineHeight: 26, ...fontStyle('bold')},
  totalAmountLong: {fontSize: 17, lineHeight: 24},
  totalTicker: {flexShrink: 0, fontSize: 14, ...fontStyle('semiBold')},
  address: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
  recipientValue: {flex: 1, alignItems: 'flex-end'},
  recipient: {textAlign: 'right', fontSize: 14, lineHeight: 19, ...fontStyle('semiBold')},
  recipientCaption: {marginTop: 2, textAlign: 'right'},
  addressSkeleton: {height: 18, marginTop: 2, justifyContent: 'center'},
  notice: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  noticeText: {flex: 1, marginLeft: 8, fontSize: 13, lineHeight: 19, ...fontStyle('regular')},
});

export default ConfirmFacts;
