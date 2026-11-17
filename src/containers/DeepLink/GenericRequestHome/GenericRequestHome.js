import store from '../../../store';
import {getAppEncryptionSessionKey} from '../../../utils/deeplink/appEncryptionSession';
/*
  GenericRequestHome 
  - Coordinates generic request detail handlers, chooses the matching deeplink
    screen, and forwards completed responses through the request flow.
*/
import React, {useMemo, useCallback, useEffect, useRef, useState} from 'react';
import {Linking, StyleSheet, unstable_batchedUpdates, View} from 'react-native';
import { Text } from 'react-native-paper';
import OpenInAnotherWalletAction from '../components/RequestReview/OpenInAnotherWalletAction';
import {useSelector} from 'react-redux';
import {
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import LottieView from 'lottie-react-native';
import { primitives } from "verusid-ts-client"
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import AnimatedSuccessCheckmark from '../../../components/AnimatedSuccessCheckmark';
import AppButton from '../../../components/AppButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import NeutralCheckMark from '../../../components/NeutralCheckMark';
import SheetScrollView from '../../../components/SheetScrollView';
import GenericRequestLoading, {
  GENERIC_REQUEST_LOADING_STEPS,
} from '../GenericRequestLoading';
import {
  AUTHENTICATION_REQUEST_VDXF_KEY,
  AUTHENTICATION_RESPONSE_VDXF_KEY,
  APP_ENCRYPTION_REQUEST_VDXF_KEY,
  DEEPLINK_PROTOCOL_URL_STRING,
  IDENTITY_UPDATE_REQUEST_VDXF_KEY,
  PROVISION_IDENTITY_DETAILS_VDXF_KEY,
  CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY,
  DATA_PACKET_REQUEST_VDXF_KEY,
  SPENDABLE_KEY_DETAILS_VDXF_KEY,
  USER_DATA_REQUEST_VDXF_KEY,
  VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID,
  VERUSPAY_INVOICE_DETAILS_VDXF_KEY,
} from 'verus-typescript-primitives';
import InvoiceInfo from '../InvoiceInfo/InvoiceInfo';
import { handleVerusPayInvoiceDetailsVDXFObject } from '../../../utils/deeplink/handlers/verusPayInvoiceDetailsHandler';
import { handleAuthenticationRequestDetailsVDXFObject } from '../../../utils/deeplink/handlers/authenticationRequestDetailsHandler';
import { handleIdentityUpdateRequestDetailsVDXFObject } from '../../../utils/deeplink/handlers/identityUpdateRequestDetailsHandler';
import { handleProvisionIdentityDetailsVDXFObject } from '../../../utils/deeplink/handlers/provisionIdentityDetailsHandler';
import { handleAppEncryptionRequestVDXFObject } from '../../../utils/deeplink/handlers/appEncryptionRequestHandler';
import { handleCreateWalletBackupDetailsVDXFObject } from '../../../utils/deeplink/handlers/createWalletBackupDetailsHandler';
import { handleSpendableKeyDetailsVDXFObject } from '../../../utils/deeplink/handlers/spendableKeyDetailsHandler';
import { handleUserDataRequestVDXFObject } from '../../../utils/deeplink/handlers/userDataRequestHandler';
import { handleDataPacketRequestVDXFObject } from '../../../utils/deeplink/handlers/dataPacketRequestHandler';
import { createAlert } from '../../../actions/actions/alert/dispatchers/alert';
import AuthenticationRequestInfo from '../AuthenticationRequestInfo/AuthenticationRequestInfo';
import IdentityUpdateRequestInfo from '../IdentityUpdateRequestInfo/IdentityUpdateRequestInfo';
import AppEncryptionRequestInfo from '../AppEncryptionRequestInfo/AppEncryptionRequestInfo';
import WalletBackupRequestInfo from '../WalletBackupRequestInfo/WalletBackupRequestInfo';
import SpendableKeyRequestInfo from '../SpendableKeyRequestInfo/SpendableKeyRequestInfo';
import UserDataRequestInfo from '../UserDataRequestInfo/UserDataRequestInfo';
import DataPacketRequestInfo from '../DataPacketRequestInfo/DataPacketRequestInfo';
import SelectionSheet, {SelectionRow} from '../../../components/SelectionSheet';
import useSheetDismissal from '../../../components/useSheetDismissal';
import DeepLinkVerusIdDetailsSheet from '../components/RequestReview/DeepLinkVerusIdDetailsSheet';
import { isDeeplinkHandlerInstalled } from '../../../utils/deeplink/isDeeplinkHandlerInstalled';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {markPendingDeeplinkComplete} from '../../../utils/deeplink/pendingDeeplinkStorage';
import {
  completeGenericResponseDelivery,
  createGenericResponseDelivery,
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericRequestDeliveryInfo,
  getGenericResponseDeliveryFailure,
  isLocalResponsePostRejection,
} from '../../../utils/deeplink/genericRequestDelivery';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  alignGenericResponseNetwork,
  createGenericRequestDeliverySingleFlight,
  GENERIC_REQUEST_COMPLETION_ACTIONS,
  getGenericRequestCompletionAction,
} from './genericRequestCompletionFlow';
import {getContinueToNextStepLabel} from './genericRequestNextStep';
import {
  createExperimentalRequestDisabledError,
  isExperimentalGenericRequestDetailKey,
  isExperimentalGenericRequestsEnabled,
} from '../../../utils/deeplink/experimentalDeeplinks';
import {getGenericRequestRejection} from '../../../utils/deeplink/genericRequestRejection';

