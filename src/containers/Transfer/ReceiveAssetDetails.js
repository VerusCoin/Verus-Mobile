import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from 'react';
import {
  Platform,
  ScrollView,
  Share,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from 'react-native-paper';
import {useDispatch, useSelector} from 'react-redux';
import {
  expireCoinData,
  setActiveApp,
  setActiveCoin,
  setActiveSection,
  setCoinSubWallet,
} from '../../actions/actionCreators';
import AppButton from '../../components/AppButton';
import CopyAction from '../../components/CopyAction';
import HeaderCloseButton from '../../components/HeaderCloseButton';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonText,
} from '../../components/SkeletonLoader';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {WALLET_APP_RECEIVE} from '../../utils/constants/apps';
import {
  API_GET_ADDRESSES,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  DLIGHT_PRIVATE,
  GENERAL,
} from '../../utils/constants/intervalConstants';
import {USD} from '../../utils/constants/currencies';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {
  getSubWalletCardType,
  getSubWalletNetworkLabel,
} from '../../utils/subwallet/cardPresentation';
import {extractDisplaySubWallets} from '../../utils/subwallet/extractSubWallets';
import ReceiveAddressSheet from './ReceiveAddressSheet';
import ReceivePaymentRequestFlow from './ReceivePaymentRequestFlow';
import ReceiveSubwalletSheet from './ReceiveSubwalletSheet';
import {createReceiveDetailsStyles} from './receive.styles';

// Addresses come from the keys of the active account, addressed by the Card's
// own address channel. This is the single source for the copied address and
// for the address encoded in the receive QR.
export const getExplicitAddressRecords = (activeAccount, coinObj, card) => {
  if (!activeAccount || !coinObj || !card) return [];
  const channel = card.api_channels?.[API_GET_ADDRESSES];
  const addresses = activeAccount.keys?.[coinObj.id]?.[channel]?.addresses;
  if (!Array.isArray(addresses)) return [];

  return addresses.filter(Boolean).map((address, index) => ({
    address,
    label:
      card.address_info?.[index]?.label ||
      (index === 0 ? 'Address' : `Address ${index + 1}`),
  }));
};

const receiveCardsForCoin = (coinObj, allSubWallets) =>
  ((allSubWallets && allSubWallets[coinObj?.id]) || []).filter(
    wallet =>
      wallet.compatible_apps?.includes(WALLET_APP_RECEIVE) &&
      wallet.api_channels?.[API_GET_ADDRESSES] != null,
  );

const RECEIVE_ROUTES = ['ReceiveAssetsList', 'ReceiveAssetDetails'];

// Close leaves Receive in one tap: it also removes the "Receive assets" list
// when Receive was opened from it, and returns to the screen that opened it.
const closeReceive = navigation => {
  const {index, routes} = navigation.getState();
  let count = 0;
  while (count < index && RECEIVE_ROUTES.includes(routes[index - count].name)) {
    count += 1;
  }
  navigation.pop(Math.max(count, 1));
};

