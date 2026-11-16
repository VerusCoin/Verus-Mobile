import {getControlFacts} from '../../../../utils/verusid/verusIdControlFacts';
/*
  SignedInVerusIdDetails
  - Shows one linked VerusID (owner-approved "D revised", 2026-10-22): the
    light VerusID card, Receive, Send and Convert, Control, Content and Details
    rows, then the VerusID's funds. A fund row opens that asset's screen with the
    VerusID card selected.
  - Unlink sits behind ⋯. Content and Details open information sheets.
  - Loading, refresh failure, and unlink confirmation use the shared
    onboarding theme, skeletons, floating sheets, and dismissal lifecycle.
*/
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import {useNavigation, useRoute} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../../../components/AppButton';
import TextAction from '../../../../components/TextAction';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import {SignedInActionButtons} from '../../../../components/SignedInActionBar';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import SkeletonLoader, {SkeletonBlock} from '../../../../components/SkeletonLoader';
import useSheetDismissal from '../../../../components/useSheetDismissal';
import {fontStyle} from '../../../../globals/fonts';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import Store from '../../../../store';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {CoinDirectory} from '../../../../utils/CoinData/CoinDirectory';
import {AssetCoinLogo} from '../../../../utils/CoinData/Graphics';
import {
  getFriendlyNameMap,
  getIdentity,
} from '../../../../utils/api/channels/verusid/callCreators';
import {getInfo} from '../../../../utils/api/channels/vrpc/requests/getInfo';
import {getIdentityContent} from '../../../../utils/api/channels/verusid/requests/getIdentityContent';
import {API_GET_BALANCES, VRPC} from '../../../../utils/constants/intervalConstants';
import {convertFqnToDisplayFormat} from '../../../../utils/fullyqualifiedname';
import {extractLedgerData} from '../../../../utils/ledger/extractLedgerData';
import {truncateDecimal} from '../../../../utils/math';
import {extractDisplaySubWallets} from '../../../../utils/subwallet/extractSubWallets';
import {
  describeVerusIdState,
  VERUSID_STATE,
} from '../../../../utils/verusid/describeVerusIdState';
import {countIdentityContentEntries} from '../../../../utils/verusid/describeIdentityContent';
import {
  findVerusIdCard,
  getVerusIdFunds,
} from '../../../../utils/verusid/getVerusIdFunds';
import {
  setActiveApp,
  setActiveCoin,
  setActiveSection,
  setCoinSubWallet,
  setServiceLoading,
  setUserCoins,
} from '../../../../actions/actionCreators';
import {unlinkVerusId} from '../../../../actions/actions/services/dispatchers/verusid/verusid';
import {updateVerusIdWallet} from '../../../../actions/actions/channels/verusid/dispatchers/VerusidWalletReduxManager';
import {
  clearChainLifecycle,
  refreshActiveChainLifecycles,
} from '../../../../actions/actions/intervals/dispatchers/lifecycleManager';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../../actions/actions/updates/sessionRequests';
import {shouldNavigateAfterUnlinkDismissal} from '../../../../utils/verusid/verusIdFlowGuards';
import {VERUSID_SERVICE_ID} from '../../../../utils/constants/services';
import {SEND_WIZARD_MODE} from '../../../SendWizard/wizardUtils';
import {CONVERSION_DISABLED} from '../../../../../env/index';
import VerusIdCard, {splitVerusIdName} from './VerusIdCard';
import VerusIdContentSheet from './VerusIdContentSheet';
import VerusIdDetailsSheet from './VerusIdDetailsSheet';
import VerusIdOptionsSheet from './VerusIdOptionsSheet';

const BOTTOM_FADE_HEIGHT = 48;
const LOAD_FAILED_MESSAGE =
  'Check your connection, then try again.';
const UNLINK_FAILED_MESSAGE = 'Unable to unlink this VerusID. Try again.';

