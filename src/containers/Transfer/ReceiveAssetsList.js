import React, {useCallback, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from 'react-native-paper';
import {formatCurrency} from 'react-native-format-currency';
import BigNumber from 'bignumber.js';
import {useDispatch, useSelector} from 'react-redux';
import AppSearchField, {APP_SEARCH_MIN_ITEMS} from '../../components/AppSearchField';
import SkeletonLoader, {SkeletonBlock, SkeletonText} from '../../components/SkeletonLoader';
import {setActiveApp, setActiveCoin, setActiveSection, setCoinSubWallet} from '../../actions/actionCreators';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../theme/onboarding';
import {AssetCoinLogo} from '../../utils/CoinData/Graphics';
import {WALLET_APP_RECEIVE} from '../../utils/constants/apps';
import {
  API_GET_ADDRESSES,
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  GENERAL,
} from '../../utils/constants/intervalConstants';
import {USD} from '../../utils/constants/currencies';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {extractDisplaySubWallets} from '../../utils/subwallet/extractSubWallets';
import ReceiveSubwalletSheet from './ReceiveSubwalletSheet';
import {createReceiveListStyles} from './receive.styles';

const receiveCardsForCoin = (coinObj, allSubWallets) =>
  (allSubWallets[coinObj.id] || []).filter(
    wallet =>
      wallet.compatible_apps?.includes(WALLET_APP_RECEIVE) &&
      wallet.api_channels?.[API_GET_ADDRESSES] != null,
  );

const ReceiveAssetsList = ({navigation}) => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createReceiveListStyles(theme), [theme]);
  const activeCoins = useObjectSelector(state => state.coins.activeCoinsForUser || []);
  const allSubWallets = useObjectSelector(state => extractDisplaySubWallets(state));
  const balances = useObjectSelector(state =>
    extractLedgerData(state, 'balances', API_GET_BALANCES),
  );
  const rates = useObjectSelector(state => state.ledger.rates || {});
  const displayCurrency = useSelector(
    state => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  const showBalance = useSelector(state => state.coins.showBalance);
  const [search, setSearch] = useState('');
  const [pendingCoin, setPendingCoin] = useState(null);
  const [cardSheetVisible, setCardSheetVisible] = useState(false);
  const [headerScrolled, setHeaderScrolled] = useState(false);
  const headerScrolledRef = useRef(false);

  useLayoutEffect(() => {
    // The title sits in the header bar, as on Send's Select asset.
    navigation.setOptions({
      title: 'Receive assets',
      headerTitleAlign: 'center',
      headerTitleStyle: {
        ...theme.typography.titleSheet,
        color: theme.colors.textPrimary,
      },
      headerRight: () => null,
      headerShadowVisible: false,
      headerStyle: {
        backgroundColor: theme.colors.background,
        elevation: 0,
        shadowOpacity: 0,
      },
      headerTintColor: theme.colors.textPrimary,
    });
  }, [navigation, theme]);

  const assets = useMemo(
    () =>
      activeCoins
        .map(coinObj => {
          const cards = receiveCardsForCoin(coinObj, allSubWallets);
          if (cards.length === 0) return null;

          const crypto = cards.reduce((total, card) => {
            const amount = balances[coinObj.id]?.[card.id]?.total;
            return total.plus(amount == null ? 0 : amount);
          }, BigNumber(0));
          const cardRateChannel = cards[0]?.api_channels?.[API_GET_FIATPRICE];
          const rate =
            rates[GENERAL]?.[coinObj.id]?.[displayCurrency] ??
            rates[cardRateChannel]?.[coinObj.id]?.[displayCurrency] ??
            null;

          return {
            cards,
            coinObj,
            crypto,
            fiat: rate == null ? null : crypto.multipliedBy(rate),
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          const aFunded = a.crypto.isGreaterThan(0);
          const bFunded = b.crypto.isGreaterThan(0);
          if (aFunded !== bFunded) return aFunded ? -1 : 1;
          if (a.fiat != null && b.fiat != null) return b.fiat.comparedTo(a.fiat);
          if (a.fiat != null) return -1;
          if (b.fiat != null) return 1;
          return b.crypto.comparedTo(a.crypto);
        }),
    [activeCoins, allSubWallets, balances, displayCurrency, rates],
  );

  const loading = activeCoins.length > 0 && Object.keys(allSubWallets).length === 0;
  // While the cards load, the coin count decides, so the field does not
  // appear late.
  const searchable =
    (loading ? activeCoins.length : assets.length) >= APP_SEARCH_MIN_ITEMS;

  const filteredAssets = useMemo(() => {
    const query = searchable ? search.trim().toLowerCase() : '';
    if (!query) return assets;
    return assets.filter(({coinObj}) =>
      [coinObj.display_name, coinObj.display_ticker, coinObj.id]
        .filter(Boolean)
        .some(value => value.toLowerCase().includes(query)),
    );
  }, [assets, search, searchable]);

  const openDetails = useCallback(
    (coinObj, card) => {
      const appKey = coinObj.default_app;
      const sections = coinObj.apps?.[appKey]?.data || [];
      const receiveSection = sections.find(section => section.key === WALLET_APP_RECEIVE);

      dispatch(setActiveCoin(coinObj));
      dispatch(setActiveApp(appKey));
      if (receiveSection) dispatch(setActiveSection(receiveSection));
      dispatch(setCoinSubWallet(coinObj.id, card));
      navigation.navigate('ReceiveAssetDetails', {
        coinId: coinObj.id,
        subWalletId: card.id,
      });
    },
    [dispatch, navigation],
  );

  const handleAssetPress = useCallback(
    item => {
      if (item.cards.length === 1) {
        openDetails(item.coinObj, item.cards[0]);
        return;
      }
      setPendingCoin(item.coinObj);
      setCardSheetVisible(true);
    },
    [openDetails],
  );

  const pendingCards = useMemo(
    () => (pendingCoin ? receiveCardsForCoin(pendingCoin, allSubWallets) : []),
    [allSubWallets, pendingCoin],
  );
  const pendingBalanceMap = useMemo(() => {
    if (!pendingCoin) return {};
    return pendingCards.reduce((result, card) => {
      result[card.id] = balances[pendingCoin.id]?.[card.id]?.total || 0;
      return result;
    }, {});
  }, [balances, pendingCards, pendingCoin]);

  const renderItem = ({item}) => {
    const fiat = item.fiat == null
      ? null
      : formatCurrency({
          amount: item.fiat.decimalPlaces(2, BigNumber.ROUND_HALF_UP).toFixed(2),
          code: displayCurrency,
        })[0];
    const crypto = item.crypto.decimalPlaces(4, BigNumber.ROUND_DOWN).toFixed(4);

    return (
      <TouchableOpacity
        accessibilityLabel={`Receive ${item.coinObj.display_name}`}
        accessibilityRole="button"
        activeOpacity={0.7}
        onPress={() => handleAssetPress(item)}
        style={styles.row}>
        <View style={styles.logo}>
          <AssetCoinLogo coinId={item.coinObj.id} size={38} />
        </View>
        <View style={styles.rowBody}>
          <View style={styles.rowTop}>
            <Text numberOfLines={1} style={styles.assetName}>
              {item.coinObj.display_name}
            </Text>
            <Text style={fiat == null ? styles.unavailable : styles.fiat}>
              {showBalance ? fiat || 'N/A' : '*****'}
            </Text>
          </View>
          <Text style={styles.crypto}>
            {showBalance ? crypto : '***'} {item.coinObj.display_ticker}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSkeleton = () => (
    <SkeletonLoader
      accessibilityLabel="Loading Assets"
      style={!searchable && styles.listWithoutSearch}>
      {[0, 1, 2].map(index => (
        <View key={index} style={styles.skeletonRow}>
          <SkeletonBlock height={38} radius={8} width={38} />
          <View style={{flex: 1, marginLeft: 16}}>
            <SkeletonText height={16} width="58%" />
            <SkeletonText height={14} style={{marginTop: 8}} width="42%" />
          </View>
        </View>
      ))}
    </SkeletonLoader>
  );

  const handleScroll = event => {
    const next = (event.nativeEvent.contentOffset.y || 0) > 1;
    if (next === headerScrolledRef.current) return;
    headerScrolledRef.current = next;
    setHeaderScrolled(next);
  };

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
      <View
        style={[
          styles.header,
          searchable && styles.headerWithSearch,
          headerScrolled && styles.headerScrolled,
        ]}>
        {searchable ? (
          <AppSearchField
            accessibilityLabel="Search assets"
            onChangeText={setSearch}
            placeholder="Search assets"
            resultCount={filteredAssets.length}
            value={search}
          />
        ) : null}
      </View>
      {loading ? (
        renderSkeleton()
      ) : (
        <FlatList
          contentContainerStyle={[styles.list, !searchable && styles.listWithoutSearch]}
          data={filteredAssets}
          keyExtractor={item => item.coinObj.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {searchable && search.trim()
                  ? 'No assets match your search.'
                  : 'No assets available yet.'}
              </Text>
            </View>
          }
          onScroll={handleScroll}
          renderItem={renderItem}
          scrollEventThrottle={16}
        />
      )}
      <ReceiveSubwalletSheet
        balanceMap={pendingBalanceMap}
        coinObj={pendingCoin}
        onClose={() => setCardSheetVisible(false)}
        onClosed={() => setPendingCoin(null)}
        onSelect={card => {
          setCardSheetVisible(false);
          openDetails(pendingCoin, card);
          setPendingCoin(null);
        }}
        subWallets={pendingCards}
        visible={cardSheetVisible}
      />
    </SafeAreaView>
  );
};

export default ReceiveAssetsList;
