import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Button, Checkbox, Text, TextInput} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AnimatedActivityIndicatorBox from '../../../components/AnimatedActivityIndicatorBox';
import BarcodeReader from '../../../components/BarcodeReader/BarcodeReader';
import GradientButton from '../../../components/GradientButton';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {openAuthenticateUserModal} from '../../../actions/actions/sendModal/dispatchers/sendModal';
import {addCoin, addKeypairs, setUserCoins} from '../../../actions/actionCreators';
import {updateVerusIdWallet} from '../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {linkVerusId} from '../../../actions/actions/services/dispatchers/verusid/verusid';
import Colors from '../../../globals/colors';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {
  broadcastSpendableKeyClaim,
  discoverSpendableKeyClaims,
  preflightSpendableKeyClaim,
  spendableKeyDetailsOrdinalToMnemonic,
} from '../../../utils/spendableKey/spendableKey';
import {reconcileSpendableKeyClaimResults} from '../../../utils/spendableKey/claimResultReconciliation';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
import {
  DLIGHT_PRIVATE,
  VRPC,
} from '../../../utils/constants/intervalConstants';
import {SEND_MODAL_USER_ALLOWLIST} from '../../../utils/constants/sendModal';
import {spendableKeyRequestInfoStyles as styles} from '../../../styles';
import {explorers} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {getCurrency} from '../../../utils/api/channels/verusid/callCreators';
import {openUrl} from '../../../utils/linking';
import {copyToClipboard} from '../../../utils/clipboard/clipboard';

const truncate = (value, start = 8, end = 6) => {
  if (!value) return '';
  if (value.length <= start + end + 3) return value;
  return `${value.slice(0, start)}...${value.slice(-end)}`;
};
const IDENTITY_DEFINITION_FIELDS = [
  'contentmap',
  'contentMap',
  'contentmultimap',
  'contentMultiMap',
  'flags',
  'identityaddress',
  'identityAddress',
  'minimumsignatures',
  'minimumSignatures',
  'name',
  'parent',
  'primaryaddresses',
  'primaryAddresses',
  'privateaddress',
  'privateAddress',
  'recoveryauthority',
  'recoveryAuthority',
  'revocationauthority',
  'revocationAuthority',
  'systemid',
  'systemId',
  'timelock',
  'txid',
  'txout',
  'version',
  'vout',
];

const getTopLevelIdentityFields = result => {
  return IDENTITY_DEFINITION_FIELDS.reduce((fields, field) => {
    if (result?.[field] !== undefined) fields[field] = result[field];
    return fields;
  }, {});
};

const isTestProfile = account => {
  return Object.keys(account?.testnetOverrides || {}).length > 0;
};

const getSystemDestinationMap = (claimPlan, activeAccount) => {
  const destinations = {};

  if (!claimPlan || !activeAccount) return destinations;

  for (const system of claimPlan.systems) {
    const address =
      activeAccount.keys?.[system.coinObj.id]?.[VRPC]?.addresses?.[0];

    if (address) {
      destinations[system.systemId] = address;
    }
  }

  return destinations;
};

const getSystemPrivateAddressMap = (claimPlan, activeAccount) => {
  const privateAddresses = {};

  if (!claimPlan || !activeAccount) return privateAddresses;

  for (const system of claimPlan.systems) {
    const address =
      activeAccount.keys?.[system.coinObj.id]?.[DLIGHT_PRIVATE]?.addresses?.[0];

    if (address) {
      privateAddresses[system.systemId] = address;
    }
  }

  return privateAddresses;
};

const getClaimTitle = totals => {
  const hasFunds = totals.currencies > 0;
  const hasIdentities = totals.identities > 0;

  if (hasFunds && hasIdentities) return 'Claim identity and funds';
  if (hasIdentities) return 'Claim identity';
  return 'Claim funds';
};

const getErrorMessage = (error, fallback) => {
  return error && error.message ? error.message : fallback;
};

const waitForStatusPaint = () =>
  new Promise(resolve => {
    const scheduleFrame =
      global.requestAnimationFrame == null
        ? callback => setTimeout(callback, 0)
        : global.requestAnimationFrame;

    scheduleFrame(() => setTimeout(resolve, 0));
  });

const getScanError = error => ({
  title: 'Network error',
  message:
    'Unable to scan this spendable key. Check your internet connection and try again.',
  detail: getErrorMessage(error, 'Unable to scan spendable key.'),
  retry: 'scan',
});

const getClaimNetworkError = error => ({
  title: 'Network error',
  message:
    'Unable to submit the claim transaction. Check your internet connection and try again.',
  detail: getErrorMessage(error, 'Unable to claim spendable key.'),
  retry: 'claim',
});

const isNetworkError = error => {
  const message = getErrorMessage(error, '');

  return /network|offline|timeout|timed out|connect|connection|socket|fetch|request failed|econn|enotfound|unreachable/i.test(
    message,
  );
};

const getAddressString = value => {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  if (typeof value.toAddress === 'function') return value.toAddress();
  return null;
};

