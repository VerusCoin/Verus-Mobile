import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  InteractionManager,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useIsFocused,
} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AmountInput from '../../components/AmountInput';
import {transparentDustError} from '../../utils/transactions/transparentDust';
import TextAction from '../../components/TextAction';
import AmountKeypad from '../../components/AmountKeypad';
import {getAmountDecimalSeparator} from '../../utils/amountInput';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {estimateConversion} from '../../utils/api/channels/vrpc/requests/estimateConversion';
import {estimateEthereumExportFee} from '../../utils/api/channels/vrpc/requests/estimateEthereumExportFee';
import {timeout} from '../../utils/promises';
import {USD} from '../../utils/constants/currencies';
import {API_GET_FIATPRICE} from '../../utils/constants/intervalConstants';
import {coinsToSats, truncateDecimal} from '../../utils/math';
import {getConversionPaths} from '../../utils/api/routers/getConversionPaths';
import {useSendWizard} from './SendWizardContext';
import {compareRoutes, IMPACT_LEVEL} from './priceImpact';
import {usePriceImpact} from './usePriceImpact';
import {useReceivedPrice} from './useReceivedPrice';
import {
  ErrorMessage,
  WizardFooter,
  WIZARD_CONTENT_TOP_INSET,
  WizardScreen,
} from './components/WizardUI';
import AmountEstimate from './components/AmountEstimate';
import PriceRouteSheet from './components/PriceRouteSheet';
import {TargetNetworkSheet} from './components/SelectionSheets';
import {
  buildSendTarget,
  ADDRESS_TYPE,
  getCurrencyDisplay,
  getRecipientAddressType,
  isConversionChannel,
  SEND_WIZARD_MODE,
} from './wizardUtils';

