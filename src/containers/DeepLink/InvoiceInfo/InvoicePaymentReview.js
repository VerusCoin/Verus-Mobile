import React, {useState} from 'react';
import {View} from 'react-native';
import {Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import {DeepLinkReviewScrollView} from '../components/RequestReview';
import BigNumber from 'bignumber.js';
import AppButton from '../../../components/AppButton';
import SlideToConfirm from '../../../components/SlideToConfirm';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import ProgressHeader from '../../../components/ProgressHeader';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {satsToCoins} from '../../../utils/math';
import {SEND_MODAL_INVOICE_CONTEXT} from '../../../utils/constants/sendModal';
import {ERC20, ETH} from '../../../utils/constants/intervalConstants';
import DeepLinkRequestSheetScaffold from '../components/RequestReview/DeepLinkRequestSheetScaffold';
import {
  InvoiceCopyRow,
  InvoiceErrorLine,
  InvoiceRow,
  useInvoiceStyles,
} from './InvoicePaymentParts';

const InvoicePaymentReview = ({
  params,
  sendModal,
  confirmationFields,
  networkName,
  onSend,
  submitting = false,
  broadcastStatusUnknown = false,
  // A failed send. It shows above the Send action until the next attempt.
  sendError = null,
  onBack,
}) => {
  const {styles} = useInvoiceStyles();
  const [showDetails, setShowDetails] = useState(false);
  const {output, names, validation, deltas, estimate, converterdef, submittedsats} =
    params;
  const context = sendModal.data[SEND_MODAL_INVOICE_CONTEXT];
  const currencyName = id => (names.has(id) ? names.get(id) : id);
  const amount = (value, currency) =>
    `${satsToCoins(BigNumber(value)).toString()} ${currencyName(currency)}`;
  const destination = output.address.getAddressString();
  const burn = output.burn === true;
  const maximumFees = [ETH, ERC20].includes(sendModal.coinObj.proto);
  const fees = Object.entries(validation.fees).filter(
    ([, value]) => !BigNumber(value).isZero(),
  );
  const debits = [...deltas.entries()].filter(([, value]) =>
    BigNumber(value).isNegative(),
  );
  // The preflight lowers a flexible amount when the fee does not fit.
  const amountLowered =
    submittedsats != null && submittedsats !== output.satoshis;
  const centralized = converterdef != null && converterdef.proofprotocol === 2;

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.screen}>
      <ProgressHeader
        title="Pay invoice"
        borderless
        progress={0.65}
        showBack={!submitting}
        onBack={onBack}
      />
      <DeepLinkReviewScrollView
        showScrollCue
        style={styles.scroll}
        contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          {burn ? 'Review burn' : 'Review payment'}
        </Text>
        <Text selectable style={styles.amount}>
          {amount(output.satoshis, output.currency)}
        </Text>
        <InvoiceRow
          label="From"
          value={`${sendModal.coinObj.display_ticker} · ${sendModal.subWallet.name}`}
        />
        {!!networkName && <InvoiceRow label="Network" value={networkName} />}
        <InvoiceRow
          label={burn ? 'Burn output' : 'To'}
          value={currencyName(destination)}
        />
        {output.convertto && (
          <>
            <InvoiceRow
              label="Invoice amount"
              value={
                context.requestedAmount
                  ? `${context.requestedAmount} ${context.requestedCurrency}`
                  : context.requestedCurrency
              }
            />
            <InvoiceRow
              label="Estimated to receive"
              value={
                estimate?.estimatedcurrencyout != null
                  ? `${estimate.estimatedcurrencyout} ${currencyName(
                      output.convertto,
                    )}`
                  : 'Estimate unavailable'
              }
            />
          </>
        )}
        {fees.length === 0 ? (
          <InvoiceRow label="Network fee" value="0" />
        ) : (
          fees.map(([currency, value]) => (
            <InvoiceRow
              key={currency}
              label={maximumFees ? 'Maximum network fee' : 'Network fee'}
              value={amount(value, currency)}
            />
          ))
        )}
        {debits.map(([currency, value]) => (
          <InvoiceRow
            key={currency}
            label={maximumFees ? 'Maximum total debit' : 'Total debit'}
            value={amount(BigNumber(value).abs(), currency)}
          />
        ))}
        {burn && (
          <View style={styles.notice}>
            <Text style={styles.text}>
              This burn is the payment. The amount is permanently removed from
              circulation and the burn output address does not receive it. This
              cannot be reversed.
            </Text>
          </View>
        )}
        {amountLowered && (
          <View style={styles.notice}>
            <Text style={styles.text}>
              The amount is lowered from {amount(submittedsats, output.currency)}{' '}
              to {amount(output.satoshis, output.currency)} to cover the network
              fee.
            </Text>
          </View>
        )}
        {centralized && (
          <View style={styles.notice}>
            <Text style={styles.text}>
              {converterdef.fullyqualifiedname} is a centralized currency. Its
              controller, {converterdef.fullyqualifiedname}@, can mint new
              supply.
            </Text>
          </View>
        )}
        {output.convertto && (
          <View style={styles.notice}>
            <Text style={styles.text}>
              {estimate == null
                ? 'The wallet could not estimate the conversion result.'
                : 'The conversion result is an estimate.'}{' '}
              The final amount can change before the transaction is processed.
            </Text>
          </View>
        )}
        <InvoiceRow
          label="Payment details"
          onPress={() => setShowDetails(true)}
        />
      </DeepLinkReviewScrollView>
      <SafeBottomActionStack horizontalSpacing={24} style={styles.footer}>
        <Text style={styles.footnote}>{broadcastStatusUnknown
          ? 'The payment may have been sent. Check your transaction history before starting another payment.'
          : 'Payments cannot be reversed.'}</Text>
        <InvoiceErrorLine>{sendError}</InvoiceErrorLine>
        {broadcastStatusUnknown ? (
          <AppButton disabled>Status unknown</AppButton>
        ) : (
          <GestureHandlerRootView style={{alignSelf: 'stretch'}}>
            <SlideToConfirm onPress={onSend} loading={submitting}
              disabled={submitting} loadingText="Sending…"
              label={burn ? 'Slide to burn' : 'Slide to pay'} />
          </GestureHandlerRootView>
        )}
      </SafeBottomActionStack>
      <DeepLinkRequestSheetScaffold
        title="Payment details"
        visible={showDetails}
        onClose={() => setShowDetails(false)}>
        {confirmationFields
          .filter(field => field.condition == null || field.condition === true)
          .map((field, index) =>
            field.accordion ? (
              <View key={index}>
                <Text style={styles.groupLabel}>{field.label}</Text>
                {field.fields.map((item, i) => (
                  <InvoiceRow key={i} label={item.data} />
                ))}
              </View>
            ) : field.data != null ? (
              <InvoiceCopyRow
                key={index}
                label={field.key}
                value={field.data}
              />
            ) : null,
          )}
      </DeepLinkRequestSheetScaffold>
    </SafeAreaView>
  );
};

export default InvoicePaymentReview;
