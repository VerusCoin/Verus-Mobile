import {useRequestBackHandler} from '../../useRequestNavigation';
/*
  ConfirmPayStep (Step 4 / final step)
  - 2026-02-05: Created. Replaces IdentityUpdatePaymentConfiguration and the
    UpdateIdentity SendModal (Form/Confirm/Result).
  - 2026-06-18: Payment source selection is driven by the primary action. The
    selected source is shown only in the footer, and the source sheet uses
    iconless filled rows.
  - 2026-03-11: Tightened fee validation and post-broadcast error handling .
*/
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Text } from 'react-native-paper';
import { useSelector } from 'react-redux';
import { formatCurrency } from 'react-native-format-currency';
import { Check, ChevronRight } from 'lucide-react-native';
import LottieView from 'lottie-react-native';
import AnimatedSuccessCheckmark from '../../../../components/AnimatedSuccessCheckmark';
import AppButton from '../../../../components/AppButton';
import SlideToConfirm from '../../../../components/SlideToConfirm';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import CopyAction from '../../../../components/CopyAction';
import InfoSheet from '../../../../components/InfoSheet';
import InfoSheetSection, {InfoSheetRow} from '../../../../components/InfoSheetSection';
import SkeletonLoader, {SkeletonBlock} from '../../../../components/SkeletonLoader';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import { useOnboardingTheme } from '../../../../theme/onboarding';
import { useObjectSelector } from '../../../../hooks/useObjectSelector';
import { coinsList } from '../../../../utils/CoinData/CoinsList';
import { CoinDirectory } from '../../../../utils/CoinData/CoinDirectory';
import { createUpdateIdentityTx, getUpdateIdentityFeeSats } from '../../../../utils/api/channels/verusid/requests/updateIdentity';
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
import {
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericResponseDeliveryFailure,
  isLocalResponsePostRejection,
} from '../../../../utils/deeplink/genericRequestDelivery';
import BigNumber from 'bignumber.js';
import {
  GenericResponse,
  IdentityUpdateResponseDetails,
  IdentityUpdateResponseOrdinalVDXFObject,
} from 'verus-typescript-primitives';
import { CREDENTIAL_ERROR_CODES, processEncryptedKeys } from '../../../../utils/crypto/encryptCredentials';
import { confirmPayStepStyles as createConfirmPayStepStyles } from '../../../../styles';
import {ensureGenericResponseSigner} from '../../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {showFundRawTransactionErrorAlert} from '../../../../utils/vrpc/fundRawTransactionError';
import {isNetworkFailureError} from '../../../../utils/deeplink/genericRequestRejection';
import {PROFILE_SECURITY_SETTINGS_LABEL} from '../../../../utils/settings/settingsLabels';
import IdentityStateChangeCard from '../components/IdentityStateChangeCard';
import {EncryptedCredentialNote} from '../../../../components/VerusIdContentChangeCard';
import {buildIdentityStateChange} from '../utils/buildIdentityStateChange';

const IDENTITY_UPDATE_COMPLETION_SHEET_HEIGHT = 360;
const COMPLETION_SHEET_STAGE = {
  IDLE: 'idle',
  BROADCASTING: 'broadcasting',
  READY: 'ready',
  DELIVERING: 'delivering',
  SUCCESS: 'success',
  ERROR: 'error',
};

const truncateAddress = value => {
  if (!value) return '';
  const text = String(value);
  if (text.includes('...') || text.length <= 15) return text;
  return `${text.slice(0, 6)}...${text.slice(-6)}`;
};

const truncateTxid = value => {
  if (!value) return '';
  const text = String(value);
  if (text.length <= 23) return text;
  return `${text.slice(0, 10)}...${text.slice(-10)}`;
};

const getSourceAddress = source => source?.wallet?.channel?.split('.')?.[1];

const isAddressLikeSourceName = value => {
  if (!value) return false;

  const text = String(value);
  if (text.includes('@')) return false;
  if (text.includes('...')) return true;

  return /^[A-Za-z0-9]{20,}$/.test(text);
};

const getSourceDisplayName = source => {
  if (!source) return '';

  const displayName =
    source.wallet?.name ||
    source.wallet?.id ||
    getSourceAddress(source) ||
    'Wallet';

  return isAddressLikeSourceName(displayName)
    ? truncateAddress(displayName)
    : displayName;
};

