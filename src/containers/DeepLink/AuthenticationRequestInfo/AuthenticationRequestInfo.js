/*
  AuthenticationRequestInfo
  - 2026-02-07: Inline identity selection via bottom sheet.
    - Added identity loading, constraint filtering, and IdentityPickerSheet
    - Choose-identity card opens sheet; selection shown on card
    - Continue builds response in-place instead of navigating to separate screen
    - Fixed connector arrow to attach flush to top card
    - Changed selection accent from blue to verusGreenColor
    - Disabled Continue until identity is selected
    - Resolved constraint i-addresses to friendly names via getIdentity
  - 2026-03-11: Fixed auth constraint system resolution and offline parent derivation .
*/
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import BigNumber from 'bignumber.js';
import {
  DeviceEventEmitter,
  TouchableOpacity,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {exitRequestToStack} from '../exitRequest';
import LottieView from 'lottie-react-native';
import {
  SafeAreaView,
} from 'react-native-safe-area-context';
import {openProvisionIdentityModal} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import {
  PROVISION_IDENTITY_SEND_MODAL,
  SEND_MODAL_PROVISION_IDENTITY_BACK_TARGET,
  SEND_MODAL_PROVISION_IDENTITY_BACK_TARGET_AUTH_PICKER,
} from '../../../utils/constants/sendModal';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {
  resetDeeplinkData,
  setUserCoins,
} from '../../../actions/actionCreators';
import {
  updateVerusIdWallet,
  updatePendingVerusIds,
} from '../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {
  deleteProvisionedIds,
  linkVerusId,
} from '../../../actions/actions/services/dispatchers/verusid/verusid';
import {dispatchRemoveNotification} from '../../../actions/actions/notifications/dispatchers/notifications';
import {satsToCoins, unixToDate} from '../../../utils/math';
import {
  AuthenticationRequestDetails,
  RecipientConstraint,
  AuthenticationResponseDetails,
  AuthenticationResponseOrdinalVDXFObject,
  fqnToParentAddress,
  fqnToParentFqn,
  GenericResponse,
  ProvisionIdentityDetails,
} from 'verus-typescript-primitives';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {
  getFriendlyNameMap,
  getCurrency,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
import {requestServiceStoredData} from '../../../utils/auth/authBox';
import Store from '../../../store';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../actions/actions/updates/sessionRequests';
import {VERUSID_SERVICE_ID} from '../../../utils/constants/services';
import {VRPC} from '../../../utils/constants/intervalConstants';
import {
  getGenericProvisioningRequestKey,
  getProvisioningRequestState,
  PROVISIONING_REQUEST_STATUSES,
} from '../../../utils/verusid/provisioningRequestState';
import {
  identityLinkCandidateMatchesAccount,
  identityLinkOriginIsCurrent,
} from '../../../utils/verusid/verusIdFlowGuards';
import AppButton from '../../../components/AppButton';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {Info} from 'lucide-react-native';
import {
  authenticationRequestInfoStyles as createAuthenticationRequestInfoStyles,
} from '../../../styles';
import IdentityPickerSheet, {
  VERUSID_SHEET_MODES,
} from '../components/VerusIdIdentityPickerSheet/IdentityPickerSheet';
import {
  DeepLinkReviewScrollView,
  RequestCard,
  getResponseHostLabel,
} from '../components/RequestReview';
import {markPendingDeeplinkComplete} from '../../../utils/deeplink/pendingDeeplinkStorage';
import {accountIsTestnet} from '../../../utils/account/accountNetwork';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../../../theme/onboarding';
import {ensureGenericResponseSigner} from '../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericRequestDeliveryInfo,
} from '../../../utils/deeplink/genericRequestDelivery';
import {assertAuthenticationRequestNotExpired} from '../../../utils/deeplink/validator/authenticationRequestValidator';
import {
  GENERIC_REQUEST_REJECTION_CODES,
  getGenericRequestRejection,
  isNetworkFailureError,
} from '../../../utils/deeplink/genericRequestRejection';

// Request errors with their own copy. assertAuthenticationRequestNotExpired
// throws AUTHENTICATION_REQUEST_EXPIRED.
const MAPPED_REQUEST_ERROR_CODES = new Set([
  ...Object.values(GENERIC_REQUEST_REJECTION_CODES),
  'AUTHENTICATION_REQUEST_EXPIRED',
]);

// The response could not be built or handed on. Mapped request errors (such
// as an expired request) keep their copy; the raw error stays in the log.
const getContinueErrorCopy = (error, requestIsTestnet) => {
  if (
    MAPPED_REQUEST_ERROR_CODES.has(error?.code) ||
    isNetworkFailureError(error)
  ) {
    return getGenericRequestRejection(error, {requestIsTestnet});
  }

  return {
    title: 'Cannot sign in',
    message:
      'Open the request again. If it still fails, ask the requester for a new request.',
  };
};

// Link errors come from wallet checks and the Verus network. Show the
// wallet-check reasons in plain words and keep network text out of view.
const getLinkFailureMessage = error => {
  const message = typeof error?.message === 'string' ? error.message : '';

  if (/primary address/i.test(message)) {
    return 'This wallet does not hold a primary address of this VerusID.';
  }
  if (/only active verusids/i.test(message)) {
    return 'Only active VerusIDs can be linked.';
  }
  if (/request requirements/i.test(message)) {
    return 'This VerusID does not meet the request requirements.';
  }
  if (isNetworkFailureError(error)) {
    return 'Verus Mobile could not reach the Verus network.';
  }

  return 'The wallet could not link this VerusID.';
};