const SendWizardAmount = () => {
  const navigation = useNavigation();
  const focused = useIsFocused();
  const theme = useOnboardingTheme();
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const {mode, state, setAmount, setAmountDraft, setEstimate, setRecipient, setRoute} = useSendWizard();
  const {
    channel,
    sourceCoin,
    sourceSubWallet,
    sourceBalance,
    sourcePending,
    target,
    route,
  } = state;
  const input = state.amountInput || '';
  const fiatMode = Boolean(state.fiatMode);
  const setInput = value => setAmountDraft({amountInput: value.replace(/,/g, '.')});
  const setFiatMode = value => setAmountDraft({fiatMode: value});
  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState(null);
  const [routeEstimates, setRouteEstimates] = useState({});
  const [preferredRouteKey, setPreferredRouteKey] = useState(null);
  const [routeSheetOpen, setRouteSheetOpen] = useState(false);
  // Select asset loads the networks once; Amount loads them only without it.
  const sendNetworks = state.sendNetworks;
  const [sendTarget, setSendTarget] = useState(sendNetworks || target);
  const [networkLoading, setNetworkLoading] = useState(false);
  const [networkError, setNetworkError] = useState(null);
  const [networkSheetOpen, setNetworkSheetOpen] = useState(false);
  const [exportFeeQuote, setExportFeeQuote] = useState(null);
  const amountInputRef = useRef(null);
  const decimalSeparator = useMemo(getAmountDecimalSeparator, []);
  const refocusAfterSheet = useCallback(() => amountInputRef.current?.focus(), []);

  useFocusEffect(useCallback(() => {
    Keyboard.dismiss();
    const task = InteractionManager.runAfterInteractions(() => amountInputRef.current?.focus());
    return () => task.cancel();
  }, []));

  const displayCurrency = useSelector(
    stateValue =>
      stateValue.settings.generalWalletSettings.displayCurrency || USD,
  );
  const rates = useObjectSelector(stateValue => stateValue.ledger.rates);
  const fiatChannel = sourceSubWallet?.api_channels?.[API_GET_FIATPRICE];
  const rate =
    fiatChannel == null
      ? null
      : rates?.[fiatChannel]?.[sourceCoin?.id]?.[displayCurrency];

  useEffect(() => {
    setSendTarget(sendNetworks || target);

    if (
      sendNetworks ||
      mode !== SEND_WIZARD_MODE.SEND ||
      !sourceCoin ||
      !channel ||
      !isConversionChannel(channel)
    ) {
      setNetworkLoading(false);
      setNetworkError(null);
      return undefined;
    }

    let active = true;
    const sourceNetworkId =
      channel.split('.')[2] || sourceCoin.system_id || sourceCoin.id;

    setNetworkLoading(true);
    setNetworkError(null);
    getConversionPaths(sourceCoin, channel, {
      src: sourceCoin.currency_id || sourceCoin.id,
    })
      .then(paths => {
        if (active) {
          setSendTarget(
            buildSendTarget(paths || {}, sourceCoin, sourceNetworkId),
          );
        }
      })
      .catch(() => {
        if (active) setNetworkError('Other networks unavailable.');
      })
      .finally(() => {
        if (active) setNetworkLoading(false);
      });

    return () => {
      active = false;
    };
  }, [channel, mode, sendNetworks, sourceCoin, target]);

  const cryptoAmount = useMemo(() => {
    const entered = BigNumber(String(input || 0).replace(',', '.'));
    if (!entered.isFinite() || entered.isNegative()) return BigNumber(NaN);
    const nativePrecision =
      ['eth', 'erc20'].includes(sourceCoin?.proto) &&
      !target?.isConversion &&
      !route?.isCrossChain;
    let value = entered;
    if (fiatMode) {
      if (rate == null || BigNumber(rate).isLessThanOrEqualTo(0)) {
        return BigNumber(NaN);
      }
      value = entered.dividedBy(rate);
    }
    return nativePrecision
      ? value
      : value.decimalPlaces(8, BigNumber.ROUND_DOWN);
  }, [
    fiatMode,
    input,
    rate,
    route?.isCrossChain,
    sourceCoin?.proto,
    target?.isConversion,
  ]);
  const cryptoAmountValue = cryptoAmount.isFinite()
    ? cryptoAmount.toString()
    : '';
  const decimals = sourceCoin?.decimals ?? 8;
  // Validate the entered asset amount before the existing rounding step.
  const excessivePrecision =
    !fiatMode &&
    BigNumber(String(input || 0).replace(',', '.')).decimalPlaces() > decimals;
  const dustError = !target?.isConversion && route?.addressType !== ADDRESS_TYPE.ETHEREUM &&
    cryptoAmount.isGreaterThan(0)
    ? transparentDustError(sourceCoin, channel, cryptoAmount) : null;
  const validAmount =
    !dustError &&
    !excessivePrecision &&
    cryptoAmount.isFinite() &&
    cryptoAmount.isGreaterThan(0) &&
    cryptoAmount.isLessThanOrEqualTo(sourceBalance || 0);
  const ethereumExport =
    channel?.split('.')[0] === 'vrpc' &&
    route?.isCrossChain &&
    route?.addressType === ADDRESS_TYPE.ETHEREUM;
  // Bind the result to the complete route request. A changed route must not
  // briefly display an old fee or enable Continue before its effect runs.
  // verusd prices this fee from gas and Bridge prices, not from the amount,
  // so typing an amount does not refetch it.
  const exportFeeRequest = ethereumExport ? JSON.stringify({
    channel,
    currency: sourceCoin?.currency_id || sourceCoin?.id,
    ...(target?.isConversion ? {convertto: target.transactionCurrency} : {}),
    exportto: route.exportTo,
    ...(route.via ? {via: route.via} : {}),
    ...(route.preconvert ? {preconvert: true} : {}),
  }) : null;
  const exportFee = exportFeeQuote?.request === exportFeeRequest
    ? exportFeeQuote?.fee : null;
  const exportFeeLoading = Boolean(
    exportFeeRequest && exportFeeQuote?.request !== exportFeeRequest,
  );
  const sourcePaysExportFee = Boolean(exportFee && exportFee.currencyId ===
    (sourceCoin?.currency_id || sourceCoin?.id));
  const exportFeeBlocksRoute = sourcePaysExportFee &&
    BigNumber(sourceBalance || 0).isLessThanOrEqualTo(exportFee.amount);
  const insufficientExportFunds = sourcePaysExportFee &&
    (exportFeeBlocksRoute || (cryptoAmount.isFinite() && cryptoAmount.isGreaterThan(0) &&
      cryptoAmount.plus(exportFee.amount).isGreaterThan(sourceBalance || 0)));
  const maximumDisabled = exportFeeLoading || exportFeeBlocksRoute;
  const exportFeeTicker = exportFee
    ? sourcePaysExportFee ? sourceCoin.display_ticker
      : getCurrencyDisplay(exportFee.currencyId).ticker
    : '';
  const exportFeeDisplay = exportFee
    ? `${BigNumber(exportFee.amount).isLessThan(0.01)
      ? truncateDecimal(BigNumber(exportFee.amount), 8)
      : BigNumber(exportFee.amount).toFixed(2)} ${exportFeeTicker}` : '';
  let amountError = null;
  if (excessivePrecision) {
    amountError = `Use no more than ${decimals} decimal places.`;
  } else if (dustError) {
    amountError = dustError;
  } else if (input && !validAmount) {
    amountError = cryptoAmount.isGreaterThan(sourceBalance || 0)
      ? "The amount exceeds this address's spendable balance."
      : 'Enter a valid amount.';
  }
  const exportFeeError = insufficientExportFunds
    ? `Not enough ${sourceCoin.display_ticker} for the bridge fee (about ${exportFeeDisplay}).`
    : null;

  useEffect(() => {
    if (!exportFeeRequest) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      const {channel: requestChannel, ...output} = JSON.parse(exportFeeRequest);
      const [, source, systemId] = requestChannel.split('.');
      try {
        const fee = await timeout(15000, estimateEthereumExportFee(systemId, source, output));
        if (active) setExportFeeQuote({request: exportFeeRequest, fee});
      } catch (_) {
        if (active) setExportFeeQuote({request: exportFeeRequest, fee: null});
      }
    }, 280);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [exportFeeRequest]);

  // A pre-conversion gets the launch price, which nobody knows yet. An estimate
  // would only guess (the daemon quotes as if the launch were now).
  const preconvert = Boolean(route?.preconvert);

  useEffect(() => {
    if (!target?.isConversion || !validAmount || preconvert) {
      setEstimate(null);
      setEstimateError(null);
      setEstimateLoading(false);
      setRouteEstimates({});
      return undefined;
    }

    let active = true;
    setEstimate(null);
    setRouteEstimates({});
    setEstimateLoading(true);
    setEstimateError(null);
    const timeout = setTimeout(async () => {
      try {
        const routes = target.routes?.length ? target.routes : [route];
        const results = await Promise.all(
          routes.map(async candidate => {
            try {
              const result = await estimateConversion(
                channel?.split('.')[2] || sourceCoin.system_id || sourceCoin.id,
                sourceCoin.currency_id || sourceCoin.id,
                target.transactionCurrency,
                cryptoAmount,
                candidate?.via,
                Boolean(candidate?.preconvert),
              );

              if (result?.error) {
                throw new Error(result.error.message || 'Estimate unavailable.');
              }
              const output = result?.result?.estimatedcurrencyout;
              if (
                output == null ||
                !BigNumber(output).isFinite() ||
                BigNumber(output).isNegative()
              ) {
                throw new Error('Estimate unavailable.');
              }
              return {estimate: result.result, route: candidate};
            } catch (error) {
              if (__DEV__) {
                console.warn('Conversion estimate unavailable:', error.message);
              }
              return {estimate: null, route: candidate};
            }
          }),
        );
        if (!active) return;
        const nextEstimates = Object.fromEntries(
          results.map(item => [item.route.key, item.estimate]),
        );
        const available = results.filter(item => item.estimate != null);
        const best = available.reduce(
          (current, candidate) =>
            !current ||
            BigNumber(candidate.estimate.estimatedcurrencyout).isGreaterThan(
              current.estimate.estimatedcurrencyout,
            )
              ? candidate
              : current,
          null,
        );
        const selectedRoute =
          routes.find(candidate => candidate.key === preferredRouteKey) ||
          best?.route ||
          route;
        const selectedEstimate = nextEstimates[selectedRoute?.key] || null;

        setRouteEstimates(nextEstimates);
        if (selectedRoute && selectedRoute.key !== route?.key) {
          setRoute(selectedRoute);
        }
        setEstimate(selectedEstimate);
        setEstimateError(selectedEstimate ? null : 'Estimate unavailable.');
      } catch (error) {
        if (!active) return;
        setRouteEstimates({});
        setEstimate(null);
        setEstimateError('Estimate unavailable.');
      } finally {
        if (active) setEstimateLoading(false);
      }
    }, 280);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [
    channel,
    cryptoAmountValue,
    preconvert,
    preferredRouteKey,
    setEstimate,
    setRoute,
    sourceCoin,
    target,
    validAmount,
  ]);

  const priceImpact = usePriceImpact({
    channel,
    sourceCoin,
    target,
    route,
    amount: cryptoAmount,
    output: validAmount ? state.estimate?.estimatedcurrencyout : null,
    rate,
  });

  const applySuggestedAmount = suggestedAmount => {
    setInput(
      fiatMode && rate != null
        ? suggestedAmount.multipliedBy(rate).decimalPlaces(2).toFixed(2)
        : suggestedAmount.toFixed(),
    );
  };

  const useMaximum = () => {
    if (maximumDisabled) return;
    const maximum = BigNumber.maximum(0, BigNumber(sourceBalance || 0)
      .minus(sourcePaysExportFee ? exportFee.amount : 0));
    if (sourcePaysExportFee) {
      // Keep MAX exact. Rounding a fiat value could spend the reserved fee.
      setFiatMode(false);
      setInput(maximum.decimalPlaces(8, BigNumber.ROUND_DOWN).toFixed());
      return;
    }
    setInput(
      fiatMode && rate != null
        ? maximum.multipliedBy(rate).decimalPlaces(2).toFixed(2)
        : maximum.toFixed(),
    );
  };

  const toggleInputMode = () => {
    if (rate == null) return;
    const currentCrypto = cryptoAmount.isFinite() ? cryptoAmount : BigNumber(0);
    if (fiatMode) setInput(currentCrypto.toFixed());
    else setInput(currentCrypto.multipliedBy(rate).decimalPlaces(2).toFixed(2));
    setFiatMode(!fiatMode);
  };

  const continueToRecipient = () => {
    if (!validAmount || exportFeeLoading || insufficientExportFunds) return;
    setAmount(
      cryptoAmount.toString(),
      coinsToSats(cryptoAmount).toString(),
      state.estimate,
      input,
      fiatMode,
    );
    // A pre-conversion goes to the source card's own address, so a failed
    // launch refunds the same address. Confirm comes next.
    if (preconvert) {
      setRecipient(channel.split('.')[1]);
      navigation.navigate('SendWizardConfirm');
      return;
    }
    // A scanned recipient is fixed, so Confirm comes next.
    navigation.navigate(
      state.scanRequest?.address || (state.invoice && !state.invoice.anyDestination)
        ? 'SendWizardConfirm'
        : 'SendWizardRecipient',
    );
  };

  // A scanned address can only be reached on networks of its own kind. A
  // private address is on the Verus network itself.
  const scannedType = state.scanRequest?.address
    ? getRecipientAddressType(state.scanRequest.address)
    : null;
  const scanAddressType =
    scannedType === ADDRESS_TYPE.PRIVATE ? ADDRESS_TYPE.VERUS : scannedType;
  const sendNetworkOptions = (sendTarget?.networkOptions || []).filter(
    option =>
      !scanAddressType ||
      option.routes.some(candidate => candidate.addressType === scanAddressType),
  );
  const selectedNetwork =
    sendNetworkOptions.find(option =>
      option.routes.some(candidate => candidate.key === route?.key),
    ) || sendNetworkOptions.find(option => option.isSameNetwork);
  const chooseSendNetwork = option => {
    const nextRoute =
      option.routes.find(candidate => !candidate.via) || option.routes[0];

    if (nextRoute) setRoute(nextRoute, option);
    setNetworkSheetOpen(false);
  };

  // The received asset's own price: the ledger's, or the same price source for
  // a target that is not in the wallet. Never the paid asset's price or the
  // small-trade crypto ratio from usePriceImpact. Missing prices stay absent.
  const receiveRate = useReceivedPrice(
    target?.coinId || target?.id,
    fiatChannel,
    {systemId: target?.systemId, testnet: sourceCoin?.testnet},
  );

  if (!sourceCoin || !target || !route) {
    return (
      <WizardScreen contentContainerStyle={styles.fallbackContent}>
        <ErrorMessage style={styles.fallbackError}>Source or recipient Asset selection is missing.</ErrorMessage>
      </WizardScreen>
    );
  }

  const available = `${truncateDecimal(BigNumber(sourceBalance || 0), 8)} ${sourceCoin.display_ticker}`;
  // The private card spends confirmed funds only. Say when the rest is ready.
  const confirming = BigNumber(sourcePending || 0).isGreaterThan(0)
    ? `${truncateDecimal(BigNumber(sourcePending), 8)} ${sourceCoin.display_ticker} can be sent in about 10 minutes.`
    : null;
  const convertedFiat =
    rate != null && cryptoAmount.isFinite()
      ? formatCurrency({
          amount: cryptoAmount.multipliedBy(rate).decimalPlaces(2).toFixed(2),
          code: displayCurrency,
        })[0]
      : null;
  const estimatedOutput = state.estimate?.estimatedcurrencyout;
  const showPriceRouteChip =
    !preconvert &&
    (target.isConversion || ethereumExport) &&
    (priceImpact.level !== IMPACT_LEVEL.NONE ||
      compareRoutes(target.routes || [], routeEstimates).length > 1 ||
      ethereumExport);
  const receiveAmount = validAmount
    ? target.isConversion ? estimatedOutput : cryptoAmountValue
    : null;
  const receiveMoneyValue = receiveAmount != null &&
    BigNumber(receiveAmount).isFinite() && BigNumber(receiveRate).isFinite() &&
    BigNumber(receiveRate).isGreaterThan(0)
    ? formatCurrency({
        amount: BigNumber(receiveAmount).multipliedBy(receiveRate).decimalPlaces(2).toFixed(2),
        code: displayCurrency,
      })[0] : null;
  const enteredCryptoAmount = truncateDecimal(
    cryptoAmount.isFinite() ? cryptoAmount : 0,
    8,
  );
  const modeText = fiatMode
    ? `${enteredCryptoAmount} ${sourceCoin.display_ticker}`
    : convertedFiat || `— ${displayCurrency}`;

  const sourceNetworkId = channel?.split('.')[2] || sourceCoin.system_id || sourceCoin.id;
  const sourceNetwork = sendTarget?.networkOptions?.find(option => option.isSameNetwork)?.networkName ||
    getCurrencyDisplay(sourceNetworkId, sourceCoin.display_name).name;
  const destinationNetwork = selectedNetwork?.networkName || route.networkName || sourceNetwork;
  const canChangeNetwork = mode === SEND_WIZARD_MODE.SEND &&
    isConversionChannel(channel) && sendNetworkOptions.length > 1;
  const amountErrorMessage = (exportFeeBlocksRoute && exportFeeError) || amountError || exportFeeError || estimateError;
  const estimateVisible = target.isConversion || (validAmount && ethereumExport);
  const emptyAmount = !input || (cryptoAmount.isFinite() && cryptoAmount.isZero());
  const showNetworkAction = !target.isConversion &&
    (canChangeNetwork || networkLoading || Boolean(networkError));
  const contextShown = route.isCrossChain || showNetworkAction;

  return (
    <WizardScreen scroll={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={Boolean(amountErrorMessage)}>
        {/* Small windows: an empty context takes no height, and a shown one is a
            20-point line whose 44-point target comes from hit slop. */}
        <View style={[styles.context, smallDevice && (contextShown ? styles.contextCompact : styles.contextEmpty)]}>
          {route.isCrossChain ? (
            <Pressable
              accessibilityLabel={`From ${sourceNetwork} to ${destinationNetwork}${canChangeNetwork ? '. Change destination network' : ''}`}
              accessibilityRole={canChangeNetwork ? 'button' : undefined}
              disabled={!canChangeNetwork || networkLoading}
              hitSlop={smallDevice ? COMPACT_LINE_HIT_SLOP : undefined}
              onPress={() => setNetworkSheetOpen(true)}
              style={[styles.networkAction, smallDevice && styles.networkActionCompact]}>
              <Text numberOfLines={1} style={[theme.typography.bodySm, styles.contextText, {color: theme.colors.textSecondary}]}>{sourceNetwork}</Text>
              <MaterialCommunityIcons name="arrow-right" size={17} color={theme.colors.textSecondary} />
              <Text numberOfLines={1} style={[theme.typography.labelMd, styles.contextText, {color: theme.colors.textPrimary}]}>{destinationNetwork}</Text>
              {canChangeNetwork ? <MaterialCommunityIcons name="chevron-down" size={16} color={theme.colors.textSecondary} /> : null}
            </Pressable>
          ) : showNetworkAction ? (
            <TextAction
              accessibilityRole="button"
              disabled={networkLoading || !canChangeNetwork}
              onPress={() => setNetworkSheetOpen(true)}
              size="small"
              style={[styles.networkAction, smallDevice && styles.networkActionCompact]}>
              {networkLoading ? 'Checking networks…' : networkError || 'Change network'}
            </TextAction>
          ) : null}
        </View>
        <View style={[styles.entry, smallDevice && (contextShown ? styles.entryTight : styles.entryCompact)]}>
          <AmountInput
            ref={amountInputRef}
            compact={smallDevice}
            decimalSeparator={decimalSeparator}
            onChangeText={setInput}
            unit={fiatMode ? displayCurrency : sourceCoin.display_ticker}
            value={input}
          />
          <View style={rate != null ? [styles.modeSlot, smallDevice && styles.modeSlotCompact] : null}>
            {rate != null ? (
              <Pressable
                accessibilityLabel={`Switch amount between ${sourceCoin.display_ticker} and ${displayCurrency}`}
                accessibilityRole="button"
                hitSlop={smallDevice ? COMPACT_MODE_HIT_SLOP : undefined}
                onPress={toggleInputMode}
                style={[styles.modeAction, smallDevice && styles.modeActionCompact]}>
                <View style={[styles.modeChip, {backgroundColor: theme.colors.surfaceMuted}]}>
                  <Text style={[theme.typography.bodySm, {color: theme.colors.textPrimary}]}>{modeText}</Text>
                  <MaterialCommunityIcons name="swap-vertical" size={16} color={theme.colors.textSecondary} />
                </View>
              </Pressable>
            ) : null}
          </View>
          <ErrorMessage style={styles.error}>{amountErrorMessage}</ErrorMessage>
          <View style={[styles.balanceRow, smallDevice && styles.balanceRowCompact]}>
            <Text style={[theme.typography.bodySm, {color: theme.colors.textSecondary}]}>Available: {available}</Text>
            <TextAction
              accessibilityLabel="Use maximum available amount"
              accessibilityRole="button"
              accessibilityState={{disabled: maximumDisabled}}
              disabled={maximumDisabled}
              onPress={useMaximum}
              variant="chip"
              style={[styles.maxButton, smallDevice && styles.maxButtonCompact]}>
              MAX
            </TextAction>
          </View>
          {confirming ? <Text style={[theme.typography.caption, styles.confirming, {color: theme.colors.textSecondary}]}>{confirming}</Text> : null}
        </View>
      </ScrollView>
      {estimateVisible ? (
        <View style={styles.estimateSlot}>
          <AmountEstimate
            atLaunch={preconvert}
            estimateLoading={validAmount && !emptyAmount && estimateLoading}
            estimatedOutput={emptyAmount ? null : receiveAmount}
            moneyValue={receiveMoneyValue}
            onOpenDetails={() => setRouteSheetOpen(true)}
            priceImpact={priceImpact}
            showDetails={validAmount && !emptyAmount && showPriceRouteChip}
            target={target}
          />
        </View>
      ) : null}
      <WizardFooter
        bottomSpacing={smallDevice ? 8 : 16}
        disabled={!validAmount || estimateLoading || exportFeeLoading || insufficientExportFunds}
        includeBottomInset={false}
        onPress={continueToRecipient}
        safeAreaSpacing={0}
      />
      <AmountKeypad
        decimalSeparator={decimalSeparator}
        onKeyPress={key => amountInputRef.current?.edit(key)}
        visible={focused && !routeSheetOpen && !networkSheetOpen}
      />
      <PriceRouteSheet
        cryptoAmount={cryptoAmount}
        displayCurrency={displayCurrency}
        estimatedOutput={estimatedOutput}
        ethereumExport={ethereumExport}
        exportFeeDisplay={exportFeeDisplay}
        exportFeeLoading={exportFeeLoading}
        hasExportFee={Boolean(exportFee)}
        onUseSuggestion={applySuggestedAmount}
        priceImpact={priceImpact}
        rate={rate}
        route={route}
        sourceCoin={sourceCoin}
        estimates={routeEstimates}
        target={target}
        visible={routeSheetOpen}
        onClose={() => setRouteSheetOpen(false)}
        onClosed={refocusAfterSheet}
        onSelect={nextRoute => {
          setPreferredRouteKey(nextRoute.key);
          setRoute(nextRoute);
          setEstimate(routeEstimates[nextRoute.key] || null);
          setEstimateError(routeEstimates[nextRoute.key] ? null : 'Estimate unavailable.');
          setRouteSheetOpen(false);
        }}
      />
      <TargetNetworkSheet
        selectedKey={route?.networkKey}
        onClose={() => setNetworkSheetOpen(false)}
        onClosed={refocusAfterSheet}
        onSelect={chooseSendNetwork}
        options={sendNetworkOptions}
        target={sendTarget}
        visible={networkSheetOpen}
      />
    </WizardScreen>
  );
};

// Small windows: a 20-point context line and a 36-point fiat chip slot keep
// 44-point targets through hit slop. TextAction adds its own (MAX keeps 48).
const COMPACT_LINE_HIT_SLOP = {top: 12, bottom: 12};
const COMPACT_MODE_HIT_SLOP = {top: 4, bottom: 4};

const styles = StyleSheet.create({
  content: {flexGrow: 1, paddingHorizontal: 16, paddingBottom: 8},
  fallbackContent: {paddingTop: WIZARD_CONTENT_TOP_INSET},
  fallbackError: {marginVertical: 0},
  context: {height: 44, alignItems: 'center', justifyContent: 'center'},
  contextCompact: {height: 20},
  contextEmpty: {height: 0},
  networkAction: {alignSelf: 'center', minHeight: 44, maxWidth: '100%', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center'},
  networkActionCompact: {minHeight: 20},
  contextText: {flexShrink: 1},
  entry: {paddingTop: 48, alignItems: 'center'},
  entryCompact: {paddingTop: 8},
  entryTight: {paddingTop: 0},
  modeSlot: {minHeight: 44, width: '100%', alignItems: 'center', justifyContent: 'center'},
  modeSlotCompact: {minHeight: 36},
  modeAction: {minHeight: 44, justifyContent: 'center'},
  modeActionCompact: {minHeight: 36},
  modeChip: {borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 6},
  error: {marginHorizontal: 0, marginVertical: 4, alignSelf: 'stretch'},
  balanceRow: {minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8},
  balanceRowCompact: {minHeight: 44},
  maxButton: {minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center'},
  maxButtonCompact: {minHeight: 44},
  confirming: {textAlign: 'center', marginBottom: 4},
  estimateSlot: {minHeight: 49, paddingHorizontal: 16},
});

export default SendWizardAmount;