const getDeliveryTitle = deliveryInfo => {
  const destination = deliveryInfo?.destinationHost || 'the requester';

  if (deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT) {
    return `Returning to ${destination}`;
  }

  if (deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
    return 'Sending response';
  }

  return 'Completing request';
};

const NETWORK_UNAVAILABLE_MESSAGE =
  'Verus Mobile could not reach the Verus network. Check your connection';

// The fee calculation failed. The raw error is not shown or logged.
const getFeeErrorMessage = error => {
  const message = typeof error?.message === 'string' ? error.message : '';

  if (message.includes('No Z recovery secret')) {
    return `Set up the Z recovery secret in Settings > ${PROFILE_SECURITY_SETTINGS_LABEL}, then select a payment source again.`;
  }
  if (error?.code === CREDENTIAL_ERROR_CODES.NO_PRIVATE_ADDRESS) {
    return 'This VerusID has no private address, which credentials need for encryption. Add one, then open the request again.';
  }
  if (error?.code === CREDENTIAL_ERROR_CODES.PRIVATE_ADDRESS_MISMATCH) {
    return "This VerusID's private address does not come from this wallet's Z recovery secret, so the credentials cannot be encrypted for it.";
  }
  // An earlier update of this VerusID waits for a block, so its identity output
  // is spent in the mempool. A new block lets the fee be calculated again.
  if (error?.code === 'REVIEW_CHANGED' && error.identityInputSpent) {
    return 'This VerusID has an update that is not confirmed yet. Wait about a minute, then select a payment source again.';
  }
  if (isNetworkFailureError(error)) {
    return `${NETWORK_UNAVAILABLE_MESSAGE}, then select a payment source again.`;
  }
  // The identity changed or the review expired after the request opened. The
  // review keeps the identity state it opened with, so only a reopened request
  // helps. Other REVIEW_CHANGED cases (a spent or immature input) need another
  // payment source and keep the message below.
  if (error?.code === 'REVIEW_CHANGED' && /changed after review|expired/.test(message)) {
    return 'This review is out of date. Close the request and open it again.';
  }

  return 'The fee could not be calculated. Select a payment source again.';
};

// The update was not broadcast, or a step after the broadcast failed. A
// broadcast update keeps its txid on the sheet.
const getBroadcastError = (error, txid) => {
  if (error?.code === 'BROADCAST_UNKNOWN' || error?.submitted) {
    return {
      title: 'Delivery not confirmed',
      message: 'Check the transaction status before you start a new review.',
    };
  }
  if (txid) {
    return {
      title: 'Response not prepared',
      message: 'The identity update was broadcast. Do not send it again.',
    };
  }

  return {
    title: 'Update not broadcast',
    message: isNetworkFailureError(error)
      ? `${NETWORK_UNAVAILABLE_MESSAGE}, then try again.`
      : null,
  };
};

const getDeliveryErrorMessage = (error, deliveryInfo) => {
  if (isLocalResponsePostRejection(error)) {
    return getGenericResponseDeliveryFailure(error).message;
  }
  // The title says that the response was not sent. Say what to check.
  if (error?.isResponsePostError) {
    return `Check that ${
      deliveryInfo?.destinationHost || 'the requester'
    } is online.`;
  }

  return error?.message || 'Verus Mobile could not complete this request.';
};

