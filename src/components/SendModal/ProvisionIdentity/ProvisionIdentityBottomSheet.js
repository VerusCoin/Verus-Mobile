import {fromBase58Check} from '@bitgo/utxo-lib/dist/src/address';
import axios from 'axios';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import LottieView from 'lottie-react-native';
import {Check, ChevronLeft, X} from 'lucide-react-native';
import {primitives} from 'verusid-ts-client';
import {ProvisionIdentityDetails} from 'verus-typescript-primitives';
import AppButton from '../../AppButton';
import AppTextInput from '../../AppTextInput';
import BottomSheetModal from '../../BottomSheetModal';
import {closeSendModal} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../actions/actions/updates/sessionRequests';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {dispatchAddNotification} from '../../../actions/actions/notifications/dispatchers/notifications';
import {fontStyle} from '../../../globals/fonts';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {requestServiceStoredData} from '../../../utils/auth/authBox';
import {getIdentity} from '../../../utils/api/channels/verusid/callCreators';
import {getVdxfId} from '../../../utils/api/channels/vrpc/requests/getVdxfid';
import {handleProvisioningResponse, PROVISIONING_FAILED} from '../../../utils/api/channels/vrpc/requests/handleProvisioningResponse';
import {signIdProvisioningRequest} from '../../../utils/api/channels/vrpc/requests/signIdProvisioningRequest';
import {NOTIFICATION_ICON_VERUSID} from '../../../utils/constants/notifications';
import {VERUSID_SERVICE_ID} from '../../../utils/constants/services';
import {SEND_MODAL_IDENTITY_TO_PROVISION_FIELD} from '../../../utils/constants/sendModal';
import {LoadingNotification} from '../../../utils/notification';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {withNameBreaks} from '../../../utils/fullyqualifiedname';
import Store from '../../../store';
import {assertProvisioningSessionCurrent} from './ProvisionIdentityConfirm/ProvisionIdentityConfirm';
import {
  getProvisioningRequestState,
  getStoredProvisioningRequestKey,
  isProvisioningResponseMismatchError,
  PROVISIONING_REQUEST_ALREADY_USED_MESSAGE,
  PROVISIONING_REQUEST_ALREADY_USED_TITLE,
  shouldBlockProvisioningRequest,
} from '../../../utils/verusid/provisioningRequestState';

const SHEET_STEPS = {
  NAME: 'name',
  REVIEW: 'review',
  RESULT: 'result',
};

const PROVISIONING_WAIT_LABEL = 'About 5 minutes';
const PROVISIONING_HANDOFF_COPY =
  "After you tap Request VerusID, you'll return to the wallet home screen. A notification will appear when the VerusID is ready.";
const AVAILABILITY_DEBOUNCE_MS = 450;
const NAME_STEP_BACK_ACCESSIBILITY_LABEL = 'Back to VerusID options';
const REVIEW_BACK_ACCESSIBILITY_LABEL = 'Back to setup options';
const HEADER_ROW_HEIGHT = 36;

const AVAILABILITY_STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  TAKEN: 'taken',
  ERROR: 'error',
  INVALID: 'invalid',
};

const getProvisioningInfo = sendModal => {
  const provisioningDetailsBufferString =
    sendModal.data.provisioningDetailsBufferString;

  if (provisioningDetailsBufferString) {
    const details = new ProvisionIdentityDetails();
    details.fromBuffer(Buffer.from(provisioningDetailsBufferString, 'hex'), 0);

    const info = [];

    if (details.uri) {
      info.push({
        vdxfkey:
          primitives.LOGIN_CONSENT_ID_PROVISIONING_WEBHOOK_VDXF_KEY.vdxfid,
        data: details.uri.getUriString(),
      });
    }

    if (details.systemID) {
      info.push({
        vdxfkey: primitives.ID_SYSTEMID_VDXF_KEY.vdxfid,
        data: details.systemID.toAddress(),
      });
    }

    if (details.parentID) {
      info.push({
        vdxfkey: primitives.ID_PARENT_VDXF_KEY.vdxfid,
        data: details.parentID.toAddress(),
      });
    }

    if (details.identityID) {
      info.push({
        vdxfkey: primitives.ID_ADDRESS_VDXF_KEY.vdxfid,
        data: details.identityID.toAddress(),
      });
    }

    return info;
  }

  if (
    sendModal.data.request != null &&
    sendModal.data.request.challenge.provisioning_info != null
  ) {
    return sendModal.data.request.challenge.provisioning_info;
  }

  return [];
};

