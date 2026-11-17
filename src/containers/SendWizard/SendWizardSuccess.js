import React, {useCallback} from 'react';
import {BackHandler} from 'react-native';
import {useFocusEffect, useNavigation} from '@react-navigation/native';
import BigNumber from 'bignumber.js';
import TransactionResult from '../../components/TransactionResult';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {satsToCoins, truncateDecimal} from '../../utils/math';
import {
  formatArrivesAtLaunch,
  getLaunchFacts,
} from '../../utils/preconversion/launchFacts';
import {useChainHeight} from '../../utils/preconversion/usePrelaunch';
import {useSendWizard} from './SendWizardContext';
import {useInvoiceFlow} from './invoiceFlow';
import {
  TransferConnector,
  TransferNode,
} from './components/TransferSummary';
import {formatEstimatedAmount} from './components/impactFormat';
import {FlatRow} from './components/WizardUI';
import {useWizardFiat} from './useWizardFiat';
import {getLoweredFrom, loweredNodeProps} from './loweredAmount';
import {
  getDestinationNetwork,
  getPreparedConversionEstimate,
  getTransactionId,
  isOwnChannelAddress,
  shortAddress,
} from './wizardUtils';

const SendWizardSuccess = () => {
  const navigation = useNavigation();
  const {state} = useSendWizard();
  const activeAccount = useObjectSelector(
    stateValue => stateValue.authentication.activeAccount,
  );
  const invoiceFlow = useInvoiceFlow();
  const {
    amount,
    channel,
    estimate,
    preflightResult,
    recipientAddress,
    route,
    sourceCoin,
    sourceSubWallet,
    target,
    txResult,
  } = state;
  const {format: formatFiat} = useWizardFiat(sourceSubWallet);
  const txid = getTransactionId(txResult);
  const estimatedReceive = getPreparedConversionEstimate(
    preflightResult, estimate,
  )?.estimatedcurrencyout;
  const isConversion = Boolean(target?.isConversion);
  const isBridge = Boolean(route?.isCrossChain);
  const selfSend = Boolean(
    target && !isConversion && !isBridge && !state.invoice &&
      isOwnChannelAddress({activeAccount, channel, recipientAddress, sourceCoin}),
  );
  // A pre-conversion arrives at the launch, at the launch price. Its arrival is
  // the one fact that is new here, so Sent keeps it (owner, 2026-10-23).
  const preconvert = Boolean(isConversion && route?.preconvert);
  const launchSystemId = preconvert
    ? state.channel?.split('.')[2] || sourceCoin?.system_id
    : null;
  const launchHeight = useChainHeight(launchSystemId);
  const launchFacts = preconvert
    ? getLaunchFacts(route.launchDefinition, {
        height: launchHeight,
        secondsPerBlock: sourceCoin?.seconds_per_block,
      })
    : null;
  const displayAmount =
    !isConversion && !isBridge && preflightResult?.value != null
      ? BigNumber(preflightResult.value)
      : preflightResult?.submittedsats && preflightResult?.output?.satoshis
      ? satsToCoins(BigNumber(preflightResult.output.satoshis))
      : BigNumber(amount || 0);
  // Sent keeps Confirm's lowered amount, so the reason stays with the result.
  const loweredFrom = getLoweredFrom(preflightResult, amount, displayAmount);
  const title = invoiceFlow
    ? 'Payment sent'
    : preconvert
    ? 'Pre-conversion sent'
    : isConversion
    ? 'Conversion sent'
    : isBridge
    ? 'Bridge transaction sent'
    : 'Transaction sent';
  const showReceive = Boolean(
    isConversion && !preconvert && estimatedReceive != null,
  );

  const finish = useCallback(() => {
    // An invoice hands back to its request, or closes the invoice.
    if (invoiceFlow) {
      if (invoiceFlow.responsePending) return;
      invoiceFlow.onPaid();
      return;
    }
    const parent = navigation.getParent?.();
    if (parent && typeof parent.reset === 'function') {
      parent.reset({
        index: 0,
        routes: [{name: 'Home', params: {screen: 'WalletHome'}}],
      });
      return;
    }
    navigation.navigate('Home', {screen: 'WalletHome'});
  }, [invoiceFlow, navigation]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        finish();
        return true;
      });
      return () => subscription.remove();
    }, [finish]),
  );

  return (
    <TransactionResult
      actions={[{
        label: 'Done',
        onPress: finish,
        disabled: invoiceFlow?.responsePending,
      }]}
      description={invoiceFlow?.responseMessage}
      warning={invoiceFlow?.responseWarning}
      amount={
        <>
          <TransferNode
            amount={truncateDecimal(displayAmount, 8)}
            copyValue={displayAmount.toFixed()}
            coinId={sourceCoin?.id}
            fiat={formatFiat(displayAmount, sourceCoin?.id)}
            label={showReceive || invoiceFlow || preconvert ? 'You paid' : 'You sent'}
            ticker={sourceCoin?.display_ticker || ''}
            {...loweredNodeProps(loweredFrom, sourceCoin?.display_ticker)}
          />
          {preconvert ? (
            <>
              <TransferConnector>Price set at launch</TransferConnector>
              <TransferNode
                amount={null}
                coinId={target.coinId || target.id}
                label="You receive"
                ticker={target.ticker}
              />
            </>
          ) : null}
          {showReceive ? (
            <>
              {route?.via ? (
                <TransferConnector>{`via ${route.viaFqn || route.via}`}</TransferConnector>
              ) : null}
              <TransferNode
                amount={`≈ ${formatEstimatedAmount(estimatedReceive)}`}
                copyValue={BigNumber(estimatedReceive).toFixed()}
                coinId={target.coinId || target.id}
                fiat={formatFiat(estimatedReceive, target.coinId || target.id)}
                label={
                  invoiceFlow
                    ? `${shortAddress(state.recipientAddress, 4)} receives`
                    : 'You receive'
                }
                ticker={target.ticker}
              />
            </>
          ) : null}
        </>
      }
      caption={
        preconvert
          ? null
          : isConversion
          ? 'The final amount can change slightly until it confirms.'
          : isBridge
          ? 'Cross-chain transfers need confirmations on both networks.'
          : selfSend
          ? 'It stayed in your wallet. Only the network fee left it.'
          : 'You can follow the transaction from this Asset’s activity.'
      }
      details={
        isBridge || preconvert ? (
          <>
            {isBridge ? (
              <FlatRow copyValue={getDestinationNetwork(route)} label="Destination" value={getDestinationNetwork(route)} />
            ) : null}
            {preconvert ? (
              <FlatRow copyValue={formatArrivesAtLaunch(launchFacts)} label="Arrives" value={formatArrivesAtLaunch(launchFacts)} />
            ) : null}
          </>
        ) : null
      }
      title={title}
      transactions={txid ? [{txid}] : []}
    />
  );
};

export default SendWizardSuccess;
