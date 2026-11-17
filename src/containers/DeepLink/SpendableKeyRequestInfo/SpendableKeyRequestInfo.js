import {confirmVerifiedClaimFees} from '../../../utils/spendableKey/reviewFees';
import {useRequestBackHandler} from '../useRequestNavigation';
import {showFundRawTransactionErrorAlert} from '../../../utils/vrpc/fundRawTransactionError';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import BigNumber from 'bignumber.js';
import {
  AccessibilityInfo,
  Keyboard,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Checkbox, Text} from 'react-native-paper';
import Animated, {FadeIn, ReduceMotion} from 'react-native-reanimated';
import {useDispatch, useSelector} from 'react-redux';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import KeyboardAvoidingForm from '../../../components/KeyboardAvoidingForm';
import ScannerScreen from '../../../components/BarcodeReader/ScannerScreen';
import OnboardingBackButton from '../../../components/OnboardingBackButton';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import TransactionResult from '../../../components/TransactionResult';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actions/walletUnlock/dispatchers/walletUnlock';
import {addCoin, addKeypairs, setUserCoins} from '../../../actions/actionCreators';
import {updateVerusIdWallet} from '../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {linkVerusId} from '../../../actions/actions/services/dispatchers/verusid/verusid';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {useOnboardingSmallDeviceLayout} from '../../../hooks/useOnboardingSmallDeviceLayout';
import useReduceMotion from '../../../hooks/useReduceMotion';
import {
  SPENDABLE_KEY_DECRYPTION_FAILED,
  broadcastSpendableKeyClaim,
  discoverSpendableKeyClaims,
  preflightSpendableKeyClaim,
  spendableKeyDetailsOrdinalToMnemonic,
} from '../../../utils/spendableKey/spendableKey';
import {reconcileSpendableKeyClaimResults} from '../../../utils/spendableKey/claimResultReconciliation';
import {
  assertClaimMetadataSessionCurrent,
  linkClaimedIdentitiesForSession,
  scopeClaimMetadataAction,
} from '../../../utils/spendableKey/claimMetadataSession';
import {
  getSpendableKeyClaimLabel,
  getSpendableKeyReviewModel,
  getSpendableKeyReviewSubtitle,
  getSpendableKeyWalletGate,
} from '../../../utils/spendableKey/spendableKeyReview';
import {convertFqnToDisplayFormat} from '../../../utils/fullyqualifiedname';
import {
  DLIGHT_PRIVATE,
  VRPC,
} from '../../../utils/constants/intervalConstants';
import {
  spendableKeyRequestInfoStyles as createSpendableKeyRequestInfoStyles,
} from '../../../styles';
import {explorers} from '../../../utils/CoinData/CoinData';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {getCurrency} from '../../../utils/api/channels/verusid/callCreators';
import {accountIsTestnet} from '../../../utils/account/accountNetwork';
import {
  OnboardingThemeProvider,
  useOnboardingTheme,
} from '../../../theme/onboarding';
import GenericRequestLoading, {
  GENERIC_REQUEST_LOADING_STEPS,
} from '../GenericRequestLoading';
import ClaimingFundsView, {getClaimAnimationCoin} from './ClaimingFundsView';
import {
  DeepLinkReviewScrollView,
  RequestTitle,
  RequestCard,
} from '../components/RequestReview';
import {
  getPendingDeeplinkRequest,
  savePendingDeeplinkRequest,
  setPendingDeeplinkBroadcast,
} from '../../../utils/deeplink/pendingDeeplinkStorage';
import {
  GENERIC_REQUEST_DELIVERY_TYPES,
  getGenericRequestDeliveryInfo,
} from '../../../utils/deeplink/genericRequestDelivery';

// The result fades in after the claim hand-off, as the stage faded out.
const RESULT_FADE_IN = FadeIn.duration(220).reduceMotion(ReduceMotion.Never);
const RESULT_FADE_STYLE = {flex: 1};

const CLAIM_PASSWORD_ERROR =
  'That password didn’t decrypt this key. Check it and try again.';
const CLAIM_PASSWORD_QR_ERROR =
  'That QR code didn’t contain a valid claim password.';

const announceForAccessibility = message => {
  if (
    typeof AccessibilityInfo.announceForAccessibilityWithOptions === 'function'
  ) {
    AccessibilityInfo.announceForAccessibilityWithOptions(message, {
      queue: true,
    });
  } else {
    AccessibilityInfo.announceForAccessibility(message);
  }
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

const getCurrentPendingClaimWalletBinding = (pendingBroadcast, account) => {
  const expectedBinding = pendingBroadcast?.ownerWalletBinding;

  if (
    expectedBinding == null ||
    typeof expectedBinding !== 'object' ||
    Array.isArray(expectedBinding) ||
    Object.keys(expectedBinding).length === 0 ||
    account == null
  ) {
    return null;
  }

  return Object.entries(expectedBinding).reduce(
    (currentBinding, [systemId, expected]) => {
      const coinId = expected?.coinId;
      const destinationAddress =
        typeof coinId === 'string'
          ? account.keys?.[coinId]?.[VRPC]?.addresses?.[0]
          : null;

      currentBinding[systemId] = {
        coinId,
        destinationAddress,
      };

      if (typeof expected?.privateAddress === 'string') {
        currentBinding[systemId].privateAddress =
          account.keys?.[coinId]?.[DLIGHT_PRIVATE]?.addresses?.[0];
      }

      return currentBinding;
    },
    {},
  );
};

const pendingClaimWalletBindingMatches = (pendingBroadcast, currentBinding) => {
  const expectedBinding = pendingBroadcast?.ownerWalletBinding;

  if (
    expectedBinding == null ||
    typeof expectedBinding !== 'object' ||
    Array.isArray(expectedBinding) ||
    Object.keys(expectedBinding).length === 0 ||
    currentBinding == null
  ) {
    return false;
  }

  return Object.entries(expectedBinding).every(([systemId, expected]) => {
    const current = currentBinding[systemId];

    return (
      typeof expected?.coinId === 'string' &&
      typeof expected?.destinationAddress === 'string' &&
      current?.coinId === expected.coinId &&
      current?.destinationAddress === expected.destinationAddress &&
      (typeof expected.privateAddress !== 'string' ||
        current?.privateAddress === expected.privateAddress)
    );
  });
};

// "1 of 2 transactions was submitted. The other is saved. Retry to submit it."
const getPartialClaimSubtitle = claimResult => {
  const submitted = claimResult?.results?.length || 0;
  const total = claimResult?.transactionCount;

  if (!Number.isFinite(total) || total <= submitted) {
    return 'Some transactions were not submitted. They are saved. Retry to submit them.';
  }

  const remaining = total - submitted;
  const submittedText = `${submitted} of ${total} transactions ${
    submitted === 1 ? 'was' : 'were'
  } submitted.`;

  return remaining === 1
    ? `${submittedText} The other is saved. Retry to submit it.`
    : `${submittedText} The other ${remaining} are saved. Retry to submit them.`;
};

const getStatusSubtitle = ({claimResult, requestError, status}) => {
  if (status === 'error') {
    if (requestError?.partial) return getPartialClaimSubtitle(claimResult);
    if (requestError?.subtitle) return requestError.subtitle;

    return requestError?.network
      ? 'Retry when your connection is available.'
      : null;
  }
  // The result says it all: no subtitle.
  if (status === 'complete') return null;
  if (status === 'empty') {
    return 'No transparent funds or VerusIDs were found.';
  }
  return 'Review the transparent funds and VerusIDs found on this key.';
};

const getScreenTitle = ({requestError, status}) => {
  if (status === 'error') return requestError?.title || 'Network error';
  if (status !== 'complete') return 'Claim funds';
  return 'Claim submitted';
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
  message: 'This key could not be scanned.',
  network: true,
  detail: getErrorMessage(error, 'Unable to scan spendable key.'),
  retry: 'scan',
});

