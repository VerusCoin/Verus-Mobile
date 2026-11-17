import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import SkeletonLoader, {SkeletonBlock} from '../../../components/SkeletonLoader';
import StatusBadge from '../../../components/StatusBadge';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {AssetCoinLogo} from '../../../utils/CoinData/Graphics';
import {IMPACT_LEVEL} from '../priceImpact';
import {FlatRow} from './WizardUI';
import {formatEstimatedAmount, getImpactBadgeLabel, getImpactTone} from './impactFormat';

// The receive block stays above Continue. Only the name gives way to the
// amount. A single-line middle ellipsis preserves the suffix on Android too.
const AmountEstimate = ({
  atLaunch = false,
  estimateLoading,
  estimatedOutput,
  moneyValue,
  onOpenDetails,
  priceImpact,
  showDetails,
  target,
}) => {
  const theme = useOnboardingTheme();
  const {colors} = theme;
  const quiet = priceImpact.impact == null || priceImpact.level === IMPACT_LEVEL.NONE;
  const chipLabel = quiet ? 'Details' : getImpactBadgeLabel(priceImpact.impact);

  return (
    <View style={[styles.estimate, {borderTopColor: colors.border}]}>
      {estimateLoading && !atLaunch ? (
        <SkeletonLoader accessibilityLabel="Estimating conversion">
          <View style={styles.receiveRow}>
            <SkeletonBlock height={32} radius={16} width={32} />
            <View style={styles.skeletonName}>
              <SkeletonBlock height={18} radius={4} width={80} />
              <SkeletonBlock height={14} radius={4} width={68} />
            </View>
            <View style={styles.amountColumn}>
              <SkeletonBlock height={22} radius={4} width={132} />
              <SkeletonBlock height={14} radius={4} width={80} />
            </View>
          </View>
          <View style={[styles.skeletonImpact, {borderTopColor: colors.border}]}>
            <SkeletonBlock height={18} radius={4} width={88} />
            <SkeletonBlock height={24} radius={12} width={54} />
          </View>
        </SkeletonLoader>
      ) : (
        <>
          <View style={styles.receiveRow}>
            <View style={styles.receiveLogo}>
              <AssetCoinLogo coinId={target.coinId || target.id} size={32} />
            </View>
            <View style={styles.nameColumn}>
              <Text
                accessibilityLabel={target.name || target.ticker}
                ellipsizeMode="middle"
                numberOfLines={1}
                style={[theme.typography.titleRow, {color: colors.textPrimary}]}>
                {target.name || target.ticker}
              </Text>
              <Text style={[theme.typography.caption, {color: colors.textSecondary}]}>
                You receive
              </Text>
            </View>
            <View style={styles.amountColumn}>
              <Text style={[
                atLaunch ? theme.typography.titleRow : styles.receiveAmount,
                {color: colors.textPrimary},
              ]}>
                {atLaunch ? 'Price set at launch' : estimatedOutput == null
                  ? '—' : `≈\u00A0${formatEstimatedAmount(estimatedOutput)}`}
              </Text>
              {!atLaunch && estimatedOutput != null && moneyValue != null ? (
                <Text style={[theme.typography.caption, {color: colors.textSecondary}]}>
                  {moneyValue}
                </Text>
              ) : null}
            </View>
          </View>
          {!atLaunch && estimatedOutput != null && showDetails ? (
            <View style={{borderTopColor: colors.border, borderTopWidth: StyleSheet.hairlineWidth}}>
              <FlatRow
                accessibilityLabel={`Price impact ${chipLabel}. Opens price and route`}
                label="Price impact"
                onPress={onOpenDetails}>
                <StatusBadge
                  label={chipLabel}
                  tone={getImpactTone(quiet ? IMPACT_LEVEL.NONE : priceImpact.level)}
                />
              </FlatRow>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  estimate: {paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth},
  receiveRow: {minHeight: 60, paddingVertical: 8, flexDirection: 'row', alignItems: 'center'},
  receiveLogo: {marginRight: 10, flexShrink: 0},
  nameColumn: {flex: 1, minWidth: 0, marginRight: 8},
  amountColumn: {flexShrink: 0, alignItems: 'flex-end', gap: 2},
  receiveAmount: {fontSize: 17, lineHeight: 22, ...fontStyle('bold'), textAlign: 'right'},
  skeletonName: {flex: 1, marginHorizontal: 10, gap: 4},
  skeletonImpact: {
    minHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default AmountEstimate;