const BottomFade = ({backgroundColor, solidHeight}) => (
  <View pointerEvents="none" style={styles.bottomFade}>
    <Svg height={BOTTOM_FADE_HEIGHT} width="100%" style={styles.bottomFadeSvg}>
      <Defs>
        <LinearGradient id="verusIdDetailsBottomFade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={backgroundColor} stopOpacity="0" />
          <Stop offset="0.3" stopColor={backgroundColor} stopOpacity="0.1" />
          <Stop offset="1" stopColor={backgroundColor} stopOpacity="1" />
        </LinearGradient>
      </Defs>
      <Rect
        x="0"
        y="0"
        width="100%"
        height={BOTTOM_FADE_HEIGHT}
        fill="url(#verusIdDetailsBottomFade)"
      />
    </Svg>
    <View style={{height: solidHeight, backgroundColor}} />
  </View>
);

const DetailsSkeleton = ({theme}) => (
  <SkeletonLoader
    accessibilityLabel="Loading VerusID details"
    style={styles.skeleton}>
    <SkeletonBlock height={196} radius={theme.rounded.xl} width="100%" />
    <View style={styles.skeletonActions}>
      {[0, 1, 2].map(index => (
        <SkeletonBlock
          key={index}
          height={48}
          radius={16}
          style={styles.skeletonAction}
        />
      ))}
    </View>
    <SkeletonBlock height={20} style={styles.skeletonTitle} width="28%" />
    <SkeletonBlock height={16} style={styles.skeletonLine} width="82%" />
    <SkeletonBlock height={16} style={styles.skeletonLine} width="64%" />
  </SkeletonLoader>
);

const describeUnlinkFailure = error => {
  const message =
    typeof error?.message === 'string' ? error.message.trim() : '';

  if (
    !message ||
    message.length > 140 ||
    /rpc|json|0x[0-9a-f]{6,}|-?\d{3,}/i.test(message)
  ) {
    return UNLINK_FAILED_MESSAGE;
  }

  return message;
};

// Flat navigation row, as "Saved addresses | N ›" on Send's Recipient step.
const NavigationRow = ({count, disabled, label, onPress, theme}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityState={{disabled: Boolean(disabled)}}
    disabled={disabled}
    onPress={onPress}
    style={({pressed}) => [
      styles.navigationRow,
      {borderBottomColor: theme.colors.border},
      pressed && styles.pressed,
    ]}>
    <Text style={[styles.navigationLabel, {color: theme.colors.textPrimary}]}>
      {label}
    </Text>
    {count ? (
      <Text style={[styles.navigationCount, {color: theme.colors.textSecondary}]}>
        {count}
      </Text>
    ) : null}
    {disabled ? null : (
      <MaterialCommunityIcons
        color={theme.colors.textSubtle}
        name="chevron-right"
        size={20}
      />
    )}
  </Pressable>
);