const getClaimNetworkError = error => ({
  title: 'Network error',
  message: 'The claim was not submitted.',
  network: true,
  detail: getErrorMessage(error, 'Unable to claim spendable key.'),
  retry: 'claim',
});

const getInvalidSpendableKeyError = error => ({
  title: 'Can’t decrypt this key',
  subtitle: 'This request can’t be processed on this device.',
  message:
    'This spendable key is invalid or uses an unsupported encryption format.',
  detail: getErrorMessage(error, 'Unable to decrypt spendable key.'),
  icon: 'alert-octagon-outline',
  retry: null,
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

const truncateAddress = value => {
  const address = getAddressString(value);
  if (!address || address.length <= 23) return address;
  return `${address.slice(0, 12)}...${address.slice(-8)}`;
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

const getSystemLabel = system =>
  `${system.coinObj.display_ticker || system.coinObj.id} Chain`;

const hasClaimFee = system =>
  system.feeAmount != null && Number(system.feeAmount) > 0;

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
  requestContext,
  systemId,
}) => {
  assertClaimMetadataSessionCurrent(requestContext);
  const activeCoinObj = (activeCoinList || []).find(coinObj =>
    coinMatchesRedeemedCurrency(coinObj, currencyId, isTestnet),
  );

  if (activeCoinObj != null) return activeCoinObj;

  if (!CoinDirectory.coinExistsInDirectory(currencyId)) {
    const currencyRes = await getCurrency(systemId, currencyId);
    assertClaimMetadataSessionCurrent(requestContext);

    if (currencyRes.error) {
      throw new Error(currencyRes.error.message);
    }

    if (!currencyRes.result || !currencyRes.result.currencyid) {
      throw new Error(`Unable to resolve currency ${currencyId}.`);
    }

    await CoinDirectory.addPbaasCurrency(currencyRes.result, isTestnet, true);
    assertClaimMetadataSessionCurrent(requestContext);
  }

  assertClaimMetadataSessionCurrent(requestContext);
  const coinObj = CoinDirectory.findCoinObj(currencyId);

  if (!!coinObj.testnet !== !!isTestnet) {
    throw new Error(
      `${coinObj.display_ticker || currencyId} is not available on the active wallet network.`,
    );
  }

  return coinObj;
};

const CLAIM_SUBMIT_ERROR = 'The claim was not submitted. Try again.';
const IDENTITY_CLAIM_CONFIRMATION_NOTE =
  'A claimed VerusID is yours only after its claim transaction confirms. Wait for the confirmation before you send funds to it.';

const resultsIncludeIdentityClaim = results =>
  (results || []).some(result => result.type === 'identity');

// The claim itself succeeded. Only the wallet's own follow-up (linking a
// claimed VerusID or adding a redeemed currency) failed.
const getClaimMetadataNote = ({identityLinkFailed, currencyAddFailed}) => {
  if (identityLinkFailed && currencyAddFailed) {
    return 'The wallet could not link the claimed VerusIDs or add the claimed currencies. Add them manually.';
  }
  if (identityLinkFailed) {
    return 'The wallet could not link the claimed VerusIDs. Link them manually.';
  }
  if (currencyAddFailed) {
    return 'The wallet could not add the claimed currencies. Add them manually.';
  }

  return null;
};

const CLAIM_FUNDS_CAPTION =
  'The funds show in your wallet after the transaction confirms.';
const CLAIM_CHAINS_CAPTION =
  'Each transaction confirms on its own chain. The funds show in your wallet after that.';
const CLAIM_SAME_CHAIN_CAPTION =
  'The funds show in your wallet after the transactions confirm.';

const getClaimedCurrencyName = (claimPlan, transaction, currencyId) => {
  const system = (claimPlan?.systems || []).find(
    item => item.systemId === transaction.systemId,
  );
  const currency = (system?.currencies || []).find(
    item => item.currencyId === currencyId,
  );

  if (currency?.display?.name) return currency.display.name;
  if (
    currencyId === transaction.systemId ||
    currencyId === transaction.coinObj?.currency_id
  ) {
    return (
      transaction.coinObj?.display_ticker || transaction.coinObj?.id || currencyId
    );
  }

  return currencyId;
};

// The funds and the VerusID that one claim transaction moves to the wallet.
// The chain's own coin comes first.
const getClaimedItems = (claimPlan, transaction) => {
  const totals = new Map();

  for (const output of transaction.outputs || []) {
    if (!output?.currencyId || output.amount == null) continue;

    const current = totals.get(output.currencyId) || BigNumber(0);
    totals.set(output.currencyId, current.plus(output.amount));
  }

  const amounts = Array.from(totals.entries())
    .filter(([, amount]) => amount.isGreaterThan(0))
    .sort(
      ([first], [second]) =>
        Number(second === transaction.systemId) -
        Number(first === transaction.systemId),
    )
    .map(([currencyId, amount]) => ({
      amount: amount.toString(),
      unit: getClaimedCurrencyName(claimPlan, transaction, currencyId),
    }));
  const identityName =
    transaction.type === 'identity' && transaction.identity != null
      ? getIdentityDisplay(transaction.identity)
      : null;

  return {amounts, identityName};
};

const formatClaimedAmount = ({amount, unit}) => `${amount} ${unit}`;

// What one transaction claims, in a few words: "alice@ and funds".
const getClaimedText = (claimPlan, transaction) => {
  const {amounts, identityName} = getClaimedItems(claimPlan, transaction);

  if (identityName) {
    return amounts.length > 0 || transaction.includesSweep
      ? `${identityName} and funds`
      : identityName;
  }

  return amounts.map(formatClaimedAmount).join(', ');
};

const getTransactionChainLabel = transaction =>
  transaction.coinObj?.display_name ||
  transaction.coinObj?.display_ticker ||
  transaction.systemId;

// The claim result on the shared transaction result (TransactionResult), as
// the Send flow's Sent step shows one. One fact at a time: no section label
// and no count line.
//
// One transaction: the amount, its Transaction ID and explorer, one caption.
// Several, or a partial claim: what each transaction claims, with its chain
// when the claim spans chains.
const getClaimResultProps = ({
  claimPlan,
  claimResult,
  partial,
  smallDevice,
  styles,
}) => {
  const results = claimResult.results || [];
  const chainCount = new Set(results.map(item => item.systemId)).size;
  const includesIdentity = resultsIncludeIdentityClaim(results);
  const warning = claimResult.metadataNote || null;

  if (!partial && results.length === 1) {
    const [transaction] = results;
    const {amounts, identityName} = getClaimedItems(claimPlan, transaction);
    const [main, ...otherAmounts] = amounts;
    const others = otherAmounts.map(formatClaimedAmount);

    if (main && identityName) others.push(identityName);

    return {
      amount:
        main || identityName ? (
          <View
            style={[
              styles.resultAmount,
              smallDevice && styles.resultAmountCompact,
            ]}>
            {main ? (
              <View style={styles.resultAmountRow}>
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.62}
                  numberOfLines={1}
                  style={styles.amountHeroValue}>
                  {main.amount}
                </Text>
                <Text numberOfLines={2} style={styles.amountHeroCurrency}>
                  {main.unit}
                </Text>
              </View>
            ) : (
              <Text style={styles.resultIdentity}>{identityName}</Text>
            )}
            {others.length > 0 ? (
              <Text style={styles.resultMore}>{`+ ${others.join(', ')}`}</Text>
            ) : null}
          </View>
        ) : null,
      caption: includesIdentity
        ? IDENTITY_CLAIM_CONFIRMATION_NOTE
        : CLAIM_FUNDS_CAPTION,
      itemized: false,
      transactions: [
        {txid: transaction.txid, explorerUrl: getExplorerTxUrl(transaction)},
      ],
      warning,
    };
  }

  return {
    caption: partial
      ? null
      : [
          chainCount > 1 ? CLAIM_CHAINS_CAPTION : CLAIM_SAME_CHAIN_CAPTION,
          includesIdentity ? IDENTITY_CLAIM_CONFIRMATION_NOTE : null,
        ],
    itemized: true,
    transactions: results.map(transaction => ({
      explorerUrl: getExplorerTxUrl(transaction),
      group: chainCount > 1 ? getTransactionChainLabel(transaction) : null,
      label: getClaimedText(claimPlan, transaction),
      txid: transaction.txid,
    })),
    warning,
  };
};