const getIdentityDefinition = identityClaim => {
  const result = identityClaim?.result || {};

  if (!result.identity) return result;

  return {
    ...result.identity,
    ...getTopLevelIdentityFields(result),
  };
};

const getIdentityAuthorityIssues = identityClaim => {
  const definition = getIdentityDefinition(identityClaim);
  const identityAddress = getAddressString(
    identityClaim?.identityAddress ||
      definition.identityaddress ||
      definition.identityAddress,
  );
  const recoveryAuthority = getAddressString(
    definition.recoveryauthority || definition.recoveryAuthority,
  );
  const revocationAuthority = getAddressString(
    definition.revocationauthority || definition.revocationAuthority,
  );
  const authorityNames =
    identityClaim?.authorityNames ||
    identityClaim?.result?.authorityNames ||
    {};
  const issues = [];

  if (!identityAddress) return issues;

  if (recoveryAuthority && recoveryAuthority !== identityAddress) {
    issues.push({
      label: 'Recovery ID',
      authority: recoveryAuthority,
      authorityDisplay: authorityNames[recoveryAuthority] || recoveryAuthority,
    });
  }

  if (revocationAuthority && revocationAuthority !== identityAddress) {
    issues.push({
      label: 'Revocation ID',
      authority: revocationAuthority,
      authorityDisplay: authorityNames[revocationAuthority] || revocationAuthority,
    });
  }

  return issues;
};

const getIdentityDisplay = identity => {
  return identity.fullyQualifiedName
    ? convertFqnToDisplayFormat(identity.fullyQualifiedName)
    : identity.identityAddress;
};

const getExplorerBase = coinObj => {
  if (!coinObj) return null;

  return (
    explorers[coinObj.id] ||
    explorers[coinObj.currency_id] ||
    explorers[coinObj.system_id]
  );
};

const getExplorerTxUrl = transaction => {
  const explorer = getExplorerBase(transaction.coinObj);

  if (!explorer || !transaction.txid) return null;

  return `${explorer.replace(/\/$/, '')}/tx/${transaction.txid}`;
};

const coinMatchesCurrencyId = (coinObj, currencyId) => {
  return (
    coinObj != null &&
    (coinObj.id === currencyId || coinObj.currency_id === currencyId)
  );
};

const coinMatchesRedeemedCurrency = (coinObj, currencyId, isTestnet) => {
  return (
    coinMatchesCurrencyId(coinObj, currencyId) &&
    !!coinObj.testnet === !!isTestnet
  );
};

const userHasCurrencyActive = (
  activeCoinList,
  currencyId,
  accountId,
  isTestnet,
) => {
  return (activeCoinList || []).some(
    coinObj =>
      coinMatchesRedeemedCurrency(coinObj, currencyId, isTestnet) &&
      Array.isArray(coinObj.users) &&
      coinObj.users.includes(accountId),
  );
};

const cloneActiveCoinList = activeCoinList => {
  return (activeCoinList || []).map(coinObj => ({
    ...coinObj,
    users: Array.isArray(coinObj.users) ? [...coinObj.users] : [],
  }));
};

const getRedeemedCurrencyRefs = results => {
  const refsByCurrency = new Map();

  for (const result of results || []) {
    const systemId = result.systemId || result.coinObj?.system_id;

    if (!systemId) continue;

    for (const output of result.outputs || []) {
      if (!output.currencyId) continue;

      const key = `${systemId}:${output.currencyId}`;

      if (!refsByCurrency.has(key)) {
        refsByCurrency.set(key, {
          systemId,
          currencyId: output.currencyId,
        });
      }
    }
  }

  return Array.from(refsByCurrency.values());
};

const resolveRedeemedCurrencyCoinObj = async ({
  activeCoinList,
  currencyId,
  isTestnet,
  systemId,
}) => {
  const activeCoinObj = (activeCoinList || []).find(coinObj =>
    coinMatchesRedeemedCurrency(coinObj, currencyId, isTestnet),
  );

  if (activeCoinObj != null) return activeCoinObj;

  if (!CoinDirectory.coinExistsInDirectory(currencyId)) {
    const currencyRes = await getCurrency(systemId, currencyId);

    if (currencyRes.error) {
      throw new Error(currencyRes.error.message);
    }

    if (!currencyRes.result || !currencyRes.result.currencyid) {
      throw new Error(`Unable to resolve currency ${currencyId}.`);
    }

    await CoinDirectory.addPbaasCurrency(currencyRes.result, isTestnet, true);
  }

  const coinObj = CoinDirectory.findCoinObj(currencyId);

  if (!!coinObj.testnet !== !!isTestnet) {
    throw new Error(
      `${coinObj.display_ticker || currencyId} is not available on the active profile network.`,
    );
  }

  return coinObj;
};

const getTransactionLabel = transaction => {
  const ticker = transaction.coinObj?.display_ticker || transaction.coinObj?.id;

  if (transaction.type === 'identity' && transaction.includesSweep) {
    return `${ticker} identity and funds claim`;
  }

  if (transaction.type === 'identity') {
    return `${ticker} identity claim`;
  }

  return `${ticker} funds claim`;
};