const getProcessedProvisioningInfo = provisioningInfo => {
  const findProvisioningInfo = key =>
    provisioningInfo.find(item => item.vdxfkey === key.vdxfid) || null;

  return {
    provAddress: findProvisioningInfo(primitives.ID_ADDRESS_VDXF_KEY),
    provSystemId: findProvisioningInfo(primitives.ID_SYSTEMID_VDXF_KEY),
    provFqn: findProvisioningInfo(
      primitives.ID_FULLYQUALIFIEDNAME_VDXF_KEY,
    ),
    provParent: findProvisioningInfo(primitives.ID_PARENT_VDXF_KEY),
    provWebhook: findProvisioningInfo(
      primitives.LOGIN_CONSENT_ID_PROVISIONING_WEBHOOK_VDXF_KEY,
    ),
  };
};

const isIAddress = identity => {
  try {
    fromBase58Check(identity);
    return true;
  } catch (e) {
    return false;
  }
};

const getPreviewName = ({identity, parentName}) => {
  if (!identity) return '';
  if (isIAddress(identity)) return identity;
  return parentName ? `${identity}${parentName}` : `${identity}@`;
};

const getPreviewPlaceholder = ({parentName}) =>
  parentName ? `...${parentName}` : '...@';

const getFormattedIdentityForLookup = ({identity, parentName}) => {
  try {
    fromBase58Check(identity);
    return identity;
  } catch (e) {
    return parentName ? `${identity}${parentName}` : `${identity}@`;
  }
};

const getAvailabilityStatus = async ({
  assignedIdentity,
  formattedIdentity,
  systemId,
}) => {
  if (assignedIdentity != null) return AVAILABILITY_STATUS.AVAILABLE;

  const res = await getIdentity(systemId, formattedIdentity);

  if (res.error && res.error.code !== -5) {
    throw new Error(res.error.message);
  }

  if (!res.error && res.result != null) {
    return AVAILABILITY_STATUS.TAKEN;
  }

  return AVAILABILITY_STATUS.AVAILABLE;
};

const getFriendlyMapValue = (friendlyNameMap, addressOrName) =>
  addressOrName != null && friendlyNameMap[addressOrName]
    ? friendlyNameMap[addressOrName]
    : addressOrName;

const getPreviewAvailabilityState = ({availabilityStatus, previewName}) => {
  if (!previewName) return 'neutral';

  switch (availabilityStatus) {
    case AVAILABILITY_STATUS.AVAILABLE:
      return 'available';
    case AVAILABILITY_STATUS.TAKEN:
    case AVAILABILITY_STATUS.INVALID:
      return 'unavailable';
    case AVAILABILITY_STATUS.ERROR:
      return 'error';
    default:
      return 'neutral';
  }
};

const getPreviewAvailabilityLabel = availabilityStatus => {
  switch (availabilityStatus) {
    case AVAILABILITY_STATUS.AVAILABLE:
      return 'Available';
    case AVAILABILITY_STATUS.TAKEN:
      return 'Already taken';
    case AVAILABILITY_STATUS.INVALID:
      return 'Not available';
    case AVAILABILITY_STATUS.ERROR:
      return 'Couldn’t check this name';
    default:
      return ' ';
  }
};