const truncateAddress = addr => {
  if (!addr || addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
};

const toAddressString = addressObj => {
  if (addressObj == null || typeof addressObj.toAddress !== 'function') {
    throw new Error('Expected compact address object');
  }

  return addressObj.toAddress();
};

const EMPTY_RECIPIENT_CONSTRAINTS = [];
const SESSION_CHANGED = 'SESSION_CHANGED';
const ROOT_CHAIN_BY_NETWORK = {
  mainnet: 'VRSC',
  testnet: 'VRSCTEST',
};

const getDisplaySystemName = fullyqualifiedname => {
  if (!fullyqualifiedname) return null;

  const displayName = convertFqnToDisplayFormat(fullyqualifiedname);
  return displayName.endsWith('@')
    ? displayName.slice(0, displayName.length - 1)
    : displayName;
};

const getOfflineSystemName = systemId => {
  if (!systemId) return null;

  try {
    return getSystemNameFromSystemId(systemId);
  } catch (e) {
    return null;
  }
};

const getRequestIdDisplay = details => {
  if (
    !details ||
    typeof details.hasRequestID !== 'function' ||
    !details.hasRequestID()
  ) {
    return null;
  }

  try {
    return typeof details.requestID?.toAddress === 'function'
      ? details.requestID.toAddress()
      : null;
  } catch (e) {
    return null;
  }
};

const AuthenticationRequestInfoContent = props => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createAuthenticationRequestInfoStyles(theme),
    [theme],
  );
  const {
    detailsBufferString,
    sigtime,
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    provisioningDetailsBufferString,
    provisioningDetailIndex,
    cancel,
    next,
    nextStepActionLabel,
    followingInvoice,
    request,
    response,
    detailIndex,
  } = props;

  const [details, setDetails] = useState(new AuthenticationRequestDetails());
  const [constraintFriendlyNames, setConstraintFriendlyNames] = useState({});
  const [resolvedSystemNames, setResolvedSystemNames] = useState({});
  const attemptedSystemNameLookupsRef = useRef(new Set());
  const authRequestMountedRef = useRef(true);
  const passthroughAutoLinkStartedRef = useRef(false);

  // Identity picker state
  const [linkedIds, setLinkedIds] = useState({});
  const [pendingIds, setPendingIds] = useState({});
  const [completedProvisioningRequests, setCompletedProvisioningRequests] =
    useState({});
  const [linkedIdsLoaded, setLinkedIdsLoaded] = useState(false);
  const [linkedIdentityParentIds, setLinkedIdentityParentIds] = useState({});
  const [linkedIdentityParentsLoaded, setLinkedIdentityParentsLoaded] =
    useState(false);
  const [sortedIds, setSortedIds] = useState({});
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const [identitySheetInitialMode, setIdentitySheetInitialMode] = useState(
    VERUSID_SHEET_MODES.CHOOSE,
  );
  const [identitySheetInitialManualValue, setIdentitySheetInitialManualValue] =
    useState('');
  const [selectedIdentity, setSelectedIdentity] = useState(null); // { chainId, iAddress, friendlyName }
  const [openIdentityAfterUnlock, setOpenIdentityAfterUnlock] =
    useState(false);
  const [idProvisionSuccess, setIdProvisionSuccess] = useState(false);
  const [autoLinkingVisible, setAutoLinkingVisible] = useState(false);
  const launchedSendModalRef = useRef(null);
  const linkOperationRef = useRef(0);
  // The account this screen rendered against. Link mutations must reject if the
  // store account changed in the same frame as the action.
  const renderedAccountHash = useObjectSelector(
    state => state.authentication.activeAccount?.accountHash || null,
  );
  const successNavigationStartedRef = useRef(false);

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const passthrough = useSelector(state => state.deeplink.passthrough);
  const pendingDeeplinkId =
    passthrough?.pendingDeeplinkId ||
    passthrough?.pendingProvisioningDeeplinkId;
  const fromService = useSelector(state => state.deeplink.fromService);
  const sendModal = useObjectSelector(state => state.sendModal);
  const sendModalType = useSelector(state => state.sendModal.type);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const isTestAccount = accountIsTestnet(activeAccount);
  const encryptedIds = useObjectSelector(
    state => state.services.stored[VERUSID_SERVICE_ID],
  );

  useEffect(() => {
    authRequestMountedRef.current = true;

    return () => {
      authRequestMountedRef.current = false;
    };
  }, []);

  const loadLinkedIds = useCallback(async isCurrent => {
    const shouldApply = () =>
      typeof isCurrent === 'function' ? isCurrent() : true;

    try {
      const verusIdServiceData = await requestServiceStoredData(
        VERUSID_SERVICE_ID,
      );
      const nextLinkedIds = verusIdServiceData.linked_ids || {};
      const nextPendingIds = verusIdServiceData.pending_ids || {};
      const nextCompletedProvisioningRequests =
        verusIdServiceData.completed_provisioning_requests || {};

      if (shouldApply()) {
        setLinkedIds(nextLinkedIds);
        setPendingIds(nextPendingIds);
        setCompletedProvisioningRequests(nextCompletedProvisioningRequests);
      }
      return nextLinkedIds;
    } catch (e) {
      if (shouldApply()) {
        setLinkedIds({});
        setPendingIds({});
        setCompletedProvisioningRequests({});
      }
      return {};
    } finally {
      if (shouldApply()) setLinkedIdsLoaded(true);
    }
  }, []);

  const requestIsTestnet = request != null && request.isTestnet();
  const activeAccountMatchesRequest =
    signedIn && activeAccount != null && isTestAccount === requestIsTestnet;
  const defaultRootChainId = requestIsTestnet
    ? ROOT_CHAIN_BY_NETWORK.testnet
    : ROOT_CHAIN_BY_NETWORK.mainnet;
  const defaultRootSystemId =
    CoinDirectory.getBasicCoinObj(defaultRootChainId).system_id;
  const invoiceNotice = useMemo(() => {
    if (!followingInvoice) return null;
    try {
      if (!followingInvoice.acceptsAnyAmount()) {
        const currency = CoinDirectory.getBasicCoinObj(
          followingInvoice.requestedcurrencyid,
        );
        const amount = satsToCoins(BigNumber(followingInvoice.amount.toString()));
        if (
          currency.display_ticker &&
          amount.isFinite() &&
          !amount.isNegative()
        ) {
          return `A payment of ${amount.toFixed()} ${currency.display_ticker} follows.`;
        }
      }
    } catch (_) {
      // The invoice review resolves currencies not yet in the local directory.
    }
    return 'A payment follows.';
  }, [followingInvoice]);

  // Identity constraint filtering (mirrored from AuthenticationRequestIdentity)
  const recipientConstraints =
    details && details.recipientConstraints
      ? details.recipientConstraints
      : EMPTY_RECIPIENT_CONSTRAINTS;
  const requiredSystemIds = useMemo(() => {
    return recipientConstraints
      .filter(x => x.type === RecipientConstraint.REQUIRED_SYSTEM)
      .map(x => {
        try {
          return toAddressString(x.identity);
        } catch (e) {
          return null;
        }
      })
      .filter(x => x != null);
  }, [recipientConstraints]);
  const systemIdsToResolve = useMemo(() => {
    return Array.from(
      new Set([signerSystemID, ...requiredSystemIds].filter(Boolean)),
    );
  }, [requiredSystemIds, signerSystemID]);
  const responseUris = useMemo(() => {
    if (request && request.responseURIs && request.responseURIs.length > 0) {
      return request.responseURIs;
    }

    return [];
  }, [request]);
  const requestBufferString = useMemo(() => {
    try {
      return request ? request.toBuffer().toString('hex') : null;
    } catch (e) {
      return null;
    }
  }, [request]);
  const provisioningRequestKey = useMemo(
    () =>
      getGenericProvisioningRequestKey({
        request,
        requestBufferString,
      }),
    [request, requestBufferString],
  );
  const deliveryInfo = useMemo(
    () => getGenericRequestDeliveryInfo(request),
    [request],
  );

  useEffect(() => {
    let cancelled = false;

    const resolveSystemNames = async () => {
      const pendingSystemIds = systemIdsToResolve.filter(
        systemId =>
          resolvedSystemNames[systemId] == null &&
          !attemptedSystemNameLookupsRef.current.has(
            `${defaultRootSystemId}:${systemId}`,
          ),
      );

      if (pendingSystemIds.length === 0) {
        return;
      }

      const resolvedNames = {};

      for (const systemId of pendingSystemIds) {
        if (cancelled) {
          return;
        }

        attemptedSystemNameLookupsRef.current.add(
          `${defaultRootSystemId}:${systemId}`,
        );
        const offlineName = getOfflineSystemName(systemId);

        if (offlineName) {
          resolvedNames[systemId] = offlineName;
          continue;
        }

        try {
          const currencyRes = await getCurrency(defaultRootSystemId, systemId);
          if (!currencyRes.error && currencyRes.result?.fullyqualifiedname) {
            resolvedNames[systemId] = getDisplaySystemName(
              currencyRes.result.fullyqualifiedname,
            );
          }
        } catch (e) {
          // leave unresolved systems empty rather than guessing the wrong chain.
        }
      }

      if (!cancelled && Object.keys(resolvedNames).length > 0) {
        setResolvedSystemNames(prev => ({...prev, ...resolvedNames}));
      }
    };

    resolveSystemNames();

    return () => {
      cancelled = true;
    };
  }, [defaultRootSystemId, resolvedSystemNames, systemIdsToResolve]);

  const allowedSystems = useMemo(() => {
    return new Set(
      requiredSystemIds
        .map(systemId => resolvedSystemNames[systemId])
        .filter(Boolean)
        .map(systemName => systemName.toLowerCase()),
    );
  }, [requiredSystemIds, resolvedSystemNames]);
  const requiredSystemsResolved = useMemo(() => {
    return requiredSystemIds.every(systemId => resolvedSystemNames[systemId]);
  }, [requiredSystemIds, resolvedSystemNames]);
  const signerChainId = resolvedSystemNames[signerSystemID] || signerSystemName;
  const canOpenSignerDetails = signerChainId && signerIdentityID;
  const systemLabel = signerChainId || signerSystemID;

  const requiredIds = useMemo(() => {
    return new Set(
      recipientConstraints
        .filter(x => x.type === RecipientConstraint.REQUIRED_ID)
        .map(x => {
          try {
            return toAddressString(x.identity);
          } catch (e) {
            return null;
          }
        })
        .filter(x => x != null),
    );
  }, [recipientConstraints]);

  const requiredParentIds = useMemo(() => {
    return new Set(
      recipientConstraints
        .filter(x => x.type === RecipientConstraint.REQUIRED_PARENT)
        .map(x => {
          try {
            return toAddressString(x.identity);
          } catch (e) {
            return null;
          }
        })
        .filter(x => x != null),
    );
  }, [recipientConstraints]);
  const parentConstraintFriendlyNames = useMemo(() => {
    const names = {};

    if (requiredParentIds.size === 0) {
      return names;
    }

    for (const chainId of Object.keys(linkedIds)) {
      for (const fullyqualifiedname of Object.values(linkedIds[chainId] || {})) {
        if (!fullyqualifiedname) {
          continue;
        }

        try {
          const parentAddress = fqnToParentAddress(fullyqualifiedname, chainId);
          const parentFqn = fqnToParentFqn(fullyqualifiedname);

          if (
            parentAddress &&
            parentFqn &&
            requiredParentIds.has(parentAddress) &&
            names[parentAddress] == null
          ) {
            names[parentAddress] = convertFqnToDisplayFormat(parentFqn);
          }
        } catch (e) {
          // Ignore malformed FQNs and keep the address fallback below.
        }
      }
    }

    return names;
  }, [linkedIds, requiredParentIds]);

  const getKnownChainId = chainName => {
    if (!chainName) return chainName;

    const normalizedChainName = String(chainName).toLowerCase();
    const linkedChainId = Object.keys(linkedIds).find(
      key => key.toLowerCase() === normalizedChainName,
    );

    if (linkedChainId) return linkedChainId;

    const knownCoinId = Object.keys(CoinDirectory.coins || {}).find(
      key => key.toLowerCase() === normalizedChainName,
    );

    return knownCoinId || chainName;
  };

  const linkChainId =
    requiredSystemsResolved && requiredSystemIds.length > 0
      ? getKnownChainId(resolvedSystemNames[requiredSystemIds[0]])
      : defaultRootChainId;

  const isIdentityAllowed = (chainId, iAddr) => {
    if (requiredSystemIds.length > 0 && !requiredSystemsResolved) return false;
    if (requiredIds.size > 0 && !requiredIds.has(iAddr)) return false;
    if (
      allowedSystems.size > 0 &&
      !allowedSystems.has(String(chainId).toLowerCase())
    ) {
      return false;
    }

    if (requiredParentIds.size > 0) {
      if (!linkedIdentityParentsLoaded) return false;

      const identityParent =
        linkedIdentityParentIds[`${chainId}:${iAddr}`] || null;
      if (identityParent == null || !requiredParentIds.has(identityParent)) {
        return false;
      }
    }

    return true;
  };

  const isLinkedIdentityAllowed = useCallback(
    (sourceLinkedIds, chainId, iAddr) => {
      if (requiredSystemIds.length > 0 && !requiredSystemsResolved) {
        return false;
      }
      if (requiredIds.size > 0 && !requiredIds.has(iAddr)) return false;
      if (
        allowedSystems.size > 0 &&
        !allowedSystems.has(String(chainId).toLowerCase())
      ) {
        return false;
      }

      if (requiredParentIds.size > 0) {
        const friendlyName = sourceLinkedIds?.[chainId]?.[iAddr];

        if (!friendlyName) return false;

        try {
          const parentAddress = fqnToParentAddress(friendlyName, chainId);
          if (
            parentAddress == null ||
            !requiredParentIds.has(parentAddress)
          ) {
            return false;
          }
        } catch (e) {
          return false;
        }
      }

      return true;
    },
    [
      allowedSystems,
      requiredIds,
      requiredParentIds,
      requiredSystemIds.length,
      requiredSystemsResolved,
    ],
  );

  const getAllowedIdentityFromLinkedIds = useCallback(
    (sourceLinkedIds, preferredIAddress) => {
      const preferredKey = preferredIAddress
        ? preferredIAddress.toLowerCase()
        : null;
      const preferredDisplayKey = preferredIAddress
        ? convertFqnToDisplayFormat(preferredIAddress).toLowerCase()
        : null;
      const identities = Object.keys(sourceLinkedIds || {}).flatMap(chainId =>
        Object.keys(sourceLinkedIds[chainId] || {}).map(iAddress => ({
          chainId,
          iAddress,
          friendlyName: sourceLinkedIds[chainId][iAddress],
        })),
      );

      identities.sort((left, right) => {
        if (preferredKey) {
          const isPreferred = identity => {
            const friendlyName = (identity.friendlyName || '').toLowerCase();

            return (
              identity.iAddress.toLowerCase() === preferredKey ||
              friendlyName === preferredKey ||
              friendlyName === preferredDisplayKey
            );
          };
          const leftPreferred = isPreferred(left) ? 0 : 1;
          const rightPreferred = isPreferred(right) ? 0 : 1;

          if (leftPreferred !== rightPreferred) {
            return leftPreferred - rightPreferred;
          }
        }

        return (left.friendlyName || '').localeCompare(
          right.friendlyName || '',
        );
      });

      return (
        identities.find(identity =>
          isLinkedIdentityAllowed(
            sourceLinkedIds,
            identity.chainId,
            identity.iAddress,
          ),
        ) || null
      );
    },
    [isLinkedIdentityAllowed],
  );

  const isAutoLinkCandidateAllowed = useCallback(
    candidate => {
      const chainId = candidate?.chainId || linkChainId;
      const identityAddress = candidate?.identityAddress;
      const fullyQualifiedName = candidate?.fullyQualifiedName;

      if (!chainId || !identityAddress || !fullyQualifiedName) return false;

      return isLinkedIdentityAllowed(
        {
          [chainId]: {
            [identityAddress]: fullyQualifiedName,
          },
        },
        chainId,
        identityAddress,
      );
    },
    [isLinkedIdentityAllowed, linkChainId],
  );

  const reloadLinkedIdsAndSelect = useCallback(
    async ({
      preferredIAddress = null,
      reopenIdentitySheet = false,
      isCurrent,
    } = {}) => {
      const shouldApply = () =>
        typeof isCurrent === 'function' ? isCurrent() : true;

      if (shouldApply()) setLinkedIdsLoaded(false);

      const nextLinkedIds = await loadLinkedIds(isCurrent);
      const nextIdentity = getAllowedIdentityFromLinkedIds(
        nextLinkedIds,
        preferredIAddress,
      );

      if (nextIdentity) {
        if (shouldApply()) {
          setSelectedIdentity(nextIdentity);
          setIdentitySheetVisible(false);
        }
        return true;
      }

      if (reopenIdentitySheet && shouldApply()) {
        setIdentitySheetVisible(true);
      }

      return false;
    },
    [getAllowedIdentityFromLinkedIds, loadLinkedIds],
  );

  const getConstraintAddress = constraint => {
    if (constraint == null || constraint.identity == null) return null;
    return toAddressString(constraint.identity);
  };

  const getConstraintDisplayName = (constraintType, constraintAddress) => {
    if (constraintAddress && constraintFriendlyNames[constraintAddress]) {
      return constraintFriendlyNames[constraintAddress];
    }

    if (
      constraintType === RecipientConstraint.REQUIRED_SYSTEM &&
      constraintAddress
    ) {
      const systemName =
        resolvedSystemNames[constraintAddress] ||
        getOfflineSystemName(constraintAddress);
      if (systemName) return systemName;
      return 'Unknown system';
    }

    if (constraintAddress && constraintAddress.includes('@')) {
      return constraintAddress;
    }

    return constraintAddress || 'Unknown identity';
  };

  const getConstraintRowData = constraint => {
    const constraintAddress = getConstraintAddress(constraint);
    let constraintValue = getConstraintDisplayName(
      constraint.type,
      constraintAddress,
    );

    // Use resolved friendly name if available
    const friendlyName = constraintFriendlyNames[constraintValue];
    if (
      friendlyName &&
      constraint.type !== RecipientConstraint.REQUIRED_SYSTEM
    ) {
      constraintValue = friendlyName;
    }

    switch (constraint.type) {
      case RecipientConstraint.REQUIRED_ID:
        return {label: 'Required identity', value: constraintValue};
      case RecipientConstraint.REQUIRED_SYSTEM: {
        const systemValue = constraintValue.endsWith('@')
          ? constraintValue.substring(0, constraintValue.length - 1)
          : constraintValue;
        return {label: 'Required system', value: systemValue};
      }
      case RecipientConstraint.REQUIRED_PARENT:
        return {label: 'Required parent', value: constraintValue};
      default:
        return {label: 'Constraint', value: constraintValue};
    }
  };

  const getExpiryLabel = () => {
    if (!details || !details.hasExpiryTime()) return null;
    return unixToDate(details.expiryTime.toNumber());
  };

  const getVerusId = async (chain, iAddrOrName) => {
    const coinObj = CoinDirectory.getBasicCoinObj(chain);
    if (!coinObj) throw new Error('Signer network is not available');

    const identity = await getIdentity(coinObj.system_id, iAddrOrName);

    if (identity.error) throw new Error(identity.error.message);
    else return identity.result;
  };

  const loadSignerVerusId = useCallback(() => {
    if (!canOpenSignerDetails) {
      throw new Error('Signer identity is not available');
    }

    return getVerusId(signerChainId, signerIdentityID);
  }, [canOpenSignerDetails, signerChainId, signerIdentityID]);
  const loadSignerFriendlyNames = useCallback(
    async identityObj => {
      try {
        const coinObj = CoinDirectory.getBasicCoinObj(signerChainId);
        if (!coinObj) throw new Error('Signer network is not available');

        return getFriendlyNameMap(coinObj.system_id, identityObj);
      } catch (e) {
        return {
          ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
          ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
        };
      }
    },
    [signerChainId],
  );

  const getAllowList = () => {
    if (requestIsTestnet) {
      return (accounts || []).filter(
        x => x.testnetOverrides && Object.keys(x.testnetOverrides).length > 0,
      );
    }
    return (accounts || []).filter(
      x => !x.testnetOverrides || Object.keys(x.testnetOverrides).length === 0,
    );
  };
  // No wallet on this device can answer the request. The screen disables the
  // wallet action and says why.
  const noRequestNetworkWallet =
    !activeAccountMatchesRequest && getAllowList().length === 0;
  const requestNetworkName = requestIsTestnet ? 'testnet' : 'mainnet';

  const showContinueError = error => {
    console.warn(error);
    const {title, message} = getContinueErrorCopy(error, requestIsTestnet);

    createAlert(
      title,
      message,
      [
        {
          text: 'Close',
          onPress: () => {
            cancel();
            resolveAlert(true);
          },
        },
      ],
      {
        cancelable: false,
      },
    );
  };

  // Build response using selected identity and call next()
  const buildResponseAndContinue = async () => {
    // Re-check immediately before signing. A request can expire while the user
    // is choosing an identity or authenticating a profile.
    assertAuthenticationRequestNotExpired(details);

    const {chainId, iAddress} = selectedIdentity;
    const requestID =
      request && request.requestID ? request.requestID : details.requestID;
    if (!response) {
      throw new Error('Missing generic response');
    }

    const responseDetail = new AuthenticationResponseOrdinalVDXFObject({
      data: new AuthenticationResponseDetails({
        requestID,
      }),
    });

    const baseResponse = new GenericResponse();
    if (response.details && response.details.length > 0) {
      baseResponse.fromBuffer(response.toBuffer(), 0);
    } else {
      Object.assign(baseResponse, response);
      baseResponse.details = [];
    }
    if (baseResponse.details == null) baseResponse.details = [];
    baseResponse.details = [...baseResponse.details, responseDetail];
    baseResponse.setFlags();

    const coinObj = CoinDirectory.findCoinObj(chainId);
    if (!coinObj) throw new Error('Unsupported signing chain.');

    ensureGenericResponseSigner({
      response: baseResponse,
      systemID: coinObj.system_id,
      identityID: iAddress,
    });

    const handledIndices = [detailIndex];
    if (
      provisioningDetailIndex != null &&
      !handledIndices.includes(provisioningDetailIndex)
    ) {
      handledIndices.push(provisioningDetailIndex);
    }

    await next(baseResponse, handledIndices, {
      autoDeliverOnComplete: true,
      responseIdentityName: selectedIdentity.friendlyName,
    });
  };

  const handleContinue = async () => {
    if (activeAccountMatchesRequest) {
      if (!selectedIdentity) {
        handleOpenIdentitySheet();
        return;
      }

      try {
        await buildResponseAndContinue();
      } catch (e) {
        showContinueError(e);
      }

      return;
    }

    const allowList = getAllowList();

    // The action is disabled with its reason on screen.
    if (allowList.length === 0) return;

    try {
      setOpenIdentityAfterUnlock(false);
      await requestWalletUnlock({
        reason: 'authentication-request',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'Authentication request',
        accountHashes: allowList.map(account => account.accountHash),
        networkLabel: requestIsTestnet ? 'Testnet' : 'Mainnet',
      });
      setOpenIdentityAfterUnlock(true);
    } catch (e) {
      if (e?.code !== WALLET_UNLOCK_CANCELLED) {
        createAlert(
          'Cannot continue',
          e?.message || 'Unable to unlock wallet.',
        );
      }
    }
  };

  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(
      SEND_MODAL_PROVISION_IDENTITY_BACK_TARGET_AUTH_PICKER,
      () => {
        if (
          launchedSendModalRef.current?.type !== PROVISION_IDENTITY_SEND_MODAL ||
          launchedSendModalRef.current?.intent !== 'user'
        ) {
          return;
        }

        launchedSendModalRef.current = null;
        setIdentitySheetInitialMode(VERUSID_SHEET_MODES.CHOOSE);
        setIdentitySheetVisible(true);
      },
    );

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!idProvisionSuccess && sendModal.data?.success) {
      setIdProvisionSuccess(true);
      return;
    }

    if (
      idProvisionSuccess &&
      !sendModal.visible &&
      sendModalType == null &&
      !successNavigationStartedRef.current
    ) {
      successNavigationStartedRef.current = true;

      const finishSuccessfulModal = async () => {
        launchedSendModalRef.current = null;
        // The request is finished. A stored request would reopen on the next
        // link instead of that link's own request.
        dispatch(resetDeeplinkData());

        // Close over the open wallet on the VerusID tab, so Home stays mounted.
        exitRequestToStack(props.navigation, 'SignedInStack', {
          screen: 'Home',
          params: {
            screen: 'IdentityTab',
          },
        });
      };

      finishSuccessfulModal().catch(e => {
        console.warn('Unable to finish successful authentication modal', e);
        exitRequestToStack(props.navigation, 'SignedInStack');
      });
    }
  }, [
    idProvisionSuccess,
    sendModal.data?.success,
    sendModal.visible,
    sendModalType,
    props.navigation,
  ]);

  const expiryLabel = getExpiryLabel();
  const constraints =
    details && details.recipientConstraints ? details.recipientConstraints : [];
  const constraintRows = useMemo(() => {
    const rows = [];

    if (constraints.length > 0) {
      constraints.forEach((constraint, index) => {
        const rowData = getConstraintRowData(constraint);
        rows.push({
          key: `constraint-${index}`,
          ...rowData,
        });
      });
    }

    return rows;
  }, [constraints, constraintFriendlyNames]);

  const requestIdLabel = getRequestIdDisplay(details);

  useEffect(() => {
    if (detailsBufferString) {
      const det = new AuthenticationRequestDetails();
      det.fromBuffer(Buffer.from(detailsBufferString, 'hex'), 0);
      setDetails(det);
    }
  }, [detailsBufferString]);


  useEffect(() => {
    let cancelled = false;

    const loadConstraintFriendlyNames = async () => {
      if (recipientConstraints.length === 0) {
        setConstraintFriendlyNames(prev =>
          Object.keys(prev).length > 0 ? {} : prev,
        );
        return;
      }

      const names = {
        ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
        ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
      };
      const lookupSystemId =
        requiredSystemIds.length === 1
          ? requiredSystemIds[0]
          : signerSystemID || defaultRootSystemId;

      for (const constraint of recipientConstraints) {
        const constraintAddress = getConstraintAddress(constraint);
        if (!constraintAddress) {
          continue;
        }

        if (constraint.type === RecipientConstraint.REQUIRED_SYSTEM) {
          const resolvedSystemName =
            resolvedSystemNames[constraintAddress] ||
            getOfflineSystemName(constraintAddress);

          if (resolvedSystemName) {
            names[constraintAddress] = resolvedSystemName;
          }

          continue;
        }

        if (constraint.type === RecipientConstraint.REQUIRED_PARENT) {
          if (parentConstraintFriendlyNames[constraintAddress]) {
            names[constraintAddress] =
              parentConstraintFriendlyNames[constraintAddress];
          }

          continue;
        }

        try {
          const identity = await getIdentity(lookupSystemId, constraintAddress);
          if (!identity.error && identity.result?.fullyqualifiedname) {
            names[constraintAddress] = convertFqnToDisplayFormat(
              identity.result.fullyqualifiedname,
            );
          }
        } catch (e) {
          // Keep i-address fallback when cross-chain resolution is unavailable.
        }
      }

      if (!cancelled) {
        setConstraintFriendlyNames(names);
      }
    };

    loadConstraintFriendlyNames();

    return () => {
      cancelled = true;
    };
  }, [
    defaultRootSystemId,
    recipientConstraints,
    requiredSystemIds,
    parentConstraintFriendlyNames,
    resolvedSystemNames,
    signerSystemID,
  ]);

  // Load linked identities when encrypted IDs change (user signs in / links ID)
  useEffect(() => {
    if (signedIn) {
      setLinkedIdsLoaded(false);
      loadLinkedIds();
    } else {
      setLinkedIds({});
      setPendingIds({});
      setCompletedProvisioningRequests({});
      setLinkedIdsLoaded(false);
    }
  }, [encryptedIds, loadLinkedIds, signedIn]);

  // Sort identities alphabetically by friendly name per chain
  useEffect(() => {
    const sorted = {};
    for (const chainId of Object.keys(linkedIds)) {
      sorted[chainId] = linkedIds[chainId]
        ? Object.keys(linkedIds[chainId]).sort((a, b) => {
            const nameA = linkedIds[chainId][a] || '';
            const nameB = linkedIds[chainId][b] || '';
            return nameA.localeCompare(nameB);
          })
        : [];
    }
    setSortedIds(sorted);
  }, [linkedIds]);

  useEffect(() => {
    let cancelled = false;

    const loadLinkedIdentityParents = async () => {
      const parentMap = {};
      const identities = Object.keys(linkedIds).flatMap(chainId =>
        Object.keys(linkedIds[chainId] || {}).map(iAddress => ({
          chainId,
          iAddress,
          fullyqualifiedname: linkedIds[chainId][iAddress],
        })),
      );

      if (identities.length === 0) {
        if (!cancelled) {
          setLinkedIdentityParentIds({});
          setLinkedIdentityParentsLoaded(true);
        }
        return;
      }

      await Promise.all(
        identities.map(async ({chainId, iAddress, fullyqualifiedname}) => {
          const mapKey = `${chainId}:${iAddress}`;

          try {
            parentMap[mapKey] = fqnToParentAddress(fullyqualifiedname, chainId);
          } catch (e) {
            parentMap[mapKey] = null;
          }
        }),
      );

      if (!cancelled) {
        setLinkedIdentityParentIds(parentMap);
        setLinkedIdentityParentsLoaded(true);
      }
    };

    if (!signedIn) {
      setLinkedIdentityParentIds(prev =>
        Object.keys(prev).length > 0 ? {} : prev,
      );
      setLinkedIdentityParentsLoaded(false);
      return () => {
        cancelled = true;
      };
    }

    if (requiredParentIds.size === 0) {
      setLinkedIdentityParentIds(prev =>
        Object.keys(prev).length > 0 ? {} : prev,
      );
      setLinkedIdentityParentsLoaded(true);
      return () => {
        cancelled = true;
      };
    }

    setLinkedIdentityParentsLoaded(false);
    loadLinkedIdentityParents();

    return () => {
      cancelled = true;
    };
  }, [linkedIds, signedIn, requiredParentIds]);

  const handleOpenLinkExistingSheet = () => {
    if (!eligibilityReady) return;

    setIdentitySheetInitialMode(VERUSID_SHEET_MODES.LINK);
    setIdentitySheetVisible(true);
  };

  // The automatic passthrough link failed. Route it into the shared manual
  // LinkExistingVerusIdSheet step with the request network and the FQN
  // prefilled instead of the legacy SendModal link UI.
  const openPassthroughLinkFallback = useCallback(
    identityAddress => {
      // The generic-request resume bookkeeping (marking the pending deeplink
      // complete) runs in the shared link handler once the manual link
      // succeeds.
      setIdentitySheetInitialManualValue(identityAddress || '');
      setIdentitySheetInitialMode(VERUSID_SHEET_MODES.LINK);
      setIdentitySheetVisible(true);
    },
    [],
  );

  const linkIdentityCandidate = useCallback(
    async (candidate, {showError = true, isCurrent: callerIsCurrent} = {}) => {
      const shouldApply = () =>
        typeof callerIsCurrent === 'function' ? callerIsCurrent() : true;
      const requestContext = {
        sessionScope: captureSessionScope(
          Store.getState(),
          renderedAccountHash,
        ),
      };
      const operationToken = linkOperationRef.current + 1;
      linkOperationRef.current = operationToken;
      const isOperationCurrent = () =>
        linkOperationRef.current === operationToken &&
        shouldApply() &&
        sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope);
      const assertSessionCurrent = () => {
        if (!isOperationCurrent()) {
          const error = new Error(
            'Account changed while the VerusID was being linked.',
          );
          error.code = SESSION_CHANGED;
          throw error;
        }
      };

      // The candidate belongs to the account this screen rendered. If the store
      // account already moved on, the link must not run against the new one.
      assertSessionCurrent();

      try {
        const candidateChainId = candidate?.chainId || linkChainId;
        const identityAddress = candidate?.identityAddress;
        const fullyQualifiedName = candidate?.fullyQualifiedName;
        const primaryAddresses =
          candidate?.identity?.primaryaddresses ||
          candidate?.identity?.primaryAddresses ||
          [];
        const displayName =
          candidate?.displayName ||
          (fullyQualifiedName
            ? convertFqnToDisplayFormat(fullyQualifiedName)
            : null);

        if (!activeAccount?.id) {
          throw new Error('You must be signed in to link VerusIDs.');
        }

        if (
          !candidate ||
          !identityAddress ||
          !fullyQualifiedName ||
          !displayName
        ) {
          throw new Error('Unable to link this VerusID.');
        }

        if (candidate.status !== 'active') {
          throw new Error('Only active VerusIDs can be linked.');
        }

        if (
          !candidate.primaryAddress ||
          !primaryAddresses.includes(candidate.primaryAddress)
        ) {
          throw new Error(
            'Ensure that your wallet address for this account matches a primary address of the VerusID you are trying to add.',
          );
        }

        if (!isAutoLinkCandidateAllowed(candidate)) {
          throw new Error(
            'This VerusID does not match the request requirements.',
          );
        }

        // The candidate's chosen primary R-address must belong to the account
        // that is scoped right now, not only to the identity's own primary
        // address list, and its origin session must still be live. A candidate
        // resolved for another account is rejected even if the sheet stayed
        // mounted across the switch.
        const liveState = Store.getState();

        if (
          candidate?.origin &&
          !identityLinkOriginIsCurrent(liveState, candidate.origin)
        ) {
          const sessionError = new Error(
            'Account changed while the VerusID was being linked.',
          );
          sessionError.code = SESSION_CHANGED;
          throw sessionError;
        }

        if (!identityLinkCandidateMatchesAccount(liveState, candidate)) {
          throw new Error(
            'Ensure that your wallet address for this account matches a primary address of the VerusID you are trying to add.',
          );
        }

        const coinObj = CoinDirectory.findCoinObj(candidateChainId);

        await linkVerusId(
          identityAddress,
          displayName,
          coinObj.id,
          requestContext,
        );
        assertSessionCurrent();
        await updateVerusIdWallet(requestContext);
        assertSessionCurrent();
        clearChainLifecycle(coinObj.id);

        const setUserCoinsAction = setUserCoins(
          activeCoinList,
          activeAccount.id,
        );
        assertSessionCurrent();
        dispatch(setUserCoinsAction);
        refreshActiveChainLifecycles(
          setUserCoinsAction.payload.activeCoinsForUser,
        );

        assertSessionCurrent();
        const selectedLinkedIdentity = await reloadLinkedIdsAndSelect({
          preferredIAddress: identityAddress,
          isCurrent: isOperationCurrent,
        });

        if (!isOperationCurrent()) return;

        if (!selectedLinkedIdentity) {
          setSelectedIdentity({
            chainId: coinObj.id,
            iAddress: identityAddress,
            friendlyName: displayName,
          });
          setIdentitySheetVisible(false);
        }

        // Preserve the request-resume bookkeeping the legacy link modal used to
        // perform: the pending generic request is marked complete under the
        // session that linked it, so the request does not strand.
        if (pendingDeeplinkId) {
          try {
            await markPendingDeeplinkComplete(pendingDeeplinkId);
          } catch (e) {
            console.warn('Unable to mark pending deeplink complete', e);
          }
        }

        // Hand the exact link context back so provisioning cleanup runs under
        // the session that performed the link.
        return {
          coinObj,
          requestContext,
          sessionScope: requestContext.sessionScope,
        };
      } catch (e) {
        if (showError && isOperationCurrent()) {
          createAlert('Error', e?.message || 'Unable to link VerusID.');
        }

        throw e;
      }
    },
    [
      activeAccount,
      activeCoinList,
      dispatch,
      isAutoLinkCandidateAllowed,
      linkChainId,
      pendingDeeplinkId,
      renderedAccountHash,
      reloadLinkedIdsAndSelect,
    ],
  );

  const linkAutoFoundIdentity = useCallback(
    candidate => linkIdentityCandidate(candidate, {showError: false}),
    [linkIdentityCandidate],
  );

  const getProvisioningIdentityCandidate = useCallback(
    async identityToLink => {
      const coinObj = CoinDirectory.findCoinObj(linkChainId);
      const identityRes = await getIdentity(coinObj.system_id, identityToLink);

      if (identityRes.error) {
        throw new Error(identityRes.error.message);
      }

      const identityResult = identityRes.result || {};
      const identity = identityResult.identity || {};
      const identityAddress =
        identity.identityaddress ||
        identity.identityAddress ||
        identityResult.identityaddress ||
        identityResult.identityAddress ||
        null;
      const fullyQualifiedName =
        identityResult.fullyqualifiedname ||
        identityResult.fullyQualifiedName ||
        null;
      const displayName = fullyQualifiedName
        ? convertFqnToDisplayFormat(fullyQualifiedName)
        : null;
      const primaryAddresses =
        identity.primaryaddresses || identity.primaryAddresses || [];
      const walletAddresses =
        activeAccount?.keys?.[coinObj.id]?.[VRPC]?.addresses || [];
      const ownedPrimaryAddress = primaryAddresses.find(address =>
        walletAddresses.includes(address),
      );

      if (!ownedPrimaryAddress) {
        throw new Error(
          'Ensure that your wallet address for this account matches a primary address of the VerusID you are trying to add.',
        );
      }

      return {
        chainId: coinObj.id,
        displayName,
        fullyQualifiedName,
        identity,
        identityAddress,
        primaryAddress: ownedPrimaryAddress,
        status: identityResult.status,
        systemId: coinObj.system_id,
      };
    },
    [activeAccount, linkChainId],
  );

  const cleanupProvisioningState = useCallback(
    async (
      coinObj,
      identityAddress,
      notificationUid = null,
      requestContext = null,
    ) => {
      const sessionScope = requestContext?.sessionScope || null;
      const sessionIsCurrent = () =>
        sessionScope == null ||
        sessionScopeIsCurrent(Store.getState(), sessionScope);
      const shouldApply = () =>
        authRequestMountedRef.current && sessionIsCurrent();

      // Provisioning bookkeeping is an unscoped side effect. It only runs while
      // the session that performed the link is still the active one.
      if (shouldApply() && pendingDeeplinkId) {
        try {
          await markPendingDeeplinkComplete(pendingDeeplinkId);
        } catch (e) {
          console.warn('Unable to mark pending deeplink complete', e);
        }
      }

      if (shouldApply() && identityAddress) {
        try {
          await deleteProvisionedIds(
            identityAddress,
            coinObj.id,
            true,
            requestContext,
          );
          await updatePendingVerusIds(requestContext);
        } catch (e) {
          console.warn(
            'Unable to remove pending VerusID provisioning state',
            e,
          );
        }
      }

      if (shouldApply() && notificationUid) {
        try {
          await dispatchRemoveNotification(notificationUid);
        } catch (e) {
          console.warn('Unable to remove VerusID ready notification', e);
        }
      }
    },
    [pendingDeeplinkId],
  );

  useEffect(() => {
    if (!signedIn) return undefined;
    if (!activeAccountMatchesRequest) return undefined;
    if (!(passthrough && passthrough.fqnToAutoLink)) return undefined;
    if (requiredSystemIds.length > 0 && !requiredSystemsResolved) {
      return undefined;
    }
    if (passthroughAutoLinkStartedRef.current) return undefined;

    passthroughAutoLinkStartedRef.current = true;

    const identityToAutoLink = passthrough.fqnToAutoLink;
    const notificationUid = passthrough.notificationUid;
    // The login request belongs to the account that is signed in when this
    // effect starts. Its context gates every later cleanup side effect.
    const sessionScope = captureSessionScope(
      Store.getState(),
      renderedAccountHash,
    );
    const sessionIsCurrent = () =>
      sessionScopeIsCurrent(Store.getState(), sessionScope);

    const autoLinkPassthroughIdentity = async () => {
      setAutoLinkingVisible(true);

      try {
        const candidate = await getProvisioningIdentityCandidate(
          identityToAutoLink,
        );
        const linkResult = await linkIdentityCandidate(candidate, {
          showError: false,
          isCurrent: sessionIsCurrent,
        });

        // The link context was invalidated before it completed: nothing was
        // linked for this session, so there is nothing to clean up or show.
        if (!linkResult) return;

        await cleanupProvisioningState(
          linkResult.coinObj,
          candidate.identityAddress,
          notificationUid,
          linkResult.requestContext,
        );
      } catch (e) {
        console.warn(
          'Unable to auto-link passthrough VerusID',
          e?.message ?? e,
        );

        // A session change is not a link failure: the new account must not get
        // this request's failure alert or fallback link sheet.
        if (e?.code === SESSION_CHANGED || !sessionIsCurrent()) {
          return;
        }

        if (authRequestMountedRef.current) {
          setAutoLinkingVisible(false);
          await createAlert(
            'Automatic link failed',
            `${getLinkFailureMessage(e)} Check the VerusID, then link it manually.`,
          );

          if (authRequestMountedRef.current) {
            openPassthroughLinkFallback(identityToAutoLink);
          }
        }

        return;
      }

      if (authRequestMountedRef.current) {
        setAutoLinkingVisible(false);
      }
    };

    autoLinkPassthroughIdentity();

    return undefined;
  }, [
    activeAccountMatchesRequest,
    cleanupProvisioningState,
    getProvisioningIdentityCandidate,
    linkIdentityCandidate,
    openPassthroughLinkFallback,
    passthrough,
    renderedAccountHash,
    requiredSystemIds.length,
    requiredSystemsResolved,
    signedIn,
  ]);

  const openProvisionIdentityModalFromChain = () => {
    if (!provisioningDetailsBufferString) return;

    try {
      const provisioningDetails = new ProvisionIdentityDetails();
      provisioningDetails.fromBuffer(
        Buffer.from(provisioningDetailsBufferString, 'hex'),
        0,
      );

      const systemId = provisioningDetails.systemID
        ? provisioningDetails.systemID.toAddress()
        : null;
      const provisioningCoinObj = systemId
        ? CoinDirectory.findCoinObj(systemId, null, true)
        : CoinDirectory.findCoinObj(linkChainId);

      const requestId =
        request && request.requestID ? request.requestID.toAddress() : null;
      const requestSignerId =
        signerIdentityID ||
        (request && request.signature
          ? request.signature.identityID.toIAddress()
          : null);
      launchedSendModalRef.current = {
        type: PROVISION_IDENTITY_SEND_MODAL,
        intent: 'user',
        identityAddress: provisioningDetails.identityID
          ? provisioningDetails.identityID.toAddress()
          : null,
      };

      setIdentitySheetVisible(false);
      openProvisionIdentityModal(
        provisioningCoinObj,
        {
          provisioningDetailsBufferString,
          provisioningRequestID: requestId,
          provisioningSignerId: requestSignerId,
          provisioningRequestBufferString: requestBufferString || '',
          provisioningRequestType: 'generic',
          provisioningRequestHasResponseUris: responseUris.length > 0,
          [SEND_MODAL_PROVISION_IDENTITY_BACK_TARGET]:
            SEND_MODAL_PROVISION_IDENTITY_BACK_TARGET_AUTH_PICKER,
        },
        fromService,
      );
    } catch (e) {
      console.warn(e);
      createAlert(
        'Cannot request VerusID',
        'The wallet could not read the VerusID details in this request. Ask the requester for a new request.',
      );
    }
  };

  const provisioningTargetIdentityAddress = useMemo(() => {
    if (!provisioningDetailsBufferString) return null;

    try {
      const provisioningDetails = new ProvisionIdentityDetails();
      provisioningDetails.fromBuffer(
        Buffer.from(provisioningDetailsBufferString, 'hex'),
        0,
      );

      return provisioningDetails.identityID
        ? provisioningDetails.identityID.toAddress()
        : null;
    } catch (e) {
      return null;
    }
  }, [provisioningDetailsBufferString]);

  const linkedProvisioningTarget = useMemo(() => {
    if (!provisioningTargetIdentityAddress) return null;

    for (const chainId of Object.keys(linkedIds)) {
      const friendlyName = linkedIds[chainId]?.[provisioningTargetIdentityAddress];

      if (friendlyName) {
        return {
          chainId,
          displayName: friendlyName,
          iAddress: provisioningTargetIdentityAddress,
          requestKey: provisioningRequestKey,
          status: PROVISIONING_REQUEST_STATUSES.LINKED,
        };
      }
    }

    return null;
  }, [linkedIds, provisioningRequestKey, provisioningTargetIdentityAddress]);

  const hasProvisioningDetails = Boolean(provisioningDetailsBufferString);

  const provisioningRequestState = useMemo(() => {
    if (!hasProvisioningDetails) return null;

    if (linkedProvisioningTarget) return linkedProvisioningTarget;

    return getProvisioningRequestState({
      completedProvisioningRequests,
      linkedIds,
      pendingIds,
      requestKey: provisioningRequestKey,
    });
  }, [
    completedProvisioningRequests,
    hasProvisioningDetails,
    linkedIds,
    linkedProvisioningTarget,
    pendingIds,
    provisioningRequestKey,
  ]);

  const shouldShowProvisioningInChooser =
    hasProvisioningDetails &&
    provisioningRequestState?.status !== PROVISIONING_REQUEST_STATUSES.LINKED;

  const handleUseProvisionedIdentity = useCallback(async () => {
    if (
      provisioningRequestState?.status !==
        PROVISIONING_REQUEST_STATUSES.READY ||
      !provisioningRequestState?.iAddress
    ) {
      return;
    }

    setIdentitySheetVisible(false);
    setAutoLinkingVisible(true);
    // The provisioning target belongs to the account this screen rendered.
    const sessionScope = captureSessionScope(
      Store.getState(),
      renderedAccountHash,
    );
    const sessionIsCurrent = () =>
      sessionScopeIsCurrent(Store.getState(), sessionScope);

    try {
      const candidate = await getProvisioningIdentityCandidate(
        provisioningRequestState.iAddress,
      );

      const linkResult = await linkIdentityCandidate(candidate, {
        showError: false,
        isCurrent: sessionIsCurrent,
      });

      if (!linkResult) return;

      await cleanupProvisioningState(
        linkResult.coinObj,
        candidate.identityAddress,
        provisioningRequestState?.storedEntry?.notificationUid,
        linkResult.requestContext,
      );
    } catch (e) {
      // A session change is not a link failure: the new account must not get
      // this request's failure alert or fallback sheet.
      if (e?.code === SESSION_CHANGED || !sessionIsCurrent()) {
        return;
      }

      if (authRequestMountedRef.current) {
        console.warn(e);
        // The chooser has no error slot, so the reason stays in an alert.
        await createAlert(
          'Cannot use this VerusID',
          `${getLinkFailureMessage(e)} Choose another VerusID, or try again.`,
        );
        setIdentitySheetInitialMode(VERUSID_SHEET_MODES.CHOOSE);
        setIdentitySheetVisible(true);
      }
    } finally {
      if (authRequestMountedRef.current && sessionIsCurrent()) {
        setAutoLinkingVisible(false);
      }
    }
  }, [
    cleanupProvisioningState,
    getProvisioningIdentityCandidate,
    linkIdentityCandidate,
    provisioningRequestState,
    renderedAccountHash,
  ]);

  // Identity sheet handlers
  const handleOpenIdentitySheet = () => {
    if (!eligibilityReady) return;
    setIdentitySheetInitialMode(VERUSID_SHEET_MODES.CHOOSE);
    setIdentitySheetVisible(true);
  };

  const handleSelectIdentity = (chainId, iAddress, friendlyName) => {
    setSelectedIdentity({chainId, iAddress, friendlyName});
    setIdentitySheetVisible(false);
  };

  // The prefilled manual value only belongs to the passthrough-fallback
  // opening. Clear it once that sheet closes so a later open never starts on a
  // stale FQN.
  useEffect(() => {
    if (!identitySheetVisible) {
      setIdentitySheetInitialManualValue('');
    }
  }, [identitySheetVisible]);

  const hasRequirements = constraintRows.length > 0;
  const hasMatchingIdentity = useMemo(() => {
    for (const chainId of Object.keys(linkedIds)) {
      const chainIdentityAddresses = Object.keys(linkedIds[chainId] || {});
      for (const iAddress of chainIdentityAddresses) {
        if (isIdentityAllowed(chainId, iAddress)) {
          return true;
        }
      }
    }

    return false;
  }, [
    linkedIds,
    requiredIds,
    requiredSystemIds,
    requiredSystemsResolved,
    allowedSystems,
    requiredParentIds,
    linkedIdentityParentIds,
    linkedIdentityParentsLoaded,
  ]);
  const eligibilityReady =
    linkedIdsLoaded &&
    (requiredSystemIds.length === 0 || requiredSystemsResolved) &&
    (requiredParentIds.size === 0 || linkedIdentityParentsLoaded);

  useEffect(() => {
    if (!openIdentityAfterUnlock) return;
    if (!activeAccountMatchesRequest) return;
    if (!eligibilityReady) return;

    setOpenIdentityAfterUnlock(false);

    if (hasMatchingIdentity || shouldShowProvisioningInChooser) {
      setIdentitySheetInitialMode(VERUSID_SHEET_MODES.CHOOSE);
      setIdentitySheetVisible(true);
    } else {
      setIdentitySheetInitialMode(VERUSID_SHEET_MODES.LINK);
      setIdentitySheetVisible(true);
    }
  }, [
    activeAccountMatchesRequest,
    eligibilityReady,
    hasMatchingIdentity,
    openIdentityAfterUnlock,
    shouldShowProvisioningInChooser,
  ]);

  const shouldShowLinkAsPrimary =
    activeAccountMatchesRequest &&
    eligibilityReady &&
    !selectedIdentity &&
    !shouldShowProvisioningInChooser &&
    !hasMatchingIdentity;
  // Another review follows in a mixed request, and nothing is sent until it
  // finishes, so the action names that review instead of signing in.
  const primaryActionLabel = activeAccountMatchesRequest
    ? selectedIdentity
      ? nextStepActionLabel || 'Sign in'
      : shouldShowLinkAsPrimary
      ? 'Link VerusID'
      : 'Choose VerusID'
    : signedIn
    ? 'Switch wallet'
    : 'Unlock wallet';
  const primaryActionHandler = activeAccountMatchesRequest
    ? selectedIdentity
      ? handleContinue
      : shouldShowLinkAsPrimary
      ? handleOpenLinkExistingSheet
      : handleOpenIdentitySheet
    : handleContinue;
  const linkExistingCoinObj = CoinDirectory.findCoinObj(linkChainId);
  const activeAccountInstruction = !activeAccountMatchesRequest
    ? noRequestNetworkWallet
      ? `This request needs a ${requestNetworkName} wallet. Add one, then open the request again.`
      : signedIn
      ? 'Switch wallet first, then select identity.'
      : 'Unlock wallet first, then select identity.'
    : null;
  const requestDetailsSections = useMemo(() => {
    const responseRows = [
      ...responseUris.map((uri, index) => ({
        label:
          responseUris.length > 1
            ? `Response URI ${index + 1}`
            : 'Response URI',
        value: uri.getUriString(),
        copy: true,
      })),
      expiryLabel ? {label: 'Expires', value: expiryLabel} : null,
      requestIdLabel ? {label: 'Request ID', value: requestIdLabel} : null,
    ].filter(Boolean);
    const requirementRows = constraintRows.map(row => ({
      label: row.label,
      value: row.value,
    }));
    const walletRows = [
      {
        label: 'Wallet state',
        value: activeAccountMatchesRequest
          ? 'Ready for this request'
          : noRequestNetworkWallet
          ? `No ${requestNetworkName} wallet`
          : signedIn
          ? 'Switch wallet required'
          : 'Unlock wallet required',
      },
      selectedIdentity
        ? {
            label: 'Selected identity',
            value: selectedIdentity.friendlyName,
          }
        : {label: 'Selected identity', value: 'Not selected'},
    ];

    return [
      {title: 'Response', rows: responseRows},
      {title: 'Requirements', rows: requirementRows},
      {title: 'Wallet', rows: walletRows},
    ].filter(section => section.rows.length > 0);
  }, [
    activeAccountMatchesRequest,
    constraintRows,
    expiryLabel,
    noRequestNetworkWallet,
    requestIdLabel,
    requestNetworkName,
    responseUris,
    selectedIdentity,
    signedIn,
  ]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <IdentityPickerSheet
        visible={identitySheetVisible}
        coinObj={linkExistingCoinObj}
        isCandidateAllowed={isAutoLinkCandidateAllowed}
        linkedIds={linkedIds}
        sortedIds={sortedIds}
        isIdentityAllowed={isIdentityAllowed}
        selectedIdentity={selectedIdentity}
        provisioningEnabled={shouldShowProvisioningInChooser}
        provisioningRequestState={provisioningRequestState}
        initialMode={identitySheetInitialMode}
        initialManualValue={identitySheetInitialManualValue}
        onClose={() => setIdentitySheetVisible(false)}
        onLinkCandidate={linkAutoFoundIdentity}
        onRequestVerusId={
          shouldShowProvisioningInChooser
            ? openProvisionIdentityModalFromChain
            : undefined
        }
        onSelect={handleSelectIdentity}
        onUseProvisionedIdentity={handleUseProvisionedIdentity}
      />
      <AutoLinkingSheet visible={autoLinkingVisible} styles={styles} />
      <DeepLinkReviewScrollView showScrollCue requestCard>
        <RequestCard
          action="wants you to sign in"
          requester={{request, signerFqn, signerIdentityID, signerSystemID, signerSystemName: systemLabel, sigtime,
            loadVerusId: loadSignerVerusId, loadFriendlyNames: loadSignerFriendlyNames}}
          sections={requestDetailsSections}
          showResponder={!shouldShowLinkAsPrimary}
          responderName={activeAccountMatchesRequest ? selectedIdentity?.friendlyName : null}
          onPressResponder={activeAccountMatchesRequest && eligibilityReady && !shouldShowLinkAsPrimary ? handleOpenIdentitySheet : undefined}
          caption={shouldShowLinkAsPrimary
            ? 'No linked VerusID can sign this request.'
            : `${deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.NONE
              ? 'No response will be sent to the requester.'
              : `The wallet sends your VerusID and a signature to ${getResponseHostLabel(deliveryInfo.destinationHost)}.`}${invoiceNotice ? ` ${invoiceNotice}` : ''}`}
        />

        {hasRequirements && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionContent}>
              {constraintRows.map((row, index) => (
                <View
                  key={row.key}
                  style={[styles.detailRow, index > 0 && styles.detailRowBorder]}>
                  <Text style={styles.requirementLabel}>{row.label}</Text>
                  <Text style={styles.requirementValue}>
                    {row.value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{height: 24}} />
      </DeepLinkReviewScrollView>

      <SafeBottomActionStack
        gap={10}
        horizontalSpacing={24}
        style={styles.footer}>
        {activeAccountInstruction && (
          <View style={styles.footerInfoRow}>
            <View style={styles.footerInfoIcon}>
              <Info
                size={16}
                strokeWidth={2.1}
                color={theme.colors.textSubtle}
              />
            </View>
            <Text style={styles.footerInfoText}>
              {activeAccountInstruction}
            </Text>
          </View>
        )}
        <AppButton
          disabled={noRequestNetworkWallet}
          height={56}
          onPress={primaryActionHandler}
          themeMode={theme.mode}
          variant="primary">
          {primaryActionLabel}
        </AppButton>
        <AppButton
          height={56}
          onPress={() => cancel()}
          themeMode={theme.mode}
          variant="secondary">
          {'Cancel'}
        </AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
};

const AutoLinkingSheet = ({visible, styles}) => (
  <BottomSheetModal
    closeDisabled
    contentContainerStyle={styles.autoLinkingSheetContainer}
    maxHeight={180}
    onClose={() => {}}
    visible={visible}>
    <View
      accessibilityLabel="Linking VerusID"
      accessibilityRole="progressbar"
      style={styles.autoLinkingSheetBody}>
      <LottieView
        autoPlay
        loop
        source={require('../../../animations/loading_7bars.json')}
        style={styles.autoLinkingAnimation}
      />
      <Text style={styles.autoLinkingTitle}>Linking VerusID</Text>
    </View>
  </BottomSheetModal>
);

const AuthenticationRequestInfo = props => (
  <OnboardingThemeProvider>
    <AuthenticationRequestInfoContent {...props} />
  </OnboardingThemeProvider>
);

export default AuthenticationRequestInfo;