const SpendableKeyRequestInfo = props => {
  const {
    cancel = () => {},
    detailIndex,
    next = async () => {},
    openVerusIdDetailsModal = () => {},
    request,
    response,
    requiresPassword,
  } = props;

  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const bottomNavigationInset = Math.max(
    insets.bottom,
    Platform.OS === 'android' ? 24 : 0,
  );
  const signedIn = useSelector(state => state.authentication.signedIn);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);

  const requestIsTestnet = request != null && request.isTestnet();
  const activeAccountMatchesRequest = !!(
    signedIn &&
    activeAccount &&
    isTestProfile(activeAccount) === requestIsTestnet
  );
  const matchingAccounts = useMemo(() => {
    return (accounts || []).filter(
      account => isTestProfile(account) === requestIsTestnet,
    );
  }, [accounts, requestIsTestnet]);
  const activeScanKey = useMemo(() => {
    if (!activeAccountMatchesRequest) return 'anonymous';

    const systems = (activeCoinsForUser || [])
      .map(coinObj => coinObj.system_id || coinObj.id)
      .filter(systemId => systemId != null)
      .sort();

    return `${activeAccount.id}:${systems.join(',')}`;
  }, [activeAccount, activeAccountMatchesRequest, activeCoinsForUser]);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(requiresPassword ? 'password' : 'idle');
  const [claimPlan, setClaimPlan] = useState(null);
  const [claimPlanScanKey, setClaimPlanScanKey] = useState(null);
  const [claimResult, setClaimResult] = useState(null);
  const [requestError, setRequestError] = useState(null);
  const [
    assignClaimedIdentityPrivateAddresses,
    setAssignClaimedIdentityPrivateAddresses,
  ] = useState(true);
  const scanStartedRef = useRef(false);
  const scanCacheRef = useRef(null);

  const destinationBySystem = useMemo(
    () => getSystemDestinationMap(claimPlan, activeAccount),
    [claimPlan, activeAccount],
  );
  const privateAddressBySystem = useMemo(
    () => getSystemPrivateAddressMap(claimPlan, activeAccount),
    [claimPlan, activeAccount],
  );

  const detail = request ? request.getDetails(detailIndex) : null;

  const getScanCache = useCallback(() => {
    const passwordKey = requiresPassword ? password : '';
    const currentCache = scanCacheRef.current;

    if (
      currentCache == null ||
      currentCache.detail !== detail ||
      currentCache.passwordKey !== passwordKey ||
      currentCache.requestIsTestnet !== requestIsTestnet
    ) {
      const nextCache = {
        detail,
        passwordKey,
        requestIsTestnet,
        mnemonic: null,
        systemsById: new Map(),
      };

      scanCacheRef.current = nextCache;
      return nextCache;
    }

    return currentCache;
  }, [
    detail,
    password,
    requestIsTestnet,
    requiresPassword,
  ]);

  const totals = useMemo(() => {
    if (!claimPlan) return {currencies: 0, identities: 0, unsupported: 0};

    return claimPlan.systems.reduce(
      (acc, system) => {
        acc.currencies += system.currencies.length;
        acc.identities += system.identities.length;
        acc.unsupported += system.identities.filter(
          identity => identity.unsupportedReason,
        ).length;
        return acc;
      },
      {currencies: 0, identities: 0, unsupported: 0},
    );
  }, [claimPlan]);
  const hasIdentityAuthorityWarnings = useMemo(() => {
    if (!claimPlan) return false;

    return claimPlan.systems.some(system =>
      system.identities.some(
        identity => getIdentityAuthorityIssues(identity).length > 0,
      ),
    );
  }, [claimPlan]);
  const identitySystemIds = useMemo(() => {
    if (!claimPlan) return [];

    return claimPlan.systems
      .filter(system => system.identities.length > 0)
      .map(system => system.systemId);
  }, [claimPlan]);
  const assignablePrivateAddressSystemIds = useMemo(() => {
    return identitySystemIds.filter(
      systemId => privateAddressBySystem[systemId],
    );
  }, [
    identitySystemIds,
    privateAddressBySystem,
  ]);
  const canAssignClaimedIdentityPrivateAddresses = useMemo(() => {
    return (
      activeAccountMatchesRequest &&
      assignablePrivateAddressSystemIds.length > 0
    );
  }, [
    activeAccountMatchesRequest,
    assignablePrivateAddressSystemIds,
  ]);
  const systemsWithoutPrivateAddressCount =
    identitySystemIds.length - assignablePrivateAddressSystemIds.length;
  const selectedPrivateAddressBySystem = useMemo(() => {
    return identitySystemIds.reduce((addresses, systemId) => {
      const privateAddress = privateAddressBySystem[systemId];

      if (!privateAddress) {
        addresses[systemId] = null;
      } else if (
        canAssignClaimedIdentityPrivateAddresses &&
        assignClaimedIdentityPrivateAddresses
      ) {
        addresses[systemId] = privateAddress;
      }

      return addresses;
    }, {});
  }, [
    assignClaimedIdentityPrivateAddresses,
    canAssignClaimedIdentityPrivateAddresses,
    identitySystemIds,
    privateAddressBySystem,
  ]);
  const privateAddressOptionSubtitle = useMemo(() => {
    if (!canAssignClaimedIdentityPrivateAddresses) return null;

    const privateAddresses = Array.from(
      new Set(
        assignablePrivateAddressSystemIds.map(
          systemId => privateAddressBySystem[systemId],
        ),
      ),
    );
    const eligibleText = privateAddresses.length === 1
      ? `Set the private address of your new identity to ${truncate(privateAddresses[0], 12, 8)}, your wallet z-address.`
      : 'Use each available chain wallet Z address for private transactions to claimed IDs.';

    return systemsWithoutPrivateAddressCount === 0
      ? eligibleText
      : `${eligibleText} ${systemsWithoutPrivateAddressCount} chain${systemsWithoutPrivateAddressCount === 1 ? '' : 's'} without a wallet z-address will have existing identity z-addresses removed.`;
  }, [
    assignablePrivateAddressSystemIds,
    canAssignClaimedIdentityPrivateAddresses,
    privateAddressBySystem,
    systemsWithoutPrivateAddressCount,
  ]);
  const claimTitle = getClaimTitle(totals);

  const toggleAssignClaimedIdentityPrivateAddresses = useCallback(() => {
    setAssignClaimedIdentityPrivateAddresses(current => !current);
  }, []);

  const scanClaims = useCallback(async () => {
    Keyboard.dismiss();
    let mnemonic;
    const scanCache = getScanCache();

    setClaimResult(null);
    setRequestError(null);
    setClaimPlan(null);
    setClaimPlanScanKey(null);
    setStatus(requiresPassword ? 'decrypting' : 'scanning');
    await waitForStatusPaint();

    try {
      if (scanCache.mnemonic != null) {
        mnemonic = scanCache.mnemonic;
      } else {
        mnemonic = spendableKeyDetailsOrdinalToMnemonic({
          spendableKeyOrdinal: detail,
          password,
        });
        scanCache.mnemonic = mnemonic;
      }
    } catch (e) {
      createAlert('Error', getErrorMessage(e, 'Unable to scan spendable key.'));
      setStatus(requiresPassword ? 'password' : 'error');

      if (!requiresPassword) {
        setRequestError({
          title: 'Invalid spendable key',
          message: 'This spendable key could not be read.',
          detail: getErrorMessage(e, 'Unable to scan spendable key.'),
          retry: 'scan',
        });
      }

      return;
    }

    try {
      if (requiresPassword) {
        setStatus('scanning');
        await waitForStatusPaint();
      }

      const discovered = await discoverSpendableKeyClaims({
        mnemonic,
        requestIsTestnet,
        activeCoinsForUser: activeAccountMatchesRequest
          ? activeCoinsForUser
          : [],
        cachedSystems: Array.from(scanCache.systemsById.values()),
      });

      for (const system of discovered.systems) {
        scanCache.systemsById.set(system.systemId, system);
      }

      setClaimPlan(discovered);
      setClaimPlanScanKey(activeScanKey);
      setRequestError(null);
      setStatus(discovered.hasClaims ? 'review' : 'empty');
    } catch (e) {
      console.warn(e);
      setRequestError(getScanError(e));
      setStatus('error');
    }
  }, [
    activeAccountMatchesRequest,
    activeCoinsForUser,
    activeScanKey,
    detail,
    getScanCache,
    password,
    requestIsTestnet,
    requiresPassword,
  ]);

  const scanPasswordQr = useCallback(() => {
    Keyboard.dismiss();
    setStatus('passwordScanner');
  }, []);

  const handlePasswordQrScan = useCallback(async codes => {
    const scannedValue = codes && codes[0] ? codes[0].value : null;

    if (
      typeof scannedValue === 'string' &&
      scannedValue.length > 0 &&
      scannedValue.length <= 5000
    ) {
      setPassword(scannedValue);
      setStatus('password');
    } else {
      createAlert('Error', 'QR code did not contain a valid claim password.');
      setStatus('password');
    }
  }, []);

  const claimPlanNeedsAccountRefresh =
    claimPlan != null &&
    activeAccountMatchesRequest &&
    claimPlanScanKey !== activeScanKey;

  const openLogin = useCallback(() => {
    if (matchingAccounts.length === 0) {
      createAlert(
        'No profile found',
        `No ${requestIsTestnet ? 'testnet' : 'mainnet'} profile is available for this request.`,
      );
      return;
    }

    openAuthenticateUserModal({
      [SEND_MODAL_USER_ALLOWLIST]: matchingAccounts,
    });
  }, [matchingAccounts, requestIsTestnet]);

  const linkClaimedIdentities = useCallback(async results => {
    const identityResults = results.filter(result => result.type === 'identity');

    if (identityResults.length === 0) return;

    const touchedCoinIds = new Set();

    for (const result of identityResults) {
      const displayName = result.identity.fullyQualifiedName
        ? convertFqnToDisplayFormat(result.identity.fullyQualifiedName)
        : result.identity.identityAddress;

      await linkVerusId(
        result.identity.identityAddress,
        displayName,
        result.coinObj.id,
      );
      touchedCoinIds.add(result.coinObj.id);
    }

    await updateVerusIdWallet();

    for (const coinId of touchedCoinIds) {
      clearChainLifecycle(coinId);
    }

    const setUserCoinsAction = setUserCoins(activeCoinList, activeAccount.id);
    dispatch(setUserCoinsAction);
    refreshActiveChainLifecycles(
      setUserCoinsAction.payload.activeCoinsForUser,
    );
  }, [activeAccount, activeCoinList, dispatch]);

  const addMissingRedeemedCurrencies = useCallback(async results => {
    const redeemedCurrencyRefs = getRedeemedCurrencyRefs(results);

    if (redeemedCurrencyRefs.length === 0) return;

    let nextActiveCoinList = cloneActiveCoinList(activeCoinList);
    let nextAccountKeys = {...(activeAccount.keys || {})};
    let addedAny = false;
    const errors = [];

    for (const {systemId, currencyId} of redeemedCurrencyRefs) {
      if (
        userHasCurrencyActive(
          nextActiveCoinList,
          currencyId,
          activeAccount.id,
          requestIsTestnet,
        )
      ) {
        continue;
      }

      try {
        const fullCoinData = await resolveRedeemedCurrencyCoinObj({
          activeCoinList: nextActiveCoinList,
          currencyId,
          isTestnet: requestIsTestnet,
          systemId,
        });
        const keypairsAction = await addKeypairs(
          fullCoinData,
          nextAccountKeys,
          activeAccount.keyDerivationVersion == null
            ? 0
            : activeAccount.keyDerivationVersion,
        );

        dispatch(keypairsAction);
        nextAccountKeys = keypairsAction.keys;

        const addCoinAction = await addCoin(
          fullCoinData,
          nextActiveCoinList,
          activeAccount.id,
          fullCoinData.compatible_channels,
        );

        if (!addCoinAction) {
          throw new Error(`Error adding ${fullCoinData.display_ticker || currencyId}.`);
        }

        dispatch(addCoinAction);
        nextActiveCoinList = cloneActiveCoinList(addCoinAction.activeCoinList);
        addedAny = true;
      } catch (e) {
        errors.push(e.message || `Unable to add ${currencyId}.`);
      }
    }

    if (addedAny) {
      const setUserCoinsAction = setUserCoins(
        nextActiveCoinList,
        activeAccount.id,
      );
      dispatch(setUserCoinsAction);
      refreshActiveChainLifecycles(
        setUserCoinsAction.payload.activeCoinsForUser,
      );
    }

    if (errors.length > 0) {
      throw new Error(errors[0]);
    }
  }, [
    activeAccount,
    activeCoinList,
    dispatch,
    requestIsTestnet,
  ]);

  const claim = useCallback(async () => {
    if (!activeAccountMatchesRequest) {
      openLogin();
      return;
    }

    if (claimPlanNeedsAccountRefresh) {
      await scanClaims();
      return;
    }

    if (claimPlan == null) {
      await scanClaims();
      return;
    }

    setStatus('claiming');
    setClaimResult(null);
    setRequestError(null);

    try {
      const preflightPlan = await preflightSpendableKeyClaim({
        claimPlan,
        destinationBySystem,
        privateAddressBySystem: selectedPrivateAddressBySystem,
      });
      const broadcastResult = await broadcastSpendableKeyClaim({
        preflightPlan,
      });

      const {
        identityLinkError,
        currencyAddError,
      } = await reconcileSpendableKeyClaimResults({
        results: broadcastResult.results,
        linkClaimedIdentities,
        addMissingRedeemedCurrencies,
      });

      if (identityLinkError) console.warn(identityLinkError);
      if (currencyAddError) console.warn(currencyAddError);

      if (identityLinkError || currencyAddError) {
        createAlert(
          'Wallet update incomplete',
          `The claim transactions succeeded, but some wallet metadata could not be updated automatically.${
            identityLinkError
              ? ` One or more claimed VerusIDs could not be linked: ${identityLinkError.message}`
              : ''
          }${
            currencyAddError
              ? ` One or more redeemed currencies could not be added: ${currencyAddError.message}`
              : ''
          }`,
        );
      }
      scanCacheRef.current = null;
      setClaimResult(broadcastResult);
      setRequestError(null);
      setStatus('complete');
    } catch (e) {
      if (Array.isArray(e.results) && e.results.length > 0) {
        const {
          identityLinkError,
          currencyAddError,
        } = await reconcileSpendableKeyClaimResults({
          results: e.results,
          linkClaimedIdentities,
          addMissingRedeemedCurrencies,
        });

        if (identityLinkError) console.warn(identityLinkError);
        if (currencyAddError) console.warn(currencyAddError);

        setClaimResult({
          preflightPlan: e.preflightPlan,
          results: e.results,
          partialError: e.message || 'Unable to complete every claim transaction.',
        });
        scanCacheRef.current = null;
        setStatus('complete');
        createAlert(
          'Claim partially completed',
          `${e.results.length} transaction${e.results.length === 1 ? '' : 's'} were submitted before an error occurred. Review the transaction IDs shown on this screen.${
            currencyAddError
              ? ` One or more redeemed currencies could not be added to your wallet automatically. ${currencyAddError.message}`
              : ''
          }${
            identityLinkError
              ? ` One or more claimed VerusIDs could not be linked automatically. ${identityLinkError.message}`
              : ''
          }`,
        );
      } else {
        console.warn(e);
        if (isNetworkError(e)) {
          setRequestError(getClaimNetworkError(e));
          setStatus('error');
        } else {
          createAlert('Error', getErrorMessage(e, 'Unable to claim spendable key.'));
          setStatus('review');
        }
      }
    }
  }, [
    activeAccountMatchesRequest,
    addMissingRedeemedCurrencies,
    claimPlan,
    claimPlanNeedsAccountRefresh,
    destinationBySystem,
    linkClaimedIdentities,
    openLogin,
    scanClaims,
    selectedPrivateAddressBySystem,
  ]);

  useEffect(() => {
    setAssignClaimedIdentityPrivateAddresses(true);
  }, [detailIndex, request]);

  useEffect(() => {
    if (
      !requiresPassword &&
      status === 'idle' &&
      detail != null &&
      !scanStartedRef.current
    ) {
      scanStartedRef.current = true;
      scanClaims();
    }
  }, [
    detail,
    requiresPassword,
    scanClaims,
    status,
  ]);

  useEffect(() => {
    if (
      claimPlanNeedsAccountRefresh &&
      (status === 'review' || status === 'empty')
    ) {
      scanClaims();
    }
  }, [claimPlanNeedsAccountRefresh, scanClaims, status]);

  const renderLoading = label => (
    <SafeAreaView style={styles.container}>
      <View style={styles.centerContent}>
        <AnimatedActivityIndicatorBox />
        <Text style={styles.loadingText}>{label}</Text>
      </View>
    </SafeAreaView>
  );

  if (status === 'scanning') {
    return renderLoading('Scanning spendable key...');
  }

  if (status === 'decrypting') {
    return renderLoading('Decrypting spendable key...');
  }

  if (status === 'claiming') {
    return renderLoading('Claiming spendable key...');
  }

  if (status === 'passwordScanner') {
    return (
      <SafeAreaView style={styles.scannerContainer}>
        <BarcodeReader
          prompt="Scan the claim password QR"
          onScan={handlePasswordQrScan}
          button={() => (
            <Button
              mode="contained"
              buttonColor={Colors.warningButtonColor}
              onPress={() => setStatus('password')}
              style={styles.scannerCancelButton}
            >
              {'Cancel'}
            </Button>
          )}
        />
      </SafeAreaView>
    );
  }

  if (status === 'password') {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.centerContent}>
            <View style={styles.passwordCard}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons
                  name="key-outline"
                  size={54}
                  color={Colors.primaryColor}
                />
              </View>
              <Text style={[styles.mainTitle, {textAlign: 'center'}]}>
                {'Decrypt spendable key'}
              </Text>
              <Text style={styles.passwordDescription}>
                {'This spendable key is encrypted and needs to be decrypted before you can redeem its funds or VerusIDs.'}
              </Text>
              <TextInput
                returnKeyType="done"
                label="Claim password"
                value={password}
                mode="outlined"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                onChangeText={setPassword}
                right={
                  <TextInput.Icon
                    icon={showPassword ? 'eye-off' : 'eye'}
                    onPress={() => setShowPassword(!showPassword)}
                  />
                }
                style={styles.passwordInput}
              />
              <Button
                mode="outlined"
                icon="qrcode-scan"
                onPress={scanPasswordQr}
                style={styles.passwordQrButton}
                contentStyle={styles.passwordQrButtonContent}
                labelStyle={styles.passwordQrButtonLabel}
              >
                {'Scan QR'}
              </Button>
              <GradientButton
                onPress={scanClaims}
                disabled={password.length === 0}
                style={styles.primaryCta}
              >
                {'Decrypt'}
              </GradientButton>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    );
  }

  const primaryActionLabel = status === 'error'
    ? 'Retry'
    : !activeAccountMatchesRequest
    ? signedIn
      ? 'Switch profile'
      : 'Sign in'
    : status === 'empty' || status === 'complete'
    ? 'Done'
    : 'Claim';
  const primaryAction = () => {
    if (status === 'error') {
      if (requestError?.retry === 'claim' && claimPlan != null) {
        claim();
      } else {
        scanClaims();
      }
    } else if (!activeAccountMatchesRequest) {
      openLogin();
    } else if (status === 'empty' || status === 'complete') {
      next(response, [detailIndex]);
    } else {
      claim();
    }
  };
  const showCancelAction = status !== 'complete';

  const footer = (
    <View style={[styles.footer, {paddingBottom: 14 + bottomNavigationInset}]}>
      {showCancelAction && (
        <View style={styles.ctaCol}>
          <Button
            mode="outlined"
            onPress={cancel}
            style={styles.secondaryCta}
            contentStyle={styles.secondaryCtaContent}
            labelStyle={styles.secondaryCtaLabel}
          >
            {'Cancel'}
          </Button>
        </View>
      )}
      <View style={styles.ctaCol}>
        <GradientButton
          onPress={primaryAction}
          disabled={
            status === 'review' &&
            activeAccountMatchesRequest &&
            (!claimPlan ||
              totals.unsupported > 0 ||
              !claimPlan.hasClaims ||
              claimPlanNeedsAccountRefresh)
          }
          style={styles.primaryCta}
        >
          {primaryActionLabel}
        </GradientButton>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.mainTitle}>
            {status === 'error' ? requestError?.title || 'Network error' : claimTitle}
          </Text>
          <Text style={styles.subtitle}>
            {status === 'error'
              ? 'Retry when your connection is available.'
              : status === 'complete'
              ? claimResult?.partialError
                ? 'Some claim transactions were submitted before an error.'
                : 'The claim transactions were submitted.'
              : status === 'empty'
              ? 'No transparent funds or VerusIDs were found.'
              : 'Review the transparent funds and VerusIDs found on this key.'}
          </Text>
        </View>

        {!activeAccountMatchesRequest && (
          <View style={styles.infoCard}>
            <MaterialCommunityIcons
              name="information-outline"
              size={18}
              color={Colors.primaryColor}
            />
            <Text style={styles.infoText}>
              {signedIn
                ? `Switch to a ${requestIsTestnet ? 'testnet' : 'mainnet'} profile to claim this key.`
                : `Sign in to a ${requestIsTestnet ? 'testnet' : 'mainnet'} profile to claim this key.`}
            </Text>
          </View>
        )}

        {status === 'error' && requestError != null && (
          <View style={styles.criticalWarningCard}>
            <MaterialCommunityIcons
              name="wifi-alert"
              size={22}
              color="#991B1B"
              style={{marginTop: 1}}
            />
            <View style={styles.criticalWarningContent}>
              <Text style={styles.criticalWarningTitle}>
                {requestError.title}
              </Text>
              <Text style={styles.criticalWarningText}>
                {requestError.message}
              </Text>
            </View>
          </View>
        )}

        {claimResult != null && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Submitted transactions</Text>
            <Text style={styles.subtitle}>
              {`${claimResult.results.length} transaction${claimResult.results.length === 1 ? '' : 's'} submitted.`}
            </Text>
            {claimResult.partialError && (
              <Text style={styles.partialErrorText}>
                {`An error occurred after the transaction${claimResult.results.length === 1 ? '' : 's'} below: ${claimResult.partialError}`}
              </Text>
            )}
            {claimResult.results.map((transaction, index) => {
              const explorerUrl = getExplorerTxUrl(transaction);

              return (
                <View
                  style={styles.txidCard}
                  key={`${transaction.systemId}:${transaction.txid}:${index}`}
                >
                  <View style={styles.txidHeader}>
                    <Text style={styles.txidLabel}>
                      {getTransactionLabel(transaction)}
                    </Text>
                    <View style={styles.txidActions}>
                      <Button
                        compact
                        icon="content-copy"
                        mode="outlined"
                        onPress={() =>
                          copyToClipboard(transaction.txid, {
                            title: 'Copied',
                            message: 'Transaction ID copied to clipboard.',
                          })
                        }
                        contentStyle={styles.explorerButtonContent}
                        labelStyle={styles.explorerButtonLabel}
                      >
                        {'Copy'}
                      </Button>
                      {explorerUrl && (
                        <Button
                          compact
                          icon="open-in-new"
                          mode="outlined"
                          onPress={() => openUrl(explorerUrl)}
                          contentStyle={styles.explorerButtonContent}
                          labelStyle={styles.explorerButtonLabel}
                        >
                          {'Explorer'}
                        </Button>
                      )}
                    </View>
                  </View>
                  <Text style={styles.txidValue} selectable>
                    {transaction.txid}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {claimPlan && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Found</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryCount}>{totals.currencies}</Text>
                <Text style={styles.summaryLabel}>Balances</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryCount}>{totals.identities}</Text>
                <Text style={styles.summaryLabel}>VerusIDs</Text>
              </View>
            </View>
          </View>
        )}

        {totals.unsupported > 0 && (
          <View style={styles.warningCard}>
            <MaterialCommunityIcons
              name="alert-outline"
              size={18}
              color="#9A3412"
            />
            <Text style={styles.warningText}>
              {'One or more VerusIDs cannot be claimed. No transactions will be sent until all discovered items can be claimed.'}
            </Text>
          </View>
        )}

        {hasIdentityAuthorityWarnings && (
          <View style={styles.criticalWarningCard}>
            <MaterialCommunityIcons
              name="alert-octagon-outline"
              size={22}
              color="#991B1B"
              style={{marginTop: 1}}
            />
            <View style={styles.criticalWarningContent}>
              <Text style={styles.criticalWarningTitle}>
                {'VerusID control warning'}
              </Text>
              <Text style={styles.criticalWarningText}>
                {'Claiming changes the primary address and may replace or remove the identity z-address. External recovery or revocation authorities listed under a VerusID may still be able to recover, reassign, or revoke the ID after you claim it.'}
              </Text>
            </View>
          </View>
        )}

        {status === 'review' && systemsWithoutPrivateAddressCount > 0 && (
          <View style={styles.warningCard}>
            <MaterialCommunityIcons
              name="shield-off-outline"
              size={18}
              color="#9A3412"
            />
            <Text style={styles.warningText}>
              {`Your wallet has no z-address for ${systemsWithoutPrivateAddressCount} identity chain${systemsWithoutPrivateAddressCount === 1 ? '' : 's'}. Existing z-addresses will be removed from those claimed VerusIDs.`}
            </Text>
          </View>
        )}

        {status === 'review' && canAssignClaimedIdentityPrivateAddresses && (
          <TouchableOpacity
            accessibilityRole="checkbox"
            accessibilityState={{
              checked: assignClaimedIdentityPrivateAddresses,
            }}
            activeOpacity={0.75}
            onPress={toggleAssignClaimedIdentityPrivateAddresses}
            style={styles.privateAddressOptionCard}
          >
            <View pointerEvents="none">
              <Checkbox.Android
                status={
                  assignClaimedIdentityPrivateAddresses
                    ? 'checked'
                    : 'unchecked'
                }
                color={Colors.verusGreenColor}
                uncheckedColor="#888"
              />
            </View>
            <View style={styles.privateAddressOptionText}>
              <Text style={styles.privateAddressOptionTitle}>
                {'Assign identity z-address to wallet z-address'}
              </Text>
              <Text style={styles.privateAddressOptionSubtitle}>
                {privateAddressOptionSubtitle}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        {claimPlan &&
          claimPlan.systems.map(system => {
            const hasRows =
              system.currencies.length > 0 || system.identities.length > 0;

            if (!hasRows) return null;

            return (
              <View style={styles.systemCard} key={system.systemId}>
                <View style={styles.systemHeader}>
                  <MaterialCommunityIcons
                    name="link-variant"
                    size={22}
                    color={Colors.primaryColor}
                  />
                  <View style={{flex: 1, minWidth: 0}}>
                    <Text style={styles.systemTitle} numberOfLines={1}>
                      {`${system.coinObj.display_ticker || system.coinObj.id} Chain`}
                    </Text>
                  </View>
                </View>

                {system.currencies.map(currency => (
                  <View
                    style={styles.row}
                    key={`${system.systemId}:${currency.currencyId}`}
                  >
                    <MaterialCommunityIcons
                      name="cash-multiple"
                      size={20}
                      color="#555"
                      style={{marginRight: 10}}
                    />
                    <View style={styles.rowText}>
                      <Text style={styles.rowTitle} numberOfLines={1}>
                        {currency.display.name}
                      </Text>
                      <Text style={styles.rowSubtitle} numberOfLines={1}>
                        {truncate(currency.currencyId)}
                      </Text>
                    </View>
                    <Text style={styles.rowAmount} numberOfLines={1}>
                      {currency.amount}
                    </Text>
                  </View>
                ))}

                {system.identities.map(identity => {
                  const authorityIssues = getIdentityAuthorityIssues(identity);
                  const hasAuthorityWarning = authorityIssues.length > 0;

                  return (
                    <View
                      style={styles.row}
                      key={`${system.systemId}:${identity.identityAddress}`}
                    >
                      <View style={styles.rowText}>
                        <Text style={styles.rowTitle} numberOfLines={1}>
                          {getIdentityDisplay(identity)}
                        </Text>
                        <Text
                          style={[
                            styles.rowSubtitle,
                            hasAuthorityWarning && styles.rowWarningSubtitle,
                          ]}
                          numberOfLines={2}
                        >
                          {identity.unsupportedReason ||
                            (hasAuthorityWarning
                              ? 'Revocation or recovery authority is external'
                              : truncate(identity.identityAddress))}
                        </Text>
                        {hasAuthorityWarning &&
                          authorityIssues.map(issue => (
                            <TouchableOpacity
                              key={`${identity.identityAddress}:${issue.label}`}
                              accessibilityRole="button"
                              accessibilityLabel={`View ${issue.label} details`}
                              activeOpacity={0.75}
                              onPress={() =>
                                openVerusIdDetailsModal(
                                  system.systemId,
                                  issue.authority,
                                )
                              }
                              style={styles.authorityLineItem}
                            >
                              <MaterialCommunityIcons
                                name="card-account-details-outline"
                                size={16}
                                color="#9A3412"
                                style={styles.authorityLineIcon}
                              />
                              <View style={styles.authorityLineText}>
                                <Text style={styles.authorityLineLabel}>
                                  {issue.label}
                                </Text>
                                <Text
                                  style={styles.authorityLineName}
                                  numberOfLines={1}
                                >
                                  {issue.authorityDisplay}
                                </Text>
                              </View>
                              <MaterialCommunityIcons
                                name="chevron-right"
                                size={18}
                                color="#9A3412"
                              />
                            </TouchableOpacity>
                          ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })}
      </ScrollView>
      {footer}
    </SafeAreaView>
  );
};

export default SpendableKeyRequestInfo;