const ProvisionIdentityBottomSheet = ({
  visible,
  onClose,
  onClosed,
  onBack,
  preventExit,
  loading,
  sendModal,
  setLoading,
  setPreventExit,
  updateSendFormData,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [step, setStep] = useState(SHEET_STEPS.NAME);
  const [friendlyNameMap, setFriendlyNameMap] = useState({});
  const [assignedIdentity, setAssignedIdentity] = useState(null);
  const [parentName, setParentName] = useState('');
  const [initializing, setInitializing] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState(
    AVAILABILITY_STATUS.IDLE,
  );
  const [availabilityCheckValue, setAvailabilityCheckValue] = useState('');
  const [reviewData, setReviewData] = useState(null);
  const [identityError, setIdentityError] = useState(null);
  // Set when this request already asked for a VerusID. Request stays disabled.
  const [requestBlocked, setRequestBlocked] = useState(false);
  const chainTicker = sendModal.coinObj ? sendModal.coinObj.id : null;
  const addresses = useObjectSelector(state =>
    chainTicker &&
    state.authentication.activeAccount?.keys?.[chainTicker]?.vrpc
      ? state.authentication.activeAccount.keys[chainTicker].vrpc.addresses
      : [],
  );
  const provisioningInfo = useMemo(
    () => getProvisioningInfo(sendModal),
    [
      sendModal.data.provisioningDetailsBufferString,
      sendModal.data.request,
    ],
  );
  const processedInfo = useMemo(
    () => getProcessedProvisioningInfo(provisioningInfo),
    [provisioningInfo],
  );
  const inputValue =
    sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD] || '';
  const trimmedInputValue = inputValue.trim();
  const displayedIdentity = assignedIdentity
    ? getFriendlyMapValue(friendlyNameMap, assignedIdentity)
    : inputValue;
  const previewName = getPreviewName({
    identity: displayedIdentity,
    parentName,
  });
  const previewPlaceholder = getPreviewPlaceholder({parentName});
  const currentFormattedIdentity = useMemo(
    () =>
      trimmedInputValue
        ? getFormattedIdentityForLookup({
            identity: trimmedInputValue,
            parentName,
          })
        : '',
    [parentName, trimmedInputValue],
  );
  const sheetMaxHeight = '70%';
  const scrollRef = useRef(null);

  // On compact screens the open keyboard leaves less room than the name step
  // needs. Keep the sheet scrollable and bring the Continue button into view.
  useEffect(() => {
    if (!visible) return undefined;
    let timer;
    const subscription = Keyboard.addListener('keyboardDidShow', () => {
      clearTimeout(timer);
      timer = setTimeout(
        () => scrollRef.current?.scrollToEnd({animated: true}),
        80,
      );
    });
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [visible]);
  const disableActions = loading || initializing;
  const availabilityMatchesInput =
    assignedIdentity != null ||
    (currentFormattedIdentity !== '' &&
      availabilityCheckValue === currentFormattedIdentity);
  const effectiveAvailabilityStatus = availabilityMatchesInput
    ? availabilityStatus
    : AVAILABILITY_STATUS.IDLE;
  const hasRequiredIdentity =
    assignedIdentity != null || trimmedInputValue.length > 0;
  const availabilityAllowsContinue =
    assignedIdentity != null ||
    effectiveAvailabilityStatus === AVAILABILITY_STATUS.AVAILABLE ||
    effectiveAvailabilityStatus === AVAILABILITY_STATUS.ERROR;
  const continueDisabled =
    disableActions || !hasRequiredIdentity || !availabilityAllowsContinue;
  const previewAvailabilityState = getPreviewAvailabilityState({
    availabilityStatus: effectiveAvailabilityStatus,
    previewName,
  });
  const previewAvailabilityLabel = getPreviewAvailabilityLabel(
    effectiveAvailabilityStatus,
  );

  useEffect(() => {
    let cancelled = false;

    const loadProvisioningIdentities = async () => {
      const {provAddress, provFqn, provParent, provSystemId} = processedInfo;
      const provIdKey = provAddress || provFqn || null;
      const identityKeys = provIdKey == null ? [] : [provIdKey];

      if (provParent) identityKeys.push(provParent);
      if (provSystemId) identityKeys.push(provSystemId);

      if (identityKeys.length === 0 || !sendModal.coinObj?.system_id) {
        setFriendlyNameMap({});
        setAssignedIdentity(null);
        setParentName('');
        return;
      }

      setInitializing(true);

      try {
        const nextFriendlyNameMap = {};
        let nextAssignedIdentity = null;
        let nextParentName = '';

        for (const idKey of identityKeys) {
          const identity = await getIdentity(
            sendModal.coinObj.system_id,
            idKey.data,
          );

          if (cancelled || !identity.result) continue;

          nextFriendlyNameMap[identity.result.identity.identityaddress] =
            identity.result.identity.name;

          if (provIdKey != null && idKey.data === provIdKey.data) {
            nextAssignedIdentity = identity.result.identity.identityaddress;
            updateSendFormData(
              SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
              identity.result.identity.name,
            );
          }

          if (idKey.vdxfkey === primitives.ID_PARENT_VDXF_KEY.vdxfid) {
            nextParentName = `.${identity.result.fullyqualifiedname}`;
          }
        }

        if (!cancelled) {
          setFriendlyNameMap(nextFriendlyNameMap);
          setAssignedIdentity(nextAssignedIdentity);
          setParentName(nextParentName);
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('Unable to load provisioning identity metadata', e);
          setFriendlyNameMap({});
          setAssignedIdentity(null);
          setParentName('');
        }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    };

    loadProvisioningIdentities();

    return () => {
      cancelled = true;
    };
  }, [
    processedInfo,
    sendModal.coinObj?.system_id,
  ]);

  useEffect(() => {
    if (assignedIdentity != null) {
      setAvailabilityStatus(AVAILABILITY_STATUS.AVAILABLE);
      setAvailabilityCheckValue(currentFormattedIdentity);
      return undefined;
    }

    const identity = trimmedInputValue;
    const systemId = sendModal.coinObj?.system_id;

    if (!identity || !systemId) {
      setAvailabilityStatus(AVAILABILITY_STATUS.IDLE);
      setAvailabilityCheckValue('');
      return undefined;
    }

    if (isIAddress(identity) && parentName) {
      setAvailabilityStatus(AVAILABILITY_STATUS.INVALID);
      setAvailabilityCheckValue(currentFormattedIdentity);
      return undefined;
    }

    setAvailabilityStatus(AVAILABILITY_STATUS.IDLE);
    setAvailabilityCheckValue('');

    let active = true;
    const timeoutId = setTimeout(async () => {
      const formattedIdentity = getFormattedIdentityForLookup({
        identity,
        parentName,
      });

      setAvailabilityStatus(AVAILABILITY_STATUS.CHECKING);

      try {
        const nextAvailabilityStatus = await getAvailabilityStatus({
          assignedIdentity,
          formattedIdentity,
          systemId,
        });

        if (active) {
          setAvailabilityStatus(nextAvailabilityStatus);
          setAvailabilityCheckValue(formattedIdentity);
        }
      } catch (e) {
        if (active) {
          setAvailabilityStatus(AVAILABILITY_STATUS.ERROR);
          setAvailabilityCheckValue(formattedIdentity);
        }
      }
    }, AVAILABILITY_DEBOUNCE_MS);

    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, [
    assignedIdentity,
    currentFormattedIdentity,
    parentName,
    sendModal.coinObj?.system_id,
    trimmedInputValue,
  ]);

  const trimProvisionIdentityInput = () => {
    const currentIdentity =
      sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD] || '';
    const trimmedIdentity = currentIdentity.trim();

    if (trimmedIdentity !== currentIdentity) {
      updateSendFormData(
        SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
        trimmedIdentity,
      );
    }

    return trimmedIdentity;
  };

  const formHasError = identity => {
    if (!identity) {
      setIdentityError('Enter a name.');
      return true;
    }

    try {
      fromBase58Check(identity);
      if (parentName) {
        setIdentityError('Enter a name, not an i-address.');
        return true;
      }
    } catch (e) {
      const formattedId = parentName ? `${identity}${parentName}` : `${identity}@`;
      if (!formattedId.endsWith('@')) {
        setIdentityError('Enter a valid name or i-address.');
        return true;
      }
    }

    setIdentityError(null);
    return false;
  };

  const handleContinue = async () => {
    const identity = trimProvisionIdentityInput();

    if (formHasError(identity)) return;

    await setLoading(true);

    const {coinObj} = sendModal;
    const formattedId = getFormattedIdentityForLookup({
      identity,
      parentName,
    });

    try {
      const nextAvailabilityStatus = await getAvailabilityStatus({
        assignedIdentity,
        formattedIdentity: formattedId,
        systemId: coinObj.system_id,
      });

      setAvailabilityStatus(nextAvailabilityStatus);
      setAvailabilityCheckValue(formattedId);

      if (nextAvailabilityStatus === AVAILABILITY_STATUS.TAKEN) {
        await setLoading(false);
        return;
      }

      setReviewData({
        ...processedInfo,
        friendlyNameMap,
        primaryAddress: addresses[0],
        requestedIdentity:
          getPreviewName({
            identity: assignedIdentity ? displayedIdentity : identity,
            parentName,
          }) || formattedId,
      });
      setStep(SHEET_STEPS.REVIEW);
    } catch (e) {
      // The availability label shows the failed check.
      console.warn('Unable to check VerusID availability', e);
      setAvailabilityStatus(AVAILABILITY_STATUS.ERROR);
      setAvailabilityCheckValue(formattedId);
    }

    await setLoading(false);
  };

  const handleSubmitRequest = async () => {
    if (reviewData == null) return;
    let existingProvisioningRequestState = null;
    const requestContext = {
      sessionScope:
        sendModal.sessionScope || captureSessionScope(Store.getState()),
      modalRequestId: sendModal.requestId || null,
    };

    await setLoading(true, true);
    await setPreventExit(true);
    setStep(SHEET_STEPS.RESULT);

    try {
      const {coinObj} = sendModal;
      const provisioningRequestType =
        sendModal.data.provisioningRequestType ||
        (sendModal.data.provisioningDetailsBufferString
          ? 'generic'
          : 'loginconsent');

      let loginRequest = null;
      if (sendModal.data.request) {
        loginRequest = new primitives.LoginConsentRequest(sendModal.data.request);
      }

      let webhookUrl = reviewData.provWebhook
        ? reviewData.provWebhook.data
        : null;

      if (!webhookUrl && loginRequest && loginRequest.challenge.provisioning_info) {
        const webhookSubject = loginRequest.challenge.provisioning_info.find(
          item =>
            item.vdxfkey ===
            primitives.LOGIN_CONSENT_ID_PROVISIONING_WEBHOOK_VDXF_KEY.vdxfid,
        );
        webhookUrl = webhookSubject ? webhookSubject.data : null;
      }

      if (webhookUrl == null) {
        throw new Error('This VerusID request is missing a destination.');
      }

      const identity =
        sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD] != null
          ? sendModal.data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD].trim()
          : '';

      let identityName;
      let isIdentityAddress;
      let parent;
      let systemid;
      let nameId;
      let requestedFqn;

      try {
        fromBase58Check(identity);
        isIdentityAddress = true;
      } catch (e) {
        isIdentityAddress = false;
      }

      if (isIdentityAddress) {
        const identityObj = await getIdentity(coinObj.system_id, identity);

        if (identityObj.error) throw new Error(identityObj.error.message);

        identityName = identityObj.result.identity.name;
        parent = identityObj.result.identity.parent;
        systemid = identityObj.result.identity.systemid;
        nameId = identity;
        requestedFqn = identityObj.result.fullyqualifiedname;
      } else {
        identityName = identity.split('@')[0];
        parent = reviewData.provParent ? reviewData.provParent.data : null;
        systemid = reviewData.provSystemId ? reviewData.provSystemId.data : null;

        const parentLookup = parent ||
          (loginRequest ? loginRequest.system_id : coinObj.system_id);
        const parentObj = await getIdentity(coinObj.system_id, parentLookup);

        if (parentObj.error) throw new Error(parentObj.error.message);

        requestedFqn = `${identityName.split('.')[0]}.${parentObj.result.fullyqualifiedname}`;
        nameId = (await getVdxfId(coinObj.system_id, requestedFqn)).result.vdxfid;
      }

      const challengeId =
        sendModal.data.provisioningRequestID ||
        (loginRequest ? loginRequest.challenge.challenge_id : null);

      if (challengeId == null) {
        throw new Error('This VerusID request is missing a request ID.');
      }

      const provisionRequest = new primitives.LoginConsentProvisioningRequest({
        signing_address: reviewData.primaryAddress,
        challenge: new primitives.LoginConsentProvisioningChallenge({
          challenge_id: challengeId,
          created_at: Number((Date.now() / 1000).toFixed(0)),
          name: identityName,
          system_id: systemid,
          parent,
        }),
      });

      const signedRequest = await signIdProvisioningRequest(
        coinObj,
        provisionRequest,
        requestContext,
      );
      const requestPayload =
        provisioningRequestType === 'generic'
          ? sendModal.data.provisioningRequestBufferString
          : loginRequest.toBuffer().toString('base64');

      if (provisioningRequestType === 'generic' && !requestPayload) {
        throw new Error('This VerusID request is missing request data.');
      }

      const requestKey = getStoredProvisioningRequestKey({
        loginRequest: requestPayload,
        requestType: provisioningRequestType,
      });
      const verusIdServiceData = await requestServiceStoredData(
        VERUSID_SERVICE_ID,
      );

      existingProvisioningRequestState = getProvisioningRequestState({
        completedProvisioningRequests:
          verusIdServiceData.completed_provisioning_requests || {},
        linkedIds: verusIdServiceData.linked_ids || {},
        pendingIds: verusIdServiceData.pending_ids || {},
        requestKey,
      });

      if (shouldBlockProvisioningRequest(existingProvisioningRequestState)) {
        const alreadyRequestedError = new Error(
          PROVISIONING_REQUEST_ALREADY_USED_MESSAGE,
        );
        alreadyRequestedError.title = PROVISIONING_REQUEST_ALREADY_USED_TITLE;
        alreadyRequestedError.code = 'PROVISIONING_REQUEST_ALREADY_USED';
        throw alreadyRequestedError;
      }

      // The POST is the irreversible external side effect.
      assertProvisioningSessionCurrent(requestContext);
      const res = await axios.post(webhookUrl, signedRequest);
      const provisioningSignerId =
        sendModal.data.provisioningSignerId ||
        (loginRequest ? loginRequest.signing_id : null);

      if (provisioningSignerId == null) {
        throw new Error('This VerusID request is missing signer information.');
      }

      const provisioningName = (
        await getIdentity(coinObj.system_id, provisioningSignerId)
      ).result.identity.name;
      const newLoadingNotification = new LoadingNotification();
      const hasResponseUris =
        sendModal.data.provisioningRequestHasResponseUris ||
        (loginRequest &&
          loginRequest.challenge.redirect_uris &&
          loginRequest.challenge.redirect_uris.length > 0);

      await handleProvisioningResponse(
        coinObj,
        res.data,
        provisioningName,
        newLoadingNotification.uid,
        nameId,
        requestedFqn,
        provisioningSignerId,
        async originatingContext => {
          newLoadingNotification.body = '';
          const lastDotIndex = requestedFqn.lastIndexOf('.');
          const formattedName =
            lastDotIndex === -1
              ? requestedFqn
              : requestedFqn.substring(0, lastDotIndex);

          newLoadingNotification.title = [
            `${formattedName}@`,
            ' is being created by ',
            `${provisioningName}@`,
          ];
          newLoadingNotification.acchash =
            originatingContext.sessionScope.accountHash;
          newLoadingNotification.icon = NOTIFICATION_ICON_VERUSID;

          dispatchAddNotification(newLoadingNotification);
        },
        {
          ...requestContext,
          provisioningRequestKey: getStoredProvisioningRequestKey({
            loginRequest: requestPayload, requestType: provisioningRequestType,
          }),
        },
      );

      const response = new primitives.LoginConsentProvisioningResponse(
        res.data,
      );
      const provisioningState = response.decision.result.state;

      if (
        provisioningState ===
          primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_PENDINGAPPROVAL
            .vdxfid ||
        provisioningState ===
          primitives.LOGIN_CONSENT_PROVISIONING_RESULT_STATE_COMPLETE.vdxfid
      ) {
        await updateSendFormData('success', true);
      }

      await setLoading(false);
      closeSendModal();
      await setPreventExit(false);
    } catch (e) {
      // The sheet belongs to the session that started the request. Do not
      // show its result in another account.
      if (
        !sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)
      ) {
        return;
      }

      setStep(SHEET_STEPS.REVIEW);
      await setLoading(false);
      await setPreventExit(false);

      if (
        e?.code === 'PROVISIONING_REQUEST_ALREADY_USED' ||
        (existingProvisioningRequestState &&
          shouldBlockProvisioningRequest(existingProvisioningRequestState) &&
          isProvisioningResponseMismatchError(e))
      ) {
        setRequestBlocked(true);
      } else if (e?.code === PROVISIONING_FAILED) {
        // The provider answered. Its own text is not shown as app copy.
        console.warn('VerusID provider refused the request', e);
        createAlert(
          'VerusID not created',
          'The provider could not create this VerusID. Ask the provider for help, or try again later.',
        );
      } else {
        console.warn('VerusID request failed', e);
        createAlert(
          'VerusID not requested',
          'The wallet could not complete the request. Check your connection and try again.',
        );
      }
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      avoidKeyboard
      closeDisabled={preventExit}
      maxHeight={sheetMaxHeight}>
      <ScrollView
        ref={scrollRef}
        bounces={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.body}>
            {step === SHEET_STEPS.NAME && (
              <NameStep
                displayedIdentity={displayedIdentity}
                editable={!disableActions && assignedIdentity == null}
                availabilityLabel={previewAvailabilityLabel}
                availabilityState={previewAvailabilityState}
                continueDisabled={continueDisabled}
                disableBack={disableActions}
                loading={loading}
                onBack={onBack}
                identityError={identityError}
                onChangeIdentity={text => {
                  if (assignedIdentity == null && !text.endsWith('@')) {
                    setIdentityError(null);
                    updateSendFormData(
                      SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
                      text,
                    );
                  }
                }}
                onContinue={handleContinue}
                onTrim={trimProvisionIdentityInput}
                previewName={previewName}
                previewPlaceholder={previewPlaceholder}
                styles={styles}
                theme={theme}
              />
            )}
            {step === SHEET_STEPS.REVIEW && (
              <ReviewStep
                coinObj={sendModal.coinObj}
                disableActions={disableActions}
                onBack={() => setStep(SHEET_STEPS.NAME)}
                onRequest={handleSubmitRequest}
                requestBlocked={requestBlocked}
                reviewData={reviewData}
                styles={styles}
                theme={theme}
              />
            )}
            {step === SHEET_STEPS.RESULT && (
              <ResultStep styles={styles} />
            )}
          </View>
        </TouchableWithoutFeedback>
      </ScrollView>
    </BottomSheetModal>
  );
};