import {useRequestBackHandler} from '../useRequestNavigation';
import {exitRequest} from '../exitRequest';

const AUTO_DELIVERY_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

const POST_SUCCESS_DELAY_MS = 900;
const AUTO_DELIVERY_SHEET_HEIGHT = 280;
const APPROVAL_RESULT_SHEET_HEIGHT = 400;

const autoDeliverySheetStyles = StyleSheet.create({
  sheet: {
    height: AUTO_DELIVERY_SHEET_HEIGHT,
    paddingTop: 0,
  },
  approvalResultSheet: {
    height: APPROVAL_RESULT_SHEET_HEIGHT,
    paddingTop: 0,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 8,
  },
  visualSlot: {
    height: 84,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingAnimation: {
    width: 96,
    height: 70,
  },
  successAnimation: {
    width: 84,
    height: 84,
  },
  summaryScroll: {
    alignSelf: 'stretch',
    flexShrink: 1,
  },
  summaryContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    letterSpacing: 0,
    lineHeight: 20,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 8,
  },
});

const otherAppStyles = StyleSheet.create({
  action: {
    position: 'absolute', zIndex: 1,
    height: 48, justifyContent: 'center',
  },
});

// Hands the same request to another installed wallet app. Valu Mobile is the
// only alternative today.
const OpenInAnotherAppSheet = ({onClose, onOpenInValu, visible}) => {
  const dismissal = useSheetDismissal({visible, onClose});

  return (
    <SelectionSheet
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}
      subtitle="Continue this request in another wallet app."
      title="Open in another wallet"
      visible={visible}>
      <SelectionRow
        onPress={() => dismissal.dismiss(onOpenInValu)}
        title="Valu Mobile"
      />
    </SelectionSheet>
  );
};

const getAutoDeliverySheetTitle = ({
  destination,
  isError,
  isPost,
  isRedirect,
  isSuccess,
  isPreparing,
  successTitle,
}) => {
  if (isError) return 'Response not sent';
  if (isSuccess) {
    if (isPost) return successTitle || 'Response sent';
    return isRedirect ? 'Browser opened' : 'Nothing was sent';
  }
  if (isPreparing) return 'Preparing response';
  if (isRedirect) return `Returning to ${destination}`;
  if (isPost) return 'Sending response';

  return 'Completing request';
};

const getAutoDeliverySheetMessage = ({
  destination,
  error,
  isError,
  isPost,
  isRedirect,
  isSuccess,
  responseIdentityName,
  successMessage,
}) => {
  if (isError) {
    if (isLocalResponsePostRejection(error)) {
      return getGenericResponseDeliveryFailure(error).message;
    }
    if (error?.isResponsePostError) {
      // The title says that the response was not sent. Say what to check.
      // A host goes on its own line. A URL otherwise breaks after the scheme
      // ("http://" / "127.0.0.1:8787").
      const separator = destination === 'the requester' ? ' ' : '\n';
      return `Check that${separator}${destination} is online.`;
    }

    return getGenericResponseDeliveryFailure(error).message;
  }

  if (isSuccess) {
    if (isPost) {
      return successMessage || (responseIdentityName ? `Responded as ${responseIdentityName}.` : null);
    }
    return isRedirect
      ? 'The response was handed to your browser. Delivery is not confirmed here.'
      : null;
  }

  if (isPost) {
    return null;
  }

  if (isRedirect) {
    return null;
  }

  return 'Finishing this request.';
};

