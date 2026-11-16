import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {AtSign, CircleAlert, Info} from 'lucide-react-native';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDispatch} from 'react-redux';
import {useFocusEffect} from '@react-navigation/native';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import EmptyState from '../../../../components/EmptyState';
import AppButton from '../../../../components/AppButton';
import TextAction from '../../../../components/TextAction';
import InfoSheet from '../../../../components/InfoSheet';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import SkeletonLoader, {
  SkeletonBlock,
} from '../../../../components/SkeletonLoader';
import useSheetDismissal from '../../../../components/useSheetDismissal';
import StatusBadge from '../../../../components/StatusBadge';
import {setUserCoins} from '../../../../actions/actionCreators';
import {fontStyle} from '../../../../globals/fonts';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import Store from '../../../../store';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';
import {getIdentity} from '../../../../utils/api/channels/verusid/callCreators';
import {getInfo} from '../../../../utils/api/channels/vrpc/requests/getInfo';
import {API_GET_BALANCES} from '../../../../utils/constants/intervalConstants';
import {extractLedgerData} from '../../../../utils/ledger/extractLedgerData';
import {refreshWalletChannels} from '../../../../utils/ledger/refreshWalletChannels';
import {extractDisplaySubWallets} from '../../../../utils/subwallet/extractSubWallets';
import {
  describeVerusIdState,
  getVerusIdStateBadge,
} from '../../../../utils/verusid/describeVerusIdState';
import {
  formatAssetCount,
  getVerusIdFunds,
  getVerusIdCardAddress,
} from '../../../../utils/verusid/getVerusIdFunds';
import {VerusIdName} from './VerusIdCard';
import {
  NOTIFICATION_TYPE_VERUSID_ERROR,
  NOTIFICATION_TYPE_VERUSID_FAILED,
  NOTIFICATION_TYPE_VERUSID_READY,
} from '../../../../utils/constants/services';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../../actions/actions/updates/sessionRequests';
import {dispatchRemoveNotification} from '../../../../actions/actions/notifications/dispatchers/notifications';
import {
  checkVerusIdNotificationsForUpdates,
  deleteProvisionedIds,
  linkVerusId,
} from '../../../../actions/actions/services/dispatchers/verusid/verusid';
import {
  updatePendingVerusIds,
  updateVerusIdWallet,
} from '../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {
  createVerusIdResumeOwner,
  identityLinkCandidateMatchesAccount,
  identityLinkOriginIsCurrent,
  pendingStatusSheetShouldDismiss,
} from '../../../../utils/verusid/verusIdFlowGuards';
import LinkExistingVerusIdSheet, {
  LINK_EXISTING_VERUSID_SHEET_MODES,
} from '../../../DeepLink/components/VerusIdIdentityPickerSheet/LinkExistingVerusIdSheet';
import {VERUSID_NETWORK_DEFAULT} from '../../../../../env/index';
import VerusIdOptionsSheet from './VerusIdOptionsSheet';
import RegistrationTabRows, {RegistrationGroupTitle} from './IdentityRegistration/RegistrationTabRows';
import {registrationNoticeState} from '../../../../utils/identityRegistration/noticeState';
import LinkVerusIdSheet from './LinkVerusIdSheet';

const BOTTOM_FADE_HEIGHT = 48;
const IDENTITY_SKELETON_WIDTHS = ['46%', '64%', '52%', '72%'];

const FAQ_ITEMS = [
  {
    key: 'sign-in',
    title: 'Signing in with VerusID',
    body: 'Instead of creating usernames and passwords for every app, you authenticate with your VerusID.\n\n• The app presents a QR code or link\n• Your wallet opens\n• You select which VerusID to use\n• You review and approve the request\n\nNo passwords needed.',
  },
  {
    key: 'personal-db',
    title: 'Your personal database',
    body: "Apps can request to store data in your VerusID or read data you've previously saved. Each request appears in your wallet for you to approve or deny.\n\nYour data is encrypted and written directly to your VerusID on the blockchain.",
  },
  {
    key: 'different',
    title: 'What makes this different?',
    body: 'Traditional apps store your data in their databases — they can analyze it, sell it, or lose it in a breach. With VerusID, your data lives in your identity.\n\nYou decide exactly what to share with each app, when you share it.',
  },
  {
    key: 'recovery',
    title: 'Permanent and recoverable',
    body: 'Your VerusID never expires and has no renewal fees. No company can suspend or delete it.\n\nYou can designate recovery options to restore access if you ever lose your keys.',
  },
];

const getReadyActionConfig = () => ({hasResponseUris: false, label: 'Link'});

