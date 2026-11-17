import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import InfoSheet from '../../../components/InfoSheet';
import {InfoSheetRow} from '../../../components/InfoSheetSection';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {MoneyValue} from './ConfirmFacts';

const FeeBreakdownSheet = ({feeItems, onClose, visible}) => (
  <InfoSheet
    title="Fee breakdown"
    visible={visible}
    onClose={onClose}>
    {(feeItems.length
      ? feeItems
      : [{amount: 'Calculated by wallet', currency: ''}]
    ).map((item, index) => (
      <InfoSheetRow
        key={`${item.amount}:${item.currency}:${index}`}
        label="Network fee"
        value={`${item.amount}${item.currency ? ` ${item.currency}` : ''}`}
      />
    ))}
  </InfoSheet>
);

// The Network fee of an Ethereum-to-Verus bridge transfer. The fee is the gas
// limit (the estimate plus 25 %) at the highest gas price the transfer accepts.
// Ethereum charges only the gas used, so the real fee is lower. A transfer of
// the whole balance also keeps some ETH back. Plain text, no topic headings or
// dividers (owner, 2026-11-13: keep upstream's amounts, explain them simply).
export const BridgeNetworkFeeSheet = ({fee, lowered, money, onClose, ticker = 'ETH', visible}) => {
  const theme = useOnboardingTheme();
  const text = [theme.typography.bodySm, {color: theme.colors.textSecondary}];

  return (
    <InfoSheet
      title="Network fee"
      visible={visible}
      onClose={onClose}>
      <View style={styles.maximum}>
        <Text style={[theme.typography.caption, {color: theme.colors.textSecondary}]}>
          Most it can cost
        </Text>
        <MoneyValue money={money} style={styles.maximumValue} value={fee} />
      </View>
      <Text style={text}>
        The wallet estimates the gas and adds 25 % so the transfer goes through. Ethereum charges only for the gas the transfer uses. The rest stays in your wallet.
      </Text>
      {lowered ? (
        <Text style={[text, styles.paragraph]}>
          {`The fees came out of your amount. When you send your full balance, the wallet also keeps some extra ${ticker} back. It stays in your wallet.`}
        </Text>
      ) : null}
    </InfoSheet>
  );
};

const styles = StyleSheet.create({
  maximum: {gap: 4, marginBottom: 16},
  maximumValue: {textAlign: 'left'},
  paragraph: {marginTop: 12},
});

export default FeeBreakdownSheet;