const AutoDeliverySheetContent = ({
  deliveryInfo,
  error,
  onLeaveWithoutSending,
  onRetry,
  status,
  phase,
  onDone,
  approvalResultTitle,
  approvalResultMessage,
  responseIdentityName,
}) => {
  const theme = useOnboardingTheme();
  const destination = deliveryInfo?.destinationHost || 'the requester';
  const isPost = deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.POST;
  const isRedirect =
    deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.REDIRECT;
  const isLoading = status === AUTO_DELIVERY_STATUS.LOADING;
  const isSuccess = status === AUTO_DELIVERY_STATUS.SUCCESS;
  const isError = status === AUTO_DELIVERY_STATUS.ERROR;
  const isApprovalResult = isSuccess && isPost && !!approvalResultTitle;

  const title = getAutoDeliverySheetTitle({
    destination,
    isError,
    isPost,
    isRedirect,
    isSuccess,
    isPreparing: isLoading && phase === 'preparing',
    successTitle: approvalResultTitle,
  });
  const message = getAutoDeliverySheetMessage({
    destination,
    error,
    isError,
    isPost,
    isRedirect,
    isSuccess,
    responseIdentityName: isApprovalResult ? responseIdentityName : null,
    successMessage: approvalResultMessage,
  });
  const summary = (
    <>
      {(isSuccess || isLoading) && (
        <View style={autoDeliverySheetStyles.visualSlot}>
          {isSuccess && isPost ? (
            <AnimatedSuccessCheckmark
              style={autoDeliverySheetStyles.successAnimation}
            />
          ) : isSuccess ? (
            // Redirect and no-response outcomes confirm no delivery.
            <NeutralCheckMark />
          ) : (
            <LottieView
              autoPlay
              loop
              source={require('../../../animations/loading_7bars.json')}
              style={autoDeliverySheetStyles.loadingAnimation}
            />
          )}
        </View>
      )}
      <Text
        accessibilityRole={isLoading ? 'progressbar' : undefined}
        style={[
          theme.typography.titleSheet,
          autoDeliverySheetStyles.title,
          {color: theme.colors.textPrimary},
        ]}>
        {title}
      </Text>
      {message && (
        <Text
          style={[
            autoDeliverySheetStyles.message,
            {color: theme.colors.textSecondary},
          ]}>
          {message}
        </Text>
      )}
    </>
  );
  return (
    <View style={autoDeliverySheetStyles.body}>
      {isApprovalResult ? (
        <SheetScrollView
          style={autoDeliverySheetStyles.summaryScroll}
          contentContainerStyle={autoDeliverySheetStyles.summaryContent}>
          {summary}
        </SheetScrollView>
      ) : (
        summary
      )}
      {isError && (
        <View style={autoDeliverySheetStyles.actions}>
          {getGenericResponseDeliveryFailure(error).canRetry && <AppButton height={52} onPress={onRetry} variant="primary">
            Try again
          </AppButton>}
          <AppButton
            height={52}
            onPress={onLeaveWithoutSending}
            variant={getGenericResponseDeliveryFailure(error).canRetry ? 'secondary' : 'primary'}>
            Leave without sending
          </AppButton>
        </View>
      )}
      {isSuccess && (!isPost || isApprovalResult) && (
        <View style={autoDeliverySheetStyles.actions}>
          <AppButton height={52} onPress={onDone} variant="primary">Done</AppButton>
        </View>
      )}
    </View>
  );
};

const AutoDeliverySheet = ({
  deliveryInfo,
  error,
  onLeaveWithoutSending,
  onRetry,
  status,
  phase,
  onDone,
  approvalResultTitle,
  approvalResultMessage,
  responseIdentityName,
}) => {
  const visible = status !== AUTO_DELIVERY_STATUS.IDLE;
  const isApprovalResult =
    status === AUTO_DELIVERY_STATUS.SUCCESS &&
    deliveryInfo?.type === GENERIC_REQUEST_DELIVERY_TYPES.POST &&
    !!approvalResultTitle;

  return (
    <BottomSheetModal
      closeDisabled
      contentContainerStyle={
        isApprovalResult
          ? autoDeliverySheetStyles.approvalResultSheet
          : autoDeliverySheetStyles.sheet
      }
      maxHeight={isApprovalResult ? '78%' : AUTO_DELIVERY_SHEET_HEIGHT}
      onClose={() => {}}
      onRequestBack={() => {
        if (status !== AUTO_DELIVERY_STATUS.LOADING) onDone();
      }}
      visible={visible}>
      <AutoDeliverySheetContent
        deliveryInfo={deliveryInfo}
        phase={phase}
        onDone={onDone}
        error={error}
        onLeaveWithoutSending={onLeaveWithoutSending}
        onRetry={onRetry}
        status={status}
        approvalResultTitle={approvalResultTitle}
        approvalResultMessage={approvalResultMessage}
        responseIdentityName={responseIdentityName}
      />
    </BottomSheetModal>
  );
};

