import {useIsFocused} from '@react-navigation/native';
import {useRequestBackHandler} from '../DeepLink/useRequestNavigation';
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {useNavigation} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {Buffer} from 'buffer';
import BigNumber from 'bignumber.js';
import {networks} from 'bitgo-utxo-lib';
import {ethers} from 'ethers';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  DEST_ETH,
  DEST_ID,
  DEST_PKH,
  TransferDestination,
  fromBase58Check,
  toLowerCaseCLocale,
} from 'verus-typescript-primitives';
import FeeBreakdownSheet, {BridgeNetworkFeeSheet} from './components/FeeBreakdownSheet';
import {getLoweredFrom, loweredNodeProps} from './loweredAmount';
import NetworkFeeSheet from './components/NetworkFeeSheet';
import PriceRouteSheet from './components/PriceRouteSheet';
import useNetworkFee from './useNetworkFee';
import {arrivalForFee, FEE_TIERS, formatFeeAmount, maxBTCFeeRate, networkFeeKind, previewNetworkFee} from './networkFeeUtils';
import {
  TransferConnector,
  TransferNode,
} from './components/TransferSummary';
import ConfirmFacts, {ConfirmNotice, ConfirmTotal} from './components/ConfirmFacts';
import ConfirmPreparing from './components/ConfirmPreparing';
import {
  formatEstimatedAmount,
  formatUnitPrice,
  getConversionPriceSummary,
} from './components/impactFormat';
import FadedScrollView from '../../components/FadedScrollView';
import {fontStyle} from '../../globals/fonts';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {expireCoinData} from '../../actions/actionCreators';
import {getIdentity} from '../../utils/api/routers/getIdentity';
import {preflightConvertOrCrossChain} from '../../utils/api/routers/preflightConvertOrCrossChain';
import {preflightSend} from '../../utils/api/routers/preflightSend';
import {sendConvertOrCrossChain} from '../../utils/api/routers/sendConvertOrCrossChain';
import {send} from '../../utils/api/routers/send';
import {
  ETH,
  ERC20,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_TRANSACTIONS,
} from '../../utils/constants/intervalConstants';
import {captureAssetContext} from '../../utils/assets/assetManagementService';
import {satsToCoins, truncateDecimal} from '../../utils/math';
import {
  formatArrivesAtLaunch,
  getLaunchFacts,
} from '../../utils/preconversion/launchFacts';
import {useChainHeight} from '../../utils/preconversion/usePrelaunch';
import {
  I_ADDRESS_VERSION,
  MID_VERIFICATION,
  NO_VERIFICATION,
  R_ADDRESS_VERSION,
} from '../../utils/constants/constants';
import {useSendWizard} from './SendWizardContext';
import {useInvoiceFlow} from './invoiceFlow';
import {refreshSourceBalance} from './refreshSourceBalance';
import {autoAddConversionAsset} from './autoAddConversionAsset';
import {
  ErrorMessage,
  WizardFooter,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from './components/WizardUI';
import {useWizardFiat} from './useWizardFiat';
import {useReceivedPrice} from './useReceivedPrice';
import {formatApproxMoney, formatMoney, sumMoney} from './confirmMoney';
import {
  getCurrencyDisplay,
  getDestinationNetwork,
  getPreparedConversionEstimate,
  getRouteName,
  getTransactionId,
  isOwnChannelAddress,
  isPrivateRecipient,
  shortAddress,
} from './wizardUtils';
import {isPrivateChannel} from '../../utils/subwallet/privateWallet';
import {isVerusIdWallet} from '../../utils/subwallet/cardPresentation';
import {memoApplies, resolvePrivateCardDestination} from './privateSend';
import {closeWizard} from './wizardNavigation';
import {formatTransactionDate} from '../Coin/Overview/TransactionDetailsSheet';
import {
  BROADCAST_STATUS_UNKNOWN_MESSAGE,
  CONNECTION_FAILED_MESSAGE,
  OFFLINE_NOTHING_SENT_MESSAGE,
  isConnectionErrorMessage,
} from '../../utils/network/connectionErrors';

// A node rejection reads "<code>: <reason>" (for example
// "16: bad-txns-failed-precheck") or names a bad-* rule.
const NODE_REJECTION_PATTERN = /^-?\d+:\s|\bbad-[a-z-]+\b/i;

// Apply only to explicit rejection responses, never transport/unknown outcomes.
const getRejectionMessage = message =>
  /\b(transaction already in block chain|txn-already-in-mempool|txn-already-known)\b/i.test(message)
    ? 'The network already has this transaction. Check your transaction history before sending again.'
    : /\b(txn-mempool-conflict|bad-txns-inputs-spent|missing inputs|bad-txns-inputs-missingorspent|bad-txns-inputs-missing)\b/i.test(message)
      ? 'The available funds changed. Go back and review this transaction again.'
      : isConnectionErrorMessage(message)
        ? CONNECTION_FAILED_MESSAGE
        : NODE_REJECTION_PATTERN.test(message)
          ? 'The network rejected this transaction. Nothing was sent.'
          : message;

const SendWizardConfirm = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const {state, setPreflight, setTxResult, setBroadcastError} = useSendWizard();
  // A VerusPay invoice (InvoicePayFlow) pays through the currency-transfer
  // path, so the invoice tag goes into the transaction, and must pay in full.
  const invoiceFlow = useInvoiceFlow();
  const invoice = state.invoice;
  const [invoiceShortfall, setInvoiceShortfall] = useState(null);
  const {
    amount,
    amountSats,
    channel,
    estimate,
    preflightResult,
    recipientAddress,
    route,
    sourceCoin,
    sourceBalance,
    sourceSubWallet,
    target,
  } = state;
  const activeAccount = useObjectSelector(
    stateValue => stateValue.authentication.activeAccount,
  );
  const coinSettings = useObjectSelector(
    stateValue => stateValue.settings.coinSettings,
  );
  const [preflighting, setPreflighting] = useState(true);
  const [sending, setSending] = useState(false);
  const submissionInFlight = useRef(false);
  const submitted = useRef(Boolean(state.txResult));
  const broadcastUnknown = useRef(Boolean(state.broadcastError));
  const connectionRef = useRef(null);
  const [error, setError] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [feeSheetOpen, setFeeSheetOpen] = useState(false);
  const [priceSheetOpen, setPriceSheetOpen] = useState(false);
  const preflightSequence = useRef(0);
  const preparedParams = useRef(null);
  const lastReview = useRef(null);
  const generalWalletSettings = useObjectSelector(value => value.settings.generalWalletSettings);
  const {displayCurrency, format: formatFiat, getRate} = useWizardFiat(
    sourceSubWallet,
  );
  // Small windows use smaller pay and receive nodes and tighter spacing.
  const {smallDevice: compact} = useOnboardingSmallDeviceLayout();
  const activeCoins = useObjectSelector(value => value.coins.activeCoinsForUser);
  const receivedPrice = useReceivedPrice(
    target?.isConversion ? target.coinId || target.id : null,
    sourceSubWallet?.api_channels?.[API_GET_FIATPRICE],
    {systemId: target?.systemId, testnet: sourceCoin?.testnet},
  );

  // After "Status unknown" only Close leaves (owner, 2026-10-26): a step back
  // would lead to a Confirm that stays locked.
  const broadcastStatusUnknown = Boolean(state.broadcastError);
  const requestStepFocused = useIsFocused();
  useRequestBackHandler(
    () => invoiceFlow.onExit(),
    sending, 2,
    Boolean(invoiceFlow) && requestStepFocused && (sending || broadcastStatusUnknown),
  );
  useLayoutEffect(() => {
    navigation.setOptions({
      gestureEnabled: !sending && !broadcastStatusUnknown,
      wizardBackHidden: broadcastStatusUnknown,
      wizardNavigationDisabled: sending,
    });
  }, [broadcastStatusUnknown, navigation, sending]);

  // Android Back then closes the wizard, as Close does.
  useEffect(() => {
    if (!broadcastStatusUnknown) return undefined;
    let leaving = false;

    return navigation.addListener('beforeRemove', event => {
      if (leaving) return;
      leaving = true;
      event.preventDefault();
      if (invoiceFlow) invoiceFlow.onExit();
      else closeWizard(navigation);
    });
  }, [broadcastStatusUnknown, invoiceFlow, navigation]);

  // The offline message is about this moment only; clear it once the phone
  // is connected again.
  useEffect(
    () =>
      NetInfo.addEventListener(connection => {
        connectionRef.current = connection;
        if (connection.isConnected) {
          setError(current =>
            current === OFFLINE_NOTHING_SENT_MESSAGE ? null : current,
          );
        }
      }),
    [],
  );

  // Nothing may leave a broadcast that is still running: the user could start
  // the same payment again before its result is known. This covers Android
  // Back and the iOS swipe, which closes the whole wizard (the parent screen)
  // because this step's own swipe is off. Sent replaces this step after
  // `submitted` is set, so it still passes.
  useEffect(() => {
    const blockWhileSending = event => {
      if (submissionInFlight.current && !submitted.current) {
        event.preventDefault();
      }
    };
    const unsubscribes = [navigation, navigation.getParent()]
      .filter(Boolean)
      .map(target => target.addListener('beforeRemove', blockWhileSending));

    return () => unsubscribes.forEach(unsubscribe => unsubscribe());
  }, [navigation]);

  const simpleSend = Boolean(
    target && !target.isConversion && !route?.isCrossChain && !invoice,
  );
  // A pre-conversion has no price until the launch. Confirm shows the launch
  // facts instead: when it arrives, the minimum, and that it cannot be undone.
  const preconvert = Boolean(target?.isConversion && route?.preconvert);
  const launchSystemId = preconvert
    ? channel?.split('.')[2] || sourceCoin?.system_id
    : null;
  const launchHeight = useChainHeight(launchSystemId);
  const launchFacts = preconvert
    ? getLaunchFacts(route.launchDefinition, {
        height: launchHeight,
        secondsPerBlock: sourceCoin?.seconds_per_block,
      })
    : null;
  const privateSource = isPrivateChannel(channel);
  const fromLabel = !invoice && (privateSource || isVerusIdWallet(sourceSubWallet))
    ? sourceSubWallet?.name : null;
  // A memo travels inside a private output only. A scanned request's note
  // becomes the memo when it can travel there.
  const sendsMemo = simpleSend && memoApplies(channel, recipientAddress);
  const memo = sendsMemo ? state.memo || state.scanRequest?.note || '' : '';
  const feeKind = networkFeeKind(simpleSend, channel, sourceCoin);
  const networkFee = useNetworkFee({
    kind: feeKind, coin: sourceCoin, channel,
    minGasPriceGwei: generalWalletSettings?.minGasPriceGwei,
  });
  const reviewKey = `${sourceCoin?.id}:${channel}:${amount}:${recipientAddress}`;
  const simpleSendParams = useMemo(() => {
    const verificationLevel = coinSettings?.[sourceCoin?.id]?.verificationLvl;
    const network =
      networks[toLowerCaseCLocale(sourceCoin?.id || '')] || networks.default;

    return {
      defaultFee: feeKind === 'btc' ? networkFee.fee : sourceCoin?.fee,
      ...(feeKind === 'eth' && networkFee.fee ? {networkFee: networkFee.fee} : {}),
      network,
      verifyMerkle:
        verificationLevel == null
          ? true
          : verificationLevel > MID_VERIFICATION,
      verifyTxid:
        verificationLevel == null
          ? true
          : verificationLevel > NO_VERIFICATION,
      // The light wallet's native send needs a string, also when empty.
      ...(privateSource ? {memo} : {}),
    };
  }, [coinSettings, sourceCoin, feeKind, networkFee.fee, privateSource, memo]);

  const buildDestination = useCallback(async () => {
    let destination = recipientAddress;
    if (destination.endsWith('@')) {
      const identityResult = await getIdentity(
        sourceCoin,
        activeAccount,
        channel,
        destination,
      );
      if (identityResult?.error || identityResult?.err) {
        throw new Error(
          identityResult?.result ||
            'Could not resolve this VerusID. Use its i-address instead.',
        );
      }
      destination = identityResult?.result?.identity?.identityaddress;
      if (!destination) throw new Error('This VerusID has no compatible destination.');
    }

    if (ethers.isAddress(destination)) {
      return new TransferDestination({
        destinationBytes: Buffer.from(destination.slice(2), 'hex'),
        type: DEST_ETH,
      });
    }

    const {hash, version} = fromBase58Check(destination);
    const type =
      version === I_ADDRESS_VERSION
        ? DEST_ID
        : version === R_ADDRESS_VERSION
        ? DEST_PKH
        : null;
    if (type == null) throw new Error('Incompatible destination address type.');
    return new TransferDestination({destinationBytes: hash, type});
  }, [activeAccount, channel, recipientAddress, sourceCoin]);

  const conversionOutput = useMemo(
    () => ({
      currency: sourceCoin?.currency_id || sourceCoin?.id,
      satoshis: amountSats,
      ...(target?.isConversion
        ? {
            convertto:
              target.convertToFqn || target.transactionCurrency,
          }
        : {}),
      ...(route?.isCrossChain
        ? {exportto: route.exportToFqn || route.exportTo}
        : {}),
      ...(route?.via ? {via: route.viaFqn || route.via} : {}),
      ...(route?.mapTo && [ETH, ERC20].includes(channel?.split('.')[0])
        ? {mapto: route.mapTo} : {}),
      ...(route?.preconvert ? {preconvert: true} : {}),
      ...(route?.bridgePrelaunch ? {bridgeprelaunch: true} : {}),
      ...(invoice?.tag ? {vdxftag: invoice.tag} : {}),
    }),
    [amountSats, invoice, route, sourceCoin, target],
  );

  useEffect(() => {
    // Amount stays mounted under this step and can update the estimate while
    // the transaction broadcasts. A new preflight then would fund again from
    // inputs that are already spent.
    if (submissionInFlight.current || submitted.current || broadcastUnknown.current) {
      return undefined;
    }
    const request = ++preflightSequence.current;
    preparedParams.current = null;
    if (
      !sourceCoin ||
      !sourceSubWallet ||
      !channel ||
      !amount ||
      !amountSats ||
      !recipientAddress ||
      !target ||
      !route
    ) {
      setPreflighting(false);
      setError('Transaction details are incomplete.');
      setPreflight(null);
      return undefined;
    }

    let active = true;
    setPreflighting(true);
    setError(null);
    setWarnings([]);
    setInvoiceShortfall(null);
    setPreflight(null);
    if (feeKind && (networkFee.loading || !networkFee.fee)) {
      setPreflighting(networkFee.loading);
      setError(networkFee.loading ? null : networkFee.error);
      return () => { active = false; };
    }

    const run = async () => {
      try {
        const result = simpleSend
          ? await preflightSend(
              sourceCoin,
              activeAccount,
              privateSource
                ? await resolvePrivateCardDestination(sourceCoin, recipientAddress)
                : recipientAddress,
              BigNumber(amount),
              channel,
              simpleSendParams,
            )
          : await preflightConvertOrCrossChain(
              sourceCoin,
              activeAccount,
              channel,
              {
                ...conversionOutput,
                address: await buildDestination(),
              },
            );

        if (!active || request !== preflightSequence.current) return;
        if (result?.err || result?.error) {
          throw new Error(result.result || result.error?.message || 'Preflight failed.');
        }
        const preflight = result?.result;
        const nextWarnings = [];

        const preflightEstimate = preflight?.estimate;
        if (
          target.isConversion &&
          !route.preconvert &&
          getPreparedConversionEstimate(preflight, estimate)?.estimatedcurrencyout == null
        ) {
          nextWarnings.push('Could not calculate an estimated result for this conversion.');
        }

        if (
          target.isConversion &&
          !route.preconvert &&
          estimate?.estimatedcurrencyout &&
          preflightEstimate?.estimatedcurrencyout
        ) {
          const earlier = BigNumber(estimate.estimatedcurrencyout);
          const latest = BigNumber(preflightEstimate.estimatedcurrencyout);
          if (earlier.isGreaterThan(0) && latest.isGreaterThan(0)) {
            const slippage = earlier.minus(latest).dividedBy(earlier).multipliedBy(100);
            if (slippage.isGreaterThan(2)) {
              nextWarnings.push(
                `The price changed. You now get about ${slippage.decimalPlaces(1).toString()}% less. Check the new amount before you slide to confirm.`,
              );
            }
          }
        }

        // The old invoice screen refused a payment that the fee would shrink.
        setInvoiceShortfall(
          invoice &&
            !invoice.anyAmount &&
            preflight?.submittedsats != null &&
            preflight?.output?.satoshis != null &&
            String(preflight.submittedsats) !== String(preflight.output.satoshis)
            ? `Not enough ${sourceCoin.display_ticker} on this card for this invoice and the network fee.${
                navigation.canGoBack() ? ' Go back and choose another way to pay.' : ''
              }`
            : null,
        );
        setWarnings(nextWarnings);
        preparedParams.current = simpleSendParams;
        lastReview.current = {key: reviewKey, result: preflight};
        setPreflight(preflight);
      } catch (preflightError) {
        if (active && request === preflightSequence.current) {
          setError(
            isConnectionErrorMessage(preflightError.message)
              ? CONNECTION_FAILED_MESSAGE
              : preflightError.message || 'Preflight failed.',
          );
        }
      } finally {
        if (active && request === preflightSequence.current) setPreflighting(false);
      }
    };

    run();
    return () => {
      active = false;
    };
  }, [
    activeAccount,
    feeKind,
    networkFee.loading,
    networkFee.error,
    reviewKey,
    amount,
    amountSats,
    buildDestination,
    channel,
    conversionOutput,
    estimate,
    recipientAddress,
    route,
    setPreflight,
    simpleSend,
    simpleSendParams,
    sourceCoin,
    sourceSubWallet,
    target,
  ]);

  const changeNetworkFee = next => {
    if (submissionInFlight.current || submitted.current || broadcastUnknown.current) return;
    preflightSequence.current++;
    preparedParams.current = null;
    setPreflight(null);
    setPreflighting(true);
    networkFee.choose(next);
  };
  const retryNetworkFee = () => {
    if (submissionInFlight.current || submitted.current || broadcastUnknown.current) return;
    preflightSequence.current++;
    preparedParams.current = null;
    setPreflight(null);
    setPreflighting(true);
    setError(null);
    networkFee.retry();
  };

  const submit = async () => {
    if (
      !preflightResult ||
      preflighting ||
      networkFee.loading ||
      preparedParams.current !== simpleSendParams ||
      submissionInFlight.current ||
      submitted.current ||
      state.txResult ||
      broadcastUnknown.current ||
      state.broadcastError
    ) return;
    submissionInFlight.current = true;
    setSending(true);
    setError(null);
    try {
      // Offline, a broadcast can wait a long time and still fail. Nothing has
      // left the wallet yet, so say so at once.
      // Use the subscribed state immediately. NetInfo.fetch can wait several
      // seconds offline. A reconnect updates the same ref before the next slide.
      const connection = connectionRef.current || await NetInfo.fetch().catch(() => null);
      if (connection?.isConnected === false) {
        setError(OFFLINE_NOTHING_SENT_MESSAGE);
        return;
      }

      const assetContext = captureAssetContext();
      const validatedSendAmount =
        simpleSend && preflightResult.value != null
          ? BigNumber(preflightResult.value)
          : BigNumber(amount);
      const result = simpleSend
        ? await send(
            sourceCoin,
            activeAccount,
            // The private preflight returns the address it resolved.
            privateSource
              ? preflightResult.toAddress || recipientAddress
              : recipientAddress,
            validatedSendAmount,
            channel,
            {...simpleSendParams, ...preflightResult},
          )
        : await sendConvertOrCrossChain(
            sourceCoin,
            activeAccount,
            channel,
            preflightResult,
          );
      if (result?.err || result?.error) {
        const rejection = new Error(
          result.result?.message || result.result || result.error?.message || 'Transaction failed.',
        );
        rejection.ambiguousBroadcast = result.ambiguousBroadcast;
        rejection.rejected = true;
        throw rejection;
      }

      // Block stale slide callbacks before context and navigation update.
      submitted.current = true;
      invoiceFlow?.onPaymentSent?.(getTransactionId(result?.result));
      invoiceFlow?.onPaymentBroadcast?.();
      void refreshSourceBalance(sourceCoin, channel, activeAccount.accountHash);
      setTxResult(result?.result);
      navigation.reset({
        index: 0,
        routes: [{name: 'SendWizardSuccess'}],
      });
      if (!invoice) void autoAddConversionAsset({
        activeAccount,
        channel,
        context: assetContext,
        recipientAddress,
        route,
        sourceCoin,
        target,
      });
    } catch (sendError) {
      if (sendError.ambiguousBroadcast) {
        broadcastUnknown.current = true;
        // The invoice may be paid; a second visit warns about it.
        invoiceFlow?.onPaymentSent?.(null);
        setBroadcastError(sendError.message || BROADCAST_STATUS_UNKNOWN_MESSAGE);
      } else {
        // Electrum preserves an explicit rejection on the thrown error.
        const message = sendError.message || 'Transaction failed.';
        setError(
          sendError.rejected || sendError.ambiguousBroadcast === false
            ? getRejectionMessage(message)
            : isConnectionErrorMessage(message)
              ? CONNECTION_FAILED_MESSAGE
              : message,
        );
      }
    } finally {
      dispatch(expireCoinData(sourceCoin.id, API_GET_BALANCES));
      dispatch(expireCoinData(sourceCoin.id, API_GET_TRANSACTIONS));
      dispatch(expireCoinData(sourceCoin.id, API_GET_FIATPRICE));
      submissionInFlight.current = false;
      // Keep the busy label through the result screen's navigation animation.
      if (!submitted.current) setSending(false);
    }
  };

  const reviewResult = preflightResult || (feeKind && lastReview.current?.key === reviewKey ? lastReview.current.result : null);
  // These addresses belong to the prepared transaction: the VRPC simple-send
  // result, a conversion's output, or the private card's resolved destination.
  const resolvedRecipient = recipientAddress.includes('@') && reviewResult
    ? reviewResult.resolvedToAddress ||
      reviewResult.output?.address?.getAddressString?.() ||
      (privateSource ? reviewResult.toAddress : null)
    : null;
  const displayEstimate = getPreparedConversionEstimate(reviewResult, estimate);
  const estimatedReceive = displayEstimate?.estimatedcurrencyout;
  // An invoice is paid in full or not at all, so its amount never shrinks.
  const displayAmount = invoiceShortfall
    ? BigNumber(amount || 0)
    : simpleSend && reviewResult?.value != null
      ? BigNumber(reviewResult.value)
      : reviewResult?.submittedsats && reviewResult?.output?.satoshis
      ? satsToCoins(BigNumber(reviewResult.output.satoshis))
      : BigNumber(amount || 0);
  const feeItems = useMemo(() => {
    if (!reviewResult) return [];

    const directFee =
      reviewResult.fee ??
      reviewResult.txfee ??
      reviewResult.networkfee;
    if (directFee != null) {
      const currencyId =
        reviewResult.feeCurr || sourceCoin?.currency_id || sourceCoin?.id;
      const display = getCurrencyDisplay(
        currencyId,
        reviewResult.feeCurr || sourceCoin?.display_ticker,
      );
      return [
        {
          amount: BigNumber(directFee).toFixed(),
          currencyId,
          currency: display.ticker,
        },
      ];
    }

    return Object.entries(reviewResult.validation?.fees || {})
      .filter(([, feeSats]) => BigNumber(feeSats).isGreaterThan(0))
      .map(([currencyId, feeSats]) => {
        const friendlyName = reviewResult.names?.get?.(currencyId);
        const display = getCurrencyDisplay(
          currencyId,
          /^0x0{40}$/i.test(currencyId) ? 'ETH' : friendlyName,
        );

        return {
          amount: satsToCoins(BigNumber(feeSats)).toFixed(),
          currencyId,
          currency: display.ticker,
        };
      });
  }, [reviewResult, sourceCoin]);
  const feeSummary = feeItems.length
    ? feeItems.map(item => `${item.amount} ${item.currency}`).join(' + ')
    : 'Calculated by wallet';
  const feesCopyValue = feeItems.map(item => item.amount).join('\n');
  const hasExportFees = Boolean(route?.isCrossChain && channel?.split('.')[0] === 'vrpc');
  // The ledger's price of a currency this payment uses, by currency ID. A
  // currency without a price gives null, and its money value stays absent.
  const getCurrencyRate = currencyId => {
    if ([sourceCoin?.id, sourceCoin?.currency_id].includes(currencyId)) {
      return getRate(sourceCoin?.id);
    }
    const coin = (activeCoins || []).find(
      candidate => candidate.currency_id === currencyId || candidate.id === currencyId,
    );
    return coin ? getRate(coin.id) : null;
  };
  const feeMoneyOf = fees => formatApproxMoney(
    sumMoney(
      Object.entries(fees)
        .filter(([, satoshis]) => BigNumber(satoshis).isGreaterThan(0))
        .map(([currencyId, satoshis]) => ({
          currencyId,
          amount: satsToCoins(BigNumber(satoshis)),
        })),
      getCurrencyRate,
    ),
    displayCurrency,
  );
  // The Fees row (a send or a same-chain conversion) shows money as the
  // export fee rows do.
  const feesMoney = formatApproxMoney(sumMoney(feeItems, getCurrencyRate), displayCurrency);
  const exportFees = hasExportFees && reviewResult?.feeDetails
    ? {
        bridgeMoney: feeMoneyOf(reviewResult.feeDetails.bridge),
        networkMoney: feeMoneyOf(reviewResult.feeDetails.network),
        bridgeCopyValue: Object.values(reviewResult.feeDetails.bridge)
          .map(satoshis => satsToCoins(BigNumber(satoshis)).toFixed()).join('\n'),
        networkCopyValue: Object.values(reviewResult.feeDetails.network)
          .filter(satoshis => BigNumber(satoshis).isGreaterThan(0))
          .map(satoshis => satsToCoins(BigNumber(satoshis)).toFixed()).join('\n'),
        bridge: Object.entries(reviewResult.feeDetails.bridge)
          .map(([currencyId, satoshis]) => `${satsToCoins(BigNumber(satoshis)).toFixed()} ${
            getCurrencyDisplay(currencyId, reviewResult.names?.get?.(currencyId)).ticker
          }`).join(' + '),
        network: Object.entries(reviewResult.feeDetails.network)
          .filter(([, satoshis]) => BigNumber(satoshis).isGreaterThan(0))
          .map(([currencyId, satoshis]) => `${satsToCoins(BigNumber(satoshis)).toFixed()} ${
            getCurrencyDisplay(currencyId, reviewResult.names?.get?.(currencyId)).ticker
          }`).join(' + '),
      }
    : null;
  // An Ethereum-to-Verus bridge transfer pays one ETH fee in two parts: the
  // bridge contract's fee, carried in the transfer's ETH value, and the gas.
  // Split them from the prepared transfer without changing its preflight. The
  // gas part is a maximum; its sheet says so.
  const bridgeFees = (() => {
    const transferOptions = reviewResult?.transferparams?.[1];
    if (exportFees || !route?.isCrossChain || transferOptions?.value == null || feeItems.length !== 1) {
      return null;
    }
    try {
      const fee = feeItems[0];
      // Sepolia's ETH is gETH, as the paid asset shows it.
      const ticker = sourceCoin?.network === 'sepolia' ? 'gETH' : fee.currency;
      // An ETH transfer's value also carries the amount; a token's does not.
      const sentWei = reviewResult.approvalparams == null
        ? BigInt(BigNumber(reviewResult.output?.satoshis).toFixed(0)) * BigInt('10000000000')
        : BigInt(0);
      const bridge = BigNumber((BigInt(transferOptions.value.toString()) - sentWei).toString()).shiftedBy(-18);
      const network = BigNumber(fee.amount).minus(bridge);
      if (!bridge.isGreaterThan(0) || !network.isGreaterThan(0)) return null;
      const moneyOf = value => formatApproxMoney(
        sumMoney([{currencyId: fee.currencyId, amount: value}], getCurrencyRate),
        displayCurrency,
      );
      return {
        bridge: `${bridge.toFixed()} ${ticker}`,
        bridgeCopyValue: bridge.toFixed(),
        bridgeMoney: moneyOf(bridge),
        network: `${network.toFixed()} ${ticker}`,
        networkCopyValue: network.toFixed(),
        networkMoney: moneyOf(network),
        onOpenNetwork: () => setFeeSheetOpen(true),
      };
    } catch (e) {
      return null;
    }
  })();
  // Sum by currency ID, not ticker: each currency the user pays appears once.
  const totalPaid = new Map([[
    sourceCoin?.currency_id || sourceCoin?.id,
    {amount: displayAmount, currency: sourceCoin?.display_ticker || ''},
  ]]);
  feeItems.forEach(item => {
    const previous = totalPaid.get(item.currencyId);
    totalPaid.set(item.currencyId, {
      amount: BigNumber(previous?.amount || 0).plus(item.amount),
      currency: previous?.currency || item.currency,
    });
  });
  const totalItems = [...totalPaid.entries()].map(([currencyId, item]) => ({
    currencyId,
    amount: item.amount.toFixed(),
    currency: item.currency,
  }));
  const totalMoney = formatApproxMoney(sumMoney(totalItems, getCurrencyRate), displayCurrency);
  const totalCopyValue = [...totalPaid.values()]
    .map(item => item.amount.toFixed()).join('\n');
  const destinationNetwork = getDestinationNetwork(
    route,
    sourceCoin?.display_name,
  );
  const feeCurrencyId = feeKind === 'btc' ? 'BTC'
    : sourceCoin?.network === 'sepolia' ? 'GETH' : 'ETH';
  const feeTicker = feeKind === 'btc' ? 'BTC'
    : sourceCoin?.network === 'sepolia' ? 'gETH' : 'ETH';
  const likelyFee = preflightResult
    ? (feeKind === 'eth' ? preflightResult.likelyFee : preflightResult.fee)
    : previewNetworkFee(feeKind, networkFee.fee, reviewResult, networkFee.quote)?.likelyFee;
  const hasNetworkFee = Boolean(networkFee.fee && likelyFee != null);
  const feeMoney = formatFiat(likelyFee, feeCurrencyId);
  const feeSpeed = networkFee.quote?.tiers || networkFee.choice.id === 'custom'
    ? (networkFee.choice.id === 'custom' ? 'Custom fee' : FEE_TIERS.find(tier => tier.id === networkFee.choice.id)?.title) : null;
  const networkFeeRow = feeKind ? {
    copyValue: hasNetworkFee ? BigNumber(likelyFee).toFixed() : null,
    amount: hasNetworkFee
      ? formatFeeAmount(likelyFee, feeTicker, feeKind === 'eth')
      : feeKind === 'btc' && !networkFee.fee ? 'Fee rates unavailable' : 'Fee unavailable',
    caption: hasNetworkFee ? [feeSpeed, feeMoney ? `≈ ${feeMoney}` : null].filter(Boolean).join(' · ') : null,
  } : null;
  const estimatedTime = preconvert ? formatArrivesAtLaunch(launchFacts)
    : feeKind && hasNetworkFee ? arrivalForFee(feeKind, networkFee.choice, networkFee.quote)
    : feeKind ? '—' : route?.isCrossChain
    ? '1-3 hours'
    : target?.isConversion
    ? '2-10 minutes'
    : '1-5 minutes';
  // Keep the exact preflight fee amounts and currency IDs for balance math.
  // Tickers alone are not currency identity (a token can share a system ticker).
  const sourceFees = feeItems.reduce(
    (total, item) =>
      [sourceCoin?.id, sourceCoin?.currency_id].includes(item.currencyId)
        ? total.plus(item.amount)
        : total,
    BigNumber(0),
  );
  const isSelfSend =
    simpleSend && isOwnChannelAddress({
      activeAccount, channel, recipientAddress, sourceCoin,
    });
  const balanceAfter = BigNumber(sourceBalance || 0)
    .minus(isSelfSend ? 0 : displayAmount)
    .minus(sourceFees);
  // The pay node shows the entered amount struck through when the wallet
  // took the fees from it (owner, 2026-11-13).
  const loweredFrom = getLoweredFrom(reviewResult, amount, displayAmount);
  // The launch's minimum, in every currency that has one. Amounts above a
  // maximum come back after the launch; the wallet does not know how much is
  // pre-converted so far, so it does not warn about that.
  const launchRows = preconvert && launchFacts?.minimums.length
    ? [{
        label: 'Needed to launch',
        copyValue: launchFacts.minimums.map(item => BigNumber(item.amount).toFixed()).join('\n'),
        value: launchFacts.minimums
          .map(item => `${BigNumber(item.amount).toFormat()} ${
            getCurrencyDisplay(item.currencyId, launchFacts.names[item.currencyId]).ticker
          }`)
          .join('\n'),
      }]
    : [];
  const refundCaption = preconvert ? 'Refunds also go here.' : null;

  if (preflighting && (!feeKind || !reviewResult)) {
    const preparingReceive = Boolean(target?.isConversion);

    return (
      <WizardScreen scroll={false}>
        <ConfirmPreparing
          amount={displayAmount}
          arrives={preconvert ? estimatedTime : null}
          atLaunch={preconvert}
          compact={compact}
          destinationNetwork={route?.isCrossChain ? destinationNetwork : null}
          isConversion={preparingReceive}
          fromLabel={fromLabel}
          networkFee={Boolean(feeKind)}
          exportFees={hasExportFees || Boolean(route?.isCrossChain && ['eth', 'erc20'].includes(sourceCoin?.proto))}
          recipient={recipientAddress}
          recipientCaption={refundCaption}
          routeRows={launchRows}
          showPriceImpact={preparingReceive && Boolean(state.marketPrice)}
          sourceCoin={sourceCoin}
          target={target}
        />
        <WizardFooter
          above={
            hasExportFees ? (
              <View style={[styles.pinnedTotal, {borderTopColor: theme.colors.border}]}>
                <ConfirmTotal loading />
              </View>
            ) : null
          }
          disabled
          slideToConfirm
          loading
          loadingText="Preparing…"
          onPress={() => {}}>
          {target?.isConversion ? 'Slide to convert' : 'Slide to send'}
        </WizardFooter>
      </WizardScreen>
    );
  }

  if (error && !preflightResult && !feeKind) {
    return (
      <WizardScreen scroll={false}>
        <View style={styles.centeredState}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color={theme.colors.danger} />
          <Text style={[styles.stateTitle, {color: theme.colors.textPrimary}]}>Couldn’t prepare transaction</Text>
          <Text style={[styles.stateBody, {color: theme.colors.textSecondary}]}>{error}</Text>
        </View>
        <WizardFooter
          onPress={() =>
            !navigation.canGoBack() && invoiceFlow
              ? invoiceFlow.onExit()
              : navigation.goBack()
          }>
          Go Back
        </WizardFooter>
      </WizardScreen>
    );
  }

  const showReceive = Boolean(
    target?.isConversion && !preconvert && estimatedReceive != null,
  );
  // An invoice fixes what the recipient gets, so its impact is what the user
  // pays on top of the market price.
  const payImpact = Boolean(invoice);
  const {impact, level, loss, lossText, unitPrice} = showReceive
    ? getConversionPriceSummary({
        amount: displayAmount,
        displayCurrency,
        marketPrice: state.marketPrice,
        output: estimatedReceive,
        pay: payImpact,
        rate: getRate(sourceCoin?.id),
        sourceTicker: sourceCoin?.display_ticker || '',
        targetTicker: target?.ticker || '',
      })
    : {};
  // The route is not on the connector (owner, 2026-10-22): the Price impact
  // row opens "Price and route", which names it.
  const connectorLines = unitPrice
    ? [`1 ${sourceCoin?.display_ticker || ''} = ${formatUnitPrice(unitPrice)} ${target?.ticker || ''}`]
    : [];
  const showImpact = showReceive && (impact != null || Boolean(route?.via));
  // Notices and errors stay above the slide. On a short screen they would
  // otherwise sit below the fold, out of sight when the user slides.
  // Fees are paid on top. A conversion or an export can cost more than it
  // moves; tell the user without blocking an otherwise valid prepared
  // transaction. On an export this also makes the total above the slide loud.
  const feesExceedAmount = Boolean(
    (target?.isConversion || hasExportFees) && !invoice && reviewResult && sourceFees.isGreaterThan(displayAmount),
  );
  const conversionFeeNotice = feesExceedAmount
    ? 'The fees are higher than the amount.'
    : null;
  const pinnedMessage = state.broadcastError || error || invoiceShortfall;
  // A scanned request that names another network warns here, above the slide.
  // From the private card, a transparent address makes the amount public.
  const publicNotice =
    simpleSend && privateSource && recipientAddress && !isPrivateRecipient(recipientAddress)
      ? 'This address is transparent. The amount and the recipient will be public on the blockchain.'
      : null;
  const launchNotice = preconvert
    ? `This can’t be cancelled. If ${target.ticker} does not launch, the ${sourceCoin?.display_ticker || ''} comes back minus fees.`
    : null;
  // A light notice, not a block: sending to the own address is allowed.
  const selfNotice = isSelfSend
    ? 'This is your own address. Only the network fee leaves your wallet.'
    : null;
  const paidBefore = invoiceFlow?.paidBefore;
  const paidBeforeDate = paidBefore ? formatTransactionDate(paidBefore.paidAt) : null;
  const paidBeforeNotice = paidBefore
    ? paidBefore.txid
      ? `You paid this invoice on ${paidBeforeDate}. Paying again sends a second payment.`
      : `This invoice may have been paid on ${paidBeforeDate}. Check your transaction history before you pay again.`
    : null;
  const notices = [
    state.scanRequest?.notice,
    paidBeforeNotice,
    selfNotice,
    publicNotice,
    launchNotice,
    conversionFeeNotice,
    ...warnings,
  ].filter(Boolean);
  const needsFeeRetry = Boolean(feeKind && networkFee.error && !networkFee.fee &&
    !state.broadcastError && !state.txResult);
  const pinnedNotices = pinnedMessage || notices.length ? (
    <View style={styles.pinnedNotices}>
      {notices.map(message => (
        <ConfirmNotice key={message}>{message}</ConfirmNotice>
      ))}
      <ErrorMessage style={styles.pinnedError}>
        {pinnedMessage}
      </ErrorMessage>
    </View>
  ) : null;
  return (
    <WizardScreen scroll={false}>
      <FadedScrollView
        containerStyle={styles.scrollViewport}
        contentContainerStyle={[styles.content, compact && styles.contentCompact]}
        fadeBackgroundColor={theme.colors.background}>
        <TransferNode
          amount={truncateDecimal(displayAmount, 8)}
          compact={compact}
          copyValue={displayAmount.toFixed()}
          coinId={sourceCoin?.id}
          fiat={formatFiat(displayAmount, sourceCoin?.id)}
          label={showReceive || preconvert ? 'You pay' : 'You send'}
          ticker={sourceCoin?.display_ticker || ''}
          {...loweredNodeProps(loweredFrom, sourceCoin?.display_ticker)}
        />
        {preconvert ? (
          <>
            <TransferConnector compact={compact}>Price set at launch</TransferConnector>
            <TransferNode
              amount={null}
              compact={compact}
              coinId={target.coinId || target.id}
              label="You receive"
              ticker={target.ticker}
            />
          </>
        ) : null}
        {showReceive ? (
          <>
            {connectorLines.length ? (
              <TransferConnector compact={compact}>{connectorLines}</TransferConnector>
            ) : null}
            <TransferNode
              amount={`≈ ${formatEstimatedAmount(estimatedReceive)}`}
              compact={compact}
              copyValue={BigNumber(estimatedReceive).toFixed()}
              coinId={target.coinId || target.id}
              fiat={formatMoney(
                sumMoney([{amount: estimatedReceive}], () => receivedPrice),
                displayCurrency,
              )}
              label={
                invoice ? `${shortAddress(recipientAddress, 4)} receives` : 'You receive'
              }
              ticker={target.ticker}
            />
          </>
        ) : null}
        <ConfirmFacts
          arrives={estimatedTime}
          compact={compact}
          destinationNetwork={route?.isCrossChain ? destinationNetwork : null}
          fees={feeSummary}
          feesCopyValue={feesCopyValue}
          feesMoney={feesMoney}
          exportFees={exportFees || bridgeFees}
          networkFee={networkFeeRow}
          feeLoading={Boolean(feeKind && (preflighting || networkFee.loading))}
          impact={
            showImpact
              ? {
                  impact,
                  level,
                  lossText,
                  onPress: () => setPriceSheetOpen(true),
                  pay: payImpact,
                }
              : null
          }
          onOpenFees={feeKind && (sending || state.broadcastError || state.txResult || !networkFee.canChoose) ? undefined : () => setFeeSheetOpen(true)}
          memo={memo || null}
          note={sendsMemo ? null : state.scanRequest?.note}
          recipient={recipientAddress}
          recipientCaption={refundCaption}
          resolvedRecipient={resolvedRecipient}
          routeRows={launchRows}
          leadingRows={
            invoice
              ? [
                  invoice.signer
                    ? {
                        label: 'Request from',
                        value: invoice.signer,
                        copyValue: invoice.signer,
                        onPress: invoiceFlow?.onOpenRequester,
                      }
                    : null,
                  state.payFromLabel ? {label: 'From', value: state.payFromLabel, copyValue: state.payFromLabel} : null,
                  paidBefore?.txid
                    ? {label: 'Earlier payment', value: shortAddress(paidBefore.txid), copyValue: paidBefore.txid}
                    : null,
                ].filter(Boolean)
              : fromLabel ? [{label: 'From', value: fromLabel, copyValue: fromLabel, numberOfLines: 0}] : []
          }
          trailingRows={
            invoice
              ? [
                  invoice.expiry ? {label: 'Expires', value: `In about ${invoice.expiry}`, copyValue: `In about ${invoice.expiry}`} : null,
                  {label: 'Invoice details', onPress: invoiceFlow?.onOpenDetails},
                ].filter(Boolean)
              : []
          }
        />
      </FadedScrollView>
      <WizardFooter
        above={
          hasExportFees ? (
            <View style={[styles.pinnedTotal, {borderTopColor: theme.colors.border}]}>
              {pinnedNotices ? <View style={styles.pinnedTotalNotices}>{pinnedNotices}</View> : null}
              <ConfirmTotal
                copyValue={totalCopyValue}
                items={totalItems}
                loud={feesExceedAmount}
                money={totalMoney}
              />
            </View>
          ) : pinnedNotices
        }
        disabled={
          (!needsFeeRetry && (!preflightResult || preparedParams.current !== simpleSendParams)) ||
          preflighting ||
          networkFee.loading ||
          submitted.current ||
          Boolean(state.txResult) ||
          Boolean(state.broadcastError) ||
          Boolean(invoiceShortfall)
        }
        slideToConfirm={!needsFeeRetry && !state.broadcastError}
        loading={sending || preflighting || networkFee.loading}
        loadingText={preflighting || networkFee.loading ? "Preparing…" : target?.isConversion ? "Converting…" : "Sending…"}
        onPress={needsFeeRetry ? retryNetworkFee : submit}>
        {state.broadcastError ? 'Status unknown' : needsFeeRetry ? 'Try again' : target?.isConversion ? 'Slide to convert' : 'Slide to send'}
      </WizardFooter>
      {feeKind ? (
        <NetworkFeeSheet
          visible={feeSheetOpen}
          onClose={() => setFeeSheetOpen(false)}
          onChoose={changeNetworkFee}
          kind={feeKind}
          quote={networkFee.quote}
          choice={networkFee.choice}
          review={reviewResult}
          confirmedReview={preflightResult}
          maximum={maxBTCFeeRate(sourceCoin)}
          ticker={feeTicker}
          formatFiat={fee => formatFiat(fee, feeCurrencyId)}
        />
      ) : bridgeFees ? (
        <BridgeNetworkFeeSheet
          fee={bridgeFees.network}
          lowered={Boolean(loweredFrom)}
          money={bridgeFees.networkMoney}
          onClose={() => setFeeSheetOpen(false)}
          ticker={sourceCoin?.display_ticker}
          visible={feeSheetOpen}
        />
      ) : <FeeBreakdownSheet feeItems={feeItems} onClose={() => setFeeSheetOpen(false)} visible={feeSheetOpen} />}
      {showImpact ? (
        <PriceRouteSheet
          baskets={[]}
          cryptoAmount={displayAmount}
          displayCurrency={displayCurrency}
          estimatedOutput={estimatedReceive}
          onClose={() => setPriceSheetOpen(false)}
          onSelect={() => {}}
          onUseSuggestion={() => {}}
          pay={payImpact}
          priceImpact={{impact, level, loss, marketPrice: state.marketPrice}}
          rate={getRate(sourceCoin?.id)}
          route={route}
          sourceCoin={sourceCoin}
          target={target}
          visible={priceSheetOpen}
        />
      ) : null}
    </WizardScreen>
  );
};

const styles = StyleSheet.create({
  scrollViewport: {flex: 1},
  content: {paddingHorizontal: 16, paddingTop: WIZARD_CONTENT_TOP_INSET, paddingBottom: 20},
  contentCompact: {paddingTop: 16, paddingBottom: 8},
  pinnedNotices: {marginBottom: 4},
  // An export's total with its notices, pinned above the slide. The hairline
  // belongs to this group, as on Amount's pinned receive block.
  pinnedTotal: {borderTopWidth: StyleSheet.hairlineWidth},
  // The Total row brings its own 10-point padding, so the last notice's
  // 12-point bottom space is taken back.
  pinnedTotalNotices: {marginTop: 8, marginBottom: -12},
  pinnedError: {marginHorizontal: 0, marginVertical: 0, marginBottom: 8},
  centeredState: {flex: 1, paddingHorizontal: 32, alignItems: 'center', justifyContent: 'center'},
  stateTitle: {fontSize: 20, lineHeight: 26, textAlign: 'center', marginTop: 18, ...fontStyle('bold')},
  stateBody: {fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: 8, ...fontStyle('regular')},
});

export default SendWizardConfirm;
