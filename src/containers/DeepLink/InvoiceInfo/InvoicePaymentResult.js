import React from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {DeepLinkReviewScrollView} from '../components/RequestReview';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BigNumber from 'bignumber.js';
import AppButton from '../../../components/AppButton';
import SignedOutActionRow from '../../../components/SignedOutActionRow';
import {ExternalLink} from 'lucide-react-native';
import ProgressHeader from '../../../components/ProgressHeader';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {satsToCoins} from '../../../utils/math';
import {
  InvoiceCopyRow,
  InvoiceRow,
  useInvoiceStyles,
} from './InvoicePaymentParts';

const InvoicePaymentResult = ({params, coinObj, onDone, onExplorer}) => {
  const {theme, styles} = useInvoiceStyles();
  const {output, txid, destination} = params;
  const burn = output.burn === true;
  const title = burn
    ? 'Burn submitted'
    : output.convertto
    ? 'Conversion submitted'
    : output.exportto
    ? 'Transfer submitted'
    : 'Payment submitted';
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <ProgressHeader
        title="Pay invoice"
        borderless
        progress={1}
        showBack={false}
      />
      <DeepLinkReviewScrollView
        showScrollCue
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <View style={styles.resultAmount}>
          <MaterialCommunityIcons
            name="check-circle-outline"
            size={36}
            color={theme.colors.success}
          />
          <Text selectable style={styles.resultAmountText}>
            {satsToCoins(BigNumber(output.satoshis)).toString()}{' '}
            {coinObj.display_ticker}
          </Text>
        </View>
        <Text style={styles.subtitle}>
          {burn
            ? 'The amount will be removed from circulation when the transaction is processed.'
            : 'Your transaction has been submitted. It may take time to arrive after it is confirmed.'}
        </Text>
        <InvoiceRow label="Status" value="Awaiting confirmation" />
        <InvoiceCopyRow
          label={burn ? 'Burn output address' : 'Destination'}
          value={destination}
        />
        <InvoiceCopyRow label="Transaction ID" value={txid} />
        {!!onExplorer && (
          <SignedOutActionRow
            IconComponent={ExternalLink}
            label="View transaction"
            onPress={onExplorer}
          />
        )}
      </DeepLinkReviewScrollView>
      <SafeBottomActionStack horizontalSpacing={24} style={styles.footer}>
        <AppButton onPress={onDone}>Done</AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
};

export default InvoicePaymentResult;