const GenericRequestSession = props => {
  const active = useRef(true);
  const isActive = () => active.current && (
    props.appEncryptionSessionKey == null ||
    props.appEncryptionSessionKey === getAppEncryptionSessionKey(store.getState())
  );
  useEffect(() => () => {active.current = false;}, []);
  const {
    deeplinkData
  } = props;

  /**
   * @type {[GenericRequest, (GenericRequest) => {}]}
   */
  const [request, setRequest] = useState(null);
  const [response, setResponse] = useState(new primitives.GenericResponse());
  const responseRef = useRef(response);

  const [displayProps, setDisplayProps] = useState({});
  const [approvalResult, setApprovalResult] = useState(null);

  const [displayKey, setDisplayKey] = useState(null);
  const [requestError, setRequestError] = useState(null);

  const [detailIndex, setDetailIndex] = useState(0);

  const [invoiceHeaderVisible, setInvoiceHeaderVisible] = useState(false);
  const [valuInstalled, setValuInstalled] = useState(false);
  const [openInAnotherAppVisible, setOpenInAnotherAppVisible] = useState(false);
  const [verusIdSheet, setVerusIdSheet] = useState(null);
  const [autoDeliveryRequested, setAutoDeliveryRequested] = useState(false);
  const [autoDeliveryState, setAutoDeliveryState] = useState({
    status: AUTO_DELIVERY_STATUS.IDLE,
    deliveryInfo: null,
    error: null,
  });
  const [inlineDeliveryInProgress, setInlineDeliveryInProgress] =
    useState(false);
  const autoDeliverySingleFlightRef = useRef(null);
  const preparedAutoDeliveryRef = useRef(null);
  const paidInvoiceDeliveryRef = useRef(null);

  if (autoDeliverySingleFlightRef.current == null) {
    autoDeliverySingleFlightRef.current =
      createGenericRequestDeliverySingleFlight();
    preparedAutoDeliveryRef.current = createGenericResponseDelivery();
  }

  const autoDeliverySuccessTimeoutRef = useRef(null);
  const processGenerationRef = useRef(0);
  const passthrough = useSelector(state => state.deeplink.passthrough);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const hasAccounts = useSelector(
    state => state.authentication.accounts.length > 0,
  );
  const experimentalRequestsAllowed = useSelector(isExperimentalGenericRequestsEnabled);

  /**
   * @type {[number, (number) => {}]}
   */
  const [detailsProcessed, setDetailsProcessed] = useState(-1);

  /**
   * @type {[Array<number>, (Array<number>) => {}]}
   */
  const [processedDetailIndices, setProcessedDetailIndices] = useState([]);
  const cancelRequest = useCallback(() => {
    if (!isActive()) return;
    active.current = false;
    processGenerationRef.current += 1;
    props.cancel();
  }, [props.cancel]);

  const hasAuthenticationResponse = response.details?.some(
    detail =>
      detail.getIAddressKey() === AUTHENTICATION_RESPONSE_VDXF_KEY.vdxfid,
  );
  const sharedCredentialCount = approvalResult?.sharedCredentialCount || 0;
  const approvalResultMessage = sharedCredentialCount > 0
    ? `Shared ${sharedCredentialCount} ${sharedCredentialCount === 1 ? 'credential' : 'credentials'} with ${approvalResult?.requesterLabel || 'the requester'}.`
    : null;
  const approvalResultTitle = sharedCredentialCount > 0
    ? 'Credentials shared'
    : hasAuthenticationResponse
    ? `Signed in to ${approvalResult?.requesterLabel || 'the requester'}`
    : !approvalResult || !response.details?.length
    ? null
    : approvalResult.dataPacketSigned
    ? 'Data signed'
    : 'Response sent';

  /**
   * @type {Map<string, (GenericRequest, GenericResponse, number) => Promise<{
   *  displayProps?: { [key: string]: any };
   *  response: GenericResponse;
   *  handledIndices: Array<number>;
   * }>}
   */
  const detailHandlers = new Map();

  detailHandlers.set(VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid, handleVerusPayInvoiceDetailsVDXFObject);
  detailHandlers.set(AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid, handleAuthenticationRequestDetailsVDXFObject);
  detailHandlers.set(IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid, handleIdentityUpdateRequestDetailsVDXFObject);
  detailHandlers.set(PROVISION_IDENTITY_DETAILS_VDXF_KEY.vdxfid, handleProvisionIdentityDetailsVDXFObject);
  detailHandlers.set(APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid, handleAppEncryptionRequestVDXFObject);
  detailHandlers.set(CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid, handleCreateWalletBackupDetailsVDXFObject);
  detailHandlers.set(SPENDABLE_KEY_DETAILS_VDXF_KEY.vdxfid, handleSpendableKeyDetailsVDXFObject);
  detailHandlers.set(USER_DATA_REQUEST_VDXF_KEY.vdxfid, handleUserDataRequestVDXFObject);
  detailHandlers.set(DATA_PACKET_REQUEST_VDXF_KEY.vdxfid, handleDataPacketRequestVDXFObject);
  /**
   * Processes a detail in the request at a certain index
   * @param {number} index 
   */
  const processDetailAtIndex = async (index) => {
    const detail = request.getDetails(index);
    const currentResponse = responseRef.current;

    if (detail) {
      const iaddr = detail.getIAddressKey();

      if (
        !experimentalRequestsAllowed &&
        isExperimentalGenericRequestDetailKey(iaddr)
      ) {
        throw createExperimentalRequestDisabledError();
      }

      if (detailHandlers.has(iaddr)) {
        if (
          passthrough?.skipWalletBackupRequests &&
          iaddr === CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid
        ) {
          return {
            response: currentResponse,
            handledIndices: [index],
          };
        }

        setDetailIndex(index);
        return await detailHandlers.get(iaddr)(request, currentResponse, index);
      }
    } else throw new Error("Unable to find detail at index " + index);
  }

  const processNextDetail = async () => {
    const processGeneration = processGenerationRef.current + 1;
    processGenerationRef.current = processGeneration;
    const detailsLen = request.details.length;
    const numProcessed = processedDetailIndices.length;

    if (numProcessed < detailsLen) {
      for (let i = 0; i < request.details.length; i++) {
        if (!processedDetailIndices.includes(i)) {
          try {
            const res = await processDetailAtIndex(i);

            if (!isActive() || processGenerationRef.current !== processGeneration) return;

            const newIndices = [...processedDetailIndices];

            for (const processedIndex of res.handledIndices) {
              if (!processedDetailIndices.includes(processedIndex)) {
                newIndices.push(processedIndex);
              }
            }

            responseRef.current = res.response;
            setResponse(res.response);
            setProcessedDetailIndices(newIndices);

            if (res.displayProps) {
              setDisplayProps(res.displayProps)
              setDisplayKey(request.getDetails(i).getIAddressKey());
            } else {
              let newDetailsProcessed = detailsProcessed;

              for (const handledIndex of res.handledIndices) {
                if (!processedDetailIndices.includes(handledIndex)) {
                  newDetailsProcessed++;
                }
              }

              setDetailsProcessed(newDetailsProcessed)
            }

            return;
          } catch (e) {
            if (!isActive() || processGenerationRef.current !== processGeneration) return;

            console.warn(e)
            // Stop here: later details must not run past a failed one.
            setRequestError(
              getGenericRequestRejection(e, {
                requestIsTestnet: request.isTestnet(),
              }),
            );
            return;
          }
        }
      }
    }
  }

  const completeRequest = useCallback(() => {
    processGenerationRef.current += 1;
    props.finishRequest(() =>
      exitRequest(props.navigation, signedIn, hasAccounts),
    );
  }, [hasAccounts, props.finishRequest, props.navigation, signedIn]);

  useRequestBackHandler(
    autoDeliveryState.status === AUTO_DELIVERY_STATUS.IDLE
      ? cancelRequest
      : completeRequest,
    props.loading ||
      autoDeliveryState.status === AUTO_DELIVERY_STATUS.LOADING,
    autoDeliveryState.status === AUTO_DELIVERY_STATUS.IDLE ? 0 : 3,
  );

  // Read the passthrough when the request completes. A dependency on it would
  // re-run the completion effect below, which re-opens the current detail,
  // each time a screen saves a choice there (the NFC gift backup box).
  const passthroughRef = useRef(passthrough);
  passthroughRef.current = passthrough;

  const markSavedPendingRequestComplete = useCallback(async () => {
    const pendingRequestId =
      passthroughRef.current?.pendingDeeplinkId ||
      passthroughRef.current?.pendingProvisioningDeeplinkId;

    if (pendingRequestId) {
      try {
        await markPendingDeeplinkComplete(pendingRequestId);
      } catch (e) {
        console.warn('Unable to mark pending deeplink complete', e);
      }
    }
  }, []);

  const runAutoDelivery = useCallback(async () => {
    if (!isActive() || request == null) return;
    if (autoDeliveryState.status === AUTO_DELIVERY_STATUS.LOADING) return;
    const generation = processGenerationRef.current;

    const requestBufferString = request.toBuffer().toString('hex');
    const currentResponse = responseRef.current;
    const responseBufferString =
      currentResponse.details && currentResponse.details.length > 0
        ? currentResponse.toBuffer().toString('hex')
        : '';
    const deliveryInfo = getGenericRequestDeliveryInfo(request);

    if (!autoDeliverySingleFlightRef.current.tryStart()) return;

    setAutoDeliveryState({
      status: AUTO_DELIVERY_STATUS.LOADING,
      deliveryInfo,
      error: null,
      phase: 'preparing',
    });

    try {
      const result = await preparedAutoDeliveryRef.current({
        requestBufferString,
        responseBufferString,
        onPhase: phase => setAutoDeliveryState(current => ({...current, phase})),
        assertCurrent: () => {
          if (!isActive() || generation !== processGenerationRef.current) throw new Error('Request closed');
        },
      });

      if (!isActive() || generation !== processGenerationRef.current) return;
      await markSavedPendingRequestComplete();

      setAutoDeliveryState({
        status: AUTO_DELIVERY_STATUS.SUCCESS,
        deliveryInfo: result,
        error: null,
      });

      if (
        result.type === GENERIC_REQUEST_DELIVERY_TYPES.POST &&
        !approvalResultTitle
      ) {
        autoDeliverySuccessTimeoutRef.current = setTimeout(() => {
          autoDeliverySuccessTimeoutRef.current = null;
          completeRequest();
        }, POST_SUCCESS_DELAY_MS);
        return;
      }

    } catch (e) {
      if (!isActive() || generation !== processGenerationRef.current) return;
      autoDeliverySingleFlightRef.current.clear();
      setAutoDeliveryState({
        status: AUTO_DELIVERY_STATUS.ERROR,
        deliveryInfo: e?.deliveryInfo || deliveryInfo,
        error: e,
      });
    }
  }, [
    autoDeliveryState.status,
    approvalResultTitle,
    completeRequest,
    markSavedPendingRequestComplete,
    request,
  ]);

  const completeWithoutResponse = useCallback(async () => {
    if (!autoDeliverySingleFlightRef.current.tryStart()) return;
    const generation = processGenerationRef.current;

    await markSavedPendingRequestComplete();
    if (!isActive() || generation !== processGenerationRef.current) return;
    completeRequest();
  }, [completeRequest, markSavedPendingRequestComplete]);

  const commitResponseProgress = (updatedResponse, handledIndices) => {
    if (request.isTestnet()) updatedResponse.setIsTestnet();
    let newDetailsProcessed = detailsProcessed;
    const newProcessedDetailIndices = [...processedDetailIndices];

    for (const handledIndex of handledIndices) {
      if (!newProcessedDetailIndices.includes(handledIndex)) {
        newProcessedDetailIndices.push(handledIndex);
        newDetailsProcessed++;
      }
    }

    if (request && newDetailsProcessed < request.details.length) {
      const navigationState = props.navigation.getState
        ? props.navigation.getState()
        : null;

      if (
        navigationState &&
        navigationState.type === 'stack' &&
        navigationState.index > 0 &&
        typeof props.navigation.popToTop === 'function'
      ) {
        props.navigation.popToTop();
      }
    }

    responseRef.current = updatedResponse;
    setResponse(updatedResponse);
    setProcessedDetailIndices(newProcessedDetailIndices);
    setDetailsProcessed(newDetailsProcessed);

    return newDetailsProcessed;
  };

  /**
   * Function passed to GUI elements that allows them to update handled
   * indices and response when done
   * @param {GenericResponse} updatedResponse
   * @param {Array<number>} handledIndices
   * @param {{autoDeliverOnComplete?: boolean, responseIdentityName?: string,
   *  dataPacketSigned?: boolean, sharedCredentialCount?: number}} options
   */
  const next = async (updatedResponse, handledIndices, options = {}) => {
    if (!isActive()) return;
    // Native promise continuations do not batch these updates. Publish the
    // response and its completion count together so the effect cannot reopen
    // the still-displayed detail between approval and delivery.
    unstable_batchedUpdates(() => {
      if (options.responseIdentityName || options.sharedCredentialCount != null) {
        setApprovalResult(previous => ({
          identityName: options.responseIdentityName || previous?.identityName,
          requesterLabel: displayProps.signerFqn || previous?.requesterLabel || 'the requester',
          sharedCredentialCount: (previous?.sharedCredentialCount || 0) + (options.sharedCredentialCount || 0),
          // Encrypted app-encryption replies also use DataResponse, so retain
          // the completed data-signing screen's result across later details.
          dataPacketSigned:
            previous?.dataPacketSigned || !!options.dataPacketSigned,
        }));
      }
      if (options.autoDeliverOnComplete) {
        setAutoDeliveryRequested(true);
      }

      commitResponseProgress(updatedResponse, handledIndices);
    });
  }

  /**
   * Shared completion adapter for detail screens that should always show the
   * centralized delivery sheet, even when no response is sent.
   */
  const completeWithDelivery = async (updatedResponse, handledIndices) => {
    return next(updatedResponse, handledIndices, {
      autoDeliverOnComplete: true,
    });
  };

  // An invoice contributes no response detail. Send the same accumulated
  // response at broadcast, while leaving its Payment sent screen in place.
  // InvoiceInfo defers a redirect until Done. Keep the promise after a failure
  // too: this path makes one attempt and never repeats the payment or delivery.
  const deliverPaidInvoiceResponse = () => {
    if (detailsProcessed + 1 < request.details.length) {
      return Promise.resolve({skippedInlineDelivery: true});
    }
    if (paidInvoiceDeliveryRef.current) return paidInvoiceDeliveryRef.current;
    const generation = processGenerationRef.current;
    const currentResponse = responseRef.current;
    paidInvoiceDeliveryRef.current = (async () => {
      const result = await preparedAutoDeliveryRef.current({
        requestBufferString: request.toBuffer().toString('hex'),
        responseBufferString: currentResponse.details?.length
          ? currentResponse.toBuffer().toString('hex')
          : '',
        assertCurrent: () => {
          if (!isActive() || generation !== processGenerationRef.current) throw new Error('Request closed');
        },
      });
      if (!isActive() || generation !== processGenerationRef.current) throw new Error('Request closed');
      await markSavedPendingRequestComplete();
      return result;
    })();
    return paidInvoiceDeliveryRef.current;
  };

  const completePaidInvoice = () => {
    if (detailsProcessed + 1 < request.details.length) {
      return next(responseRef.current, [detailIndex]);
    }
    completeRequest();
  };

  const deliverIdentityUpdateResponse = async (updatedResponse, handledIndices) => {
    if (!isActive()) throw new Error('Request closed');
    setInlineDeliveryInProgress(true);

    const newDetailsProcessed = commitResponseProgress(
      updatedResponse,
      handledIndices,
    );

    if (request == null || newDetailsProcessed < request.details.length) {
      setInlineDeliveryInProgress(false);
      return {skippedInlineDelivery: true};
    }

    const requestBufferString = request.toBuffer().toString('hex');
    const responseBufferString =
      updatedResponse.details && updatedResponse.details.length > 0
        ? updatedResponse.toBuffer().toString('hex')
        : '';

    const result = await completeGenericResponseDelivery({
      requestBufferString,
      responseBufferString,
      assertCurrent: () => {if (!isActive()) throw new Error('Request closed');},
    });

    if (!isActive()) throw new Error('Request closed');
    await markSavedPendingRequestComplete();

    // The update step keeps "Response sent" and the txid open until Done.
    if (result.type === GENERIC_REQUEST_DELIVERY_TYPES.POST) return result;

    completeRequest();
    return result;
  }

  const getVerusId = useCallback(async (systemId, iAddrOrName) => {
    const identity = await getIdentity(systemId, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    return identity.result;
  }, []);

  // Opens the redesigned VerusID details sheet, as invoice and sign-in
  // reviews do (a claim's outside revocation or recovery authority).
  const openVerusIdDetailsModal = useCallback((systemId, iAddress) => {
    setVerusIdSheet({
      loadVerusId: () => getVerusId(systemId, iAddress),
      loadFriendlyNames: async identityObj => {
        try {
          return await getFriendlyNameMap(systemId, identityObj);
        } catch (e) {
          return {
            ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
            ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
          };
        }
      },
    });
  }, [getVerusId]);

  useEffect(() => {
    isDeeplinkHandlerInstalled(VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID).then(installed => {
      setValuInstalled(installed);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    // Do not update after initial update
    if (request == null) {
      const req = new primitives.GenericRequest();
      req.fromBuffer(Buffer.from(deeplinkData, 'hex'));
      const initializedResponse = alignGenericResponseNetwork(
        req,
        new primitives.GenericResponse(),
      );

      if (req.isTestnet()) initializedResponse.setIsTestnet();
      responseRef.current = initializedResponse;
      setResponse(initializedResponse);
      setRequest(req);
      setDetailsProcessed(0);
    }
  }, [deeplinkData]);

  useEffect(() => {
    return () => {
      processGenerationRef.current += 1;

      if (autoDeliverySuccessTimeoutRef.current) {
        clearTimeout(autoDeliverySuccessTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (request != null) {
      const completionAction = getGenericRequestCompletionAction({
        autoDeliveryRequested,
        autoDeliveryStatus: autoDeliveryState.status,
        detailCount: request.details.length,
        detailsProcessed,
        hasResponseDetails: !!(response.details && response.details.length > 0),
        inlineDeliveryInProgress,
      });

      if (completionAction === GENERIC_REQUEST_COMPLETION_ACTIONS.WAIT) {
        return;
      }

      if (
        completionAction ===
        GENERIC_REQUEST_COMPLETION_ACTIONS.PROCESS_NEXT_DETAIL
      ) {
        setDisplayKey(null);
        setDisplayProps({});
        processNextDetail();
        return;
      }

      if (
        completionAction ===
        GENERIC_REQUEST_COMPLETION_ACTIONS.RUN_AUTO_DELIVERY
      ) {
        runAutoDelivery();
        return;
      }

      completeWithoutResponse();
    }
  }, [
    autoDeliveryRequested,
    autoDeliveryState.status,
    completeWithoutResponse,
    detailsProcessed,
    inlineDeliveryInProgress,
    request,
    runAutoDelivery,
    response,
  ]);

  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();

  const screens = {
    [AUTHENTICATION_REQUEST_VDXF_KEY.vdxfid]: () => (
      <AuthenticationRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        nextStepActionLabel={getContinueToNextStepLabel({
          request,
          currentIndex: detailIndex,
          processedDetailIndices,
          skipWalletBackup: !!passthrough?.skipWalletBackupRequests,
        })}
        followingInvoice={
          request.details.find(
            (detail, index) =>
              !processedDetailIndices.includes(index) &&
              detail.getIAddressKey() === VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid,
          )?.data
        }
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [IDENTITY_UPDATE_REQUEST_VDXF_KEY.vdxfid]: () => (
      <IdentityUpdateRequestInfo
        {...displayProps}
        request={request}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        requestBufferString={request.toBuffer().toString('hex')}
        responseBufferString={
          response.details && response.details.length > 0
            ? response.toBuffer().toString('hex')
            : ''
        }
        detailIndex={detailIndex}
        deliverIdentityUpdateResponse={deliverIdentityUpdateResponse}
        identityUpdateDeliveryInfo={getGenericRequestDeliveryInfo(request)}
        completeIdentityUpdateWithoutDelivery={completeRequest}
        next={next}
      />
    ),
    [VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid]: () => (
      <InvoiceInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
        deliverPaidInvoiceResponse={deliverPaidInvoiceResponse}
        completePaidInvoice={completePaidInvoice}
        onHeaderVisibilityChange={setInvoiceHeaderVisible}
        onOpenInAnotherApp={valuInstalled ? () => setOpenInAnotherAppVisible(true) : undefined}
        paidSignInMessage={
          hasAuthenticationResponse && approvalResult?.identityName
            ? `Signed in to ${approvalResult.requesterLabel} as ${approvalResult.identityName}.`
            : null
        }
      />
    ),
    [APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid]: () => (
      <AppEncryptionRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [USER_DATA_REQUEST_VDXF_KEY.vdxfid]: () => (
      <UserDataRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
        hasFollowingDetails={request.details.some(
          (detail, index) =>
            index !== detailIndex &&
            !processedDetailIndices.includes(index) &&
            !(
              passthrough?.skipWalletBackupRequests &&
              detail.getIAddressKey() === CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid
            ),
        )}
      />
    ),
    [DATA_PACKET_REQUEST_VDXF_KEY.vdxfid]: () => (
      <DataPacketRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [CREATE_WALLET_BACKUP_DETAILS_VDXF_KEY.vdxfid]: () => (
      <WalletBackupRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        response={response}
        request={request}
        detailIndex={detailIndex}
      />
    ),
    [SPENDABLE_KEY_DETAILS_VDXF_KEY.vdxfid]: () => (
      <SpendableKeyRequestInfo
        {...displayProps}
        cancel={cancelRequest}
        completeWithDelivery={completeWithDelivery}
        setLoading={props.setLoading}
        navigation={props.navigation}
        next={next}
        pendingDeeplinkId={passthrough?.pendingDeeplinkId || null}
        response={response}
        request={request}
        detailIndex={detailIndex}
        openVerusIdDetailsModal={openVerusIdDetailsModal}
      />
    )
  };

  // Keep handler selection and alternate-app routing explicit; integrated by Codex GPT-5 so new VDXF types do not bypass the redesign flow.
  const openInValu = () => {
    const originalUri = request.toWalletDeeplinkUri();
    const redirectUri = originalUri.replace(
      `${DEEPLINK_PROTOCOL_URL_STRING}://`,
      `${DEEPLINK_PROTOCOL_URL_STRING}${VALU_MOBILE_GENERIC_REQUEST_HANDLER_ID}://`
    );
    Linking.openURL(redirectUri).catch(() =>
      createAlert(
        'Cannot open Valu Mobile',
        'Check that Valu Mobile is installed, then try again.',
      ),
    );
  };

  return (
    <View style={{flex: 1, backgroundColor: theme.colors.background}}>
      {displayKey == null ? (
        <GenericRequestLoading
          activeStep={GENERIC_REQUEST_LOADING_STEPS.REVIEW}
          error={requestError}
          onCancel={cancelRequest}
          onRetry={() => {
            setRequestError(null);
            processNextDetail();
          }}
        />
      ) : props.loading ? (
        <AnimatedActivityIndicatorBox />
      ) : (
        <View style={{flex: 1, backgroundColor: theme.colors.background}}>
          <View style={{flex: 1}}>{screens[displayKey]()}</View>
          {valuInstalled && (displayKey !== VERUSPAY_INVOICE_DETAILS_VDXF_KEY.vdxfid || !invoiceHeaderVisible) && (
            <View
              pointerEvents="box-none"
              style={[otherAppStyles.action, {
                top: insets.top,
                right: insets.right + theme.spacing.lg,
              }]}>
              <OpenInAnotherWalletAction
                disabled={autoDeliveryState.status === AUTO_DELIVERY_STATUS.LOADING}
                onPress={() => setOpenInAnotherAppVisible(true)}
              />
            </View>
          )}
        </View>
      )}
      <AutoDeliverySheet
        deliveryInfo={autoDeliveryState.deliveryInfo}
        phase={autoDeliveryState.phase}
        onDone={completeRequest}
        error={autoDeliveryState.error}
        onLeaveWithoutSending={completeRequest}
        onRetry={runAutoDelivery}
        status={autoDeliveryState.status}
        approvalResultTitle={approvalResultTitle}
        approvalResultMessage={approvalResultMessage}
        responseIdentityName={approvalResult?.identityName}
      />
      {verusIdSheet != null && (
        <DeepLinkVerusIdDetailsSheet
          {...verusIdSheet}
          visible
          onClose={() => setVerusIdSheet(null)}
        />
      )}
      <OpenInAnotherAppSheet
        onClose={() => setOpenInAnotherAppVisible(false)}
        onOpenInValu={openInValu}
        visible={openInAnotherAppVisible}
      />
    </View>
  );
};

const GenericRequestHome = props => {
  const hasAppEncryption = useMemo(() => {
    const request = new primitives.GenericRequest();
    request.fromBuffer(Buffer.from(props.deeplinkData, 'hex'));
    return request.details.some(detail =>
      detail.getIAddressKey() === APP_ENCRYPTION_REQUEST_VDXF_KEY.vdxfid,
    );
  }, [props.deeplinkData]);
  const appEncryptionSessionKey = useSelector(state =>
    hasAppEncryption ? getAppEncryptionSessionKey(state) : null,
  );
  return <GenericRequestSession
    key={`${props.deeplinkData}:${appEncryptionSessionKey || ''}`}
    {...props}
    appEncryptionSessionKey={appEncryptionSessionKey}
  />;
};
export default GenericRequestHome;