const ConfirmPayStep = ({
  requestCard,
  details,
  requestIsTestnet,
  subjectIdentity,
  subjectIdTxHex,
  friendlyNames,
  coinObj,
  responseBufferString,
  detailIndex,
  deliverIdentityUpdateResponse,
  identityUpdateDeliveryInfo,
  completeIdentityUpdateWithoutDelivery,
  next,
  cancel,
  highRiskCount,
  contentCount,
  hasEncryptedKeys,
  onBroadcastingChange,
  identityStateChange,
  chainHeight,
  styles: parentStyles,
}) => {
  const theme = useOnboardingTheme();
  const localStyles = useMemo(
    () => createConfirmPayStepStyles(theme),
    [theme],
  );
  const [selectedSource, setSelectedSource] = useState(null);
  const [fee, setFee] = useState(null);
  const [feeCurrency, setFeeCurrency] = useState(null);
  const [preparedUpdate, setPreparedUpdate] = useState(null);
  const preparationSequence = useRef(0);
  const activeCrypto = useRef(null);
  const preparationController = useRef(null);
  const sending = useRef(null);
  const delivering = useRef(false);
  const completedReview = useRef(null);
  const [calculating, setCalculating] = useState(false);
  const [completionSheetStage, setCompletionSheetStage] = useState(
    COMPLETION_SHEET_STAGE.IDLE,
  );
  const [broadcastTxid, setBroadcastTxid] = useState(null);
  const [pendingResponse, setPendingResponse] = useState(null);
  const [completionError, setCompletionError] = useState(null);
  // Set when the ERROR stage reports a failed broadcast, not a failed delivery.
  const [broadcastError, setBroadcastError] = useState(null);
  const [feeError, setFeeError] = useState(null);
  const [completionDeliveryInfo, setCompletionDeliveryInfo] = useState(null);
  const [sourceSheetVisible, setSourceSheetVisible] = useState(false);
  const [keysSheetVisible, setKeysSheetVisible] = useState(false);
  const mountedRef = useRef(true);
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
  const hasFee = fee != null && preparedUpdate?.reviewInputs === reviewInputs && !calculating;
  const preparedIdentity = useMemo(() => hasFee
    ? identityToDisplayJson(preparedUpdate.built.identity) : null,
  [hasFee, preparedUpdate]);
  useEffect(() => {
    setSelectedSource(null);
    setFee(null);
    setFeeCurrency(null);
    setPreparedUpdate(null);
    setPreparedStateChange(null);
    setCalculating(false);
    setCompletionSheetStage(COMPLETION_SHEET_STAGE.IDLE);
    setBroadcastTxid(null);
    setPendingResponse(null);
    setFeeError(null);
    setSourceSheetVisible(false);
    setKeysSheetVisible(false);
    return () => {
      preparationSequence.current += 1;
      preparationController.current?.abort();
      activeCrypto.current?.dispose();
      activeCrypto.current = null;
    };
  }, [reviewInputs]);


  // The prepared identity, said once: "Not changed", or only the fields that
  // differ from the current identity, each with its current value.
  const keysAndAuthorities = useMemo(() => {
    if (!preparedIdentity?.primaryaddresses) return null;
    const current = subjectIdentity.identity || {};
    const authorityName = address => friendlyNames[address] || address;
    const fields = [
      {
        label: 'Identity address',
        current: current.identityaddress,
        after: preparedIdentity.identityaddress || preparedIdentity.name,
        copy: true,
      },
      {
        label: 'Required signatures',
        current: current.minimumsignatures == null ? null : String(current.minimumsignatures),
        after: String(preparedIdentity.minimumsignatures),
      },
      {
        label: 'Primary addresses',
        current: Array.isArray(current.primaryaddresses) ? current.primaryaddresses.join('\n') : null,
        after: preparedIdentity.primaryaddresses.join('\n'),
      },
      {
        label: 'Revocation authority',
        current: current.revocationauthority ? authorityName(current.revocationauthority) : null,
        after: authorityName(preparedIdentity.revocationauthority),
      },
      {
        label: 'Recovery authority',
        current: current.recoveryauthority ? authorityName(current.recoveryauthority) : null,
        after: authorityName(preparedIdentity.recoveryauthority),
      },
    ];
    const changed = fields.filter(field => field.current !== field.after);
    return {
      changed,
      fields,
      summary: changed.length === 0 ? 'Not changed' : 'Changed',
    };
  }, [friendlyNames, preparedIdentity, subjectIdentity]);

  // --- Fiat fee display ---
  const rates = useObjectSelector(state => state.ledger.rates);
  const displayCurrency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );

  // The fee is paid in the requested currency. Its rate is known before the
  // fee, so the loading skeleton can reserve the money line too.
  const getFeeRate = useCallback(currencyId => {
    if (!currencyId) return null;

    // Find the coin ID for the fee currency to look up rate
    let feeCoinId = null;
    try {
      const coin = CoinDirectory.findCoinObj(currencyId);
      if (coin) feeCoinId = coin.id;
    } catch (e) {}

    if (!feeCoinId) return null;

    return rates?.[WYRE_SERVICE]?.[feeCoinId]?.[displayCurrency] != null
      ? rates[WYRE_SERVICE][feeCoinId][displayCurrency]
      : rates?.[GENERAL]?.[feeCoinId]?.[displayCurrency] != null
        ? rates[GENERAL][feeCoinId][displayCurrency]
        : null;
  }, [rates, displayCurrency]);
  const feeRateKnown = !!getFeeRate(requestedCurrency);

  const feeFiatDisplay = useMemo(() => {
    if (!fee || !feeCurrency) return null;

    const rate = getFeeRate(feeCurrency);

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
  }, [fee, feeCurrency, getFeeRate, displayCurrency]);

  useEffect(() => {
    if (typeof onBroadcastingChange === 'function') {
      onBroadcastingChange(
        completionSheetStage !== COMPLETION_SHEET_STAGE.IDLE,
      );
    }
  }, [completionSheetStage, onBroadcastingChange]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      preparationSequence.current += 1;
      preparationController.current?.abort();
      activeCrypto.current?.dispose();
      activeCrypto.current = null;
    },
    [],
  );

  useEffect(
    () => () => {
      if (typeof onBroadcastingChange === 'function') {
        onBroadcastingChange(false);
      }
    },
    [onBroadcastingChange],
  );

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
    setFeeError(null);
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
      getUpdateIdentityFeeSats(updateIdentityTx.deltas, requestedCurrency);

      // The funded transaction can have a later expiry (and therefore unlock
      // height) than the preview. Display the identity verified from this tx.
      setPreparedStateChange(buildIdentityStateChange({
        currentIdentity: subjectIdentity.identity,
        updatedIdentity: identityToDisplayJson(updateIdentityTx.identity),
        chainHeight: reviewedHeight,
        secondsPerBlock: coinObj.seconds_per_block,
      }));
      setFee(satsToCoins(BigNumber(approval.nativeFee)).toString());
      setFeeCurrency(requestedCurrency);
      setPreparedUpdate({built: updateIdentityTx, context, reviewInputs});
    } catch (e) {
      if (!mountedRef.current || sequence !== preparationSequence.current || currentReviewInputs.current !== reviewInputs) return;
      setSelectedSource(null);
      if (!showFundRawTransactionErrorAlert(e)) {
        setFeeError(getFeeErrorMessage(e));
      }
    } finally {
      crypto?.dispose();
      if (activeCrypto.current === crypto) activeCrypto.current = null;
      if (mountedRef.current && sequence === preparationSequence.current && currentReviewInputs.current === reviewInputs) setCalculating(false);
    }
  }, [details, subjectIdTxHex, subjectIdentity, requestIsTestnet, hasEncryptedKeys, coinObj, requestedCurrency, signerIdentityAddress, reviewInputs]);

  const deliverPendingResponse = useCallback(async (responseToDeliver = pendingResponse) => {
    if (!responseToDeliver || !next || delivering.current) return;
    delivering.current = true;

    setCompletionError(null);
    setBroadcastError(null);
    setCompletionDeliveryInfo(identityUpdateDeliveryInfo || null);
    setCompletionSheetStage(COMPLETION_SHEET_STAGE.DELIVERING);

    try {
      if (typeof deliverIdentityUpdateResponse === 'function') {
        const deliveryResult = await deliverIdentityUpdateResponse(
          responseToDeliver,
          [detailIndex],
        );

        if (deliveryResult?.skippedInlineDelivery) {
          setPendingResponse(null);
          setBroadcastTxid(null);
          setCompletionSheetStage(COMPLETION_SHEET_STAGE.IDLE);
          return;
        }

        setCompletionDeliveryInfo(deliveryResult || identityUpdateDeliveryInfo);

        if (deliveryResult?.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
          setCompletionSheetStage(COMPLETION_SHEET_STAGE.SUCCESS);
        }

        return;
      }

      setCompletionSheetStage(COMPLETION_SHEET_STAGE.IDLE);
      await next(responseToDeliver, [detailIndex], {
        autoDeliverOnComplete: true,
      });
    } catch (e) {
      setCompletionDeliveryInfo(e?.deliveryInfo || identityUpdateDeliveryInfo);
      setCompletionError(e);
      setCompletionSheetStage(COMPLETION_SHEET_STAGE.ERROR);
    } finally {
      delivering.current = false;
    }
  }, [
    deliverIdentityUpdateResponse,
    detailIndex,
    identityUpdateDeliveryInfo,
    next,
    pendingResponse,
  ]);

  const handleUpdate = useCallback(async () => {
    if (completedReview.current === reviewInputs || sending.current || !preparedUpdate || !hasFee) return;
    sending.current = preparedUpdate;
    if (typeof onBroadcastingChange === 'function') {
      onBroadcastingChange(true);
    }
    setBroadcastTxid(null);
    setPendingResponse(null);
    setCompletionError(null);
    setBroadcastError(null);
    setCompletionDeliveryInfo(null);
    setCompletionSheetStage(COMPLETION_SHEET_STAGE.BROADCASTING);
    let resultTxid = null;

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
      resultTxid = result.txid;
      if (!mountedRef.current || preparedUpdate.context.signal?.aborted || currentReviewInputs.current !== preparedUpdate.reviewInputs) return;
      completedReview.current = preparedUpdate.reviewInputs;

      // Build response (mirrored from IdentityUpdatePaymentConfiguration)
      const responseDetail = new IdentityUpdateResponseOrdinalVDXFObject({
        data: new IdentityUpdateResponseDetails({
          requestID: details.containsRequestID() ? details.requestID : undefined,
          txid: resultTxid
            ? Buffer.from(resultTxid, 'hex').reverse()
            : undefined,
        }),
      });

      if (baseResponse.details == null) baseResponse.details = [];
      baseResponse.details = [...baseResponse.details, responseDetail];

      baseResponse.setFlags();

      if (next) {
        setBroadcastTxid(resultTxid);
        setPendingResponse(baseResponse);
        if (identityUpdateDeliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) {
          await deliverPendingResponse(baseResponse);
        } else {
          setCompletionSheetStage(COMPLETION_SHEET_STAGE.READY);
        }
      } else {
        cancel();
      }
    } catch (e) {
      if (resultTxid || e.submitted || e.code === 'BROADCAST_UNKNOWN') {
        completedReview.current = preparedUpdate.reviewInputs;
        resultTxid = resultTxid || e.txid;
      }
      if (!mountedRef.current || preparedUpdate.context.signal?.aborted || currentReviewInputs.current !== preparedUpdate.reviewInputs) return;
      setBroadcastTxid(resultTxid);
      setBroadcastError(getBroadcastError(e, resultTxid));
      setCompletionSheetStage(COMPLETION_SHEET_STAGE.ERROR);
    } finally {
      if (sending.current === preparedUpdate) sending.current = null;
    }
  }, [selectedSource, preparedUpdate, hasFee, details, responseBufferString, coinObj, signerIdentityAddress, next, detailIndex, cancel, onBroadcastingChange, reviewInputs, identityUpdateDeliveryInfo, deliverPendingResponse]);

  // Back to the confirm step, as after the earlier error alert.
  const closeBroadcastError = useCallback(() => {
    if (completedReview.current === reviewInputs) {
      cancel();
      return;
    }
    if (typeof onBroadcastingChange === 'function') {
      onBroadcastingChange(false);
    }
    setCompletionSheetStage(COMPLETION_SHEET_STAGE.IDLE);
  }, [onBroadcastingChange, cancel, reviewInputs]);

  const handleCompleteUpdate = useCallback(() => {
    deliverPendingResponse();
  }, [deliverPendingResponse]);

  const handleRetryDelivery = useCallback(() => {
    deliverPendingResponse();
  }, [deliverPendingResponse]);

  const handleLeaveWithoutSending = useCallback(() => {
    if (typeof completeIdentityUpdateWithoutDelivery === 'function') {
      completeIdentityUpdateWithoutDelivery();
      return;
    }

    cancel();
  }, [cancel, completeIdentityUpdateWithoutDelivery]);

  const handlePrimaryAction = useCallback(() => {
    if (!selectedSource) {
      setSourceSheetVisible(true);
      return;
    }

    if (hasFee && !calculating) {
      return handleUpdate();
    }
  }, [calculating, handleUpdate, hasFee, selectedSource]);

  const primaryActionLabel = selectedSource
    ? 'Slide to update'
    : 'Select payment source';
  const primaryActionDisabled = !!selectedSource && !hasFee;
  const recapRows = [
    highRiskCount > 0
      ? {label: 'High-risk changes', value: highRiskCount}
      : null,
    contentCount > 0 ? {label: 'Content changes', value: contentCount} : null,
  ].filter(Boolean);
  const selectedSourceDisplay = getSourceDisplayName(selectedSource);
  const selectedSourceDisplayIsAddress =
    isAddressLikeSourceName(selectedSourceDisplay);
  const completionSheetVisible =
    completionSheetStage !== COMPLETION_SHEET_STAGE.IDLE;
  const effectiveDeliveryInfo =
    completionDeliveryInfo || identityUpdateDeliveryInfo;
  const completionIsBroadcasting =
    completionSheetStage === COMPLETION_SHEET_STAGE.BROADCASTING;
  const completionIsReady =
    completionSheetStage === COMPLETION_SHEET_STAGE.READY;
  const completionIsDelivering =
    completionSheetStage === COMPLETION_SHEET_STAGE.DELIVERING;
  const completionIsSuccess =
    completionSheetStage === COMPLETION_SHEET_STAGE.SUCCESS;
  const completionIsError =
    completionSheetStage === COMPLETION_SHEET_STAGE.ERROR;
  const closeCompletion = () => {
    if (completionIsBroadcasting || completionIsDelivering) return;
    if (completionIsReady) handleCompleteUpdate();
    else if (completionIsBroadcastError) closeBroadcastError();
    else handleLeaveWithoutSending();
  };
  useRequestBackHandler(closeCompletion,
    completionIsBroadcasting || completionIsDelivering, 2, completionSheetVisible);
  const completionIsBroadcastError = completionIsError && broadcastError != null;
  const completionTitle = completionIsBroadcasting
    ? 'Broadcasting update'
    : completionIsReady
      ? 'Identity update broadcast'
      : completionIsDelivering
        ? getDeliveryTitle(effectiveDeliveryInfo)
        : completionIsSuccess
          ? 'Response sent'
          : completionIsBroadcastError
            ? broadcastError.title
            : 'Response not sent';
  const completionMessage = completionIsBroadcasting
    ? 'This may take a moment.'
    : completionIsBroadcastError
      ? broadcastError.message
      : completionIsError
        ? getDeliveryErrorMessage(completionError, effectiveDeliveryInfo)
        : null;
  const showLoadingAnimation = completionIsBroadcasting || completionIsDelivering;
  const showSuccessAnimation = completionIsReady || completionIsSuccess;
  const showTxidCard =
    !completionIsBroadcasting && !completionIsDelivering && !!broadcastTxid;
  const redirectCompleteHint =
    completionIsReady &&
    effectiveDeliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT &&
    effectiveDeliveryInfo?.destinationHost
      ? `You'll return to ${effectiveDeliveryInfo.destinationHost} when you tap Complete.`
      : null;

  // --- Always render confirm layout ---
  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={parentStyles.scrollView}
        contentContainerStyle={[parentStyles.scrollContent, {paddingTop: 4}]}
        showsVerticalScrollIndicator={false}
      >
        {requestCard}

        <IdentityStateChangeCard change={preparedStateChange || identityStateChange} detailed />

        {keysAndAuthorities && (
          <TouchableOpacity
            accessibilityHint="Opens the keys and authorities after this update"
            accessibilityLabel={`Keys and authorities, ${keysAndAuthorities.summary}`}
            accessibilityRole="button"
            activeOpacity={0.74}
            onPress={() => setKeysSheetVisible(true)}
            style={localStyles.keysRow}>
            <Text style={localStyles.feeLabel}>Keys and authorities</Text>
            <View style={localStyles.keysValueGroup}>
              <Text numberOfLines={1} style={localStyles.keysValue}>
                {keysAndAuthorities.summary}
              </Text>
              <ChevronRight color={theme.colors.textSubtle} size={20} />
            </View>
          </TouchableOpacity>
        )}

        {/* Fee */}
        <View style={localStyles.feeCard}>
          <Text style={localStyles.feeLabel}>Transaction fee</Text>
          <View
            style={[
              localStyles.feeContent,
              // A fee error can run to several lines.
              feeError && !calculating && !hasFee && {
                height: 'auto',
                minHeight: 38,
              },
            ]}>
            {calculating ? (
              // Shaped like the fee value it replaces, so the row keeps its
              // height and the value appears in the same place.
              <SkeletonLoader
                key="fee-loading"
                accessibilityLabel="Calculating transaction fee"
                style={localStyles.feeSkeleton}>
                <View style={localStyles.feeSkeletonLine}>
                  <SkeletonBlock width={96} height={14} radius={4} />
                </View>
                {feeRateKnown && (
                  <View style={localStyles.feeSkeletonFiatLine}>
                    <SkeletonBlock width={56} height={12} radius={4} />
                  </View>
                )}
              </SkeletonLoader>
            ) : hasFee ? (
              <View key="fee-value">
                <Text style={localStyles.feeValue}>{fee} {feeCurrencyDisplay}</Text>
                {feeFiatDisplay && (
                  <Text style={localStyles.feeFiat}>{feeFiatDisplay}</Text>
                )}
              </View>
            ) : feeError ? (
              <Text
                accessibilityLiveRegion="polite"
                accessibilityRole="alert"
                style={[
                  theme.typography.bodySm,
                  {color: theme.colors.danger},
                ]}>
                {feeError}
              </Text>
            ) : (
              <Text style={localStyles.feePlaceholder}>
                —
              </Text>
            )}
          </View>
        </View>

        {/* Recap */}
        <View style={localStyles.recapCard}>
          {recapRows.map((row, index) => (
            <View
              key={row.label}
              style={[
                localStyles.recapRow,
                index > 0 && localStyles.recapRowDivider,
              ]}>
              <Text style={localStyles.recapLabel}>{row.label}</Text>
              <Text style={localStyles.recapValue} numberOfLines={1}>
                {row.value}
              </Text>
            </View>
          ))}
          {hasEncryptedKeys && (
            <EncryptedCredentialNote
              darkMode={theme.isDark}
              style={localStyles.encryptedKeyRecapNote}
            />
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <SafeBottomActionStack
        gap={10}
        horizontalSpacing={24}
        style={parentStyles.footer}>
        {selectedSource && (
          <View>
            <Text style={localStyles.selectedSourceLabel}>Paying from</Text>
            <TouchableOpacity
              accessibilityHint="Open payment source options"
              accessibilityLabel={`Selected payment source ${selectedSourceDisplay}`}
              accessibilityRole="button"
              activeOpacity={0.78}
              onPress={() => setSourceSheetVisible(true)}
              style={localStyles.selectedSourceCard}>
              <View style={localStyles.selectedSourceText}>
                <Text
                  numberOfLines={1}
                  style={[
                    localStyles.selectedSourceName,
                    selectedSourceDisplayIsAddress &&
                      localStyles.selectedSourceNameMono,
                  ]}>
                  {selectedSourceDisplay}
                </Text>
              </View>
              <View style={localStyles.selectedSourceCheck}>
                <Check color={theme.colors.successText} size={22} strokeWidth={2.5} />
              </View>
            </TouchableOpacity>
          </View>
        )}
        {selectedSource ? (
          <SlideToConfirm disabled={primaryActionDisabled}
            loading={completionIsBroadcasting || completionIsDelivering}
            loadingText="Updating…"
            label="Slide to update" onPress={handlePrimaryAction} />
        ) : (
          <AppButton
            disabled={primaryActionDisabled}
            height={56}
            onPress={handlePrimaryAction}
            themeMode={theme.mode}
            variant="primary">
            {primaryActionLabel}
          </AppButton>
        )}
      </SafeBottomActionStack>

      <InfoSheet
        visible={keysSheetVisible && keysAndAuthorities != null}
        title="Keys and authorities"
        onClose={() => setKeysSheetVisible(false)}>
        {keysAndAuthorities?.changed.length > 0
          ? keysAndAuthorities.changed.map(field => (
            <InfoSheetSection
              key={field.label}
              title={field.label}
              rows={[
                {label: 'Current', value: field.current || 'None'},
                {label: 'After update', value: field.after || 'None'},
              ]}
            />
          ))
          : keysAndAuthorities?.fields.map(field => (
            <InfoSheetRow
              key={field.label}
              label={field.label}
              value={field.after}
              copy={field.copy}
            />
          ))}
      </InfoSheet>

      <BottomSheetModal
        visible={sourceSheetVisible}
        onClose={() => setSourceSheetVisible(false)}
        maxHeight="70%">
        <View style={localStyles.sheetBody}>
          <Text style={localStyles.sheetTitle}>Select payment source</Text>
          <ScrollView
            alwaysBounceVertical={false}
            bounces={false}
            contentContainerStyle={localStyles.sheetListContainer}
            showsVerticalScrollIndicator={false}>
            {paymentSources.length === 0 ? (
              <View style={localStyles.sheetEmpty}>
                <Text style={localStyles.sheetEmptyText}>
                  No wallets with sufficient balance found.
                </Text>
              </View>
            ) : (
              paymentSources.map((source, index) => {
                const selected =
                  selectedSource &&
                  selectedSource.coinObj.id === source.coinObj.id &&
                  selectedSource.wallet.id === source.wallet.id;
                const sourceDisplayName = getSourceDisplayName(source);
                const sourceDisplayNameIsAddress =
                  isAddressLikeSourceName(sourceDisplayName);

                return (
                  <TouchableOpacity
                    key={`${source.coinObj.id}-${source.wallet.id}-${index}`}
                    style={[
                      localStyles.walletCard,
                      selected && localStyles.walletCardSelected,
                    ]}
                    onPress={() => handleSelectSource(source)}
                    activeOpacity={0.74}>
                    <View style={localStyles.walletTextSection}>
                      <Text
                        style={[
                          localStyles.walletNameText,
                          sourceDisplayNameIsAddress &&
                            localStyles.walletNameMonoText,
                        ]}
                        numberOfLines={1}>
                        {sourceDisplayName}
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
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        closeDisabled
        contentContainerStyle={localStyles.broadcastSheet}
        maxHeight={IDENTITY_UPDATE_COMPLETION_SHEET_HEIGHT}
        onClose={() => {}}
        onRequestBack={closeCompletion}
        visible={completionSheetVisible}>
        <View style={localStyles.broadcastSheetBody}>
          {(showLoadingAnimation || showSuccessAnimation) && (
            <View
              accessibilityLabel={
                showLoadingAnimation
                  ? completionTitle
                  : undefined
              }
              accessibilityRole={showLoadingAnimation ? 'progressbar' : undefined}
              style={localStyles.broadcastVisualSlot}>
              {showLoadingAnimation ? (
                <LottieView
                  autoPlay
                  loop
                  source={require('../../../../animations/loading_7bars.json')}
                  style={localStyles.broadcastLoadingAnimation}
                />
              ) : (
                <AnimatedSuccessCheckmark
                  style={localStyles.broadcastSuccessAnimation}
                />
              )}
            </View>
          )}
          <Text style={localStyles.broadcastTitle}>
            {completionTitle}
          </Text>
          {completionMessage && (
            <Text style={localStyles.broadcastMessage}>
              {completionMessage}
            </Text>
          )}
          {showTxidCard && (
            <View style={localStyles.txidCard}>
              <Text style={localStyles.txidLabel}>
                Identity update txid
              </Text>
              <View style={localStyles.txidRow}>
                <Text
                  numberOfLines={1}
                  selectable
                  style={localStyles.txidValue}>
                  {truncateTxid(broadcastTxid)}
                </Text>
                <CopyAction
                  accessibilityLabel="Copy transaction ID"
                  copiedAccessibilityLabel="Transaction ID copied"
                  color={theme.colors.textSubtle}
                  copiedColor={theme.colors.success}
                  style={localStyles.txidCopyButton}
                  value={broadcastTxid}
                />
              </View>
            </View>
          )}
          {completionIsReady && (
            <>
              {redirectCompleteHint && (
                <Text style={localStyles.redirectCompleteHint}>
                  {redirectCompleteHint}
                </Text>
              )}
              <AppButton
                height={52}
                onPress={handleCompleteUpdate}
                style={localStyles.completeButton}
                themeMode={theme.mode}
                variant="primary">
                Complete
              </AppButton>
            </>
          )}
          {completionIsSuccess && (
            <AppButton
              height={52}
              onPress={handleLeaveWithoutSending}
              style={localStyles.completeButton}
              themeMode={theme.mode}
              variant="primary">
              Done
            </AppButton>
          )}
          {completionIsBroadcastError && (
            <View style={localStyles.deliveryActions}>
              {!broadcastTxid && (
                <AppButton
                  height={52}
                  onPress={handleUpdate}
                  style={localStyles.deliveryActionButton}
                  themeMode={theme.mode}
                  variant="primary">
                  Try again
                </AppButton>
              )}
              <AppButton
                height={52}
                onPress={closeBroadcastError}
                style={localStyles.deliveryActionButton}
                themeMode={theme.mode}
                variant={broadcastTxid ? 'primary' : 'secondary'}>
                Close
              </AppButton>
            </View>
          )}
          {completionIsError && !completionIsBroadcastError && (
            <View style={localStyles.deliveryActions}>
              {getGenericResponseDeliveryFailure(completionError).canRetry && <AppButton
                height={52}
                onPress={handleRetryDelivery}
                style={localStyles.deliveryActionButton}
                themeMode={theme.mode}
                variant="primary">
                Try again
              </AppButton>}
              <AppButton
                height={52}
                onPress={handleLeaveWithoutSending}
                style={localStyles.deliveryActionButton}
                themeMode={theme.mode}
                variant={getGenericResponseDeliveryFailure(completionError).canRetry ? 'secondary' : 'primary'}>
                Leave without sending
              </AppButton>
            </View>
          )}
        </View>
      </BottomSheetModal>
    </View>
  );
};

export default ConfirmPayStep;
