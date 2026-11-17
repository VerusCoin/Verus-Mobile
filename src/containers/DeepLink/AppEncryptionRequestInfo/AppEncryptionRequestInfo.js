import {getAppEncryptionSessionKey} from '../../../utils/deeplink/appEncryptionSession';
import VrpcProvider from '../../../utils/vrpc/vrpcInterface';
import {appEncryptionIdentityMatchesConstraints, getAppEncryptionIdentityConstraints} from '../../../utils/deeplink/validator/appEncryptionIdentityConstraints';
import {useRequestBackHandler} from '../useRequestNavigation';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {TouchableOpacity, View} from 'react-native';
import {exitRequestToStack} from '../exitRequest';
import {Text} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {SafeAreaView} from 'react-native-safe-area-context';
import StatusBadge from '../../../components/StatusBadge';
import {InfoSheetRow} from '../../../components/InfoSheetSection';
import {Info} from 'lucide-react-native';
import {GenericResponse} from 'verus-typescript-primitives';
import AppButton from '../../../components/AppButton';
import SlideToConfirm from '../../../components/SlideToConfirm';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {
  resetDeeplinkData,
  setConfigSection,
  setUserCoins,
} from '../../../actions/actionCreators';
import {
  updateVerusIdWallet,
} from '../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {
  createAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {
  linkVerusId,
} from '../../../actions/actions/services/dispatchers/verusid/verusid';
import {getSystemNameFromSystemId} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../utils/api/channels/verusid/callCreators';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {requestServiceStoredData} from '../../../utils/auth/authBox';
import Store from '../../../store';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../actions/actions/updates/sessionRequests';
import {VERUSID_SERVICE_ID} from '../../../utils/constants/services';
import {DLIGHT_PRIVATE} from '../../../utils/constants/intervalConstants';
import {
  VERUSID_NETWORK_DEFAULT,
} from '../../../../env/index';
import {PROFILE_SECURITY_SETTINGS_LABEL} from '../../../utils/settings/settingsLabels';
import {processAppEncryptionRequest} from '../../../utils/deeplink/handlers/appEncryptionRequestHandler';
import {ensureGenericResponseSigner} from '../../../utils/deeplink/genericResponse/ensureGenericResponseSigner';
import {
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericRequestDeliveryInfo,
} from '../../../utils/deeplink/genericRequestDelivery';
import {accountIsTestnet} from '../../../utils/account/accountNetwork';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
import {
  identityLinkCandidateMatchesAccount,
  identityLinkOriginIsCurrent,
} from '../../../utils/verusid/verusIdFlowGuards';
import {
  appEncryptionRequestInfoStyles as createAppEncryptionRequestInfoStyles,
  requestCardStyles as createRequestCardStyles,
} from '../../../styles';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../../../theme/onboarding';
import IdentityPickerSheet, {
  VERUSID_SHEET_MODES,
} from '../components/VerusIdIdentityPickerSheet/IdentityPickerSheet';
import {
  DeepLinkReviewScrollView,
  RequestCard,
  getResponseHostLabel,
} from '../components/RequestReview';

const ROOT_CHAIN_BY_NETWORK = {
  mainnet: VERUSID_NETWORK_DEFAULT,
  testnet: 'VRSCTEST',
};

const SESSION_CHANGED = 'SESSION_CHANGED';

const SHIELDED_SETUP_PROFILE_MESSAGE =
  `Set up the Z recovery secret in Settings > ${PROFILE_SECURITY_SETTINGS_LABEL}, then restart Verus Mobile and try again.`;

const SHIELDED_SETUP_RESTART_MESSAGE =
  'Restart Verus Mobile, unlock this wallet, and try again.';

const getOfflineSystemName = systemId => {
  if (!systemId) return null;

  try {
    return getSystemNameFromSystemId(systemId);
  } catch (e) {
    return null;
  }
};

const getUriString = uri => {
  if (!uri) return null;
  if (typeof uri.getUriString === 'function') return uri.getUriString();
  return String(uri);
};