const SpendableKeyRequestInfoContent = props => {
  const {
    cancel = () => {},
    completeWithDelivery,
    detailIndex,
    next = async () => {},
    navigation,
    openVerusIdDetailsModal = () => {},
    pendingDeeplinkId,
    request,
    response,
    requiresPassword,
  } = props;

  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const styles = useMemo(
    () => createSpendableKeyRequestInfoStyles(theme),
    [theme],
  );
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const signedIn = useSelector(state => state.authentication.signedIn);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const deeplinkPassthrough = useObjectSelector(state => state.deeplink.passthrough);
  const isReplayedPendingDeeplink =
    deeplinkPassthrough?.replayedPendingDeeplink === true;
  const sessionEpoch = useObjectSelector(
    state => state.authentication.sessionEpoch || 0,
  );
  const [pendingClaimBroadcast, setPendingClaimBroadcast] = useState(null);

  const requestIsTestnet = request != null && request.isTestnet();
  const pendingClaimOwnerAccountHash =
    pendingClaimBroadcast?.ownerAccountHash || null;
  const pendingClaimHasWalletBinding = !!(
    pendingClaimBroadcast == null ||
    (pendingClaimBroadcast.ownerWalletBinding != null &&
      typeof pendingClaimBroadcast.ownerWalletBinding === 'object' &&
      !Array.isArray(pendingClaimBroadcast.ownerWalletBinding) &&
      Object.keys(pendingClaimBroadcast.ownerWalletBinding).length > 0)
  );
  const pendingClaimHasBoundOwner =
    pendingClaimBroadcast == null ||
    (pendingClaimOwnerAccountHash != null && pendingClaimHasWalletBinding);
  const currentPendingClaimWalletBinding = useMemo(
    () =>
      getCurrentPendingClaimWalletBinding(
        pendingClaimBroadcast,
        activeAccount,
      ),
    [activeAccount, pendingClaimBroadcast],
  );
  const activeAccountMatchesPendingClaimWallet =
    pendingClaimBroadcast == null ||
    pendingClaimWalletBindingMatches(
      pendingClaimBroadcast,
      currentPendingClaimWalletBinding,
    );
  const activeAccountMatchesRequest = !!(
    signedIn &&
    activeAccount &&
    accountIsTestnet(activeAccount) === requestIsTestnet &&
    pendingClaimHasBoundOwner &&
    (pendingClaimBroadcast == null ||
      activeAccount.accountHash === pendingClaimOwnerAccountHash) &&
    activeAccountMatchesPendingClaimWallet
  );
  const matchingAccounts = useMemo(() => {
    return (accounts || []).filter(
      account =>
        accountIsTestnet(account) === requestIsTestnet &&
        pendingClaimHasBoundOwner &&
        (pendingClaimBroadcast == null ||
          account.accountHash === pendingClaimOwnerAccountHash),
    );
  }, [
    accounts,
    pendingClaimBroadcast,
    pendingClaimHasBoundOwner,
    pendingClaimOwnerAccountHash,
    requestIsTestnet,
  ]);
  const activeScanKey = useMemo(() => {
    if (!activeAccountMatchesRequest) return 'anonymous';

    const systems = (activeCoinsForUser || [])
      .map(coinObj => coinObj.system_id || coinObj.id)
      .filter(systemId => systemId != null)
      .sort();

    return `${activeAccount.id}:${systems.join(',')}`;
  }, [activeAccount, activeAccountMatchesRequest, activeCoinsForUser]);

  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState(requiresPassword ? 'password' : 'idle');
  const [claimPlan, setClaimPlan] = useState(null);
  const [claimPlanScanKey, setClaimPlanScanKey] = useState(null);
  const [claimResult, setClaimResult] = useState(null);
  const [claimError, setClaimError] = useState(null);
  const [requestError, setRequestError] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [claimSlow, setClaimSlow] = useState(false);
  // The broadcast returned: the claim screen plays its hand-off, then the
  // result fades in.
  const [claimHandoff, setClaimHandoff] = useState(false);
  const [resultFadeIn, setResultFadeIn] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState(
    pendingDeeplinkId ||
      deeplinkPassthrough?.pendingDeeplinkId ||
      deeplinkPassthrough?.pendingProvisioningDeeplinkId ||
      null,
  );
  const [
    assignClaimedIdentityPrivateAddresses,
    setAssignClaimedIdentityPrivateAddresses,
  ] = useState(true);
  const scanStartedRef = useRef(false);
  const scanCacheRef = useRef(null);
  const scanInFlightRef = useRef(false);
  const passwordInputRef = useRef(null);
  const passwordScrollRef = useRef(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const revealPassword = useCallback(() => {
    if (keyboardVisible) {
      passwordScrollRef.current?.scrollToEnd({animated: !reduceMotion});
    }
  }, [keyboardVisible, reduceMotion]);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  useEffect(() => {
    const frame = requestAnimationFrame(revealPassword);
    return () => cancelAnimationFrame(frame);
  }, [revealPassword]);

  const showPasswordError = useCallback(async message => {
    setPasswordError(message);
    setStatus('password');
    await waitForStatusPaint();
    passwordInputRef.current?.focus();
    announceForAccessibility(message);
  }, []);

  const destinationBySystem = useMemo(
    () => getSystemDestinationMap(claimPlan, activeAccount),
    [claimPlan, activeAccount],
  );
  const privateAddressBySystem = useMemo(
    () => getSystemPrivateAddressMap(claimPlan, activeAccount),
    [claimPlan, activeAccount],
  );

  const detail = request ? request.getDetails(detailIndex) : null;

  const ensurePendingRequestId = useCallback(async () => {
    if (!request) throw new Error('Cannot save this spendable-key request.');
    const requestBufferString = request.toBuffer().toString('hex');

    if (pendingRequestId) {
      const existingRequest = await getPendingDeeplinkRequest(pendingRequestId);

      if (existingRequest?.requestBufferString === requestBufferString) {
        return pendingRequestId;
      }
    }

    const savedRequest = await savePendingDeeplinkRequest({
      requestBufferString,
      uri: request.toWalletDeeplinkUri(),
    });

    if (!savedRequest?.id) {
      throw new Error('Unable to save this spendable-key request.');
    }

    setPendingRequestId(savedRequest.id);
    return savedRequest.id;
  }, [pendingRequestId, request]);

  const persistClaimBroadcast = useCallback(async pendingBroadcast => {
    const requestId = await ensurePendingRequestId();

    await setPendingDeeplinkBroadcast(requestId, pendingBroadcast);
    setPendingClaimBroadcast(pendingBroadcast);
  }, [ensurePendingRequestId]);

  const loadPendingClaimBroadcast = useCallback(async () => {
    const requestId = await ensurePendingRequestId();
    const savedRequest = await getPendingDeeplinkRequest(requestId);
    const savedBroadcast = savedRequest?.pendingBroadcast;

    if (
      savedBroadcast?.kind === 'spendable-key-claim' &&
      Array.isArray(savedBroadcast.transactions) &&
      savedBroadcast.transactions.length > 0
    ) {
      setPendingClaimBroadcast(savedBroadcast);
      return savedBroadcast;
    }

    return null;
  }, [ensurePendingRequestId]);

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

  const reviewModel = useMemo(
    () => getSpendableKeyReviewModel(claimPlan),
    [claimPlan],
  );
  // With one chain, the receiving address and fee continue the list above
  // them. A gap there showed as an empty row between two lines.
  const onlySystem = reviewModel.hasMultipleSystems ? null : reviewModel.systems[0];
  const joinClaimDetails =
    onlySystem != null &&
    (reviewModel.identityCount > 0 ||
      (!reviewModel.singleBalance && reviewModel.balanceCount > 0)) &&
    (!!destinationBySystem[onlySystem.systemId] || hasClaimFee(onlySystem));
  const joinBalancesToDetails = joinClaimDetails && reviewModel.identityCount === 0;
  // The subtitle already names what the key holds. Label the lists only when
  // balances and VerusIDs both show.
  const showSectionTitles = reviewModel.balanceCount > 0 && reviewModel.identityCount > 0;
  const unsupportedIdentityCount = useMemo(
    () =>
      reviewModel.identities.filter(({identity}) => identity.unsupportedReason)
        .length,
    [reviewModel],
  );
  const hasIdentityAuthorityWarnings = useMemo(
    () =>
      reviewModel.identities.some(
        ({identity}) => getIdentityAuthorityIssues(identity).length > 0,
      ),
    [reviewModel],
  );
  const identitySystemIds = useMemo(() => {
    if (!claimPlan) return [];

    return claimPlan.systems
      .filter(system => system.identities.length > 0)
      .map(system => system.systemId);
  }, [claimPlan]);
  const assignablePrivateAddressSystemIds = useMemo(
    () =>
      identitySystemIds.filter(systemId => privateAddressBySystem[systemId]),
    [identitySystemIds, privateAddressBySystem],
  );
  const canAssignClaimedIdentityPrivateAddresses =
    activeAccountMatchesRequest &&
    assignablePrivateAddressSystemIds.length > 0;
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
    const eligibleText =
      privateAddresses.length === 1
        ? `Set the private address of claimed VerusIDs to ${truncateAddress(
            privateAddresses[0],
          )}, your wallet z-address.`
        : 'Use each available chain wallet z-address for claimed VerusIDs.';

    return systemsWithoutPrivateAddressCount === 0
      ? eligibleText
      : `${eligibleText} ${systemsWithoutPrivateAddressCount} chain${
          systemsWithoutPrivateAddressCount === 1 ? '' : 's'
        } without a wallet z-address will have existing identity z-addresses removed.`;
  }, [
    assignablePrivateAddressSystemIds,
    canAssignClaimedIdentityPrivateAddresses,
    privateAddressBySystem,
    systemsWithoutPrivateAddressCount,
  ]);
  const walletGate = useMemo(
    () =>
      getSpendableKeyWalletGate({
        activeAccountMatchesRequest,
        matchingAccountCount: matchingAccounts.length,
        signedIn,
      }),
    [activeAccountMatchesRequest, matchingAccounts.length, signedIn],
  );

  const scanClaims = useCallback(async () => {
    if (scanInFlightRef.current) return;
    scanInFlightRef.current = true;

    Keyboard.dismiss();
    let mnemonic;
    const scanCache = getScanCache();
    const needsDecryption = requiresPassword && scanCache.mnemonic == null;

    setClaimResult(null);
    setClaimError(null);
    setRequestError(null);
    setClaimPlan(null);
    setClaimPlanScanKey(null);
    setPasswordError(null);
    setStatus(needsDecryption ? 'decrypting' : 'scanning');

    try {
      await waitForStatusPaint();
      const savedBroadcast = await loadPendingClaimBroadcast();

      if (savedBroadcast != null) {
        setRequestError({
          title: 'Pending claim transaction',
          message: 'A signed claim was saved before an earlier broadcast attempt. Retry to broadcast the same transaction again.',
          retry: 'claim',
        });
        setStatus('error');
        return;
      }
    } catch (e) {
      console.warn('Unable to load pending spendable-key broadcast', e);
    }

    try {
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
        if (requiresPassword && e?.code === SPENDABLE_KEY_DECRYPTION_FAILED) {
          await showPasswordError(CLAIM_PASSWORD_ERROR);
        } else if (!requiresPassword) {
          console.warn(e);
          setRequestError({
            title: 'Invalid spendable key',
            message: 'This spendable key could not be read.',
            detail: getErrorMessage(e, 'Unable to scan spendable key.'),
            retry: 'scan',
          });
          setStatus('error');
        } else {
          setRequestError(getInvalidSpendableKeyError(e));
          setStatus('error');
        }

        return;
      }

      if (needsDecryption) {
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
    } finally {
      scanInFlightRef.current = false;
    }
  }, [
    activeAccountMatchesRequest,
    activeCoinsForUser,
    activeScanKey,
    detail,
    getScanCache,
    loadPendingClaimBroadcast,
    password,
    requestIsTestnet,
    requiresPassword,
    showPasswordError,
  ]);

  const scanPasswordQr = useCallback(() => {
    Keyboard.dismiss();
    setStatus('passwordScanner');
  }, []);

  const closePasswordScanner = useCallback(() => setStatus('password'), []);

  const handlePasswordQrScan = useCallback(async codes => {
    const scannedValue = codes && codes[0] ? codes[0].value : null;

    if (
      typeof scannedValue === 'string' &&
      scannedValue.length > 0 &&
      scannedValue.length <= 5000
    ) {
      setPassword(scannedValue);
      setPasswordError(null);
      setStatus('password');
    } else {
      await showPasswordError(CLAIM_PASSWORD_QR_ERROR);
    }
  }, [showPasswordError]);

  const claimPlanNeedsAccountRefresh =
    claimPlan != null &&
    activeAccountMatchesRequest &&
    claimPlanScanKey !== activeScanKey;

  // A saved claim that no wallet on this device may retry. The screen shows
  // the reason beside the disabled action instead of an alert.
  const pendingClaimRetryBlock = useMemo(() => {
    if (pendingClaimBroadcast == null) return null;

    if (
      pendingClaimHasBoundOwner &&
      signedIn &&
      activeAccount?.accountHash === pendingClaimOwnerAccountHash &&
      !activeAccountMatchesPendingClaimWallet
    ) {
      return 'This saved claim was created by a different wallet. It will not be submitted from this wallet.';
    }

    if (matchingAccounts.length === 0) {
      return pendingClaimHasBoundOwner
        ? 'This saved claim can only be retried from the wallet that created it.'
        : 'This saved claim is missing its originating wallet. It will not be submitted from another wallet.';
    }

    return null;
  }, [
    activeAccount,
    activeAccountMatchesPendingClaimWallet,
    matchingAccounts.length,
    pendingClaimBroadcast,
    pendingClaimHasBoundOwner,
    pendingClaimOwnerAccountHash,
    signedIn,
  ]);

  const openLogin = useCallback(async () => {
    if (pendingClaimRetryBlock != null) return;

    try {
      await requestWalletUnlock({
        reason: 'spendable-key-claim',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'Spendable key',
        accountHashes: matchingAccounts.map(account => account.accountHash),
        networkLabel: requestIsTestnet ? 'Testnet' : 'Mainnet',
      });
    } catch (e) {
      if (e?.code !== WALLET_UNLOCK_CANCELLED) {
        createAlert(
          'Cannot continue',
          e?.message || 'Unable to unlock wallet.',
        );
      }
    }
  }, [
    matchingAccounts,
    pendingClaimRetryBlock,
    requestIsTestnet,
    signedIn,
  ]);

  const openWalletSetup = useCallback(async () => {
    let savedPendingDeeplinkId = pendingDeeplinkId;

    try {
      if (!savedPendingDeeplinkId) {
        const savedRequest = await savePendingDeeplinkRequest({
          requestBufferString: request.toBuffer().toString('hex'),
          uri: request.toWalletDeeplinkUri(),
        });
        savedPendingDeeplinkId = savedRequest?.id;
      }

      if (!savedPendingDeeplinkId) {
        throw new Error('Unable to save this claim before wallet setup.');
      }

      const rootNavigation =
        navigation?.getParent?.() || navigation?.dangerouslyGetParent?.();

      if (!rootNavigation) {
        throw new Error('Unable to open wallet setup.');
      }

      const hasAnyWallets = (accounts || []).length > 0;

      rootNavigation.navigate(
        hasAnyWallets ? 'SignedOutStack' : 'SignedOutNoKeyStack',
        {
          screen: hasAnyWallets ? 'Login' : 'LandingScreen',
          params: {
            claimRequestIsTestnet: requestIsTestnet,
            openSetupSheet: true,
            resumePendingDeeplinkId: savedPendingDeeplinkId,
          },
        },
      );
    } catch (e) {
      console.warn(e);
      createAlert(
        'Cannot open wallet setup',
        'The wallet could not save this claim before setup. Try again.',
      );
    }
  }, [accounts, navigation, pendingDeeplinkId, request, requestIsTestnet]);

  const linkClaimedIdentities = useCallback(
    async (results, requestContext) =>
      linkClaimedIdentitiesForSession({
        results,
        requestContext,
        activeAccount,
        activeCoinList,
        dispatch,
        linkIdentity: linkVerusId,
        updateIdentityWallet: updateVerusIdWallet,
        clearLifecycle: clearChainLifecycle,
        createSetUserCoinsAction: setUserCoins,
        refreshLifecycles: refreshActiveChainLifecycles,
      }),
    [activeAccount, activeCoinList, dispatch],
  );

  const addMissingRedeemedCurrencies = useCallback(async (
    results,
    requestContext,
  ) => {
    assertClaimMetadataSessionCurrent(requestContext);
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
        assertClaimMetadataSessionCurrent(requestContext);
        const fullCoinData = await resolveRedeemedCurrencyCoinObj({
          activeCoinList: nextActiveCoinList,
          currencyId,
          isTestnet: requestIsTestnet,
          requestContext,
          systemId,
        });
        assertClaimMetadataSessionCurrent(requestContext);
        const keypairsAction = await addKeypairs(
          fullCoinData,
          nextAccountKeys,
          activeAccount.keyDerivationVersion == null
            ? 0
            : activeAccount.keyDerivationVersion,
          requestContext,
        );

        assertClaimMetadataSessionCurrent(requestContext);
        dispatch(scopeClaimMetadataAction(keypairsAction, requestContext));
        nextAccountKeys = keypairsAction.keys;

        assertClaimMetadataSessionCurrent(requestContext);
        const addCoinAction = await addCoin(
          fullCoinData,
          nextActiveCoinList,
          activeAccount.id,
          fullCoinData.compatible_channels,
          requestContext,
        );
        assertClaimMetadataSessionCurrent(requestContext);

        if (!addCoinAction) {
          throw new Error(`Error adding ${fullCoinData.display_ticker || currencyId}.`);
        }

        dispatch(scopeClaimMetadataAction(addCoinAction, requestContext));
        nextActiveCoinList = cloneActiveCoinList(addCoinAction.activeCoinList);
        addedAny = true;
      } catch (e) {
        if (e?.code === 'SESSION_CHANGED') throw e;
        errors.push(e.message || `Unable to add ${currencyId}.`);
      }
    }

    if (addedAny) {
      assertClaimMetadataSessionCurrent(requestContext);
      const setUserCoinsAction = setUserCoins(
        nextActiveCoinList,
        activeAccount.id,
      );
      dispatch(scopeClaimMetadataAction(setUserCoinsAction, requestContext));
      assertClaimMetadataSessionCurrent(requestContext);
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

    if (claimPlan == null && pendingClaimBroadcast == null) {
      await scanClaims();
      return;
    }

    setStatus('claiming');
    setClaimHandoff(false);
    setResultFadeIn(false);
    setClaimResult(null);
    setClaimError(null);
    setRequestError(null);

    const claimRequestContext = {
      sessionScope: {
        sessionScoped: true,
        accountHash: activeAccount.accountHash,
        sessionEpoch,
      },
    };

    try {
      assertClaimMetadataSessionCurrent(claimRequestContext);
      const preflightPlan = pendingClaimBroadcast == null
        ? await preflightSpendableKeyClaim({
            claimPlan,
            destinationBySystem,
            privateAddressBySystem: selectedPrivateAddressBySystem,
          })
        : null;
      assertClaimMetadataSessionCurrent(claimRequestContext);
      if (preflightPlan) {
        const approved = await confirmVerifiedClaimFees(preflightPlan, currency => {
          const system = preflightPlan.claimPlan.systems.find(item => item.systemId === currency);
          if (system) return system.coinObj.display_ticker || system.coinObj.id;
          try {
            const coin = CoinDirectory.findCoinObj(currency);
            return coin.display_ticker || coin.id;
          } catch (_) { return currency; }
        });
        assertClaimMetadataSessionCurrent(claimRequestContext);
        if (!approved) {
          setStatus('review');
          return;
        }
      }
      const persistPendingBroadcastForSession = async pendingBroadcast => {
        assertClaimMetadataSessionCurrent(claimRequestContext);
        await persistClaimBroadcast(pendingBroadcast);
        assertClaimMetadataSessionCurrent(claimRequestContext);
      };
      const broadcastResult = await broadcastSpendableKeyClaim({
        preflightPlan,
        pendingBroadcast: pendingClaimBroadcast,
        loadPendingBroadcast: loadPendingClaimBroadcast,
        ownerAccountHash: claimRequestContext.sessionScope.accountHash,
        currentOwnerWalletBinding: currentPendingClaimWalletBinding,
        persistPendingBroadcast: persistPendingBroadcastForSession,
      });

      const {
        identityLinkError,
        currencyAddError,
      } = await reconcileSpendableKeyClaimResults({
        results: broadcastResult.results,
        linkClaimedIdentities,
        addMissingRedeemedCurrencies,
        requestContext: claimRequestContext,
      });

      if (identityLinkError) console.warn(identityLinkError);
      if (currencyAddError) console.warn(currencyAddError);

      scanCacheRef.current = null;
      setPendingClaimBroadcast(broadcastResult.pendingBroadcast);
      // The "Claim submitted" screen notes an incomplete wallet update.
      setClaimResult({
        ...broadcastResult,
        metadataNote: getClaimMetadataNote({
          identityLinkFailed: !!identityLinkError,
          currencyAddFailed: !!currencyAddError,
        }),
      });
      setRequestError(null);
      // The screen shows the result after its hand-off (finishClaimHandoff).
      setClaimHandoff(true);
    } catch (e) {
      if (e?.code === 'SESSION_CHANGED') return;

      if (e.pendingBroadcast) {
        setPendingClaimBroadcast(e.pendingBroadcast);
      }

      if (Array.isArray(e.results) && e.results.length > 0) {
        const reconciliation = await reconcileSpendableKeyClaimResults({
          results: e.results,
          linkClaimedIdentities,
          addMissingRedeemedCurrencies,
          requestContext: claimRequestContext,
        }).catch(metadataError => {
          if (metadataError?.code === 'SESSION_CHANGED') return null;
          throw metadataError;
        });

        if (reconciliation == null) return;

        const {
          identityLinkError,
          currencyAddError,
        } = reconciliation;

        if (identityLinkError) console.warn(identityLinkError);
        if (currencyAddError) console.warn(currencyAddError);

        // The error state and the submitted transactions already show the
        // partial claim. The incomplete wallet update shows as a note there.
        // The screen counts what was submitted; the raw error only goes to
        // the log.
        console.warn(e);
        setClaimResult({
          preflightPlan: e.preflightPlan,
          results: e.results,
          transactionCount: e.pendingBroadcast?.transactions?.length ?? null,
          metadataNote: getClaimMetadataNote({
            identityLinkFailed: !!identityLinkError,
            currencyAddFailed: !!currencyAddError,
          }),
        });
        scanCacheRef.current = null;
        setRequestError({
          title: 'Claim not finished',
          partial: true,
          detail: e.message || 'Unable to complete every claim transaction.',
          retry: 'claim',
        });
        setStatus('error');
      } else {
        console.warn(e);
        if (e.pendingBroadcast) {
          setRequestError({
            title: 'Claim not confirmed',
            message:
              'The signed claim transaction is saved and can be retried safely.',
            detail: getErrorMessage(e, 'Unable to claim spendable key.'),
            network: isNetworkError(e),
            retry: 'claim',
          });
          setStatus('error');
        } else if (showFundRawTransactionErrorAlert(e)) {
          setStatus('review');
        } else if (isNetworkError(e)) {
          setRequestError(getClaimNetworkError(e));
          setStatus('error');
        } else {
          setClaimError(CLAIM_SUBMIT_ERROR);
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
    pendingClaimBroadcast,
    currentPendingClaimWalletBinding,
    persistClaimBroadcast,
    scanClaims,
    selectedPrivateAddressBySystem,
    sessionEpoch,
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

  const finishClaimHandoff = useCallback(() => {
    setClaimHandoff(false);
    setResultFadeIn(true);
    setStatus('complete');
  }, []);

  const claimAnimationCoin = useMemo(
    () => getClaimAnimationCoin(claimPlan, requestIsTestnet),
    [claimPlan, requestIsTestnet],
  );

  // A long broadcast says so after 15 seconds, as the secure task screen does.
  useEffect(() => {
    if (status !== 'claiming') {
      setClaimSlow(false);
      return undefined;
    }

    const timer = setTimeout(() => setClaimSlow(true), 15000);
    return () => clearTimeout(timer);
  }, [status]);

  const resultDoneRef = useRef(null);
  useRequestBackHandler(() => {
    if (status === 'passwordScanner') setStatus('password');
    else if (status === 'empty' || status === 'complete') resultDoneRef.current?.();
    else cancel();
  }, status === 'claiming' || status === 'decrypting' || finishing);

  if (status === 'scanning') {
    return (
      <GenericRequestLoading
        activeStep={GENERIC_REQUEST_LOADING_STEPS.REVIEW}
        onCancel={cancel}
      />
    );
  }

  if (status === 'claiming') {
    return (
      <ClaimingFundsView
        coin={claimAnimationCoin}
        done={claimHandoff}
        onDone={finishClaimHandoff}
        slow={claimSlow}
        walletAvatar={activeAccount?.walletAvatar}
      />
    );
  }

  if (status === 'passwordScanner') {
    return (
      <ScannerScreen
        noCameraAction={{label: 'Enter password', onPress: closePasswordScanner}}
        noCameraHint="Type the claim password instead."
        onBack={closePasswordScanner}
        onScan={handlePasswordQrScan}
        title="Scan password"
      />
    );
  }

  const isDecrypting = status === 'decrypting';

  if (status === 'password' || isDecrypting) {
    const decryptDisabled = password.length === 0 || isDecrypting;

    return (
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.container}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.passwordScreen}>
            <KeyboardAvoidingForm
              keyboardVerticalOffset={insets.top}
              style={styles.passwordScreen}>
              {isReplayedPendingDeeplink && (
                <View style={styles.passwordNavigation}>
                  <OnboardingBackButton
                    disabled={isDecrypting}
                    onPress={cancel}
                  />
                </View>
              )}
              <DeepLinkReviewScrollView
                ref={passwordScrollRef}
                requestCard={!isReplayedPendingDeeplink && request?.isSigned?.() === true}
                onLayout={revealPassword}
                onContentSizeChange={revealPassword}
                keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                  styles.passwordScrollContent,
                  smallDevice && styles.passwordScrollContentSmallDevice,
                  isReplayedPendingDeeplink &&
                    styles.passwordScrollContentWithBack,
                ]}>
                <View style={styles.passwordContent}>
                  {request?.isSigned?.() === true ? (
                    <RequestCard
                      action="wants you to claim funds"
                      requester={props}
                      caption="This key is encrypted. Enter the claim password to see what it holds."
                    />
                  ) : (
                    <View style={styles.header}>
                      <RequestTitle>Unlock gift</RequestTitle>
                      <Text style={styles.subtitle}>Enter the claim password to see what this gift holds.</Text>
                    </View>
                  )}
                  <View pointerEvents={isDecrypting ? 'none' : 'auto'}>
                    <AppTextInput
                      ref={passwordInputRef}
                      accessibilityLabel="Claim password"
                      accessibilityState={{disabled: isDecrypting}}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={!isDecrypting}
                      errorText={passwordError}
                      label="Claim password"
                      onFocus={revealPassword}
                      onChangeText={value => {
                        if (value !== password) {
                          setPasswordError(null);
                        }

                        setPassword(value);
                      }}
                      onRightPress={() => setShowPassword(!showPassword)}
                      onSubmitEditing={
                        decryptDisabled ? undefined : scanClaims
                      }
                      returnKeyType="done"
                      rightAccessibilityLabel={
                        showPassword
                          ? 'Hide claim password'
                          : 'Show claim password'
                      }
                      rightIconColor={theme.colors.textSecondary}
                      rightIcon={showPassword ? 'eye-off' : 'eye'}
                      secureTextEntry={!showPassword}
                      themeMode={theme.mode}
                      value={password}
                    />
                  </View>
                </View>
              </DeepLinkReviewScrollView>
              <SafeBottomActionStack
                bottomSpacing={keyboardVisible ? 8 : 30}
                includeBottomInset={!keyboardVisible}
                safeAreaSpacing={keyboardVisible ? 0 : 12}
                gap={10}
                horizontalSpacing={24}
                style={styles.footer}>
                <AppButton
                  accessibilityState={{
                    busy: isDecrypting,
                    disabled: decryptDisabled,
                  }}
                  disabled={decryptDisabled}
                  height={56}
                  loading={isDecrypting}
                  onPress={scanClaims}
                  variant="primary">
                  {isDecrypting ? 'Decrypting…' : 'Decrypt'}
                </AppButton>
                {!keyboardVisible && (
                  <AppButton
                    disabled={isDecrypting}
                    icon="qrcode-scan"
                    height={56}
                    onPress={scanPasswordQr}
                    variant="secondary">
                    Scan password QR
                  </AppButton>
                )}
                {!keyboardVisible && !isReplayedPendingDeeplink && (
                  <AppButton
                    disabled={isDecrypting}
                    height={48}
                    onPress={cancel}
                    variant="text">
                    Cancel
                  </AppButton>
                )}
              </SafeBottomActionStack>
            </KeyboardAvoidingForm>
          </View>
        </TouchableWithoutFeedback>
      </SafeAreaView>
    );
  }

  let primaryActionLabel = getSpendableKeyClaimLabel(reviewModel);

  if (status === 'error') {
    primaryActionLabel = requestError?.retry ? 'Retry' : 'Close';
  } else if (walletGate) primaryActionLabel = walletGate.actionLabel;
  else if (status === 'empty' || status === 'complete') {
    primaryActionLabel = 'Done';
  }

  const statusSubtitle =
    status === 'review'
      ? getSpendableKeyReviewSubtitle(reviewModel)
      : getStatusSubtitle({claimResult, requestError, status});
  const mainTitle = getScreenTitle({requestError, status});
  const hasResponseDestination =
    getGenericRequestDeliveryInfo(request).type !==
    GENERIC_REQUEST_DELIVERY_TYPES.NONE;
  const primaryAction = async () => {
    if (status === 'error') {
      if (!requestError?.retry) {
        cancel();
      } else if (
        requestError.retry === 'claim' &&
        (claimPlan != null || pendingClaimBroadcast != null)
      ) {
        await claim();
      } else {
        await scanClaims();
      }
    } else if (walletGate?.type === 'setup') {
      await openWalletSetup();
    } else if (walletGate) {
      await openLogin();
    } else if (status === 'empty' || status === 'complete') {
      if (finishing) return;

      setFinishing(true);

      try {
        if (!hasResponseDestination) {
          // A gift card has no requester. Finish without a delivery sheet that
          // reports a response nobody asked for.
          await next(response, [detailIndex]);
        } else if (typeof completeWithDelivery === 'function') {
          await completeWithDelivery(response, [detailIndex]);
        } else {
          await next(response, [detailIndex], {autoDeliverOnComplete: true});
        }
      } catch (e) {
        setFinishing(false);
        createAlert(
          'Cannot finish request',
          e?.message || 'Unable to continue to response delivery.',
        );
      }
    } else {
      await claim();
    }
  };
  resultDoneRef.current = primaryAction;
  const canOfferSecondaryActions =
    status !== 'error' || requestError?.retry != null;
  const showCancelAction =
    status !== 'complete' && canOfferSecondaryActions;
  // The primary action would switch or unlock a wallet for a saved claim that
  // no wallet here may retry. Disable it and say why.
  const primaryActionOpensLogin =
    status === 'error'
      ? requestError?.retry === 'claim' && !activeAccountMatchesRequest
      : walletGate != null && walletGate.type !== 'setup';
  const retryBlockedReason = primaryActionOpensLogin
    ? pendingClaimRetryBlock
    : null;
  const footerHelper =
    status !== 'complete' && canOfferSecondaryActions
      ? retryBlockedReason || walletGate?.helper
      : null;

  const primaryActionDisabled =
    finishing ||
    retryBlockedReason != null ||
    (status === 'review' &&
      activeAccountMatchesRequest &&
      (!claimPlan ||
        unsupportedIdentityCount > 0 ||
        !claimPlan.hasClaims ||
        claimPlanNeedsAccountRefresh));
  const cancelActionLabel = requestError?.partial ? 'Close' : 'Cancel';
  const footerHelperRow = footerHelper ? (
    <View style={styles.footerInfoRow}>
      <MaterialCommunityIcons
        name="information-outline"
        size={16}
        color={theme.colors.textSubtle}
        style={styles.footerInfoIcon}
      />
      <Text style={styles.footerInfoText}>{footerHelper}</Text>
    </View>
  ) : null;

  const footer = (
    <SafeBottomActionStack
      gap={10}
      horizontalSpacing={24}
      style={styles.footer}>
      {footerHelperRow}
      {status === 'review' && claimError && (
        <Text
          accessibilityLiveRegion="polite"
          accessibilityRole="alert"
          style={[styles.footerInfoText, {color: theme.colors.danger}]}>
          {claimError}
        </Text>
      )}
      <AppButton
        disabled={primaryActionDisabled}
        height={56}
        onPress={primaryAction}
        variant="primary">
        {primaryActionLabel}
      </AppButton>
      {showCancelAction && (
        <AppButton height={56} onPress={cancel} variant="secondary">
          {cancelActionLabel}
        </AppButton>
      )}
    </SafeBottomActionStack>
  );

  const partialClaim = status === 'error' && requestError?.partial === true;
  const claimResultView =
    claimResult != null && (status === 'complete' || partialClaim) ? (
      <TransactionResult
        {...getClaimResultProps({
          claimPlan,
          claimResult,
          partial: partialClaim,
          smallDevice,
          styles,
        })}
        above={footerHelperRow}
        actions={[
          {
            label: primaryActionLabel,
            onPress: primaryAction,
            disabled: primaryActionDisabled,
          },
          showCancelAction ? {label: cancelActionLabel, onPress: cancel} : null,
        ].filter(Boolean)}
        description={statusSubtitle}
        success={status === 'complete'}
        title={mainTitle}
      />
    ) : null;

  const screen = claimResultView || (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={styles.container}>
      <DeepLinkReviewScrollView requestCard={status === 'review' && request?.isSigned?.() === true} contentContainerStyle={status === 'review' ? styles.reviewScrollContent : styles.scrollContent}>
        {status === 'review' && request?.isSigned?.() === true ? (
          <RequestCard
            action="wants you to claim funds"
            requester={props}
            showResponder={!!activeAccountMatchesRequest}
            responderWord="to"
            responderName={activeAccount?.id}
          />
        ) : (
          <View style={styles.header}>
            <RequestTitle>{mainTitle}</RequestTitle>
            {statusSubtitle ? <Text style={styles.subtitle}>{statusSubtitle}</Text> : null}
          </View>
        )}

        {status === 'error' &&
          requestError?.message != null &&
          !requestError.partial && (
            <View style={styles.criticalWarningCard}>
              <MaterialCommunityIcons
                name={requestError.icon || 'wifi-alert'}
                size={22}
                color={theme.colors.danger}
                style={{marginTop: 1}}
              />
              <View style={styles.criticalWarningContent}>
                <Text style={styles.criticalWarningText}>
                  {requestError.message}
                </Text>
              </View>
            </View>
          )}

        {claimResult == null && unsupportedIdentityCount > 0 && (
          <View style={styles.warningCard}>
            <MaterialCommunityIcons
              name="alert-outline"
              size={18}
              color={theme.colors.warning}
            />
            <Text style={styles.warningText}>
              {'One or more VerusIDs cannot be claimed. No transactions will be sent until all discovered items can be claimed.'}
            </Text>
          </View>
        )}

        {claimResult == null && hasIdentityAuthorityWarnings && (
          <View style={styles.criticalWarningCard}>
            <MaterialCommunityIcons
              name="alert-octagon-outline"
              size={22}
              color={theme.colors.danger}
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

        {claimResult == null &&
          signedIn &&
          status === 'review' &&
          systemsWithoutPrivateAddressCount > 0 && (
            <View style={styles.warningCard}>
              <MaterialCommunityIcons
                name="shield-off-outline"
                size={18}
                color={theme.colors.warning}
              />
              <Text style={styles.warningText}>
                {`Your wallet has no z-address for ${systemsWithoutPrivateAddressCount} identity chain${
                  systemsWithoutPrivateAddressCount === 1 ? '' : 's'
                }. Existing z-addresses will be removed from those claimed VerusIDs.`}
              </Text>
            </View>
          )}

        {claimResult == null &&
          status === 'review' &&
          canAssignClaimedIdentityPrivateAddresses && (
            <TouchableOpacity
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: assignClaimedIdentityPrivateAddresses,
              }}
              activeOpacity={0.75}
              onPress={() =>
                setAssignClaimedIdentityPrivateAddresses(current => !current)
              }
              style={styles.privateAddressOptionCard}>
              <View pointerEvents="none">
                <Checkbox.Android
                  status={
                    assignClaimedIdentityPrivateAddresses
                      ? 'checked'
                      : 'unchecked'
                  }
                  color={theme.colors.primary}
                  uncheckedColor={theme.colors.textSubtle}
                />
              </View>
              <View style={styles.privateAddressOptionText}>
                <Text style={styles.privateAddressOptionTitle}>
                  Assign identity z-address to wallet z-address
                </Text>
                <Text style={styles.privateAddressOptionSubtitle}>
                  {privateAddressOptionSubtitle}
                </Text>
              </View>
            </TouchableOpacity>
          )}

        {claimPlan && claimResult == null && reviewModel.itemCount > 0 && (
          <>
            {/* One balance shows its amount large. Several balances or
                VerusIDs show only their list: no chain or count line. */}
            {reviewModel.singleBalance && (
              <View style={styles.amountHero}>
                <View style={styles.amountHeroRow}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.62}
                    numberOfLines={1}
                    style={[styles.amountHeroValue, styles.reviewAmountValue]}>
                    {reviewModel.singleBalance.currency.balanceAmount}
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={styles.amountHeroCurrency}>
                    {reviewModel.singleBalance.currency.display?.name ||
                      reviewModel.singleBalance.currency.currencyId}
                  </Text>
                </View>
              </View>
            )}

            {!reviewModel.singleBalance && reviewModel.balanceCount > 0 && (
              <View style={[styles.itemSection, joinBalancesToDetails && styles.joinedSection]}>
                {showSectionTitles && <Text style={styles.sectionTitle}>Balances</Text>}
                {reviewModel.systems.map(system => {
                  if (system.currencies.length === 0) return null;

                  return (
                    <View
                      style={[styles.systemGroup, joinBalancesToDetails && styles.joinedSection]}
                      key={system.systemId}>
                      {reviewModel.hasMultipleSystems && (
                        <Text style={styles.systemGroupLabel}>
                          {getSystemLabel(system)}
                        </Text>
                      )}
                      <View style={styles.flatRows}>
                        {system.currencies.map((currency, index) => (
                          <View
                            style={[
                              styles.flatRow,
                              index > 0 && styles.flatRowBorder,
                            ]}
                            key={`${system.systemId}:${currency.currencyId}`}>
                            <Text numberOfLines={2} style={styles.rowTitle}>
                              {currency.display?.name || currency.currencyId}
                            </Text>
                            <Text numberOfLines={2} style={styles.rowAmount}>
                              {currency.balanceAmount}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {reviewModel.identityCount > 0 && (
              <View style={[styles.itemSection, joinClaimDetails && styles.joinedSection]}>
                {showSectionTitles && (
                  <Text style={styles.sectionTitle}>
                    {reviewModel.identityCount === 1 ? 'VerusID' : 'VerusIDs'}
                  </Text>
                )}
                {reviewModel.systems.map(system => {
                  if (system.identities.length === 0) return null;

                  return (
                    <View
                      style={[styles.systemGroup, joinClaimDetails && styles.joinedSection]}
                      key={system.systemId}>
                      {reviewModel.hasMultipleSystems && (
                        <Text style={styles.systemGroupLabel}>
                          {getSystemLabel(system)}
                        </Text>
                      )}
                      <View style={styles.flatRows}>
                        {system.identities.map((identity, index) => {
                          const authorityIssues =
                            getIdentityAuthorityIssues(identity);
                          const hasAuthorityWarning = authorityIssues.length > 0;

                          return (
                            <View
                              style={[
                                styles.identityRow,
                                index > 0 && styles.flatRowBorder,
                              ]}
                              key={`${system.systemId}:${identity.identityAddress}`}>
                              <Text numberOfLines={2} style={styles.rowTitle}>
                                {getIdentityDisplay(identity)}
                              </Text>
                              {(identity.unsupportedReason ||
                                hasAuthorityWarning) && (
                                <Text
                                  numberOfLines={2}
                                  style={[
                                    styles.rowSubtitle,
                                    hasAuthorityWarning &&
                                      styles.rowWarningSubtitle,
                                  ]}>
                                  {identity.unsupportedReason ||
                                    'Revocation or recovery authority is external'}
                                </Text>
                              )}
                              {hasAuthorityWarning &&
                                authorityIssues.map(issue => (
                                  <TouchableOpacity
                                    accessibilityLabel={`View ${issue.label} details`}
                                    accessibilityRole="button"
                                    activeOpacity={0.75}
                                    key={`${identity.identityAddress}:${issue.label}`}
                                    onPress={() =>
                                      openVerusIdDetailsModal(
                                        system.systemId,
                                        issue.authority,
                                      )
                                    }
                                    style={styles.authorityLineItem}>
                                    <MaterialCommunityIcons
                                      name="card-account-details-outline"
                                      size={16}
                                      color={theme.colors.warning}
                                      style={styles.authorityLineIcon}
                                    />
                                    <View style={styles.authorityLineText}>
                                      <Text style={styles.authorityLineLabel}>
                                        {issue.label}
                                      </Text>
                                      <Text
                                        numberOfLines={1}
                                        style={styles.authorityLineName}>
                                        {issue.authorityDisplay}
                                      </Text>
                                    </View>
                                    <MaterialCommunityIcons
                                      name="chevron-right"
                                      size={18}
                                      color={theme.colors.warning}
                                    />
                                  </TouchableOpacity>
                                ))}
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {reviewModel.systems.map(system => {
              const destination = destinationBySystem[system.systemId];
              const showFee = hasClaimFee(system);

              if (!destination && !showFee) return null;

              return (
                <View
                  style={[styles.itemSection, styles.systemGroup]}
                  key={`details:${system.systemId}`}>
                  {reviewModel.hasMultipleSystems && (
                    <Text style={styles.systemGroupLabel}>
                      {getSystemLabel(system)}
                    </Text>
                  )}
                  <View style={[styles.flatRows, joinClaimDetails && styles.joinedRows]}>
                    {destination && (
                      <View style={styles.claimDetailRow}>
                        <View style={styles.claimDetailHeader}>
                          <Text style={styles.claimDetailLabel}>Receiving address</Text>
                        </View>
                        <Text selectable style={styles.claimDetailAddress}>
                          {destination}
                        </Text>
                      </View>
                    )}
                    {showFee && (
                      <View
                        style={[
                          styles.flatRow,
                          styles.claimFeeRow,
                          destination && styles.flatRowBorder,
                        ]}>
                        <Text style={styles.claimDetailLabel}>
                          Network fee
                        </Text>
                        <Text numberOfLines={2} style={styles.rowAmount}>
                          {`${system.feeAmount} ${
                            system.coinObj.display_ticker || system.coinObj.id
                          }`}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </>
        )}
        <View style={styles.scrollEndSpacer} />
      </DeepLinkReviewScrollView>
      {footer}
    </SafeAreaView>
  );

  if (!resultFadeIn || status !== 'complete') return screen;

  // The page color stays while the result fades in over it.
  return (
    <View style={styles.container}>
      <Animated.View entering={RESULT_FADE_IN} style={RESULT_FADE_STYLE}>
        {screen}
      </Animated.View>
    </View>
  );
};

const SpendableKeyRequestInfo = props => (
  <OnboardingThemeProvider>
    <SpendableKeyRequestInfoContent {...props} />
  </OnboardingThemeProvider>
);

export default SpendableKeyRequestInfo;
