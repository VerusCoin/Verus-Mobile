/*
  ConfirmPayStep (Step 4 / final step)
  - Confirms, signs, and submits the reviewed identity update.
  - 2026-02-05: Refactored to always render the confirm layout. Fund source
    selection is now triggered via a tappable card that opens a SemiModal sheet.
  - 2026-02-06: Replaced FundSourceSelectList with custom grey-card source list
    matching SendSourceSubwalletSheet visual style.
  - 2026-02-06: Cleaned up icons -- removed heavy icons from fee card and recap
    rows, kept wallet icon on payment source card. Added fiat fee display below
    crypto fee using Redux rates (WYRE_SERVICE -> GENERAL fallback).
  - 2026-03-11: Tightened fee validation and post-broadcast error handling .
*/
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, TouchableOpacity, View } from 'react-native';
import { Portal, Text } from 'react-native-paper';
import Button from '../../../../components/Button';
import { useSelector } from 'react-redux';
import { formatCurrency } from 'react-native-format-currency';
import Colors from '../../../../globals/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedActivityIndicatorBox from '../../../../components/AnimatedActivityIndicatorBox';
import GradientButton from '../../../../components/GradientButton';
import SemiModal from '../../../../components/SemiModal';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';
import { createUpdateIdentityTx } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
import {createLocalIdentityUploadCrypto} from '../../../../utils/identityUpdate/localUploadCrypto';
import {identityToDisplayJson} from '../../../../utils/identityUpdate/identityDisplay';
import {
  captureIdentityUpdateContext,
  assertIdentityUpdateContext,
  requireIdentityFundingApproval,
  validateIdentityUpdateContext,
  submitReviewedIdentityUpdate,
} from '../../../../utils/identityUpdate/verifiedSubmission';
import { requestPrivKey } from '../../../../utils/auth/authBox';
import { satsToCoins, truncateDecimal } from '../../../../utils/math';
import { API_GET_BALANCES, API_SEND, GENERAL, WYRE_SERVICE, USD } from '../../../../utils/constants/intervalConstants';
import BigNumber from 'bignumber.js';
import {
  GenericResponse,
  IdentityUpdateResponseDetails,
  IdentityUpdateResponseOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import { processEncryptedKeys } from '../../../../utils/crypto/encryptCredentials';
import { confirmPayStepStyles as localStyles } from '../../../../styles';
import {ensureGenericResponseSigner} from '../../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {showFundRawTransactionErrorAlert} from '../../../../utils/vrpc/fundRawTransactionError';
import IdentityStateChangeCard from '../components/IdentityStateChangeCard';
import {buildIdentityStateChange} from '../utils/buildIdentityStateChange';

const ConfirmPayStep = ({
  details,
  requestIsTestnet,
  subjectIdentity,
  subjectIdTxHex,
  friendlyNames,
  coinObj,
  responseBufferString,
  detailIndex,
  next,
  cancel,
  onGoBack,
  highRiskCount,
  contentCount,
  hasEncryptedKeys,
  identityStateChange,
  chainHeight,
  styles: parentStyles,
}) => {
  const [selectedSource, setSelectedSource] = useState(null);
  const [fee, setFee] = useState(null);
  const [feeCurrency, setFeeCurrency] = useState(null);
  const [preparedUpdate, setPreparedUpdate] = useState(null);
  const preparationSequence = useRef(0);
  const activeCrypto = useRef(null);
  const preparationController = useRef(null);
  const sending = useRef(null);
  const completedReview = useRef(null);
  const [submissionOutcome, setSubmissionOutcome] = useState(null);
  const [calculating, setCalculating] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);
  const [preparedStateChange, setPreparedStateChange] = useState(null);

  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const allBalances = useObjectSelector(state => state.ledger.balances);

  const signerIdentityAddress = subjectIdentity.identity
    ? subjectIdentity.identity.identityaddress
    : subjectIdentity.identityaddress;

  const requestedCurrency = useMemo(() => {
    if (details.containsSystem()) return details.systemID.toAddress();
    return requestIsTestnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id;
  }, [details, requestIsTestnet]);

  const feeCurrencyDisplay = useMemo(() => {
    if (!feeCurrency) return '';
    if (friendlyNames[feeCurrency]) return friendlyNames[feeCurrency].replace('@', '');
    return feeCurrency;
  }, [feeCurrency, friendlyNames]);

  // A mounted confirmation can receive another request (or a refreshed source
  // outpoint). Bind the displayed approval and every pending callback to the
  // inputs the user actually reviewed, including before effect cleanup runs.
  const reviewInputs = useMemo(() => ({
    details, requestIsTestnet, subjectIdentity, subjectIdTxHex, hasEncryptedKeys,
    systemId: coinObj.system_id,
  }), [details, requestIsTestnet, subjectIdentity, subjectIdTxHex, hasEncryptedKeys, coinObj.system_id]);
  const currentReviewInputs = useRef(reviewInputs);
  currentReviewInputs.current = reviewInputs;
  const preparedIdentity = useMemo(() => preparedUpdate
    ? identityToDisplayJson(preparedUpdate.built.identity) : null, [preparedUpdate]);
  const hasFee = fee != null && preparedUpdate?.reviewInputs === reviewInputs && !calculating;
  useEffect(() => {
    setSelectedSource(null);
    setFee(null);
    setFeeCurrency(null);
    setPreparedUpdate(null);
    setPreparedStateChange(null);
    setCalculating(false);
    setBroadcasting(false);
    setSubmissionOutcome(null);
    setSourceSheetVisible(false);
    return () => {
      preparationSequence.current += 1;
      preparationController.current?.abort();
      activeCrypto.current?.dispose();
      activeCrypto.current = null;
    };
  }, [reviewInputs]);

  // --- Fiat fee display ---
  const rates = useObjectSelector(state => state.ledger.rates);
  const displayCurrency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );

  const feeFiatDisplay = useMemo(() => {
    if (!fee || !feeCurrency) return null;

    // Find the coin ID for the fee currency to look up rate
    let feeCoinId = null;
    try {
      const coin = CoinDirectory.findCoinObj(feeCurrency);
      if (coin) feeCoinId = coin.id;
    } catch (e) {}

    if (!feeCoinId) return null;

    const rate = rates?.[WYRE_SERVICE]?.[feeCoinId]?.[displayCurrency] != null
      ? rates[WYRE_SERVICE][feeCoinId][displayCurrency]
      : rates?.[GENERAL]?.[feeCoinId]?.[displayCurrency] != null
        ? rates[GENERAL][feeCoinId][displayCurrency]
        : null;

    if (!rate) return null;

    try {
      const fiatValue = BigNumber(fee).multipliedBy(BigNumber(rate));
      if (fiatValue.isNaN() || !fiatValue.isFinite()) return null;
      const [formatted] = formatCurrency({
        amount: fiatValue.decimalPlaces(2, BigNumber.ROUND_HALF_UP).toNumber(),
        code: displayCurrency,
      });
      return formatted;
    } catch (e) {
      return null;
    }
  }, [fee, feeCurrency, rates, displayCurrency]);

  // --- Build available payment sources ---
  const paymentSources = useMemo(() => {
    const sources = [];

    for (const cObj of activeCoinsForUser) {
      if (cObj.currency_id !== requestedCurrency) continue;

      const chainTicker = cObj.id;
      const subWallets = allSubWallets[chainTicker] || [];

      for (const wallet of subWallets) {
        if (!wallet.network) continue;

        // Get balance for this wallet
        const balanceChannel = wallet.api_channels?.[API_GET_BALANCES];
        const balanceData = balanceChannel && allBalances[balanceChannel]?.[chainTicker];
        const balance = balanceData?.total != null ? BigNumber(balanceData.total) : BigNumber(0);

        if (balance.isGreaterThan(0)) {
          sources.push({
            coinObj: cObj,
            wallet,
            balance,
            balanceDisplay: truncateDecimal(balance, 4),
          });
        }
      }
    }

    return sources;
  }, [activeCoinsForUser, allSubWallets, allBalances, requestedCurrency]);

  // --- Handlers ---

  const handleSelectSource = useCallback(async (source) => {
    if (completedReview.current === reviewInputs || (sending.current && !sending.current.context.signal?.aborted)) return;
    const sequence = ++preparationSequence.current;
    preparationController.current?.abort();
    const controller = new AbortController();
    preparationController.current = controller;
    activeCrypto.current?.dispose();
    activeCrypto.current = null;
    setSourceSheetVisible(false);
    setSelectedSource(source);
    setCalculating(true);
    setFee(null);
    setFeeCurrency(null);
    setPreparedStateChange(null);
    setPreparedUpdate(null);

    let crypto;
    try {
      const [, address, systemId] = source.wallet.channel.split('.');
      if (systemId !== coinObj.system_id || systemId !== requestedCurrency) {
        throw new Error('The selected payment source belongs to a different network.');
      }
      const context = captureIdentityUpdateContext({
        systemId, isTestnet: requestIsTestnet, request: details,
        changeAddress: address, identityAddress: signerIdentityAddress, signal: controller.signal,
      });
      const assertActive = () => {
        assertIdentityUpdateContext(context);
        if (sequence !== preparationSequence.current || currentReviewInputs.current !== reviewInputs) {
          throw new Error('Identity update preparation canceled.');
        }
      };
      const activeHeight = await validateIdentityUpdateContext(context);
      assertActive();

      // If request contains encrypted credential keys, encrypt them before
      // creating the tx so plaintext credentials are never sent to the server.
      let effectiveDetails = details;
      if (hasEncryptedKeys) {
        effectiveDetails = await processEncryptedKeys(
          systemId,
          details,
          subjectIdentity,
          coinObj,
          assertActive,
        );
      }
      assertActive();
      crypto = effectiveDetails.signDataMap?.size
        ? await createLocalIdentityUploadCrypto({
          systemId, request: effectiveDetails, assertActive,
        })
        : undefined;
      assertActive();
      activeCrypto.current = crypto;

      const updateIdentityTx = await createUpdateIdentityTx(
        systemId,
        effectiveDetails,
        address,
        subjectIdTxHex,
        subjectIdentity.blockheight,
        true,
        requestIsTestnet,
        crypto,
        activeHeight,
      );
      assertActive();
      const reviewedHeight = await validateIdentityUpdateContext(context, updateIdentityTx);
      const approval = requireIdentityFundingApproval(updateIdentityTx, {
        chainId: systemId, nextBlockHeight: reviewedHeight + 1,
      });
      if (sequence !== preparationSequence.current) return;
      if (updateIdentityTx.deltas.size !== 1) throw new Error('Unexpected currency debits');

      const feeObj = Object.fromEntries(updateIdentityTx.deltas.entries());
      const currency = Object.keys(feeObj)[0];
      if (currency !== requestedCurrency) {
        throw new Error('Unexpected fee currency');
      }

      // The funded transaction can have a later expiry (and therefore unlock
      // height) than the preview. Display the identity verified from this tx.
      setPreparedStateChange(buildIdentityStateChange({
        currentIdentity: subjectIdentity.identity,
        updatedIdentity: identityToDisplayJson(updateIdentityTx.identity),
        chainHeight: reviewedHeight,
        secondsPerBlock: coinObj.seconds_per_block,
      }));
      setFee(satsToCoins(BigNumber(approval.nativeFee)).toString());
      setFeeCurrency(currency);
      setPreparedUpdate({built: updateIdentityTx, context, reviewInputs});
    } catch (e) {
      if (sequence !== preparationSequence.current) return;
      setSelectedSource(null);
      if (!showFundRawTransactionErrorAlert(e)) {
        Alert.alert('Error', e.message || 'Failed to calculate fee');
      }
    } finally {
      crypto?.dispose();
      if (activeCrypto.current === crypto) activeCrypto.current = null;
    }

    if (sequence === preparationSequence.current) setCalculating(false);
  }, [details, subjectIdTxHex, subjectIdentity, requestIsTestnet, hasEncryptedKeys, coinObj, requestedCurrency, signerIdentityAddress, reviewInputs]);

  const handleUpdate = useCallback(async () => {
    if (completedReview.current === reviewInputs || (sending.current && !sending.current.context.signal?.aborted) || !preparedUpdate || !hasFee) return;
    sending.current = preparedUpdate;
    setBroadcasting(true);
    let broadcastTxid = null;

    try {
      const baseResponse = new GenericResponse();
      if (responseBufferString && responseBufferString.length > 0) {
        baseResponse.fromBuffer(Buffer.from(responseBufferString, 'hex'), 0);
      }

      ensureGenericResponseSigner({
        response: baseResponse,
        systemID: coinObj.system_id,
        identityID: signerIdentityAddress,
      });

      const { wallet, coinObj: sourceCoinObj } = selectedSource;
      const [channelName, , systemId] = wallet.api_channels[API_SEND].split('.');

      if (systemId !== preparedUpdate.context.systemId) {
        throw new Error('The selected payment source changed. Review the update again.');
      }
      const result = await submitReviewedIdentityUpdate({
        ...preparedUpdate,
        getKeys: async () => {
          const spendingKey = await requestPrivKey(sourceCoinObj.id, channelName, preparedUpdate.context);
          return preparedUpdate.built.utxos.map(() => [spendingKey]);
        },
      });
      broadcastTxid = result.txid;
      if (preparedUpdate.context.signal?.aborted || currentReviewInputs.current !== preparedUpdate.reviewInputs) return;
      completedReview.current = preparedUpdate.reviewInputs;

      // Return the submitted transaction in the generic request response.
      const responseDetail = new IdentityUpdateResponseOrdinalVDXFObject({
        data: new IdentityUpdateResponseDetails({
          requestID: details.containsRequestID() ? details.requestID : undefined,
          txid: broadcastTxid
            ? Buffer.from(broadcastTxid, 'hex').reverse()
            : undefined,
        }),
      });

      if (baseResponse.details == null) baseResponse.details = [];
      baseResponse.details = [...baseResponse.details, responseDetail];

      baseResponse.setFlags();

      if (next) {
        await next(baseResponse, [detailIndex]);
      } else {
        cancel();
      }
    } catch (e) {
      if (!preparedUpdate.context.signal?.aborted && currentReviewInputs.current === preparedUpdate.reviewInputs) {
        if (broadcastTxid || e.code === 'BROADCAST_UNKNOWN') {
          completedReview.current = preparedUpdate.reviewInputs;
          setSubmissionOutcome({txid: broadcastTxid || e.txid, deliveryUnknown: !broadcastTxid});
          setPreparedUpdate(null);
        } else {
          Alert.alert('Error', e.message || 'Failed to broadcast transaction');
        }
        setBroadcasting(false);
      }
    } finally {
      if (sending.current === preparedUpdate) sending.current = null;
    }
  }, [selectedSource, preparedUpdate, hasFee, details, responseBufferString, coinObj, signerIdentityAddress, next, detailIndex, cancel, reviewInputs]);

  if (submissionOutcome) {
    return (
      <View style={{flex: 1, padding: 24, gap: 20}}>
        <Text style={parentStyles.mainTitle}>{submissionOutcome.deliveryUnknown ? 'Delivery not confirmed' : 'Update sent'}</Text>
        <Text>{submissionOutcome.deliveryUnknown
          ? 'The network may have received this identity update. Check the transaction’s status before starting a new review.'
          : 'Your update was sent, but the request response could not be completed.'}</Text>
        <Text selectable>Transaction ID: {submissionOutcome.txid}</Text>
        <Text>This screen will not send the transaction again.</Text>
        <Button mode="contained" onPress={cancel}>Close</Button>
      </View>
    );
  }

  // --- Full-screen broadcasting state ---
  if (broadcasting) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <AnimatedActivityIndicatorBox />
        <Text style={{ marginTop: 16, fontSize: 14, color: '#666' }}>
          Broadcasting transaction...
        </Text>
      </View>
    );
  }

  // --- Always render confirm layout ---
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={parentStyles.scrollView}
        contentContainerStyle={parentStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={parentStyles.header}>
          <Text style={parentStyles.mainTitle}>Confirm update</Text>
          <Text style={parentStyles.subtitle}>Select a payment source and confirm the identity update</Text>
        </View>

        <IdentityStateChangeCard change={hasFee ? preparedStateChange : identityStateChange} />

        {hasFee && preparedIdentity?.primaryaddresses && (
          <View style={localStyles.recapCard}>
            <Text style={localStyles.recapTitle}>Resulting identity</Text>
            <Text style={localStyles.recapText}>{preparedIdentity.identityaddress || preparedIdentity.name}</Text>
            <Text style={localStyles.recapText}>Required signatures: {preparedIdentity.minimumsignatures}</Text>
            <Text style={localStyles.recapText}>Primary addresses: {preparedIdentity.primaryaddresses.join(', ')}</Text>
            <Text style={localStyles.recapText}>Revocation authority: {friendlyNames[preparedIdentity.revocationauthority] || preparedIdentity.revocationauthority}</Text>
            <Text style={localStyles.recapText}>Recovery authority: {friendlyNames[preparedIdentity.recoveryauthority] || preparedIdentity.recoveryauthority}</Text>
          </View>
        )}

        {/* Payment source card -- tappable to open sheet */}
        <TouchableOpacity
          style={localStyles.sourceSelectCard}
          onPress={() => setSourceSheetVisible(true)}
          activeOpacity={0.7}
        >
          <View style={localStyles.sourceSelectRow}>
            <MaterialCommunityIcons
              name={selectedSource ? 'wallet-outline' : 'wallet-plus-outline'}
              size={22}
              color={selectedSource ? Colors.primaryColor : '#888'}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={localStyles.sourceSelectLabel}>
                {selectedSource ? 'PAYING FROM' : 'PAYMENT SOURCE'}
              </Text>
              <Text style={localStyles.sourceSelectValue}>
                {selectedSource
                  ? `${selectedSource.coinObj.display_ticker} - ${selectedSource.wallet.name}`
                  : 'Select payment source'}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color="#CCC" />
          </View>
        </TouchableOpacity>

        {/* Fee card */}
        <View style={localStyles.feeCard}>
          <Text style={localStyles.feeLabel}>Transaction fee</Text>
          {calculating ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <ActivityIndicator size="small" color={Colors.primaryColor} style={{ marginRight: 8 }} />
              <Text style={localStyles.feeCalculating}>Calculating...</Text>
            </View>
          ) : hasFee ? (
            <View>
              <Text style={localStyles.feeValue}>{fee} {feeCurrencyDisplay}</Text>
              {feeFiatDisplay && (
                <Text style={localStyles.feeFiat}>{feeFiatDisplay}</Text>
              )}
            </View>
          ) : (
            <Text style={localStyles.feePlaceholder}>Select a payment source to see fee</Text>
          )}
        </View>

        {/* Recap card */}
        <View style={localStyles.recapCard}>
          <Text style={localStyles.recapTitle}>Changes recap</Text>
          {highRiskCount > 0 && (
            <View style={localStyles.recapRow}>
              <Text style={localStyles.recapText}>{highRiskCount} high-risk {highRiskCount === 1 ? 'change' : 'changes'} acknowledged</Text>
            </View>
          )}
          <View style={localStyles.recapRow}>
            <Text style={localStyles.recapText}>{contentCount} content {contentCount === 1 ? 'change' : 'changes'}</Text>
          </View>
          {hasEncryptedKeys && (
            <View style={localStyles.encryptedKeyRecapRow}>
              <MaterialCommunityIcons
                name="shield-lock-outline"
                size={14}
                color={Colors.primaryColor}
                style={{ marginRight: 6, marginTop: 1 }}
              />
              <Text style={localStyles.encryptedKeyRecapText}>
                Credential data will be encrypted with a key derived from your identity so that neither the credential type nor its contents are publicly visible on-chain. Your account's shielded (Z) seed must match the identity's z-address.
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Footer: Back + Update */}
      <View style={parentStyles.footer}>
        <View style={parentStyles.ctaCol}>
          <Button
            mode="contained"
            onPress={() => {
              preparationSequence.current += 1;
              preparationController.current?.abort();
              activeCrypto.current?.dispose();
              activeCrypto.current = null;
              onGoBack();
            }}
            style={parentStyles.secondaryCta}
            contentStyle={parentStyles.secondaryCtaContent}
            uppercase={false}
            buttonColor="#EBF6FF"
            textColor={Colors.primaryColor}
            labelStyle={parentStyles.secondaryCtaLabel}
          >
            Back
          </Button>
        </View>
        <View style={parentStyles.ctaCol}>
          <GradientButton
            onPress={handleUpdate}
            style={parentStyles.primaryCta}
            disabled={!hasFee}
          >
            Update
          </GradientButton>
        </View>
      </View>

      {/* Fund source selection sheet -- grey card style */}
      <Portal>
        <SemiModal
          animationType="slide"
          transparent={true}
          visible={sourceSheetVisible}
          onRequestClose={() => setSourceSheetVisible(false)}
          title="Select payment source"
          flexHeight={0.01}
          contentContainerStyle={{
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            flex: 0,
            width: '100%',
            alignSelf: 'flex-end',
            paddingBottom: 32,
            maxHeight: '70%',
          }}
        >
          <View style={localStyles.sheetDescription}>
            <Text style={localStyles.sheetDescriptionText}>
              Choose a wallet to pay the identity update fee from.
            </Text>
          </View>
          <ScrollView>
            <View style={localStyles.sheetListContainer}>
              {paymentSources.length === 0 ? (
                <View style={localStyles.sheetEmpty}>
                  <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#999" style={{ marginBottom: 8 }} />
                  <Text style={localStyles.sheetEmptyText}>
                    No wallets with sufficient balance found.
                  </Text>
                </View>
              ) : (
                paymentSources.map((source, index) => (
                  <TouchableOpacity
                    key={`${source.coinObj.id}-${source.wallet.id}-${index}`}
                    style={localStyles.walletCard}
                    onPress={() => handleSelectSource(source)}
                    activeOpacity={0.7}
                  >
                    <View style={localStyles.walletAddressSection}>
                      <Text style={localStyles.walletAddressText} numberOfLines={1}>
                        {source.wallet.name || source.wallet.id}
                      </Text>
                    </View>
                    <View style={localStyles.walletBalanceSection}>
                      <Text style={localStyles.walletBalanceAmount}>
                        {source.balanceDisplay}
                      </Text>
                      <Text style={localStyles.walletBalanceTicker}>
                        {source.coinObj.display_ticker}
                      </Text>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-right"
                      size={20}
                      color="#CCC"
                      style={{ marginLeft: 4 }}
                    />
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        </SemiModal>
      </Portal>
    </View>
  );
};

export default ConfirmPayStep;
