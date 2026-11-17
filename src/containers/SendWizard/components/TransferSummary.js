import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import CopyFeedback from '../../../components/CopyFeedback';
import useCopyFeedback from '../../../hooks/useCopyFeedback';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import PrivacyBlurredText from '../../../components/PrivacyBlurredText';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';

const LOGO_SIZE = 40;
const COMPACT_LOGO_SIZE = 32;

// One end of a transfer: the asset logo, a short label ("You pay", "You
// receive") and the amount. The recipient is not named here; Confirm lists it
// once, in full. A long amount shrinks; a long label ("RSRG…LLck receives")
// wraps to a second line instead of running into the amount. `loading` holds
// the amount's place with a skeleton while the wallet still works it out.
// Without an amount (a pre-conversion before its launch), the ticker takes the
// amount's place. History details opt into `hideAmounts`; active payment
// reviews and results keep their existing readable amounts. `compact` is the
// smaller node that Confirm uses on small windows. When the wallet lowered the
// amount to pay the fees, `enteredAmount` ("0.0134422 ETH") shows struck
// through above the amount and `note` ("Lowered for fees") under the label
// (owner, 2026-11-13, option B of the reduced-amount mockups).
export const TransferNode = ({
  amount,
  coinId,
  compact = false,
  copyValue,
  enteredAmount,
  fiat,
  hideAmounts = false,
  label,
  loading = false,
  note,
  ticker,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;
  const AmountText = hideAmounts ? PrivacyBlurredText : Text;
  const {copied, canCopy, copyProps} = useCopyFeedback(copyValue, {
    disabled: loading || hideAmounts,
    haptic: true,
  });
  const Container = canCopy ? Pressable : View;

  return (
    <Container
      accessible={canCopy || undefined}
      {...copyProps}
      style={[styles.node, compact && styles.nodeCompact]}>
      <AssetCoinLogo coinId={coinId} size={compact ? COMPACT_LOGO_SIZE : LOGO_SIZE} />
      <View style={styles.labelWrap}>
        <Text
          numberOfLines={2}
          style={[theme.typography.bodySm, {color: colors.textSecondary}]}>
          {label}
        </Text>
        {note ? (
          <Text style={[theme.typography.caption, styles.note, {color: colors.warningText}]}>
            {note}
          </Text>
        ) : null}
      </View>
      <View
        accessible={hideAmounts || undefined}
        accessibilityLabel={hideAmounts ? 'Balance hidden' : undefined}
        style={styles.value}>
        <CopyFeedback copied={copied} contentStyle={styles.valueContent}>
          {loading ? (
            <SkeletonLoader style={styles.valueSkeleton}>
              <SkeletonBlock height={22} radius={6} width={112} />
            </SkeletonLoader>
          ) : amount == null ? (
            <Text
              numberOfLines={1}
              style={[styles.amount, compact && styles.amountLong, {color: colors.textPrimary}]}>
              {ticker}
            </Text>
          ) : (
            <>
              {enteredAmount ? (
                <Text
                  accessibilityLabel={`Entered ${enteredAmount}`}
                  numberOfLines={1}
                  style={[theme.typography.caption, styles.entered, {color: colors.textSecondary}]}>
                  {enteredAmount}
                </Text>
              ) : null}
              <View style={styles.amountRow}>
                <AmountText
                  {...(hideAmounts ? {hidden: true, blurRadius: 7, color: colors.textPrimary} : {})}
                  adjustsFontSizeToFit
                  minimumFontScale={0.6}
                  numberOfLines={1}
                  style={[
                    styles.amount,
                    (compact || String(amount).length > 11) && styles.amountLong,
                    {color: colors.textPrimary},
                  ]}>
                  {amount}
                </AmountText>
                <Text
                  numberOfLines={1}
                  style={[styles.ticker, compact && styles.tickerCompact, {color: colors.textSecondary}]}>
                  {' '}
                  {ticker}
                </Text>
              </View>
              {fiat ? (
                <AmountText
                  {...(hideAmounts ? {hidden: true, blurRadius: 5, color: colors.textSecondary} : {})}
                  style={[theme.typography.caption, {color: colors.textSecondary}]}>
                  {`≈ ${fiat}`}
                </AmountText>
              ) : null}
            </>
          )}
        </CopyFeedback>
      </View>
    </Container>
  );
};

// The line between two nodes. It carries what happens on the way: the price
// and the route. Pass each fact as its own line, so a route name never breaks
// in the middle.
export const TransferConnector = ({children, compact = false, loading = false}) => {
  const theme = useOnboardingTheme();
  return (
    <View
      style={[
        styles.connector,
        compact && styles.connectorCompact,
        {borderLeftColor: theme.colors.border},
      ]}>
      {loading ? (
        <SkeletonLoader style={styles.connectorSkeleton}>
          <SkeletonBlock height={13} radius={4} width={168} />
        </SkeletonLoader>
      ) : (
        [].concat(children).map(line => (
          <Text
            key={line}
            style={[theme.typography.caption, {color: theme.colors.textSecondary}]}>
            {line}
          </Text>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  node: {minHeight: 56, flexDirection: 'row', alignItems: 'center'},
  nodeCompact: {minHeight: 44},
  labelWrap: {flexGrow: 1, flexShrink: 1, minWidth: 0, marginLeft: 14, marginRight: 8, justifyContent: 'center'},
  value: {alignItems: 'flex-end', flexShrink: 0, marginLeft: 8, maxWidth: '64%'},
  valueContent: {alignItems: 'flex-end'},
  valueSkeleton: {alignSelf: 'flex-end'},
  amountRow: {flexDirection: 'row', alignItems: 'baseline', flexShrink: 1},
  note: {...fontStyle('semiBold')},
  entered: {textDecorationLine: 'line-through'},
  connectorSkeleton: {alignSelf: 'flex-start'},
  amount: {fontSize: 20, lineHeight: 26, ...fontStyle('bold')},
  amountLong: {fontSize: 17, lineHeight: 24},
  ticker: {flexShrink: 0, fontSize: 14, ...fontStyle('semiBold')},
  tickerCompact: {fontSize: 13},
  connector: {
    minHeight: 40,
    marginLeft: LOGO_SIZE / 2 - 1,
    paddingLeft: LOGO_SIZE / 2 + 13,
    borderLeftWidth: 2,
    justifyContent: 'center',
  },
  connectorCompact: {
    minHeight: 24,
    marginLeft: COMPACT_LOGO_SIZE / 2 - 1,
    paddingLeft: COMPACT_LOGO_SIZE / 2 + 13,
  },
});