const SignedInVerusIdDetails = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const navigation = useNavigation();
  const route = useRoute();
  const {chain, iAddress} = route.params;
  // The route this screen instance owns. The queued unlink navigation must
  // only fire while this exact route is still focused.
  const originatingRouteKeyRef = useRef(route.key);
  const screenMountedRef = useRef(true);
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);
  const walletAddresses = useObjectSelector(
    state =>
      state.authentication.activeAccount?.keys?.[chain]?.[VRPC]?.addresses ||
      null,
  );
  const coins = useObjectSelector(state => state.coins.activeCoinsForUser);
  const cardsByCoin = useObjectSelector(state => extractDisplaySubWallets(state));
  const balances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const showBalance = useObjectSelector(state => state.coins.showBalance);
  const [identity, setIdentity] = useState(null);
  const [identityContent, setIdentityContent] = useState(null);
  const [friendlyNames, setFriendlyNames] = useState(null);
  const [chainInfo, setChainInfo] = useState(null);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [contentVisible, setContentVisible] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [unlinkVisible, setUnlinkVisible] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [unlinkError, setUnlinkError] = useState(null);
  const [cardBottom, setCardBottom] = useState(null);
  const [titleShown, setTitleShown] = useState(false);
  const titleShownRef = useRef(false);
  const loadRequestIdRef = useRef(0);
  const unlinkingRef = useRef(false);
  const unlinkTokenRef = useRef(0);
  // The session this screen rendered against. Operations capture the scope
  // synchronously so a late completion cannot write into another account.
  const renderedSessionScopeRef = useRef(null);
  renderedSessionScopeRef.current = captureSessionScope(
    Store.getState(),
    activeAccount?.accountHash || null,
  );
  // The session the options sheet was opened in. A chosen action runs after
  // the sheet closes, and Unlink after its own sheet, so each one re-checks
  // this scope, not the latest render's, and is dropped when it is stale.
  const actionScopeRef = useRef(null);
  const isActionSessionCurrent = useCallback(
    () =>
      screenMountedRef.current &&
      sessionScopeIsCurrent(Store.getState(), actionScopeRef.current),
    [],
  );
  const renderedAccountHash = renderedSessionScopeRef.current.accountHash;
  const renderedSessionEpoch = renderedSessionScopeRef.current.sessionEpoch;
  const bottomPadding = Math.max(insets.bottom, 20);
  const coinObj = useMemo(() => {
    try {
      return CoinDirectory.findCoinObj(chain);
    } catch (e) {
      return null;
    }
  }, [chain]);

  const load = useCallback(async () => {
    const requestId = loadRequestIdRef.current + 1;
    loadRequestIdRef.current = requestId;
    const sessionScope = renderedSessionScopeRef.current;
    const isRequestCurrent = () =>
      requestId === loadRequestIdRef.current &&
      sessionScopeIsCurrent(Store.getState(), sessionScope);
    setError(null);

    try {
      const systemId = CoinDirectory.getBasicCoinObj(chain).system_id;
      // The chain tip decides whether an unlock height still locks the
      // VerusID. Without it the page still loads; only that case is unknown.
      const [response, contentResponse, infoResponse] = await Promise.all([
        getIdentity(systemId, iAddress),
        // Content from all updates. A server without this call still shows
        // the page, with the latest update's content only.
        getIdentityContent(systemId, iAddress).catch(() => null),
        getInfo(systemId).catch(() => null),
      ]);

      if (!isRequestCurrent()) return;
      if (response.error) throw new Error(response.error.message);

      const loadedIdentity = response.result;
      const loadedFriendlyNames = await getFriendlyNameMap(
        systemId,
        loadedIdentity,
        loadedIdentity?.identity?.parent ? [loadedIdentity.identity.parent] : [],
      );

      if (!isRequestCurrent()) return;

      setIdentity(loadedIdentity);
      setIdentityContent(
        contentResponse?.error || !contentResponse?.result?.identity
          ? loadedIdentity.identity
          : contentResponse.result.identity,
      );
      setFriendlyNames(loadedFriendlyNames);
      setChainInfo(infoResponse?.result || null);
    } catch (e) {
      if (!isRequestCurrent()) return;

      // A failed refresh keeps the VerusID already on screen and reports the
      // failure in the screen's own words. Raw RPC text is never the headline.
      setError(LOAD_FAILED_MESSAGE);
    }
  }, [chain, iAddress]);

  useEffect(() => {
    load();
  }, [load]);

  // Coming back from Modify or Transfer reads the VerusID again, so Control
  // shows the confirmed values. Only a return after a blur reloads; the
  // mount load above covers the first visit.
  const leftScreenRef = useRef(false);
  useEffect(() => {
    const removeBlur = navigation.addListener('blur', () => {
      leftScreenRef.current = true;
    });
    const removeFocus = navigation.addListener('focus', () => {
      if (!leftScreenRef.current) return;
      leftScreenRef.current = false;
      load();
    });

    return () => {
      removeBlur();
      removeFocus();
    };
  }, [navigation, load]);

  useEffect(() => {
    screenMountedRef.current = true;

    return () => {
      screenMountedRef.current = false;
    };
  }, []);

  // A wallet switch with this page still open ends the previous session's
  // actions: close their sheets and drop the captured scope.
  useEffect(() => {
    if (
      actionScopeRef.current == null ||
      sessionScopeIsCurrent(Store.getState(), actionScopeRef.current)
    ) {
      return;
    }

    actionScopeRef.current = null;
    setOptionsVisible(false);
    setUnlinkVisible(false);
  }, [renderedAccountHash, renderedSessionEpoch]);

  const title = useMemo(
    () =>
      identity?.fullyqualifiedname
        ? convertFqnToDisplayFormat(identity.fullyqualifiedname)
        : route.params?.displayName || 'VerusID',
    [identity?.fullyqualifiedname, route.params?.displayName],
  );

  const ownedAddress = useMemo(() => {
    const primaryAddresses = identity?.identity?.primaryaddresses || [];

    if (!Array.isArray(walletAddresses)) return null;

    return (
      primaryAddresses.find(address => walletAddresses.includes(address)) ||
      null
    );
  }, [identity, walletAddresses]);

  const stateInfo = useMemo(
    () =>
      identity
        ? describeVerusIdState(
            identity.identity,
            chainInfo,
            coinObj?.seconds_per_block,
            identity.status,
          )
        : {state: VERUSID_STATE.ACTIVE, unlock: null},
    [chainInfo, coinObj?.seconds_per_block, identity],
  );

  const controlFacts = useMemo(
    () =>
      identity
        ? getControlFacts({friendlyNames, identity, ownedAddress, stateInfo})
        : [],
    [friendlyNames, identity, ownedAddress, stateInfo],
  );

  const contentCount = useMemo(
    () => (identityContent ? countIdentityContentEntries(identityContent) : 0),
    [identityContent],
  );

  const {funds, loaded: fundsLoaded} = useMemo(
    () => getVerusIdFunds({balances, cardsByCoin, coins, iAddress}),
    [balances, cardsByCoin, coins, iAddress],
  );

  // Receive needs no asset: any Verus currency can go to the VerusID, so it
  // opens Receive on the VerusID's own network with its card selected.
  const receiveCard = useMemo(
    () => (coinObj ? findVerusIdCard(cardsByCoin?.[coinObj.id], iAddress) : null),
    [cardsByCoin, coinObj, iAddress],
  );
  const canAct = stateInfo.state === VERUSID_STATE.ACTIVE;
  const receiveDisabled =
    !receiveCard || stateInfo.state === VERUSID_STATE.REVOKED;
  const sendDisabled = !canAct || funds.length === 0;
  const convertDisabled = sendDisabled || CONVERSION_DISABLED;
  const explorerUrl =
    identity?.fullyqualifiedname && coinObj && !coinObj.testnet
      ? `https://verus.io/verusid-lookup/${identity.fullyqualifiedname}`
      : null;
  const shortName = splitVerusIdName(title).leaf;

  const openReceive = useCallback(() => {
    if (!coinObj || !receiveCard) return;

    navigation.navigate('ReceiveAssetDetails', {
      coinId: coinObj.id,
      subWalletId: receiveCard.id,
    });
  }, [coinObj, navigation, receiveCard]);

  // One asset starts the wizard on that asset; several open Select asset
  // with only the assets on this VerusID's cards.
  const openWizard = useCallback(
    mode => {
      if (funds.length === 1) {
        navigation.navigate('SendWizard', {
          mode,
          initialCoinId: funds[0].coin.id,
          initialSubWalletId: funds[0].card.id,
        });
        return;
      }

      navigation.navigate('SendWizard', {
        mode,
        sourceIdentity: {iAddress, name: title},
      });
    },
    [funds, iAddress, navigation, title],
  );

  // The asset screen, opened as Home opens it, on this VerusID's card.
  // CoinMenus is on the main stack, so Back returns here.
  const openFund = useCallback(
    ({coin, card}) => {
      dispatch(setCoinSubWallet(coin.id, card, true));
      dispatch(setActiveCoin(coin));
      dispatch(setActiveApp(coin.default_app));
      dispatch(setActiveSection(coin.apps[coin.default_app].data[0]));
      navigation.navigate('CoinMenus', {title: 'Overview'});
    },
    [dispatch, navigation],
  );

  const handleScroll = useCallback(
    event => {
      if (cardBottom == null) return;

      const next = event.nativeEvent.contentOffset.y > cardBottom;

      if (titleShownRef.current !== next) {
        titleShownRef.current = next;
        setTitleShown(next);
      }
    },
    [cardBottom],
  );

  // The dismissal hook's onClose must hide unconditionally; the processing
  // guard is applied by the caller instead.
  const closeUnlinkSheet = useCallback(() => setUnlinkVisible(false), []);

  const handleUnlinkSheetClosed = useCallback(() => {
    unlinkTokenRef.current += 1;
    unlinkingRef.current = false;
    setUnlinkError(null);
    setUnlinking(false);
  }, []);

  const unlinkDismissal = useSheetDismissal({
    visible: unlinkVisible,
    onClose: closeUnlinkSheet,
    onClosed: handleUnlinkSheetClosed,
  });

  const requestCloseUnlinkSheet = useCallback(() => {
    if (unlinkingRef.current) return;

    unlinkDismissal.close();
  }, [unlinkDismissal]);

  const unlinkIdentity = useCallback(async () => {
    // Same-frame double taps must only start one unlink.
    if (unlinkingRef.current) return;
    // The unlink belongs to the session the options sheet was opened in. If
    // the store account moved on, it must not run against the new one.
    if (!isActionSessionCurrent()) return;

    const requestContext = {
      sessionScope: actionScopeRef.current,
    };
    const token = unlinkTokenRef.current + 1;
    unlinkTokenRef.current = token;
    unlinkingRef.current = true;
    const isCurrent = () =>
      unlinkTokenRef.current === token &&
      sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope);
    const assertSessionCurrent = () => {
      if (!sessionScopeIsCurrent(Store.getState(), requestContext.sessionScope)) {
        const sessionError = new Error(
          'Account changed while the VerusID was being unlinked.',
        );
        sessionError.code = 'SESSION_CHANGED';
        throw sessionError;
      }
    };

    setUnlinking(true);
    setUnlinkError(null);
    dispatch(setServiceLoading(true, VERUSID_SERVICE_ID));

    try {
      const unlinkCoinObj = CoinDirectory.findCoinObj(chain);
      await unlinkVerusId(iAddress, unlinkCoinObj.id, requestContext);
      assertSessionCurrent();
      await updateVerusIdWallet(requestContext);
      assertSessionCurrent();
      clearChainLifecycle(unlinkCoinObj.id);

      if (activeAccount) {
        const action = setUserCoins(activeCoinList, activeAccount.id);
        dispatch(action);
        refreshActiveChainLifecycles(action.payload.activeCoinsForUser);
      }

      assertSessionCurrent();
      // The list underneath must be the active screen before this screen
      // leaves, so the unlink sheet finishes closing first.
      if (!isCurrent()) return;
      unlinkDismissal.dismiss(() => {
        // The queued navigation runs after the close animation. Re-check the
        // session that began this unlink and the route/focus ownership here, at
        // execution time, because both may have changed mid-dismissal. The
        // request context is captured when the unlink starts, so a rerender
        // cannot swap the scope out from under the delayed callback. The
        // unlink token is intentionally not consulted: `onClosed` bumps it
        // first, so it would always look stale.
        if (
          !shouldNavigateAfterUnlinkDismissal({
            mounted: screenMountedRef.current,
            sessionScope: requestContext.sessionScope,
            state: Store.getState(),
            originatingRouteKey: originatingRouteKeyRef.current,
            navigationState: navigation.getState?.(),
            isFocused:
              typeof navigation.isFocused === 'function'
                ? navigation.isFocused()
                : undefined,
          })
        ) {
          return;
        }
        navigation.goBack();
      });
    } catch (e) {
      if (!isCurrent()) return;

      setUnlinkError(describeUnlinkFailure(e));
    } finally {
      // Only clear the global service-loading flag while the captured session
      // is still the active one; otherwise this old operation would clear a
      // newly active session's loading state.
      if (isCurrent()) {
        dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
      }
      if (unlinkTokenRef.current === token) {
        unlinkingRef.current = false;
        setUnlinking(false);
      }
    }
  }, [
    activeAccount,
    activeCoinList,
    chain,
    dispatch,
    iAddress,
    isActionSessionCurrent,
    navigation,
    unlinkDismissal,
  ]);

  const openOptions = useCallback(() => {
    actionScopeRef.current = renderedSessionScopeRef.current;
    setOptionsVisible(true);
  }, []);

  // The options sheet runs a chosen action after it has closed. An action of
  // a session that is no longer current is cancelled silently.
  const optionActions = useMemo(
    () => [
      {key: 'transfer', label: 'Transfer VerusID', icon: 'account-arrow-right-outline',
        onPress: () => {
          if (!isActionSessionCurrent()) return;
          navigation.navigate('IdentityManagement', {
            screen: 'IdentityTransfer', params: {chain, identityAddress: iAddress, displayName: title},
          });
        }},
      {key: 'modify', label: 'Modify VerusID', icon: 'account-edit-outline',
        onPress: () => {
          if (!isActionSessionCurrent()) return;
          navigation.navigate('IdentityManagement', {
            screen: 'IdentityModify', params: {chain, identityAddress: iAddress, displayName: title},
          });
        }},
      {
        key: 'unlink',
        label: 'Unlink VerusID',
        icon: 'link-variant-off',
        onPress: () => {
          if (!isActionSessionCurrent()) return;
          setUnlinkError(null);
          setUnlinkVisible(true);
        },
      },
    ],
    [chain, iAddress, isActionSessionCurrent, navigation, title],
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      title: titleShown ? shortName : '',
      headerRight: () => (
        <TouchableOpacity
          accessibilityLabel="VerusID options"
          accessibilityRole="button"
          hitSlop={8}
          onPress={openOptions}
          style={styles.headerAction}>
          <MaterialCommunityIcons
            color={theme.colors.textPrimary}
            name="dots-horizontal"
            size={24}
          />
        </TouchableOpacity>
      ),
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: theme.colors.background,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: theme.colors.textPrimary,
    });
  }, [navigation, openOptions, shortName, theme, titleShown]);

  const hasIdentity = Boolean(identity && friendlyNames);

  const renderFunds = () => {
    if (!fundsLoaded) {
      return (
        <SkeletonLoader
          accessibilityLabel="Loading funds"
          style={styles.fundsSkeleton}>
          {[0, 1].map(index => (
            <View key={index} style={styles.fundSkeletonRow}>
              <SkeletonBlock height={40} radius={20} width={40} />
              <View style={styles.fundSkeletonText}>
                <SkeletonBlock height={16} width="42%" />
                <SkeletonBlock height={14} width="30%" />
              </View>
            </View>
          ))}
        </SkeletonLoader>
      );
    }

    if (funds.length === 0) {
      return (
        <Text
          style={[
            theme.typography.bodySm,
            styles.noFunds,
            {color: theme.colors.textSecondary},
          ]}>
          This VerusID holds no funds.
        </Text>
      );
    }

    return funds.map(fund => {
      const amount = showBalance
        ? `${truncateDecimal(fund.balance, 8)} ${fund.coin.display_ticker}`
        : 'Balance hidden';

      return (
        <Pressable
          key={fund.coin.id}
          accessibilityHint="Opens this asset with the VerusID card"
          accessibilityLabel={`${fund.coin.display_name}, ${amount}`}
          accessibilityRole="button"
          onPress={() => openFund(fund)}
          style={({pressed}) => [
            styles.fundRow,
            {borderBottomColor: theme.colors.border},
            pressed && styles.pressed,
          ]}>
          <AssetCoinLogo coinId={fund.coin.id} size={40} />
          <View style={styles.fundText}>
            <Text
              numberOfLines={2}
              style={[theme.typography.titleRow, {color: theme.colors.textPrimary}]}>
              {fund.coin.display_name}
            </Text>
            <Text
              numberOfLines={2}
              style={[theme.typography.bodySm, {color: theme.colors.textSecondary}]}>
              {amount}
            </Text>
          </View>
          <MaterialCommunityIcons
            color={theme.colors.textSubtle}
            name="chevron-right"
            size={22}
          />
        </Pressable>
      );
    });
  };

  return (
    <View style={[styles.screen, {backgroundColor: theme.colors.background}]}>
      {hasIdentity ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {paddingBottom: 24 + BOTTOM_FADE_HEIGHT + bottomPadding},
          ]}
          onScroll={handleScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor={theme.colors.primary}
            />
          }
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          {error ? (
            <View
              style={[
                styles.refreshErrorRow,
                {backgroundColor: theme.colors.surfaceMuted},
              ]}>
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={20}
                color={theme.colors.danger}
              />
              <View style={styles.refreshErrorText}>
                <Text
                  style={[
                    theme.typography.titleRow,
                    {color: theme.colors.textPrimary},
                  ]}>
                  Couldn't refresh this VerusID
                </Text>
                <Text
                  style={[
                    theme.typography.caption,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {error}
                </Text>
              </View>
              <TextAction
                accessibilityLabel="Try loading this VerusID again"
                onPress={load}
                style={styles.refreshErrorAction}>
                Try again
              </TextAction>
            </View>
          ) : null}

          <View
            onLayout={event =>
              setCardBottom(
                event.nativeEvent.layout.y + event.nativeEvent.layout.height,
              )
            }>
            <VerusIdCard
              name={title}
              networkName={coinObj?.display_name || chain}
              state={stateInfo.state}
            />
          </View>

          <SignedInActionButtons
            convertDisabled={convertDisabled}
            onConvert={() => openWizard(SEND_WIZARD_MODE.CONVERT)}
            onReceive={openReceive}
            onSend={() => openWizard(SEND_WIZARD_MODE.SEND)}
            receiveDisabled={receiveDisabled}
            sendDisabled={sendDisabled}
            style={styles.actions}
          />

          <Text
            accessibilityRole="header"
            style={[
              theme.typography.titleRow,
              styles.sectionTitle,
              {color: theme.colors.textPrimary},
            ]}>
            Control
          </Text>
          <View>
            {controlFacts.map((fact, index) => (
              <View
                key={fact.key}
                style={[
                  styles.factRow,
                  index > 0 && {
                    borderTopColor: theme.colors.border,
                    borderTopWidth: StyleSheet.hairlineWidth,
                  },
                ]}>
                <Text
                  style={[
                    theme.typography.bodySm,
                    styles.factLabel,
                    {color: theme.colors.textSecondary},
                  ]}>
                  {fact.label}
                </Text>
                <View style={styles.factValue}>
                  <Text
                    numberOfLines={2}
                    style={[
                      theme.typography.labelMd,
                      styles.factValueText,
                      {color: theme.colors.textPrimary},
                    ]}>
                    {fact.value}
                  </Text>
                  {fact.detail ? (
                    <Text
                      style={[
                        theme.typography.caption,
                        styles.factValueText,
                        {color: theme.colors.textSecondary},
                      ]}>
                      {fact.detail}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>

          <View
            style={[styles.navigationRows, {borderTopColor: theme.colors.border}]}>
            <NavigationRow
              count={
                contentCount === 0
                  ? 'None'
                  : `${contentCount} ${contentCount === 1 ? 'entry' : 'entries'}`
              }
              disabled={contentCount === 0}
              label="Content"
              onPress={() => setContentVisible(true)}
              theme={theme}
            />
            <NavigationRow
              label="Details"
              onPress={() => setDetailsVisible(true)}
              theme={theme}
            />
          </View>

          <Text
            accessibilityRole="header"
            style={[
              theme.typography.titleRow,
              styles.sectionTitle,
              styles.fundsTitle,
              {color: theme.colors.textPrimary},
            ]}>
            Funds
          </Text>
          {renderFunds()}
        </ScrollView>
      ) : error ? (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={52}
            color={theme.colors.textSubtle}
          />
          <Text
            style={[
              theme.typography.titleRow,
              styles.errorTitle,
              {color: theme.colors.textPrimary},
            ]}>
            Couldn't load this VerusID
          </Text>
          <Text
            style={[
              theme.typography.bodySm,
              styles.errorText,
              {color: theme.colors.textSecondary},
            ]}>
            {error}
          </Text>
          <AppButton
            accessibilityLabel="Try loading this VerusID again"
            onPress={load}
            style={styles.errorAction}
            themeMode={theme.mode}>
            Try again
          </AppButton>
        </View>
      ) : (
        <DetailsSkeleton theme={theme} />
      )}

      {hasIdentity ? (
        <BottomFade
          backgroundColor={theme.colors.background}
          solidHeight={bottomPadding}
        />
      ) : null}

      <VerusIdOptionsSheet
        actions={optionActions}
        onClose={() => setOptionsVisible(false)}
        visible={optionsVisible}
      />

      <VerusIdContentSheet
        identity={identityContent}
        onClose={() => setContentVisible(false)}
        visible={contentVisible}
      />

      <VerusIdDetailsSheet
        explorerUrl={explorerUrl}
        friendlyNames={friendlyNames}
        identity={identity}
        onClose={() => setDetailsVisible(false)}
        visible={detailsVisible}
      />

      <BottomSheetModal
        closeDisabled={unlinking}
        onClose={requestCloseUnlinkSheet}
        onClosed={unlinkDismissal.onClosed}
        maxHeight="60%"
        visible={unlinkVisible}>
        <View style={[sheetStyles.body, sheetStyles.bodyShort]}>
          <Text
            accessibilityRole="header"
            style={[theme.typography.titleSheet, {color: theme.colors.textPrimary}]}>
            Unlink VerusID
          </Text>
          <Text
            style={[
              theme.typography.bodySm,
              styles.unlinkBody,
              {color: theme.colors.textSecondary},
            ]}>
            {`This removes ${title} from this wallet. The VerusID stays on the blockchain: unlinking does not revoke, delete, recover, or change it, and you can link it again anytime.`}
          </Text>
          {unlinkError ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[
                theme.typography.caption,
                styles.unlinkError,
                {color: theme.colors.danger},
              ]}>
              {unlinkError}
            </Text>
          ) : null}
          <SafeBottomActionStack
            bottomSpacing={12}
            gap={10}
            horizontalSpacing={0}
            includeBottomInset={false}
            safeAreaSpacing={0}
            style={styles.unlinkActions}>
            <AppButton
              accessibilityLabel={`Unlink ${title}`}
              disabled={unlinking}
              height={56}
              onPress={unlinkIdentity}
              themeMode={theme.mode}
              variant="primary">
              {unlinking ? 'Unlinking...' : 'Unlink VerusID'}
            </AppButton>
            <AppButton
              accessibilityLabel="Cancel unlinking this VerusID"
              disabled={unlinking}
              height={56}
              onPress={requestCloseUnlinkSheet}
              themeMode={theme.mode}
              variant="secondary">
              Cancel
            </AppButton>
          </SafeBottomActionStack>
        </View>
      </BottomSheetModal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  headerAction: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {flex: 1},
  content: {paddingHorizontal: 20, paddingTop: 8},
  actions: {marginTop: 12},
  sectionTitle: {marginTop: 28, marginBottom: 2},
  fundsTitle: {marginBottom: 4},
  factRow: {
    minHeight: 50,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  factLabel: {flexShrink: 0},
  factValue: {minWidth: 0, flexShrink: 1, alignItems: 'flex-end'},
  factValueText: {textAlign: 'right'},
  navigationRows: {
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  navigationRow: {
    minHeight: 62,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  navigationLabel: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
    ...fontStyle('semiBold'),
  },
  navigationCount: {
    fontSize: 14,
    lineHeight: 20,
    marginRight: 6,
    ...fontStyle('regular'),
  },
  fundRow: {
    minHeight: 76,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fundText: {flex: 1, minWidth: 0, gap: 2},
  noFunds: {marginTop: 6},
  pressed: {opacity: 0.7},
  fundsSkeleton: {paddingTop: 4},
  fundSkeletonRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  fundSkeletonText: {flex: 1, gap: 8},
  refreshErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  refreshErrorText: {flex: 1, minWidth: 0, marginLeft: 10, marginRight: 4},
  refreshErrorAction: {alignSelf: 'center'},
  skeleton: {paddingHorizontal: 20, paddingTop: 8},
  skeletonActions: {flexDirection: 'row', gap: 8, marginTop: 12},
  skeletonAction: {flex: 1},
  skeletonTitle: {marginTop: 32, marginBottom: 16},
  skeletonLine: {marginBottom: 14},
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 60,
  },
  errorTitle: {textAlign: 'center', marginTop: 16},
  errorText: {textAlign: 'center', marginTop: 8, marginBottom: 24},
  errorAction: {minWidth: 180},
  bottomFade: {position: 'absolute', left: 0, right: 0, bottom: 0},
  bottomFadeSvg: {marginBottom: -1},
  unlinkBody: {marginTop: 12},
  unlinkError: {marginTop: 12},
  unlinkActions: {marginTop: 18},
});

export default SignedInVerusIdDetails;