const buildMatchingIdentities = (linkedIds, preferredChain) =>
  [preferredChain, ...Object.keys(linkedIds || {}).filter(chain => chain !== preferredChain)]
    .flatMap(chainId => Object.keys(linkedIds?.[chainId] || {})
      .sort((a, b) => (linkedIds[chainId][a] || '').localeCompare(linkedIds[chainId][b] || ''))
      .map(iAddress => ({chainId, iAddress, friendlyName: linkedIds[chainId][iAddress] || iAddress})));

const buildPickerIdentityData = linkedIds => ({
  linkedIds,
  sortedIds: Object.fromEntries(Object.entries(linkedIds).map(([chain, ids]) => [chain, Object.keys(ids)])),
});

const findPreferredIdentity = ({
  linkedIds,
  preferredIAddress,
  previousAddressSet,
  requestIdentityChainId,
}) => {
  const identities = buildMatchingIdentities(linkedIds, requestIdentityChainId);
  const preferredKey = preferredIAddress
    ? preferredIAddress.toLowerCase()
    : null;

  if (preferredKey) {
    const preferredIdentity = identities.find(
      identity => identity.iAddress.toLowerCase() === preferredKey,
    );

    if (preferredIdentity) return preferredIdentity;
  }

  if (previousAddressSet) {
    const newIdentity = identities.find(
      identity => !previousAddressSet.has(identity.iAddress.toLowerCase()),
    );

    if (newIdentity) return newIdentity;
  }

  return identities[0] || null;
};

const cloneGenericResponse = response => {
  const baseResponse = new GenericResponse();

  if (response?.details && response.details.length > 0) {
    baseResponse.fromBuffer(response.toBuffer(), 0);
    return baseResponse;
  }

  if (response) {
    Object.assign(baseResponse, response);
  }

  baseResponse.details = [];
  return baseResponse;
};

