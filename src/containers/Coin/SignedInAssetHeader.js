import React, {useMemo, useState} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import {ChevronRight} from 'lucide-react-native';
import OnboardingBackButton from '../../components/OnboardingBackButton';
import PrivacyBlurredText from '../../components/PrivacyBlurredText';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {explorers} from '../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {getBridgedOrigin} from '../../utils/assets/bridgedOrigin';
import {truncateDecimal} from '../../utils/math';
import BridgedOriginSheet from './BridgedOriginSheet';

const lookupCoin = id => {
  try {
    return CoinDirectory.getBasicCoinObj(id);
  } catch (_) {
    return null;
  }
};

// The screen owns the safe top inset. This row replaces both the native
// navigation header and the old ticker row. Pre-launch assets reuse it alone.
const SignedInAssetHeader = ({asset, compact, onBack}) => {
  const theme = useOnboardingTheme();
  const {coin, showBalance, total, totalFiat} = asset;
  const [bridgedVisible, setBridgedVisible] = useState(false);
  const origin = useMemo(
    () =>
      getBridgedOrigin(lookupCoin(coin.id) || coin, {explorers, lookupCoin}),
    [coin],
  );
  const amount = total == null ? '—' : truncateDecimal(total, 4);
  const fiat = totalFiat ?? (coin.testnet ? '—' : null);
  const label = !showBalance
    ? `${coin.display_ticker} total balance hidden`
    : [amount, coin.display_ticker, totalFiat].filter(Boolean).join(', ');

  return (
    <View
      style={[
        styles.row,
        {height: compact ? 44 : 48, marginBottom: compact ? 2 : 4},
      ]}>
      <OnboardingBackButton onPress={onBack} style={styles.back} />
      <View accessible={false} style={styles.logo}>
        <AssetCoinLogo coinId={coin.id} size={24} />
      </View>
      <View style={styles.nameColumn}>
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          style={[
            theme.typography.titleRow,
            {color: theme.colors.textPrimary},
          ]}>
          {coin.display_name}
        </Text>
        {origin ? (
          <Pressable
            accessibilityLabel={origin.title}
            accessibilityRole="button"
            onPress={() => setBridgedVisible(true)}
            style={({pressed}) => [
              styles.bridged,
              {opacity: pressed ? 0.6 : 1},
            ]}
            testID="asset-bridged-line">
            <Text
              numberOfLines={1}
              style={[
                theme.typography.caption,
                styles.bridgedText,
                {color: theme.colors.textSecondary},
              ]}>
              {origin.title}
            </Text>
            <ChevronRight
              color={theme.colors.textSubtle}
              size={14}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
      </View>
      <View accessible accessibilityLabel={label} style={styles.total}>
        <PrivacyBlurredText
          adjustsFontSizeToFit
          blurRadius={7}
          color={theme.colors.textPrimary}
          containerStyle={styles.balanceFrame}
          hidden={!showBalance}
          minimumFontScale={0.75}
          numberOfLines={1}
          style={styles.amount}>
          {amount}
        </PrivacyBlurredText>
        {fiat != null ? (
          <PrivacyBlurredText
            blurRadius={5}
            color={theme.colors.textSecondary}
            containerStyle={styles.balanceFrame}
            hidden={!showBalance && totalFiat != null}
            numberOfLines={1}
            style={styles.fiat}>
            {fiat}
          </PrivacyBlurredText>
        ) : null}
      </View>
      {origin ? (
        <BridgedOriginSheet
          onClose={() => setBridgedVisible(false)}
          origin={origin}
          visible={bridgedVisible}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {marginHorizontal: 20, flexDirection: 'row', alignItems: 'center'},
  back: {marginLeft: -14},
  logo: {marginRight: 10},
  nameColumn: {flex: 1, minWidth: 0, justifyContent: 'center'},
  bridged: {
    minHeight: 44,
    marginVertical: -13,
    flexDirection: 'row',
    alignItems: 'center',
  },
  bridgedText: {flexShrink: 1},
  total: {maxWidth: '43%', marginLeft: 8, alignItems: 'flex-end'},
  balanceFrame: {maxWidth: '100%'},
  amount: {
    fontSize: 16,
    lineHeight: 21,
    letterSpacing: -0.2,
    ...fontStyle('bold'),
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  fiat: {
    fontSize: 12,
    lineHeight: 16,
    ...fontStyle('medium'),
    textAlign: 'right',
  },
});

export default SignedInAssetHeader;