const ReceiveAssetDetails = ({navigation, route}) => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const {height, width} = useWindowDimensions();
  const styles = useMemo(() => createReceiveDetailsStyles(theme), [theme]);
  const isSmall = height <= 667 || width <= 375;
  // 360x640 Android windows need a tighter page so the address field sits
  // fully above the footer without scrolling.
  const isTight = height <= 640;
  const qrSize = isTight ? 160 : isSmall ? 184 : 216;
  const activeCoins = useObjectSelector(
    state => state.coins.activeCoinsForUser || [],
  );
  const allSubWallets = useObjectSelector(state => extractDisplaySubWallets(state));
  const balances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const activeAccount = useObjectSelector(
    state => state.authentication.activeAccount,
  );
  const rates = useObjectSelector(state => state.ledger.rates || {});
  const displayCurrency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const generalSettings = useSelector(
    state => state.settings.generalWalletSettings,
  );
  const coinObj = useMemo(() => {
    const active = activeCoins.find(coin => coin.id === route.params?.coinId);
    if (active) return active;
    try {
      return CoinDirectory.findCoinObj(route.params?.coinId);
    } catch (e) {
      return null;
    }
  }, [activeCoins, route.params?.coinId]);
  const cards = useMemo(
    () => receiveCardsForCoin(coinObj, allSubWallets),
    [allSubWallets, coinObj],
  );
  const [selectedCardId, setSelectedCardId] = useState(
    route.params?.subWalletId || null,
  );
  const resolvedCardId =
    selectedCardId ?? (cards.length === 1 ? cards[0].id : null);
  const selectedCard = useMemo(
    () => cards.find(card => card.id === resolvedCardId) || null,
    [cards, resolvedCardId],
  );
  const addressRecords = useMemo(
    () => getExplicitAddressRecords(activeAccount, coinObj, selectedCard),
    [activeAccount, coinObj, selectedCard],
  );
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const selectedAddressRecord = addressRecords[selectedAddressIndex] || null;
  const address = selectedAddressRecord?.address || null;
  const [cardSheetVisible, setCardSheetVisible] = useState(false);
  const [addressSheetVisible, setAddressSheetVisible] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [requestActive, setRequestActive] = useState(false);

  useEffect(() => {
    if (cards.length === 1 && selectedCardId !== cards[0].id) {
      setSelectedCardId(cards[0].id);
    }
  }, [cards, selectedCardId]);

  useEffect(() => {
    setSelectedAddressIndex(0);
    setShareError(null);
  }, [resolvedCardId, activeAccount?.accountHash]);

  useEffect(() => {
    if (!coinObj || !selectedCard) return;
    const appKey = coinObj.default_app;
    const sections = coinObj.apps?.[appKey]?.data || [];
    const receiveSection = sections.find(section => section.key === WALLET_APP_RECEIVE);
    dispatch(setActiveCoin(coinObj));
    dispatch(setActiveApp(appKey));
    if (receiveSection) dispatch(setActiveSection(receiveSection));
    dispatch(setCoinSubWallet(coinObj.id, selectedCard));
    dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));
    dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
  }, [coinObj, dispatch, selectedCard]);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerShadowVisible: false,
      headerShown: !requestActive,
      headerTintColor: theme.colors.textPrimary,
      headerStyle: {
        backgroundColor: theme.colors.background,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerRight: () => (
        <HeaderCloseButton
          accessibilityLabel="Close Receive"
          onPress={() => closeReceive(navigation)}
        />
      ),
      headerRightContainerStyle: {paddingRight: 16},
    });
  }, [navigation, requestActive, theme]);

  const conversionEligible =
    coinObj?.proto === 'vrsc' &&
    selectedCard?.id !== 'PRIVATE_WALLET' &&
    selectedCard?.channel !== DLIGHT_PRIVATE;
  const rateChannel = selectedCard?.api_channels?.[API_GET_FIATPRICE];
  const priceMap =
    rates[GENERAL]?.[coinObj?.id] || rates[rateChannel]?.[coinObj?.id] || {};
  const price = priceMap[displayCurrency];
  const balanceMap = useMemo(
    () =>
      cards.reduce((result, card) => {
        result[card.id] = balances[coinObj?.id]?.[card.id]?.total || 0;
        return result;
      }, {}),
    [balances, cards, coinObj?.id],
  );
  const cardContextLabel = useMemo(() => {
    if (!selectedCard) return '';
    const networkName = getSubWalletNetworkLabel(selectedCard, coinObj);
    return `${getSubWalletCardType(selectedCard)} · ${networkName}`;
  }, [coinObj, selectedCard]);
  const requestContextKey = [
    coinObj?.id,
    selectedCard?.id,
    address,
    activeAccount?.accountHash,
  ].join('|');

  const openCardSheet = useCallback(() => setCardSheetVisible(true), []);
  const closeCardSheet = useCallback(() => setCardSheetVisible(false), []);
  const openAddressSheet = useCallback(() => setAddressSheetVisible(true), []);
  const closeAddressSheet = useCallback(() => setAddressSheetVisible(false), []);
  const shareAddress = useCallback(async () => {
    if (!address) return;
    try {
      await Share.share({message: address});
      setShareError(null);
    } catch (e) {
      setShareError('The share sheet could not be opened. Try again.');
    }
  }, [address]);
  const startRequest = useCallback(() => setRequestActive(true), []);
  const exitRequest = useCallback(() => setRequestActive(false), []);
  const goHome = useCallback(() => navigation.navigate('Home'), [navigation]);
  const selectCard = useCallback(card => {
    setSelectedCardId(card.id);
    dispatch(setCoinSubWallet(coinObj.id, card, true));
    setCardSheetVisible(false);
  }, [coinObj?.id, dispatch]);

  const renderCardSheet = () => (
    <ReceiveSubwalletSheet
      balanceMap={balanceMap}
      coinObj={coinObj}
      onClose={closeCardSheet}
      onSelect={selectCard}
      selectedId={resolvedCardId}
      subWallets={cards}
      visible={cardSheetVisible}
    />
  );

  const addressLoading = activeAccount == null;

  const renderAddressRow = () => (
    <TouchableOpacity
      accessibilityRole={addressRecords.length > 1 ? 'button' : undefined}
      activeOpacity={addressRecords.length > 1 ? 0.7 : 1}
      disabled={addressRecords.length <= 1}
      onPress={openAddressSheet}
      style={styles.addressRow}>
      {address ? (
        <>
          <Text
            ellipsizeMode="middle"
            numberOfLines={1}
            selectable={Platform.OS === 'ios'}
            style={[styles.address, styles.identifier]}>
            {address}
          </Text>
          <CopyAction
            accessibilityLabel="Copy receive address"
            value={address}
          />
        </>
      ) : (
        // Missing data is a sentence, not a value: it reads as body copy that
        // wraps fully and offers no copy affordance. Only a real address gets
        // the identifier treatment and the copy control.
        <Text style={styles.addressMissing}>
          No address is available.
        </Text>
      )}
      {addressRecords.length > 1 ? (
        <MaterialCommunityIcons
          color={theme.colors.textSubtle}
          name="chevron-down"
          size={20}
        />
      ) : null}
    </TouchableOpacity>
  );

  if (!coinObj) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safe}>
        <View style={styles.stateScreen}>
          <Text style={styles.stateTitle}>Asset unavailable</Text>
          <Text style={styles.stateBody}>
            This Asset could not be loaded from the wallet directory.
          </Text>
          <View style={styles.stateAction}>
            <AppButton onPress={goHome}>Done</AppButton>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (cards.length === 0) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safe}>
        <View style={styles.stateScreen}>
          <Text style={styles.stateTitle}>No address available</Text>
          <View style={[styles.stateAction, styles.stateActionAfterTitle]}>
            <AppButton onPress={goHome}>Done</AppButton>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (!selectedCard) {
    return (
      <SafeAreaView edges={['left', 'right']} style={styles.safe}>
        <View style={styles.stateScreen}>
          <Text style={styles.stateTitle}>Choose an address</Text>
          <View style={[styles.stateAction, styles.stateActionAfterTitle]}>
            <AppButton onPress={openCardSheet}>Choose address</AppButton>
          </View>
        </View>
        {renderCardSheet()}
      </SafeAreaView>
    );
  }

  if (requestActive) {
    return (
      <ReceivePaymentRequestFlow
        address={address}
        card={selectedCard}
        coinObj={coinObj}
        contextKey={requestContextKey}
        conversionEligible={conversionEligible}
        displayCurrency={displayCurrency}
        isSmall={isSmall}
        navigation={navigation}
        onClose={() => closeReceive(navigation)}
        onExit={exitRequest}
        price={price}
        priceMap={priceMap}
      />
    );
  }

  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safe}>
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.scroll, isTight && styles.scrollTight]}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AssetCoinLogo coinId={coinObj.id} size={40} />
              <Text style={styles.title}>{coinObj.display_name}</Text>
            </View>
            {cards.length > 1 ? (
              <TouchableOpacity
                accessibilityLabel={`Choose an address. Current: ${getSubWalletCardType(selectedCard)} on ${getSubWalletNetworkLabel(selectedCard, coinObj)}`}
                accessibilityRole="button"
                onPress={openCardSheet}
                style={styles.cardContext}>
                <Text style={styles.contextText}>{cardContextLabel}</Text>
                <MaterialCommunityIcons
                  color={theme.colors.textSubtle}
                  name="chevron-down"
                  size={20}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.cardContext}>
                <Text style={styles.contextText}>{cardContextLabel}</Text>
              </View>
            )}
          </View>
          <View style={styles.receiveBody}>
            <View style={[styles.qrWrap, isTight && styles.qrWrapTight]}>
              <View style={[styles.qrSurface, isTight && styles.qrSurfaceTight]}>
                {addressLoading ? (
                  <SkeletonLoader accessibilityLabel="Loading receive address">
                    <SkeletonBlock height={qrSize} radius={8} width={qrSize} />
                  </SkeletonLoader>
                ) : address ? (
                  <QRCode size={qrSize} value={address} />
                ) : (
                  <View
                    style={{
                      width: qrSize,
                      height: qrSize,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                    <MaterialCommunityIcons
                      color={theme.colors.textSubtle}
                      name="qrcode"
                      size={72}
                    />
                  </View>
                )}
              </View>
            </View>
            {addressLoading ? (
              <SkeletonLoader accessibilityLabel="Loading address record">
                <SkeletonText height={13} width="28%" />
                <SkeletonBlock height={56} radius={12} style={{marginTop: 8}} />
              </SkeletonLoader>
            ) : (
              <>
                {selectedCard.name?.endsWith('@') ? (
                  <>
                    <Text style={styles.label}>VerusID</Text>
                    <View style={styles.addressRow}>
                      <Text
                        ellipsizeMode="middle"
                        numberOfLines={1}
                        selectable={Platform.OS === 'ios'}
                        style={styles.address}>
                        {selectedCard.name}
                      </Text>
                      <CopyAction
                        accessibilityLabel="Copy VerusID"
                        value={selectedCard.name}
                      />
                    </View>
                    <Text style={[styles.label, {marginTop: 12}]}>i-Address</Text>
                    {renderAddressRow()}
                  </>
                ) : (
                  <>
                    <Text style={styles.label}>
                      {selectedAddressRecord?.label || 'Address'}
                    </Text>
                    {renderAddressRow()}
                  </>
                )}
              </>
            )}
          </View>
        </ScrollView>
        <SafeBottomActionStack
          gap={10}
          horizontalSpacing={20}
          style={[styles.footer, height <= 667 && styles.footerCompact]}>
          {shareError ? <Text style={styles.error}>{shareError}</Text> : null}
          <AppButton disabled={!address} onPress={shareAddress}>
            Share address
          </AppButton>
          <AppButton disabled={!address} onPress={startRequest} variant="secondary">
            Request amount
          </AppButton>
        </SafeBottomActionStack>
      </View>

      <ReceiveAddressSheet
        records={addressRecords}
        selectedIndex={selectedAddressIndex}
        onSelect={setSelectedAddressIndex}
        onClose={closeAddressSheet}
        visible={addressSheetVisible}
      />
      {renderCardSheet()}
    </SafeAreaView>
  );
};

export default ReceiveAssetDetails;