const AppEncryptionRequestInfoContent = props => {
  const {
    signerFqn,
    signerSystemID,
    signerSystemName,
    signerIdentityID,
    sigtime,
    derivationNumber,
    secondaryDerivationNumber,
    appScopeID,
    appScopeFqn,
    derivationIdentityID,
    derivationIdFqn,
    hasDerivationID,
    requestIdFqn,
    hasRequestID,
    encryptResponseToAddress,
    returnESK,
    cancel,
    next,
    response,
    request,
    detailIndex,
    navigation,
    sessionKey,
  } = props;

  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createAppEncryptionRequestInfoStyles(theme),
    [theme],
  );
  const reviewStyles = useMemo(() => createRequestCardStyles(theme), [theme]);
  const dispatch = useDispatch();
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  // The account this screen rendered against. Link mutations must reject if the
  // store account changed in the same frame as the action.
  const renderedAccountHash = useObjectSelector(
    state => state.authentication.activeAccount?.accountHash || null,
  );
  const encryptedIds = useObjectSelector(
    state => state.services.stored[VERUSID_SERVICE_ID],
  );
  const signedIn = useSelector(state => state.authentication.signedIn);
  const requestIsTestnet = request != null ? request.isTestnet() : false;
  const activeAccountMatchesRequest =
    signedIn &&
    activeAccount != null &&
    accountIsTestnet(activeAccount) === requestIsTestnet;
  const requestHex = request.toBuffer().toString('hex');
  const linkedIdsVersion = JSON.stringify(encryptedIds);
  const requestIdentityChainId = requestIsTestnet
    ? ROOT_CHAIN_BY_NETWORK.testnet
    : ROOT_CHAIN_BY_NETWORK.mainnet;
  const requestCoinObj = useMemo(
    () => CoinDirectory.findCoinObj(signerSystemID || requestIdentityChainId),
    [signerSystemID, requestIdentityChainId],
  );
  const systemLabel =
    signerSystemName || getOfflineSystemName(signerSystemID) || signerSystemID;
  const responseUris = useMemo(
    () => (request?.responseURIs && request.responseURIs.length > 0
      ? request.responseURIs
      : []),
    [request],
  );
  const deliveryInfo = useMemo(
    () => getGenericRequestDeliveryInfo(request),
    [request],
  );
  const [linkedIdentityData, setLinkedIdentityData] = useState(null);
  const [parentData, setParentData] = useState(null);
  const linkedIdsLoaded = activeAccountMatchesRequest && linkedIdentityData?.source === encryptedIds;
  const allLinkedIds = useMemo(() => linkedIdsLoaded ? linkedIdentityData.ids : {}, [linkedIdsLoaded, linkedIdentityData]);
  const constraints = useMemo(() => {
    try { return getAppEncryptionIdentityConstraints(request); }
    catch (_) { return null; }
  }, [request, requestHex]);
  const parentScope = useMemo(() => ({allLinkedIds, constraints}), [allLinkedIds, constraints]);
  const linkedIds = useMemo(() => {
    const eligible = {};
    if (!constraints || (constraints.parentIDs.size > 0 && parentData?.scope !== parentScope)) return eligible;
    for (const [chain, ids] of Object.entries(allLinkedIds)) {
      let coin;
      try { coin = CoinDirectory.findCoinObj(chain); } catch (_) { continue; }
      if (!coin || !!coin.testnet !== requestIsTestnet) continue;
      eligible[chain] = Object.fromEntries(Object.entries(ids).filter(([identityID]) =>
        appEncryptionIdentityMatchesConstraints(constraints, {
          identityID, systemID: coin.system_id, parentID: parentData?.ids[`${chain}:${identityID}`],
        })));
    }
    return eligible;
  }, [allLinkedIds, constraints, parentData, parentScope, requestIsTestnet]);
  const [selectedIdentity, setSelectedIdentity] = useState(null);
  const [identitySheetVisible, setIdentitySheetVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  useRequestBackHandler(cancel, processing);
  const [openIdentityAfterUnlock, setOpenIdentityAfterUnlock] =
    useState(false);
  const linkOperationRef = useRef(0);
  const zSeedConfigured = activeAccount?.seeds?.[DLIGHT_PRIVATE] != null;
  const shieldedKeyLoaded =
    requestCoinObj?.id != null &&
    activeAccount?.keys?.[requestCoinObj.id]?.[DLIGHT_PRIVATE] != null;
  const shieldedSetupBlocksResponse =
    activeAccountMatchesRequest &&
    requestCoinObj?.id != null &&
    !shieldedKeyLoaded;
  const shieldedSetupNeedsProfile =
    shieldedSetupBlocksResponse && !zSeedConfigured;
  const shieldedSetupNeedsRestart =
    shieldedSetupBlocksResponse && zSeedConfigured;
  const waitingForLinkedIds =
    activeAccountMatchesRequest &&
    !shieldedSetupBlocksResponse &&
    !linkedIdsLoaded;
  const showSelectedIdentityCard =
    selectedIdentity &&
    activeAccountMatchesRequest &&
    !shieldedSetupBlocksResponse;

  const matchingIdentities = useMemo(
    () => buildMatchingIdentities(linkedIds, requestIdentityChainId),
    [linkedIds, requestIdentityChainId],
  );
  const identityPickerData = useMemo(
    () => buildPickerIdentityData(linkedIds, requestIdentityChainId),
    [linkedIds, requestIdentityChainId],
  );
  const isIdentityAllowed = useCallback(
    (chainId, identityID) => !!linkedIds[chainId]?.[identityID], [linkedIds],
  );
  const isAutoLinkCandidateAllowed = useCallback(candidate => {
    let coin;
    try { coin = CoinDirectory.findCoinObj(candidate?.chainId || requestIdentityChainId); }
    catch (_) { return false; }
    return !!coin && !!coin.testnet === requestIsTestnet && !!constraints &&
      appEncryptionIdentityMatchesConstraints(constraints, {
        identityID: candidate?.identityAddress, systemID: coin.system_id,
        parentID: candidate?.identity?.parent,
      });
  }, [constraints, requestIdentityChainId, requestIsTestnet]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const ids = {};
      await Promise.all(Object.keys(allLinkedIds).map(async chain => {
        let coin;
        try { coin = CoinDirectory.findCoinObj(chain); } catch (_) { return; }
        if (!coin?.vrpc_endpoints?.[0] || !!coin.testnet !== requestIsTestnet) return;
        try { VrpcProvider.initEndpoint(coin.system_id, coin.vrpc_endpoints[0]); }
        catch (_) { return; }
        await Promise.all(Object.keys(allLinkedIds[chain]).map(async id => {
          try {
            const result = await getIdentity(coin.system_id, id);
            if (!result.error) ids[`${chain}:${id}`] = result.result?.identity?.parent;
          } catch (_) { /* Unverified parents stay ineligible. */ }
        }));
      }));
      if (active && getAppEncryptionSessionKey(Store.getState()) === sessionKey) setParentData({scope: parentScope, ids});
    };
    if (linkedIdsLoaded && constraints?.parentIDs.size > 0) load();
    return () => {active = false;};
  }, [parentScope, linkedIdsLoaded, requestIsTestnet, sessionKey]);

  const loadLinkedIds = useCallback(async isCurrent => {
    const shouldApply = () =>
      getAppEncryptionSessionKey(Store.getState()) === sessionKey &&
      (typeof isCurrent === 'function' ? isCurrent() : true);

    try {
      const verusIdServiceData = await requestServiceStoredData(
        VERUSID_SERVICE_ID,
      );
      // Preserve legacy root-chain key casing. PBaaS identifiers stay exact.
      const nextLinkedIds = Object.fromEntries(Object.entries(verusIdServiceData.linked_ids || {}).map(([chain, ids]) => [
        Object.values(ROOT_CHAIN_BY_NETWORK).find(root => root.toLowerCase() === chain.toLowerCase()) || chain, ids,
      ]));

      if (shouldApply()) setLinkedIdentityData({source: encryptedIds, ids: nextLinkedIds});
      return nextLinkedIds;
    } catch (e) {
      if (shouldApply()) setLinkedIdentityData({source: encryptedIds, ids: {}});
      return {};
    }
  }, [encryptedIds, sessionKey]);

  const loadLinkedIdsAndSelect = useCallback(
    async ({
      preferredIAddress,
      previousAddressSet,
      reopenIdentitySheet,
      isCurrent,
    }) => {
      const shouldApply = () =>
        getAppEncryptionSessionKey(Store.getState()) === sessionKey &&
      (typeof isCurrent === 'function' ? isCurrent() : true);

      if (shouldApply()) setLinkedIdentityData(null);

      const nextLinkedIds = await loadLinkedIds(isCurrent);
      const nextIdentity = findPreferredIdentity({
        linkedIds: nextLinkedIds,
        preferredIAddress,
        previousAddressSet,
        requestIdentityChainId,
      });

      if (nextIdentity) {
        if (shouldApply()) {
          setSelectedIdentity(nextIdentity);
          setIdentitySheetVisible(false);
        }
        return nextIdentity;
      }

      if (reopenIdentitySheet && shouldApply()) {
        setIdentitySheetVisible(true);
      }

      return nextIdentity;
    },
    [loadLinkedIds, requestIdentityChainId],
  );

  useEffect(() => {
    let active = true;
    if (signedIn) {
      loadLinkedIds(() => active);
    } else {
      setLinkedIdentityData(null);
      setSelectedIdentity(null);
    }
    return () => {active = false;};
  }, [encryptedIds, loadLinkedIds, signedIn]);

  useEffect(() => {
    if (!activeAccountMatchesRequest) return;
    if (!linkedIdsLoaded) return;
    if (selectedIdentity && isIdentityAllowed(selectedIdentity.chainId, selectedIdentity.iAddress)) return;
    if (matchingIdentities.length === 0) return;

    setSelectedIdentity(matchingIdentities[0]);
  }, [
    activeAccountMatchesRequest,
    linkedIdsLoaded,
    matchingIdentities,
    selectedIdentity,
    isIdentityAllowed,
  ]);

  useEffect(() => {
    if (!selectedIdentity) return;
    if (isIdentityAllowed(selectedIdentity.chainId, selectedIdentity.iAddress)) return;

    setSelectedIdentity(null);
  }, [isIdentityAllowed, selectedIdentity]);

  useEffect(() => {
    if (!openIdentityAfterUnlock) return;
    if (!activeAccountMatchesRequest) return;
    if (!linkedIdsLoaded) return;

    setOpenIdentityAfterUnlock(false);
    setIdentitySheetVisible(true);
  }, [activeAccountMatchesRequest, linkedIdsLoaded, openIdentityAfterUnlock]);

  const canOpenSignerDetails = signerSystemID && signerIdentityID;

  const loadSignerVerusId = useCallback(async () => {
    if (!canOpenSignerDetails) {
      throw new Error('Signer identity is not available');
    }

    const coinObj = CoinDirectory.getBasicCoinObj(signerSystemID);
    if (!coinObj) throw new Error('Signer network is not available');

    const res = await getIdentity(coinObj.system_id, signerIdentityID);
    if (res.error) throw new Error(res.error.message);

    return res.result;
  }, [canOpenSignerDetails, signerIdentityID, signerSystemID]);
  const loadSignerFriendlyNames = useCallback(
    async identityObj => {
      try {
        const coinObj = CoinDirectory.getBasicCoinObj(signerSystemID);
        if (!coinObj) throw new Error('Signer network is not available');

        return getFriendlyNameMap(coinObj.system_id, identityObj);
      } catch (e) {
        return {
          ['i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV']: 'VRSC',
          ['iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq']: 'VRSCTEST',
        };
      }
    },
    [signerSystemID],
  );

  const handleWalletUnlock = async () => {
    const allowList = (accounts || []).filter(
      account => accountIsTestnet(account) === requestIsTestnet,
    );

    // The action is disabled with its reason on screen.
    if (allowList.length === 0) return;

    try {
      await requestWalletUnlock({
        reason: 'app-encryption-request',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'Encryption request',
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
        const candidateChainId = candidate?.chainId || requestIdentityChainId;
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
            'This VerusID does not match the request network.',
          );
        }

        // The candidate's chosen primary R-address must belong to the account
        // that is scoped right now, not only to the identity's own primary
        // address list, and its origin session must still be live.
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

        if (!coinObj) {
          throw new Error('Unable to find the request network.');
        }

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
        const selectedLinkedIdentity = await loadLinkedIdsAndSelect({
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
      loadLinkedIdsAndSelect,
      renderedAccountHash,
      requestIdentityChainId,
    ],
  );

  const linkAutoFoundIdentity = useCallback(
    candidate => linkIdentityCandidate(candidate, {showError: false}),
    [linkIdentityCandidate],
  );

  const mounted = useRef(true);
  const activeApproval = useRef(null);
  const review = useMemo(() => ({request, requestHex, detailIndex, selectedIdentity, linkedIds}),
    [request, requestHex, detailIndex, selectedIdentity, linkedIds]);
  const currentReview = useRef(review);
  currentReview.current = review;
  useEffect(() => {
    mounted.current = true;
    return () => {mounted.current = false;};
  }, []);
  useEffect(() => {activeApproval.current = null; setProcessing(false);}, [review]);

  const handleSelectIdentity = (chainId, iAddress, friendlyName) => {
    if (!isIdentityAllowed(chainId, iAddress)) return;
    activeApproval.current = null;
    setSelectedIdentity({chainId, iAddress, friendlyName});
    setIdentitySheetVisible(false);
  };

  const buildResponseAndContinue = async () => {
    if (!mounted.current || currentReview.current !== review || activeApproval.current) return;
    if (!selectedIdentity || !isIdentityAllowed(selectedIdentity.chainId, selectedIdentity.iAddress)) {
      setIdentitySheetVisible(true);
      return;
    }
    const approval = {
      isActive: () => {
        try {
          return mounted.current && currentReview.current === review && activeApproval.current === approval &&
            getAppEncryptionSessionKey(Store.getState()) === sessionKey &&
            JSON.stringify(Store.getState().services.stored[VERUSID_SERVICE_ID]) === linkedIdsVersion &&
            request.toBuffer().toString('hex') === requestHex;
        } catch (_) { return false; }
      },
      assertActive: () => {
        if (!approval.isActive()) throw Object.assign(new Error('Encryption approval is no longer current.'), {code: SESSION_CHANGED});
      },
    };
    activeApproval.current = approval;
    setProcessing(true);
    let responseCommitted = false;
    try {
      approval.assertActive();
      const updatedResponse = cloneGenericResponse(response);
      const coinObj = CoinDirectory.findCoinObj(selectedIdentity.chainId);
      if (!coinObj) throw new Error('Unsupported signing chain.');
      ensureGenericResponseSigner({response: updatedResponse, systemID: coinObj.system_id, identityID: selectedIdentity.iAddress});
      const {responseDetail} = await processAppEncryptionRequest({
        request, detailIndex, responseSignerID: selectedIdentity.iAddress,
        responseSignerSystemID: coinObj.system_id, assertActive: approval.assertActive,
      });
      approval.assertActive();
      updatedResponse.details = [...(updatedResponse.details || []), responseDetail];
      updatedResponse.setFlags();
      await next(updatedResponse, [detailIndex], {
        autoDeliverOnComplete: true, responseIdentityName: selectedIdentity.friendlyName,
      });
      responseCommitted = true;
    } catch (e) {
      if (!approval.isActive() || e?.code === SESSION_CHANGED) return;
      activeApproval.current = null;
      const isZSeedMissing = e?.message?.includes('No Z recovery secret');
      createAlert(isZSeedMissing ? 'Z recovery secret required' : 'Cannot share encryption address',
        isZSeedMissing ? `Set up the Z recovery secret in Settings > ${PROFILE_SECURITY_SETTINGS_LABEL}, then open the request again.`
          : 'The wallet could not create the encryption address. Try again.');
      if (isZSeedMissing) cancel();
    } finally {
      // Delivery owns the result and Retry after next. Keep the review locked
      // with its chosen identity until Done closes it.
      if (!responseCommitted && mounted.current && currentReview.current === review) {
        setProcessing(false);
      }
    }
  };

  const openProfileSettings = useCallback(() => {
    dispatch(setConfigSection('settings-profile'));
    dispatch(resetDeeplinkData());

    const settingsRoute = {
      screen: 'Home',
      params: {
        screen: 'SettingsHome',
        params: {screen: 'ProfileSettings'},
      },
    };

    exitRequestToStack(navigation, 'SignedInStack', settingsRoute);
  }, [dispatch, navigation]);

  // No wallet on this device can answer the request. The wallet action is
  // disabled and the footer says why.
  const noRequestNetworkWallet =
    !activeAccountMatchesRequest &&
    !(accounts || []).some(
      account => accountIsTestnet(account) === requestIsTestnet,
    );
  const requestNetworkName = requestIsTestnet ? 'testnet' : 'mainnet';
  const primaryActionLabel = processing
    ? 'Preparing response'
    : !activeAccountMatchesRequest
    ? signedIn
      ? 'Switch wallet'
      : 'Unlock wallet'
    : shieldedSetupNeedsProfile
    ? `Open ${PROFILE_SECURITY_SETTINGS_LABEL}`
    : shieldedSetupNeedsRestart
    ? 'Restart required'
    : !linkedIdsLoaded
    ? 'Loading VerusIDs'
    : selectedIdentity
    ? returnESK
      ? 'Slide to approve'
      : 'Share encryption address'
    : 'Choose VerusID';
  const primaryActionDisabled =
    processing ||
    noRequestNetworkWallet ||
    waitingForLinkedIds ||
    shieldedSetupNeedsRestart;
  const activeAccountInstruction = !activeAccountMatchesRequest
    ? noRequestNetworkWallet
      ? `This request needs a ${requestNetworkName} wallet. Add one, then open the request again.`
      : signedIn
      ? 'Switch wallet first, then select identity.'
      : 'Unlock wallet first, then select identity.'
    : null;
  const requestDetailsSections = useMemo(() => {
    const responseRows = responseUris
      .map((uri, index) => {
        const uriString = getUriString(uri);
        if (!uriString) return null;

        return {
          label:
            responseUris.length > 1
              ? `Response URI ${index + 1}`
              : 'Response URI',
          value: uriString,
        };
      })
      .filter(Boolean);
    const encryptionRows = [
      {label: 'App scope', value: appScopeFqn || appScopeID, copy: true, valueStyle: !appScopeFqn || appScopeFqn === appScopeID ? reviewStyles.identifier : undefined},
      appScopeFqn && appScopeFqn !== appScopeID ? {label: 'App scope ID', value: appScopeID, copy: true, valueStyle: reviewStyles.identifier} : null,
      {label: 'Primary key number', value: `#${derivationNumber}`},
      hasDerivationID ? {label: 'Nested identity', value: derivationIdFqn || derivationIdentityID, copy: true, valueStyle: !derivationIdFqn || derivationIdFqn === derivationIdentityID ? reviewStyles.identifier : undefined} : null,
      hasDerivationID && derivationIdFqn && derivationIdFqn !== derivationIdentityID
        ? {label: 'Nested identity ID', value: derivationIdentityID, copy: true, valueStyle: reviewStyles.identifier} : null,
      hasDerivationID ? {label: 'Secondary key number', value: `#${secondaryDerivationNumber}`} : null,
      hasRequestID ? {label: 'Request ID', value: requestIdFqn, copy: true} : null,
      {label: 'Response encryption recipient', value: encryptResponseToAddress, copy: true, valueStyle: reviewStyles.identifier},
      {label: 'Spending key', value: returnESK ? 'Requested' : 'Not requested'},
    ].filter(Boolean);
    const walletRows = [
      {
        label: 'Wallet state',
        value: activeAccountMatchesRequest
          ? shieldedSetupNeedsProfile
            ? 'Private address setup required'
            : shieldedSetupNeedsRestart
            ? 'Restart required'
            : 'Ready for this request'
          : noRequestNetworkWallet
          ? `No ${requestNetworkName} wallet`
          : signedIn
          ? 'Switch wallet required'
          : 'Unlock wallet required',
      },
      selectedIdentity
        ? {label: 'Selected identity', value: selectedIdentity.friendlyName}
        : {label: 'Selected identity', value: 'Not selected'},
    ];

    return [
      {title: 'Response', rows: responseRows},
      {title: 'Encryption', rows: encryptionRows},
      {title: 'Wallet', rows: walletRows},
    ].filter(section => section.rows.length > 0);
  }, [
    activeAccountMatchesRequest,
    reviewStyles,
    appScopeFqn,
    appScopeID,
    derivationIdentityID,
    derivationIdFqn,
    derivationNumber,
    secondaryDerivationNumber,
    encryptResponseToAddress,
    hasDerivationID,
    hasRequestID,
    noRequestNetworkWallet,
    requestIdFqn,
    requestNetworkName,
    responseUris,
    returnESK,
    selectedIdentity,
    shieldedSetupNeedsProfile,
    shieldedSetupNeedsRestart,
    signedIn,
  ]);

  const handlePrimaryAction = () => {
    if (!activeAccountMatchesRequest) {
      handleWalletUnlock();
      return;
    }

    if (shieldedSetupNeedsProfile) {
      openProfileSettings();
      return;
    }

    if (shieldedSetupNeedsRestart) {
      return;
    }

    if (!selectedIdentity) {
      setIdentitySheetVisible(true);
      return;
    }

    return buildResponseAndContinue();
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <IdentityPickerSheet
        visible={identitySheetVisible}
        coinObj={requestCoinObj}
        isCandidateAllowed={isAutoLinkCandidateAllowed}
        linkedIds={identityPickerData.linkedIds}
        sortedIds={identityPickerData.sortedIds}
        isIdentityAllowed={isIdentityAllowed}
        selectedIdentity={selectedIdentity}
        provisioningEnabled={false}
        initialMode={VERUSID_SHEET_MODES.CHOOSE}
        onClose={() => setIdentitySheetVisible(false)}
        onLinkCandidate={linkAutoFoundIdentity}
        onSelect={handleSelectIdentity}
      />
      <DeepLinkReviewScrollView showScrollCue requestCard>
        <RequestCard
          action="wants you to share an encryption address"
          requester={{request, signerFqn, signerIdentityID, signerSystemID, signerSystemName: systemLabel, sigtime,
            loadVerusId: loadSignerVerusId, loadFriendlyNames: loadSignerFriendlyNames}}
          sections={requestDetailsSections}
          showResponder={showSelectedIdentityCard || (activeAccountMatchesRequest && !selectedIdentity)}
          responderName={showSelectedIdentityCard ? selectedIdentity?.friendlyName : null}
          onPressResponder={activeAccountMatchesRequest && linkedIdsLoaded &&
            !shieldedSetupBlocksResponse && !processing
            ? () => setIdentitySheetVisible(true)
            : undefined}
          caption={deliveryInfo.type === GENERIC_REQUEST_DELIVERY_TYPES.NONE
            ? 'No response will be sent to the requester.'
            : `The wallet sends this app-specific address and its viewing keys to ${getResponseHostLabel(deliveryInfo.destinationHost)}.`}
        />

        {hasDerivationID && (
          <View>
            <InfoSheetRow
              label="Nested VerusID"
              value={derivationIdFqn || derivationIdentityID}
              valueStyle={!derivationIdFqn || derivationIdFqn === derivationIdentityID
                ? reviewStyles.identifier : undefined}
            />
            <InfoSheetRow
              label="Secondary key number"
              value={`#${secondaryDerivationNumber}`}
            />
          </View>
        )}

        {returnESK && (
          <View style={styles.warningCard}>
            <View style={styles.warningHeader}>
              <Text style={styles.warningTitle}>
                Extended spending key
              </Text>
              <StatusBadge label="High risk" tone="warning" />
            </View>
            <Text style={styles.warningText}>
              {hasDerivationID
                ? 'The app can decrypt data, spend funds, and derive more keys. The app-scope key stays private.'
                : 'This key is for the app-scope channel. The app can decrypt data and spend funds. It can derive every nested channel for your selected identity, app scope, and primary key number.'}
            </Text>
            <Text style={styles.warningEmphasis}>
              Approve only if you fully trust this app.
            </Text>
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
        {shieldedSetupBlocksResponse && (
          <View style={styles.footerWarningCard}>
            <Text style={styles.footerWarningTitle}>
              {shieldedSetupNeedsProfile
                ? 'Private address setup required'
                : 'Restart Verus Mobile'}
            </Text>
            <Text style={styles.footerWarningText}>
              {shieldedSetupNeedsProfile
                ? SHIELDED_SETUP_PROFILE_MESSAGE
                : SHIELDED_SETUP_RESTART_MESSAGE}
            </Text>
          </View>
        )}
        {returnESK && activeAccountMatchesRequest && selectedIdentity && linkedIdsLoaded &&
        !shieldedSetupNeedsProfile && !shieldedSetupNeedsRestart ? (
          <SlideToConfirm disabled={primaryActionDisabled} loading={processing}
            loadingText="Preparing response" label="Slide to approve" onPress={handlePrimaryAction} />
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
        <AppButton
          disabled={processing}
          height={56}
          onPress={cancel}
          themeMode={theme.mode}
          variant="secondary">
          Cancel
        </AppButton>
      </SafeBottomActionStack>
    </SafeAreaView>
  );
};

const AppEncryptionRequestInfo = props => {
  const sessionKey = useSelector(getAppEncryptionSessionKey);
  return <OnboardingThemeProvider>
    <AppEncryptionRequestInfoContent key={sessionKey} {...props} sessionKey={sessionKey} />
  </OnboardingThemeProvider>;
};

export default AppEncryptionRequestInfo;