const NameStep = ({
  availabilityLabel,
  availabilityState,
  continueDisabled,
  disableBack,
  displayedIdentity,
  editable,
  identityError,
  loading,
  onBack,
  onChangeIdentity,
  onContinue,
  onTrim,
  previewName,
  previewPlaceholder,
  styles,
  theme,
}) => (
  <View>
    {onBack ? (
      <View style={styles.stepHeader}>
        <TouchableOpacity
          accessibilityLabel={NAME_STEP_BACK_ACCESSIBILITY_LABEL}
          accessibilityRole="button"
          activeOpacity={disableBack ? 1 : 0.74}
          disabled={disableBack}
          onPress={onBack}
          style={styles.backButton}>
          <View style={styles.backIcon}>
            <ChevronLeft size={22} color={theme.colors.textPrimary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Request VerusID</Text>
      </View>
    ) : (
      <Text style={styles.title}>Request VerusID</Text>
    )}
    <View style={styles.formBlock}>
      <AppTextInput
        autoCapitalize="none"
        autoCorrect={false}
        editable={editable}
        errorText={identityError}
        label="Choose your VerusID name"
        onBlur={onTrim}
        onChangeText={onChangeIdentity}
        onSubmitEditing={onContinue}
        placeholder="Name"
        returnKeyType="done"
        value={displayedIdentity}
      />
      <View
        style={[
          styles.previewCard,
          availabilityState === 'available' && styles.previewCardAvailable,
          availabilityState === 'unavailable' && styles.previewCardUnavailable,
        ]}>
        <Text
          numberOfLines={2}
          style={[
            styles.previewValue,
            !previewName && styles.previewValuePlaceholder,
          ]}>
          {previewName ? withNameBreaks(previewName) : previewPlaceholder}
        </Text>
        {availabilityState === 'available' && (
          <View style={styles.previewStatusIcon}>
            <Check size={25} color={theme.colors.success} strokeWidth={3} />
          </View>
        )}
        {availabilityState === 'unavailable' && (
          <View style={styles.previewStatusIcon}>
            <X size={24} color={theme.colors.danger} strokeWidth={3} />
          </View>
        )}
      </View>
      <Text
        numberOfLines={1}
        style={[
          styles.previewAvailabilityText,
          availabilityState === 'available' &&
            styles.previewAvailabilityTextAvailable,
          (availabilityState === 'unavailable' ||
            availabilityState === 'error') &&
            styles.previewAvailabilityTextUnavailable,
        ]}>
        {availabilityLabel}
      </Text>
    </View>
    <AppButton
      disabled={continueDisabled}
      height={56}
      onPress={onContinue}
      themeMode={theme.mode}
      variant="primary">
      {loading ? 'Checking' : 'Continue'}
    </AppButton>
  </View>
);

const ReviewStep = ({
  coinObj,
  disableActions,
  onBack,
  onRequest,
  requestBlocked,
  reviewData,
  styles,
  theme,
}) => {
  const rows = getReviewRows({coinObj, reviewData});

  return (
    <View>
      <View style={styles.stepHeader}>
        <TouchableOpacity
          accessibilityLabel={REVIEW_BACK_ACCESSIBILITY_LABEL}
          accessibilityRole="button"
          activeOpacity={disableActions ? 1 : 0.74}
          disabled={disableActions}
          onPress={onBack}
          style={styles.backButton}>
          <View style={styles.backIcon}>
            <ChevronLeft size={22} color={theme.colors.textPrimary} />
          </View>
        </TouchableOpacity>
        <Text style={styles.title}>Review request</Text>
      </View>
      <View style={styles.reviewList}>
        {rows.map(row => (
          <ReviewRow key={row.key} row={row} styles={styles} />
        ))}
      </View>
      {requestBlocked ? (
        <Text accessibilityLiveRegion="polite" style={styles.requestNote}>
          {PROVISIONING_REQUEST_ALREADY_USED_MESSAGE}
        </Text>
      ) : (
        <View style={styles.handoffCard}>
          <Text style={styles.handoffTitle}>Notification when ready</Text>
          <Text style={styles.handoffText}>{PROVISIONING_HANDOFF_COPY}</Text>
        </View>
      )}
      <View style={styles.actionStack}>
        <AppButton
          disabled={disableActions || requestBlocked}
          height={56}
          onPress={onRequest}
          themeMode={theme.mode}
          variant="primary">
          {disableActions ? 'Requesting' : 'Request VerusID'}
        </AppButton>
      </View>
    </View>
  );
};

const ResultStep = ({styles}) => (
  <View style={styles.resultBody}>
    <LottieView
      accessibilityLabel="Requesting VerusID"
      accessibilityRole="progressbar"
      autoPlay
      loop
      source={require('../../../animations/loading_7bars.json')}
      style={styles.resultLoadingAnimation}
    />
  </View>
);

const ReviewRow = ({row, styles}) => (
  <View style={[styles.reviewRow, row.showDivider && styles.reviewRowDivider]}>
    <Text style={styles.reviewLabel}>{row.label}</Text>
    <Text numberOfLines={2} style={styles.reviewValue}>
      {row.isName ? withNameBreaks(row.value) : row.value}
    </Text>
  </View>
);

const getReviewRows = ({coinObj, reviewData}) => {
  if (reviewData == null) return [];

  const {
    friendlyNameMap = {},
    provAddress,
    provFqn,
    provSystemId,
  } = reviewData;
  const requestedIdentity = provFqn?.data || reviewData.requestedIdentity;
  const systemValue = provSystemId
    ? getFriendlyMapValue(friendlyNameMap, provSystemId.data)
    : coinObj?.display_ticker || coinObj?.id;
  const rows = [];
  const addRow = row => {
    if (row.value == null || row.value === '') return;
    rows.push(row);
  };

  addRow({
    key: 'identity',
    label: 'VerusID',
    value: requestedIdentity,
    isName: true,
  });
  addRow({
    key: 'network',
    label: 'Network',
    value: systemValue,
  });
  addRow({
    key: 'wait',
    label: 'Estimated wait',
    value: PROVISIONING_WAIT_LABEL,
  });
  addRow({
    key: 'identity-address',
    label: 'Identity address',
    value: provAddress?.data,
  });

  return rows.map((row, index) => ({
    ...row,
    showDivider: index > 0,
  }));
};

const createStyles = theme =>
  StyleSheet.create({
    body: {
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 22,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      lineHeight: 26,
      ...fontStyle('semiBold'),
    },
    subtitle: {
      marginTop: 4,
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    formBlock: {
      marginTop: 18,
      marginBottom: 18,
    },
    previewCard: {
      minHeight: 56,
      marginTop: 14,
      borderRadius: 18,
      paddingHorizontal: 16,
      paddingVertical: 0,
      backgroundColor: 'transparent',
      flexDirection: 'row',
      alignItems: 'center',
    },
    previewCardAvailable: {
      backgroundColor: theme.colors.successBackground,
    },
    previewCardUnavailable: {
      backgroundColor: theme.isDark
        ? 'rgba(255, 107, 117, 0.18)'
        : '#FDECEE',
    },
    previewValue: {
      flex: 1,
      minWidth: 0,
      paddingRight: 10,
      color: theme.colors.textPrimary,
      fontSize: 17,
      lineHeight: 22,
      ...fontStyle('semiBold'),
    },
    previewValuePlaceholder: {
      color: theme.colors.textSubtle,
    },
    previewStatusIcon: {
      width: 28,
      height: 28,
      marginLeft: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    previewAvailabilityText: {
      height: 18,
      marginTop: 6,
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    previewAvailabilityTextAvailable: {
      color: theme.colors.success,
    },
    previewAvailabilityTextUnavailable: {
      color: theme.colors.danger,
    },
    stepHeader: {
      minHeight: HEADER_ROW_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
    },
    backButton: {
      width: 40,
      height: HEADER_ROW_HEIGHT,
      marginLeft: -8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backIcon: {
      opacity: 0.42,
    },
    reviewList: {
      marginTop: 12,
      marginBottom: 0,
    },
    reviewRow: {
      minHeight: 45,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    reviewRowDivider: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    reviewLabel: {
      color: theme.colors.textSubtle,
      flex: 1,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    reviewValue: {
      flex: 1,
      color: theme.colors.textPrimary,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    handoffCard: {
      marginTop: 12,
      marginBottom: 18,
      borderRadius: 16,
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: theme.colors.successBackground,
    },
    handoffTitle: {
      color: theme.colors.success,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('semiBold'),
    },
    handoffText: {
      marginTop: 4,
      color: theme.colors.textSecondary,
      fontSize: 12,
      lineHeight: 17,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    requestNote: {
      marginTop: 12,
      marginBottom: 18,
      color: theme.colors.danger,
      fontSize: 13,
      lineHeight: 18,
      letterSpacing: 0,
      ...fontStyle('regular'),
    },
    actionStack: {
      gap: 10,
    },
    resultBody: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 156,
      paddingVertical: 22,
    },
    resultLoadingAnimation: {
      width: 108,
      height: 78,
    },
  });

export default ProvisionIdentityBottomSheet;