const normalizeIdentityItems = (linkedIds, pendingIds, identityNetwork) => {
  const linked = [];
  Object.keys(linkedIds || {}).forEach(chain => {
    Object.keys(linkedIds[chain] || {}).forEach(iAddress => {
      linked.push({chain, iAddress, name: String(linkedIds[chain][iAddress])});
    });
  });
  linked.sort((a, b) => {
    const preferred = Number(b.chain === identityNetwork) - Number(a.chain === identityNetwork);
    return preferred || a.chain.localeCompare(b.chain) || a.name.localeCompare(b.name);
  });

  const linkedAddresses = new Set(linked.map(item => item.iAddress.toLowerCase()));
  const linkedNames = new Set(linked.map(item => item.name.toLowerCase()));
  const groups = {ready: [], attention: [], progress: []};

  Object.keys(pendingIds || {}).forEach(chain => {
    Object.keys(pendingIds[chain] || {}).forEach(iAddress => {
      const details = pendingIds[chain][iAddress] || {};
      const name = details.fqn
        ? convertFqnToDisplayFormat(details.fqn)
        : details.provisioningName
        ? `${details.provisioningName}@`
        : iAddress;
      if (linkedAddresses.has(iAddress.toLowerCase()) || linkedNames.has(String(name).toLowerCase())) {
        return;
      }

      const item = {
        chain,
        iAddress,
        name,
        details,
        status: details.status,
        linkInput: details.fqn ? convertFqnToDisplayFormat(details.fqn) : iAddress,
        readyAction: getReadyActionConfig(details),
      };
      if (details.status === NOTIFICATION_TYPE_VERUSID_READY) groups.ready.push(item);
      else if (
        details.status === NOTIFICATION_TYPE_VERUSID_ERROR ||
        details.status === NOTIFICATION_TYPE_VERUSID_FAILED
      ) groups.attention.push(item);
      else groups.progress.push(item);
    });
  });

  Object.values(groups).forEach(group => group.sort((a, b) => a.name.localeCompare(b.name)));
  return {linked, groups};
};

const BottomFade = ({backgroundColor, solidHeight}) => (
  <View pointerEvents="none" style={styles.bottomFade}>
    <Svg height={BOTTOM_FADE_HEIGHT} width="100%" style={styles.bottomFadeSvg}>
      <Defs>
        <LinearGradient id="identityBottomFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={backgroundColor} stopOpacity="0" />
          <Stop offset="0.3" stopColor={backgroundColor} stopOpacity="0.1" />
          <Stop offset="1" stopColor={backgroundColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height={BOTTOM_FADE_HEIGHT} fill="url(#identityBottomFade)" />
    </Svg>
    <View style={{height: solidHeight, backgroundColor}} />
  </View>
);

// A filled row per VerusID (owner-approved "D revised", 2026-10-22): the name
// with its parent muted, one line under it, a status badge only when the
// VerusID is not active, and a chevron. Pending requests keep their action.
const IdentityRow = ({actionLabel, badge, name, onPress, subtitle, theme}) => (
  <View style={styles.rowWrap}>
    <TouchableOpacity
      accessibilityRole="button"
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.identityRow, {backgroundColor: theme.colors.surfaceMuted}]}>
      <View
        style={[
          styles.rowText,
          actionLabel && styles.rowTextWithAction,
          actionLabel === 'Link and login' && styles.rowTextWithWideAction,
        ]}>
        <VerusIdName
          leafColor={theme.colors.textPrimary}
          name={name}
          restColor={theme.colors.textSecondary}
          style={theme.typography.titleRow}
        />
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[
              theme.typography.caption,
              styles.identitySubtitle,
              {color: theme.colors.textSecondary},
            ]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {badge ? (
        <StatusBadge label={badge.label} style={styles.rowBadge} tone={badge.tone} />
      ) : null}
      {actionLabel ? null : (
        <MaterialCommunityIcons
          color={theme.colors.textSubtle}
          name="chevron-right"
          size={22}
        />
      )}
    </TouchableOpacity>
    {actionLabel ? (
      <TextAction
        accessibilityRole="button"
        onPress={onPress}
        hitSlop={{top: 4, bottom: 4}}
        style={[
          styles.rowAction,
          actionLabel === 'Link and login' && styles.rowActionWide,
          {backgroundColor: theme.colors.surface},
        ]}>
        {actionLabel}
      </TextAction>
    ) : null}
  </View>
);

const SectionHeading = ({count, title, theme}) => (
  <View style={styles.sectionHeading}>
    <Text style={[styles.sectionTitle, {color: theme.colors.textPrimary}]}>{title}</Text>
    <Text
      style={[
        styles.countPill,
        {backgroundColor: theme.colors.surfaceMuted, color: theme.colors.textSecondary},
      ]}>
      {count}
    </Text>
  </View>
);

const FaqBody = ({body, theme}) => (
  <View style={styles.faqBody}>
    {String(body)
      .split('\n')
      .map((line, index) =>
        line.trim() ? (
          <Text
            key={`${line}:${index}`}
            style={[
              styles.faqParagraph,
              line.trim().startsWith('•') && styles.faqBullet,
              {color: theme.colors.textSecondary},
            ]}>
            {line}
          </Text>
        ) : (
          <View key={`spacer:${index}`} style={styles.faqSpacer} />
        ),
      )}
  </View>
);

const describePendingActionError = error => {
  const message =
    typeof error?.message === 'string' ? error.message.trim() : '';

  if (
    !message ||
    message.length > 140 ||
    /rpc|json|0x[0-9a-f]{6,}|-?\d{3,}/i.test(message)
  ) {
    return 'Unable to update this VerusID request. Try again.';
  }

  return message;
};

