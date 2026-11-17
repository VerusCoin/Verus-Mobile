import React, {useCallback, useLayoutEffect, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  findNodeHandle,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {useFocusEffect, useIsFocused} from '@react-navigation/native';
import {useSharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import BigNumber from 'bignumber.js';
import {CONVERSION_DISABLED} from '../../../env/index';
import {setCoinSubWallet} from '../../actions/actionCreators';
import AppButton from '../../components/AppButton';
import MissingInfoRedirect from '../../components/MissingInfoRedirect/MissingInfoRedirect';
import SignedInActionBar from '../../components/SignedInActionBar';
import DraggableSheet from '../../components/DraggableSheet';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {ONBOARDING_SMALL_DEVICE_MAX_HEIGHT} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {
  WALLET_APP_OVERVIEW,
  WALLET_APP_RECEIVE,
  WALLET_APP_SEND,
} from '../../utils/constants/apps';
import {
  API_GET_BALANCES,
  API_SEND,
} from '../../utils/constants/intervalConstants';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {usePrelaunchAsset} from '../../utils/preconversion/usePrelaunch';
import {subWalletActivity} from '../../utils/subwallet/subWalletStatus';
import {
  getPrivateSyncPercent,
  getSpendableBalance,
  isPrivateCard,
  selectPrivateWalletInfo,
} from '../../utils/subwallet/privateWallet';
import {isConversionChannel, SEND_WIZARD_MODE} from '../SendWizard/wizardUtils';
import CoinCardPickerSheet from './CoinCardPickerSheet';
import Overview from './Overview/Overview';
import PrelaunchAssetPanel from './PrelaunchAssetPanel';
import SignedInAssetHeader from './SignedInAssetHeader';
import AssetCardStack from './AssetCardStack';
import useAssetCardData from './useAssetCardData';

const SignedInCoinDetail = ({navigation, route}) => {
  const dispatch = useDispatch();
  const asset = useAssetCardData();
  const sheetRef = useRef(null);
  const progress = useSharedValue(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [peekHeight, setPeekHeight] = useState(0);
  const [bodyHeight, setBodyHeight] = useState(0);
  const theme = useOnboardingTheme();
  const activeCoin = useObjectSelector(state => state.coins.activeCoin);
  const selectedSubWallet = useObjectSelector(
    state => state.coinMenus.activeSubWallets[activeCoin.id],
  );
  const allSubWallets = useObjectSelector(
    state => state.coinMenus.allSubWallets[activeCoin.id] || [],
  );
  const selectedBalance = useObjectSelector(state =>
    selectedSubWallet == null
      ? '0'
      : String(
          getSpendableBalance(
            extractLedgerData(state, 'balances', API_GET_BALANCES)?.[
              activeCoin.id
            ]?.[selectedSubWallet.id],
            selectedSubWallet,
          ),
        ),
  );
  const services = useSelector(state => state.services);
  const showBalance = useSelector(state => state.coins.showBalance);
  const insets = useSafeAreaInsets();
  const compact =
    useWindowDimensions().height <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;
  // Before its launch a currency has no balance and no price. Its screen shows
  // the launch and this wallet's pre-conversions instead of cards and history.
  const {prelaunch} = usePrelaunchAsset(activeCoin, allSubWallets);
  const activeCoins = useObjectSelector(
    state => state.coins.activeCoinsForUser,
  );
  const ledgerBalances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const cardsByCoin = useObjectSelector(state => state.coinMenus.allSubWallets);
  // The private card cannot send until its sync finishes; the card shows it.
  const privateSyncing = useSelector(
    state =>
      isPrivateCard(selectedSubWallet) &&
      getPrivateSyncPercent(selectPrivateWalletInfo(state)[activeCoin.id]) !=
        null,
  );
  const cardPickerTriggerRef = useRef(null);
  const restorePickerFocusRef = useRef(false);
  const [cardPickerVisible, setCardPickerVisible] = useState(false);
  const isFocused = useIsFocused();
  const signedIn = useSelector(
    state => state.authentication.activeAccount != null,
  );
  // The chooser opens only on the visible screen of a signed-in account with
  // cards. Otherwise a teardown or rebuild would show an empty native sheet.
  const cardPickerAllowed = isFocused && signedIn && allSubWallets.length > 0;
  const compatibleApps = selectedSubWallet?.compatible_apps || [];
  const hasOverview = compatibleApps.includes(WALLET_APP_OVERVIEW);
  const canReceive = compatibleApps.includes(WALLET_APP_RECEIVE);
  const sendChannel = selectedSubWallet?.api_channels?.[API_SEND];
  const canSend =
    compatibleApps.includes(WALLET_APP_SEND) &&
    Boolean(sendChannel) &&
    !privateSyncing &&
    BigNumber(selectedBalance).isGreaterThan(0);
  const canConvert =
    canSend && !CONVERSION_DISABLED && isConversionChannel(sendChannel);

  const mainNavigation = navigation.getParent()?.getParent() || navigation;
  const sourceParams = {
    initialCoinId: activeCoin.id,
    initialSubWalletId: selectedSubWallet?.id,
  };
  const receiveParams = {
    coinId: activeCoin.id,
    subWalletId: selectedSubWallet?.id,
  };

  // "Pre-convert" pays with a currency the launch accepts and this wallet
  // holds: the chain's own coin first. Without one, Select asset opens.
  const openPreconvert = () => {
    const accepted = new Set(
      (prelaunch?.facts?.reserves || []).map(reserve => reserve.currencyId),
    );
    const funded = coin =>
      (cardsByCoin?.[coin.id] || []).some(card =>
        BigNumber(
          getSpendableBalance(ledgerBalances?.[coin.id]?.[card.id], card),
        ).isGreaterThan(0),
      );
    const candidates = (activeCoins || []).filter(
      coin =>
        coin.system_id === activeCoin.system_id &&
        accepted.has(coin.currency_id) &&
        funded(coin),
    );
    const fundingCoin =
      candidates.find(coin => coin.currency_id === coin.system_id) ||
      candidates[0];

    mainNavigation.navigate('SendWizard', {
      mode: SEND_WIZARD_MODE.CONVERT,
      presetTargetId: activeCoin.currency_id,
      ...(fundingCoin ? {initialCoinId: fundingCoin.id} : {}),
    });
  };

  const openCardPicker = useCallback(() => {
    restorePickerFocusRef.current = true;
    setCardPickerVisible(true);
  }, []);

  const closeCardPicker = useCallback(() => {
    if (selectedSubWallet == null) {
      navigation.goBack();
      return;
    }

    setCardPickerVisible(false);
  }, [navigation, selectedSubWallet]);

  const selectCard = useCallback(
    subWallet => {
      dispatch(setCoinSubWallet(activeCoin.id, subWallet, true));

      setCardPickerVisible(false);
    },
    [activeCoin.id, dispatch],
  );

  const handleCardPickerClosed = useCallback(() => {
    if (!restorePickerFocusRef.current) return;

    restorePickerFocusRef.current = false;
    const triggerHandle = findNodeHandle(cardPickerTriggerRef.current);

    if (triggerHandle != null) {
      AccessibilityInfo.setAccessibilityFocus(triggerHandle);
    }
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({headerShown: false});
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      sheetRef.current?.reset();
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (!sheetOpen) return false;
          sheetRef.current?.close();
          return true;
        },
      );
      return () => subscription.remove();
    }, [sheetOpen]),
  );

  let overviewActive = false;
  let overviewContent = null;

  if (selectedSubWallet != null) {
    const {placeholder, active} = subWalletActivity(selectedSubWallet.id);
    overviewActive = hasOverview && active(services);
    overviewContent = !hasOverview ? (
      <MissingInfoRedirect
        icon="power-plug-off"
        label={`Transactions are not available from the ${selectedSubWallet.name} Card.`}
      />
    ) : overviewActive ? (
      <Overview
        navigation={navigation}
        data={route?.params?.data || null}
        key={selectedSubWallet.id}
        sheetOpen={sheetOpen}
        backgroundColor={theme.colors.sheet}
      />
    ) : (
      <MissingInfoRedirect icon={placeholder.icon} label={placeholder.label} />
    );
  }

  if (prelaunch) {
    const preconverted = (prelaunch.preconversions || []).length > 0;

    return (
      <View
        style={[
          styles.screen,
          {backgroundColor: theme.colors.background, paddingTop: insets.top},
        ]}>
        <SignedInAssetHeader
          asset={asset}
          compact={compact}
          onBack={navigation.goBack}
          showCards={false}
        />
        <View style={styles.transactions}>
          <PrelaunchAssetPanel
            coin={activeCoin}
            prelaunch={prelaunch}
            showBalance={showBalance}
          />
        </View>
        <View
          style={[
            styles.prelaunchBar,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: Math.max(insets.bottom, 20),
            },
          ]}>
          <AppButton
            disabled={CONVERSION_DISABLED}
            onPress={openPreconvert}
            variant={preconverted ? 'secondary' : 'primary'}>
            {preconverted ? 'Pre-convert more' : 'Pre-convert'}
          </AppButton>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.screen,
        {backgroundColor: theme.colors.background, paddingTop: insets.top},
      ]}>
      <SignedInAssetHeader
        asset={asset}
        compact={compact}
        onBack={navigation.goBack}
        showCards={false}
      />
      {selectedSubWallet != null ? (
        <View
          onLayout={event => setBodyHeight(event.nativeEvent.layout.height)}
          style={styles.body}>
          <View
            onLayout={event => setPeekHeight(event.nativeEvent.layout.height)}>
            <AssetCardStack
              asset={asset}
              compact={compact}
              progress={progress}
              sheetOpen={sheetOpen}
              onCloseSheet={() => sheetRef.current?.close()}
              onSelect={selectCard}
              onMore={openCardPicker}
              moreRef={cardPickerTriggerRef}
            />
            <View
              pointerEvents={sheetOpen ? 'none' : 'auto'}
              accessibilityElementsHidden={sheetOpen}
              importantForAccessibility={
                sheetOpen ? 'no-hide-descendants' : 'auto'
              }>
              <SignedInActionBar
                placement="assetStack"
                includeBottomInset={false}
                convertDisabled={!canConvert}
                receiveDisabled={!canReceive}
                sendDisabled={!canSend}
                onReceive={() =>
                  mainNavigation.navigate('ReceiveAssetDetails', receiveParams)
                }
                onSend={() =>
                  mainNavigation.navigate('SendWizard', {
                    ...sourceParams,
                    mode: SEND_WIZARD_MODE.SEND,
                  })
                }
                onConvert={() =>
                  mainNavigation.navigate('SendWizard', {
                    ...sourceParams,
                    mode: SEND_WIZARD_MODE.CONVERT,
                  })
                }
              />
            </View>
          </View>
          {bodyHeight > 0 && peekHeight > 0 ? (
            <DraggableSheet
              ref={sheetRef}
              title="Transactions"
              progress={progress}
              peekTop={Math.min(
                peekHeight,
                Math.max(compact ? 64 : 68, bodyHeight - 52),
              )}
              openTop={compact ? 64 : 68}
              resetKey={`${activeCoin.id}:${selectedSubWallet.id}`}
              onOpenChange={setSheetOpen}>
              <View
                pointerEvents={!overviewActive && !sheetOpen ? 'none' : 'auto'}
                style={styles.transactions}>
                {overviewContent}
              </View>
            </DraggableSheet>
          ) : null}
        </View>
      ) : null}
      <CoinCardPickerSheet
        coin={activeCoin}
        onClose={closeCardPicker}
        onClosed={handleCardPickerClosed}
        onSelect={selectCard}
        selectedSubWalletId={selectedSubWallet?.id || null}
        subWallets={allSubWallets}
        visible={
          cardPickerAllowed && (selectedSubWallet == null || cardPickerVisible)
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {flex: 1},
  transactions: {flex: 1},
  prelaunchBar: {paddingHorizontal: 16, paddingTop: 10},
  body: {flex: 1},
});

export default SignedInCoinDetail;