const IdentityListSkeleton = ({theme}) => (
  <SkeletonLoader
    accessibilityLabel="Loading VerusIDs"
    style={styles.loadingSkeleton}>
    {IDENTITY_SKELETON_WIDTHS.map(width => (
      <View
        key={width}
        style={[
          styles.loadingRow,
          {backgroundColor: theme.colors.surfaceMuted},
        ]}>
        <SkeletonBlock color={theme.colors.border} height={16} width={width} />
        <SkeletonBlock color={theme.colors.border} height={12} width="32%" />
      </View>
    ))}
  </SkeletonLoader>
);

const SignedInVerusIdService = ({controller}) => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  // The account this component rendered against. Operations must reject if the
  // store account changed in the same frame as the tap.
  const renderedAccountHash = useObjectSelector(
    state => state.authentication.activeAccount?.accountHash || null,
  );
  // The session epoch increments on an account/session change (including a
  // re-login of the same account), so it is a dependency of the resume owner.
  const renderedSessionEpoch = useObjectSelector(
    state => state.authentication.sessionEpoch || 0,
  );
  const pendingIds = useObjectSelector(state => state.channelStore_verusid?.pendingIds || {});
  const registrationJobs = useObjectSelector(state => state.channelStore_verusid?.registrationJobs || {});
  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const cardsByCoin = useObjectSelector(state => extractDisplaySubWallets(state));
  const balances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  // The state of each linked VerusID ("chain:iAddress" -> active, locked or
  // revoked). A failed lookup shows no badge.
  const [identityStates, setIdentityStates] = useState({});
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [linkSheetContentActive, setLinkSheetContentActive] = useState(false);
  const [linkSheetInitialManualValue, setLinkSheetInitialManualValue] = useState('');
  const [linkSheetMode, setLinkSheetMode] = useState(
    LINK_EXISTING_VERUSID_SHEET_MODES.LIST,
  );
  const [linkSheetNetwork, setLinkSheetNetwork] = useState(null);
  const [linkSheetSession, setLinkSheetSession] = useState(0);
  const [linkSheetVisible, setLinkSheetVisible] = useState(false);
  const [linkSheetBusy, setLinkSheetBusy] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(null);
  const [pendingSheetVisible, setPendingSheetVisible] = useState(false);
  const [selectedPending, setSelectedPending] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingError, setPendingError] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [registrationLink, setRegistrationLink] = useState(null);
  const scrollRef = useRef(false);
  const linkSheetBusyRef = useRef(false);
  const linkSheetSessionRef = useRef(0);
  // The READY-resume single-flight flag is owned by the session scope that
  // started it. A scope change invalidates the old run synchronously so a READY
  // action in the new session can start even if the old promise never settles.
  const identityResumeOwnerRef = useRef(
    createVerusIdResumeOwner(captureSessionScope(Store.getState())),
  );
  const identityResumeOwner = identityResumeOwnerRef.current;
  const pendingActionRef = useRef(null);
  const pendingActionTokenRef = useRef(0);
  const testnetOverrides = controller.props.activeAccount?.testnetOverrides || {};
  const identityNetwork = testnetOverrides[VERUSID_NETWORK_DEFAULT] || VERUSID_NETWORK_DEFAULT;
  const linkedIds = controller.state.linkedIds;
  const loading = controller.props.loading || linkedIds == null;
  const {linked, groups} = useMemo(
    () => normalizeIdentityItems(linkedIds, pendingIds, identityNetwork),
    [identityNetwork, linkedIds, pendingIds],
  );
  const pendingCount = groups.ready.length + groups.attention.length + groups.progress.length;
  const hasContent = linked.length > 0 || pendingCount > 0 || Object.values(registrationJobs).some(job => job.status !== 'complete');
  const bottomPadding = Math.max(insets.bottom, 20);
  const resolvedLinkNetwork = linkSheetNetwork || identityNetwork;
  const activePendingKey = selectedPending
    ? `${selectedPending.chain}:${selectedPending.iAddress}`
    : null;
  const linkedKey = linked.map(item => `${item.chain}:${item.iAddress}`).join('|');
  useFocusEffect(useCallback(() => {
    if (!linkedKey) return;
    const addresses = new Set(linkedKey.split('|').map(key => key.split(':')[1]));
    activeCoinsForUser.forEach(coin => {
      const cards = (cardsByCoin[coin.id] || []).filter(card =>
        addresses.has(getVerusIdCardAddress(card)));
      if (cards.length) refreshWalletChannels(coin.id, cards, [API_GET_BALANCES])
        .catch(() => console.warn('Unable to refresh VerusID balances'));
    });
  }, [activeCoinsForUser, cardsByCoin, linkedKey]));
  useEffect(() => {
    if (!linkedKey) return undefined;

    let cancelled = false;
    const sessionScope = captureSessionScope(Store.getState(), renderedAccountHash);
    const chainInfoBySystem = {};

    const loadState = async item => {
      try {
        const coinObj = CoinDirectory.getBasicCoinObj(item.chain);
        const systemId = coinObj.system_id;

        if (!(systemId in chainInfoBySystem)) {
          chainInfoBySystem[systemId] = getInfo(systemId).catch(() => null);
        }

        const [response, infoResponse] = await Promise.all([
          getIdentity(systemId, item.iAddress),
          chainInfoBySystem[systemId],
        ]);

        if (response?.error || !response?.result) return null;

        return describeVerusIdState(
          response.result.identity,
          infoResponse?.result || null,
          coinObj.seconds_per_block,
          response.result.status,
        ).state;
      } catch (e) {
        return null;
      }
    };

    Promise.all(linked.map(loadState)).then(states => {
      if (cancelled || !sessionScopeIsCurrent(Store.getState(), sessionScope)) {
        return;
      }

      const next = {};
      linked.forEach((item, index) => {
        if (states[index]) next[`${item.chain}:${item.iAddress}`] = states[index];
      });
      setIdentityStates(next);
    });

    return () => {
      cancelled = true;
    };
    // Pending-request updates rebuild `linked`; only a change in the linked
    // VerusIDs themselves (linkedKey) reloads their states.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedKey, renderedAccountHash]);
  const getAssetCountLabel = useCallback(
    item => {
      const {funds, loaded} = getVerusIdFunds({
        balances,
        cardsByCoin,
        coins: activeCoinsForUser,
        iAddress: item.iAddress,
      });

      return loaded ? formatAssetCount(funds.length) : null;
    },
    [activeCoinsForUser, balances, cardsByCoin],
  );
  // Release any resume still bound to a previous account/session epoch; only
  // the current session's single-flight gate survives a scope change.
  useEffect(() => {
    identityResumeOwner.invalidateForScope(
      captureSessionScope(Store.getState(), renderedAccountHash),
    );
  }, [identityResumeOwner, renderedAccountHash, renderedSessionEpoch]);
  // Re-read the selected request from the current store data so a refresh can
  // show an updated status without the sheet holding a stale snapshot.
  const currentPending = useMemo(() => {
    if (!activePendingKey) return null;

    return (
      [...groups.ready, ...groups.attention, ...groups.progress].find(
        item => `${item.chain}:${item.iAddress}` === activePendingKey,
      ) || null
    );
  }, [activePendingKey, groups]);
  const pendingSheetItem = currentPending || selectedPending;
  const pendingProcessing = Boolean(pendingAction);
  const pendingIsError =
    pendingSheetItem?.status === NOTIFICATION_TYPE_VERUSID_ERROR;
  const pendingIsReady =
    pendingSheetItem?.status === NOTIFICATION_TYPE_VERUSID_READY;
  // The provider answered that it could not create this VerusID.
  const pendingIsFailed =
    pendingSheetItem?.status === NOTIFICATION_TYPE_VERUSID_FAILED;
  const pendingCanRetry = false;
  // Writes the ref before the state update so same-frame taps and the close
  // guard see the in-flight link synchronously.
  const handleLinkSheetBusyChange = useCallback(nextBusy => {
    linkSheetBusyRef.current = nextBusy;
    setLinkSheetBusy(nextBusy);
  }, []);
  // Guard the dismissal itself, not `closeDisabled` alone, so an in-flight
  // link cannot be abandoned by a system/backdrop close.
  const closeLinkSheet = useCallback(() => {
    if (linkSheetBusyRef.current) return;

    setLinkSheetVisible(false);
  }, []);

  const handleLinkSheetClosed = useCallback(
    () => {
      linkSheetBusyRef.current = false;
      setLinkSheetBusy(false);
      setLinkSheetContentActive(false);
      setLinkSheetInitialManualValue('');
      setLinkSheetMode(LINK_EXISTING_VERUSID_SHEET_MODES.LIST);
    },
    [],
  );

  const openLinkSheet = useCallback(
    (
      chain = identityNetwork,
      manualValue = '',
      mode = LINK_EXISTING_VERUSID_SHEET_MODES.LIST,
    ) => {
      if (mode === LINK_EXISTING_VERUSID_SHEET_MODES.LIST) {
        controller.props.navigation.navigate('LinkIdentities', {chain: chain || identityNetwork});
        return;
      }
      setLinkSheetNetwork(chain || identityNetwork);
      setLinkSheetInitialManualValue(manualValue || '');
      setLinkSheetMode(mode);
      // A new opening is a new session; an older link completion must not
      // close or select into it.
      linkSheetSessionRef.current += 1;
      setLinkSheetSession(linkSheetSessionRef.current);
      setLinkSheetContentActive(true);
      setLinkSheetVisible(true);
    },
    [controller.props.navigation, identityNetwork],
  );

  const openManualLinkSheet = useCallback(
    (chain, manualValue) =>
      openLinkSheet(
        chain,
        manualValue,
        LINK_EXISTING_VERUSID_SHEET_MODES.MANUAL,
      ),
    [openLinkSheet],
  );

  // The full-page lookup hands manual fallback to the existing guarded linker.
  const manualLinkChain = controller.props.route?.params?.manualLinkChain;
  useEffect(() => {
    if (!manualLinkChain) return;
    controller.props.navigation.setParams({manualLinkChain: undefined});
    openManualLinkSheet(manualLinkChain, '');
  }, [manualLinkChain, controller.props.navigation, openManualLinkSheet]);

  const isLinkCandidateAllowed = useCallback(
    candidate => candidate?.chainId === resolvedLinkNetwork,
    [resolvedLinkNetwork],
  );

  const linkAutoFoundIdentity = useCallback(
    async candidate => {
      const requestContext = {
        sessionScope: captureSessionScope(
          Store.getState(),
          renderedAccountHash,
        ),
      };
      if (!sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)) {
        const error = new Error(
          'Account changed while the VerusID was being linked.',
        );
        error.code = 'SESSION_CHANGED';
        throw error;
      }
      // Capture the sheet session too: only the session that started the link
      // may close it afterwards.
      const sheetSession = linkSheetSessionRef.current;
      const isSheetSessionCurrent = () =>
        linkSheetSessionRef.current === sheetSession;
      const assertSessionCurrent = () => {
        if (
          !sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)
        ) {
          const error = new Error(
            'Account changed while the VerusID was being linked.',
          );
          error.code = 'SESSION_CHANGED';
          throw error;
        }
      };

      const activeAccount = controller.props.activeAccount;
      const candidateChainId = candidate?.chainId || resolvedLinkNetwork;
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

      if (!identityAddress || !fullyQualifiedName || !displayName) {
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

      if (!isLinkCandidateAllowed(candidate)) {
        throw new Error('This VerusID does not match the selected network.');
      }

      // The candidate's chosen primary R-address must belong to the account
      // that is scoped right now, not only to the identity's own primary
      // address list. A candidate resolved for another account is rejected
      // even if this sheet stayed mounted across the switch.
      const liveState = Store.getState();

      if (
        candidate?.origin &&
        !identityLinkOriginIsCurrent(liveState, candidate.origin)
      ) {
        const error = new Error(
          'Account changed while the VerusID was being linked.',
        );
        error.code = 'SESSION_CHANGED';
        throw error;
      }

      if (!identityLinkCandidateMatchesAccount(liveState, candidate)) {
        throw new Error(
          'Ensure that your wallet address for this account matches a primary address of the VerusID you are trying to add.',
        );
      }

      const coinObj = CoinDirectory.findCoinObj(candidateChainId);

      if (!coinObj) {
        throw new Error('Unable to find the VerusID network.');
      }

      await linkVerusId(identityAddress, displayName, coinObj.id, requestContext);
      assertSessionCurrent();
      await updateVerusIdWallet(requestContext);
      assertSessionCurrent();
      clearChainLifecycle(coinObj.id);

      const setUserCoinsAction = setUserCoins(activeCoinList, activeAccount.id);
      assertSessionCurrent();
      dispatch(setUserCoinsAction);
      refreshActiveChainLifecycles(
        setUserCoinsAction.payload.activeCoinsForUser,
      );

      assertSessionCurrent();
      if (!isSheetSessionCurrent()) return;
      // The sheet renders any rejected link reason inline, so this path only
      // resolves once the VerusID is actually linked for this account. The
      // wallet refresh above already supplies the list update.
      setLinkSheetVisible(false);
    },
    [
      activeCoinList,
      controller.props.activeAccount,
      dispatch,
      isLinkCandidateAllowed,
      renderedAccountHash,
      resolvedLinkNetwork,
    ],
  );

  const openIdentity = useCallback(
    item =>
      controller.props.navigation.navigate('VerusIdDetails', {
        chain: item.chain,
        iAddress: item.iAddress,
        displayName: item.name,
      }),
    [controller.props.navigation],
  );

  const runPendingAction = useCallback(
    async (action, item = selectedPending) => {
      // Single-flight per action: the ref is set before the first state
      // update so same-frame taps cannot start a second run.
      if (!item || pendingActionRef.current) return;

      const requestContext = {
        sessionScope: captureSessionScope(
          Store.getState(),
          renderedAccountHash,
        ),
      };
      // The pending row belongs to the account this screen rendered. If the
      // store account already moved on, the action must not run at all.
      if (!sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)) {
        return;
      }
      const token = pendingActionTokenRef.current + 1;
      pendingActionTokenRef.current = token;
      pendingActionRef.current = action;
      const isCurrent = () =>
        pendingActionTokenRef.current === token &&
        sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope);

      setPendingAction(action);
      setPendingError(null);
      setPendingNotice(null);
      try {
        if (action === 'refresh') {
          await checkVerusIdNotificationsForUpdates(requestContext);
          if (!isCurrent()) return;
          await updatePendingVerusIds(requestContext);
          if (!isCurrent()) return;
          setPendingNotice('Checked just now.');
        } else if (action === 'remove') {
          await deleteProvisionedIds(item.iAddress, item.chain, requestContext);
          if (!isCurrent()) return;
          await updatePendingVerusIds(requestContext);
          if (!isCurrent()) return;
          if (item.details?.notificationUid) {
            if (!isCurrent()) return;
            await dispatchRemoveNotification(item.details.notificationUid);
          }

        }
      } catch (error) {
        if (!isCurrent()) return;

        setSelectedPending(item);
        setPendingError(describePendingActionError(error));
        setPendingSheetVisible(true);
      } finally {
        if (pendingActionTokenRef.current === token) {
          pendingActionRef.current = null;
          setPendingAction(null);
        }
      }
    },
    [controller.props.navigation, dispatch, renderedAccountHash, selectedPending],
  );

  const handleReady = useCallback(
    item => openLinkSheet(item.chain),
    [openLinkSheet],
  );

  const openPendingSheet = useCallback(item => {
    // Supersede any in-flight action so it cannot write into this opening.
    pendingActionTokenRef.current += 1;
    pendingActionRef.current = null;
    setPendingAction(null);
    setPendingError(null);
    setPendingNotice(null);
    setSelectedPending(item);
    setPendingSheetVisible(true);
  }, []);

  // The hook's onClose must hide unconditionally. A rejected close that
  // returned early would leave the hook's internal closing flag stuck on.
  const hidePendingSheet = useCallback(() => setPendingSheetVisible(false), []);

  const handlePendingSheetClosed = useCallback(() => {
    setSelectedPending(null);
    setPendingError(null);
    setPendingNotice(null);
  }, []);

  const pendingDismissal = useSheetDismissal({
    visible: pendingSheetVisible,
    onClose: hidePendingSheet,
    onClosed: handlePendingSheetClosed,
  });

  // The processing guard lives outside the hook so a blocked dismissal is a
  // no-op instead of a partially applied hook transition.
  const requestClosePendingSheet = useCallback(() => {
    if (pendingActionRef.current) return;

    pendingDismissal.close();
  }, [pendingDismissal]);

  // A request that leaves the pending list - linked, removed, or replaced -
  // has nothing left to show, so the status sheet closes itself. The same
  // applies once a refresh makes it READY: the sheet would otherwise keep
  // calling it "In progress" with only Check/Remove, so close it and let the
  // READY row's Link action take over.
  useEffect(() => {
    if (!pendingSheetVisible || pendingProcessing) return;
    if (
      !pendingStatusSheetShouldDismiss({
        selectedPending,
        currentPending,
        readyStatus: NOTIFICATION_TYPE_VERUSID_READY,
      })
    ) {
      return;
    }

    setPendingSheetVisible(false);
  }, [
    currentPending,
    pendingProcessing,
    pendingSheetVisible,
    selectedPending,
  ]);

  const handleScroll = event => {
    const next = (event.nativeEvent.contentOffset.y || 0) > 1;
    if (scrollRef.current !== next) {
      scrollRef.current = next;
      setScrolled(next);
    }
  };

  const renderPendingGroup = (title, items, showHeading = true) => {
    if (!items.length) return null;
    return (
      <View style={styles.pendingGroup}>
        {showHeading ? <SectionHeading count={items.length} title={title} theme={theme} /> : null}
        <View style={styles.pendingRows}>
          {items.map(item => {
            const isReady = item.status === NOTIFICATION_TYPE_VERUSID_READY;
            const press = isReady
              ? () => handleReady(item)
              : () => openPendingSheet(item);
            return (
              <IdentityRow
                key={`${item.chain}:${item.iAddress}`}
                actionLabel={isReady ? item.readyAction.label : null}
                name={item.name}
                onPress={press}
                subtitle={
                  isReady
                    ? null
                    : item.status === NOTIFICATION_TYPE_VERUSID_FAILED
                    ? 'Failed'
                    : item.status === NOTIFICATION_TYPE_VERUSID_ERROR
                    ? 'Needs attention'
                    : 'In progress'
                }
                theme={theme}
              />
            );
          })}
        </View>
      </View>
    );
  };

  // The tab mounts hidden after sign-in, where a native SafeAreaView measures
  // no top inset until its first visit; context insets are known up front.
  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.colors.background,
          paddingTop: insets.top,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}>
      <View
        style={[
          styles.header,
          {backgroundColor: theme.colors.background},
          scrolled && {borderBottomColor: theme.colors.border, borderBottomWidth: StyleSheet.hairlineWidth},
        ]}>
        <View style={styles.headerTitle}>
          <Text
            style={[
              theme.typography.headlineMd,
              {color: theme.colors.textPrimary},
            ]}>
            VerusID
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            accessibilityLabel="About VerusID"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setInfoVisible(true)}
            style={styles.headerIcon}>
            <Info size={23} strokeWidth={2.2} color={theme.colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityLabel="Add VerusID"
            accessibilityRole="button"
            hitSlop={10}
            onPress={() => setAddVisible(true)}
            style={styles.headerIcon}>
            <MaterialCommunityIcons name="plus" size={20} color={theme.colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <LinkVerusIdSheet target={registrationLink} onClose={() => setRegistrationLink(null)} />
      {loading ? (
        <IdentityListSkeleton theme={theme} />
      ) : controller.state.loadError ? (
        <EmptyState
          actionLabel="Try again"
          icon={CircleAlert}
          onAction={() => controller.getLinkedIds()}
          title="Unable to load VerusIDs"
        />
      ) : hasContent ? (
        <SectionList
          sections={[{key: 'linked', data: linked}]}
          keyExtractor={item => `${item.chain}:${item.iAddress}`}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: 40 + BOTTOM_FADE_HEIGHT + bottomPadding},
          ]}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {['Needs attention', 'In progress', 'Ready to link'].map((title, index) => {
                const pending = [groups.attention, groups.progress, groups.ready][index];
                const count = pending.length + Object.values(registrationJobs).filter(job => job.status !== 'complete' && registrationNoticeState(job).group === title).length;
                return count > 0 && <View key={title}>
                  <RegistrationGroupTitle title={title} count={count} />
                  <RegistrationTabRows group={title} showHeading={false} jobs={registrationJobs} navigation={controller.props.navigation} onLink={setRegistrationLink} />
                  {renderPendingGroup(title, pending, false)}
                </View>;
              })}
              <RegistrationGroupTitle title="Your VerusIDs" count={linked.length} />
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
          renderItem={({item}) => (
            <IdentityRow
              badge={getVerusIdStateBadge(
                identityStates[`${item.chain}:${item.iAddress}`],
              )}
              name={item.name}
              onPress={() => openIdentity(item)}
              subtitle={getAssetCountLabel(item)}
              theme={theme}
            />
          )}
        />
      ) : (
        <EmptyState
          actionLabel="Add VerusID"
          icon={AtSign}
          message="Create or link a VerusID to manage funds, authenticate across apps, and keep your data in your hands."
          onAction={() => setAddVisible(true)}
          title="No VerusID yet"
        />
      )}

      <VerusIdOptionsSheet
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        actions={[
          {key: 'register', label: 'New VerusID', icon: 'account-plus-outline',
            onPress: () => controller.props.navigation.navigate('IdentityRegistration', {
              screen: 'IdentityRegistrationCreate', params: {coinId: identityNetwork},
            })},
          {key: 'link', label: 'Link VerusID', icon: 'link-variant', onPress: () => openLinkSheet()},
        ]}
      />
      {hasContent ? <BottomFade backgroundColor={theme.colors.background} solidHeight={bottomPadding} /> : null}

      <BottomSheetModal
        avoidKeyboard
        closeDisabled={linkSheetBusy}
        visible={linkSheetVisible}
        onClose={closeLinkSheet}
        onClosed={handleLinkSheetClosed}
        maxHeight="76%">
        <View style={[signedOutSheetStyles.body, signedOutSheetStyles.bodyShort]}>
          <LinkExistingVerusIdSheet
            key={linkSheetSession}
            active={linkSheetContentActive}
            coinObj={CoinDirectory.findCoinObj(resolvedLinkNetwork)}
            initialManualValue={linkSheetInitialManualValue}
            initialMode={linkSheetMode}
            isCandidateAllowed={isLinkCandidateAllowed}
            linkedIds={linkedIds}
            onBusyChange={handleLinkSheetBusyChange}
            onLinkCandidate={linkAutoFoundIdentity}
          />
        </View>
      </BottomSheetModal>

      <InfoSheet
        onClose={() => setInfoVisible(false)}
        subtitle="Acts as a universal login and personal data vault that belongs entirely to you."
        title="VerusID"
        visible={infoVisible}>
        <View style={styles.faqList}>
          {FAQ_ITEMS.map(item => {
            const expanded = item.key === expandedFaq;
            return (
              <View key={item.key} style={styles.faqItem}>
                <TouchableOpacity
                  accessibilityLabel={item.title}
                  accessibilityRole="button"
                  accessibilityState={{expanded}}
                  onPress={() =>
                    setExpandedFaq(current =>
                      current === item.key ? null : item.key,
                    )
                  }
                  style={styles.faqHeader}>
                  <Text style={[styles.faqTitle, {color: theme.colors.textPrimary}]}>
                    {item.title}
                  </Text>
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </TouchableOpacity>
                {expanded ? <FaqBody body={item.body} theme={theme} /> : null}
              </View>
            );
          })}
        </View>
      </InfoSheet>

      <BottomSheetModal
        closeDisabled={pendingProcessing}
        onClose={requestClosePendingSheet}
        onClosed={pendingDismissal.onClosed}
        maxHeight="70%"
        visible={pendingSheetVisible}>
        <View style={[signedOutSheetStyles.body, signedOutSheetStyles.bodyShort]}>
          <Text
            accessibilityRole="header"
            style={[theme.typography.titleSheet, {color: theme.colors.textPrimary}]}>
            VerusID request
          </Text>
          <Text
            numberOfLines={2}
            style={[styles.pendingName, {color: theme.colors.textPrimary}]}>
            {pendingSheetItem?.name || 'VerusID'}
          </Text>
          <Text style={[styles.pendingStatus, {color: theme.colors.textSecondary}]}>
            {pendingIsFailed
              ? 'Failed'
              : pendingIsError
              ? 'Needs attention'
              : pendingIsReady
              ? 'Ready to link'
              : 'In progress'}
          </Text>
          <Text
            style={[
              theme.typography.bodySm,
              styles.pendingDescription,
              {color: theme.colors.textSecondary},
            ]}>
            {pendingIsFailed
              ? 'The provider could not create this VerusID. Remove the request from this list.'
              : pendingIsError
              ? pendingCanRetry
                ? 'The request did not finish. Retry it, or check for updates first.'
                : 'The request did not finish and its original payload is no longer available. Remove it from this list.'
              : pendingIsReady
              ? 'The request finished. Link this VerusID to continue.'
              : 'The request is still processing. Check for updates, or remove it from this list.'}
          </Text>
          {pendingError ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.pendingError, {color: theme.colors.danger}]}>
              {pendingError}
            </Text>
          ) : null}
          {pendingNotice ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[styles.pendingNotice, {color: theme.colors.textSecondary}]}>
              {pendingNotice}
            </Text>
          ) : null}
          <SafeBottomActionStack
            bottomSpacing={12}
            gap={10}
            horizontalSpacing={0}
            includeBottomInset={false}
            safeAreaSpacing={0}
            style={styles.pendingActions}>
            {pendingCanRetry ? (
              <AppButton
                accessibilityLabel="Retry VerusID request"
                disabled={pendingProcessing}
                height={56}
                onPress={() =>
                  pendingDismissal.dismiss(() =>
                    runPendingAction('retry', pendingSheetItem),
                  )
                }
                themeMode={theme.mode}>
                Retry request
              </AppButton>
            ) : null}
            {pendingIsReady ? (
              <AppButton
                accessibilityLabel="Link completed VerusID request"
                disabled={pendingProcessing}
                height={56}
                onPress={() => {
                  // The status sheet has nothing left to do; close it and let
                  // the READY row's Link/Resume action take over.
                  setPendingSheetVisible(false);
                  handleReady(pendingSheetItem);
                }}
                themeMode={theme.mode}>
                Link VerusID
              </AppButton>
            ) : (
              <AppButton
                accessibilityLabel="Check for VerusID request updates"
                disabled={pendingProcessing}
                height={56}
                onPress={() => runPendingAction('refresh', pendingSheetItem)}
                themeMode={theme.mode}
                variant={pendingCanRetry ? 'secondary' : 'primary'}>
                {pendingAction === 'refresh'
                  ? 'Checking...'
                  : 'Check for updates'}
              </AppButton>
            )}
            <AppButton
              accessibilityLabel="Remove VerusID request from this list"
              disabled={pendingProcessing}
              height={56}
              onPress={() => runPendingAction('remove', pendingSheetItem)}
              textColor={theme.colors.danger}
              themeMode={theme.mode}
              variant="secondary">
              {pendingAction === 'remove' ? 'Removing...' : 'Remove from list'}
            </AppButton>
          </SafeBottomActionStack>
        </View>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {flex: 1, flexDirection: 'row', alignItems: 'center'},
  headerActions: {flexDirection: 'row', alignItems: 'center', columnGap: 6},
  headerIcon: {padding: 6},
  listContent: {paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40},
  listHeader: {paddingTop: 0},
  pendingGroup: {marginBottom: 18},
  pendingRows: {rowGap: 12},
  sectionHeading: {flexDirection: 'row', alignItems: 'center', marginTop: 8, marginBottom: 16},
  sectionTitle: {...fontStyle('semiBold'), fontSize: 16, lineHeight: 20},
  countPill: {
    marginLeft: 8,
    minWidth: 24,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    overflow: 'hidden',
    textAlign: 'center',
    ...fontStyle('bold'),
    fontSize: 12,
    lineHeight: 16,
  },
  rowWrap: {width: '100%', justifyContent: 'center'},
  identityRow: {
    minHeight: 76,
    borderRadius: 18,
    paddingVertical: 14,
    paddingLeft: 18,
    paddingRight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowBadge: {alignSelf: 'center'},
  rowText: {flex: 1, minWidth: 0},
  rowTextWithAction: {paddingRight: 90},
  rowTextWithWideAction: {paddingRight: 140},
  identitySubtitle: {marginTop: 2},
  rowAction: {
    position: 'absolute',
    right: 12,
    minWidth: 74,
    height: 36,
    minHeight: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  rowActionWide: {minWidth: 132},
  itemSeparator: {height: 12},
  loadingSkeleton: {paddingHorizontal: 20, paddingTop: 12, rowGap: 12},
  loadingRow: {
    height: 76,
    borderRadius: 18,
    paddingHorizontal: 14,
    justifyContent: 'center',
    rowGap: 8,
  },
  bottomFade: {position: 'absolute', left: 0, right: 0, bottom: 0},
  bottomFadeSvg: {marginBottom: -1},
  faqList: {width: '100%', gap: 4},
  faqItem: {width: '100%'},
  faqHeader: {minHeight: 56, flexDirection: 'row', alignItems: 'center'},
  faqTitle: {...fontStyle('semiBold'), flex: 1, fontSize: 15, lineHeight: 20, letterSpacing: -0.2},
  faqBody: {paddingBottom: 16},
  faqParagraph: {...fontStyle('regular'), fontSize: 14, lineHeight: 20, marginBottom: 10},
  faqBullet: {marginLeft: 10, marginBottom: 6},
  faqSpacer: {height: 10},
  pendingName: {...fontStyle('semiBold'), fontSize: 16, lineHeight: 22, marginTop: 12},
  pendingStatus: {...fontStyle('regular'), fontSize: 13, lineHeight: 18, marginTop: 2},
  pendingDescription: {marginTop: 12},
  pendingError: {...fontStyle('regular'), fontSize: 13, lineHeight: 18, marginTop: 12},
  pendingNotice: {...fontStyle('regular'), fontSize: 13, lineHeight: 18, marginTop: 12},
  pendingActions: {marginTop: 18},
});

export default SignedInVerusIdService;
