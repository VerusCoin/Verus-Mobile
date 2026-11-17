import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  FlatList,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useDispatch, useSelector} from 'react-redux';
import {Pin} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, {Defs, LinearGradient, Rect, Stop} from 'react-native-svg';
import AppSearchField, {APP_SEARCH_MIN_ITEMS} from '../../components/AppSearchField';
import BottomSheetModal from '../../components/BottomSheetModal';
import CardMaterial from '../../components/CardMaterial';
import PrivacyBlurredText from '../../components/PrivacyBlurredText';
import {fontStyle} from '../../globals/fonts';
import {toggleCoinCardPin} from '../../actions/actionCreators';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {ONBOARDING_SMALL_DEVICE_MAX_HEIGHT} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {CONNECTION_ERROR} from '../../utils/api/errors/errorMessages';
import {API_GET_BALANCES} from '../../utils/constants/intervalConstants';
import {refreshWalletChannels} from '../../utils/ledger/refreshWalletChannels';
import {
  extractErrorData,
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import {truncateDecimal} from '../../utils/math';
import {getCardColors} from '../../utils/subwallet/cardColors';
import {
  getCardStackMainId,
  getCardStackPinLimit,
  getCardStackPins,
  toggleCardStackPin,
} from '../../utils/subwallet/cardStackPreferences';
import {
  getLedgerTotal,
  getNetworkTicker,
  getSubWalletCardType,
  getSubWalletDisplayIdentifier,
  getSubWalletNetworkLabel,
  isVerusIdWallet,
  sortSubWalletsByBalance,
  truncateMiddle,
} from '../../utils/subwallet/cardPresentation';

const TYPE_FILTERS = [
  {id: 'all', label: 'All'},
  {id: 'addresses', label: 'Addresses'},
  {id: 'verusids', label: 'VerusIDs'},
];
const ALL_CHAINS = 'all';
// A row with its network line. When all cards share one network, rows drop
// that line and use the shorter height.
const ROW_HEIGHT = 72;
const ROW_HEIGHT_ONE_NETWORK = 60;
const ROW_GAP = 8;
// Height of the sheet without the list and without the controls: the modal's
// 10-point top padding, the body padding (8 and 18), the title (26) and the
// list gap (12), plus 8 points of margin. The search field and the type chips
// add 112, a chain row 52.
const SHEET_CHROME_BASE = 82;
const SHEET_CHROME_CONTROLS = 112;
const SHEET_CHROME_CHAIN_ROW = 52;
const SHEET_MAX_HEIGHT_RATIO = 0.76;
// Space kept free above a sheet that grows past 76%.
const SHEET_TOP_CLEARANCE = 16;
const SCROLL_CUE_HEIGHT = 42;
const MIN_FADE_VIEWPORT_HEIGHT = 128;
const SCROLL_END_THRESHOLD = 8;
const MONOSPACE_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

const CoinCardPickerSheet = ({
  visible,
  coin,
  subWallets = [],
  selectedSubWalletId,
  onSelect,
  onClose,
  onClosed,
}) => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const {height: screenHeight} = useWindowDimensions();
  const compact = screenHeight <= ONBOARDING_SMALL_DEVICE_MAX_HEIGHT;
  const pinLimit = getCardStackPinLimit(compact);
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const didInitialScrollRef = useRef(false);
  const wasVisibleRef = useRef(false);
  const styles = useMemo(() => createStyles(theme), [theme]);
  const chainTicker = coin?.id;
  const displayTicker = coin?.display_ticker || '';
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const showBalance = useSelector(state => state.coins.showBalance);
  const stackPreferences = useObjectSelector(state =>
    state.settings.generalWalletSettings.cardStackPreferencesByAccount?.[activeAccount?.accountHash]?.[chainTicker] || {},
  );
  const pins = useMemo(
    () => getCardStackPins(subWallets, stackPreferences.pins),
    [stackPreferences.pins, subWallets],
  );
  const mainId = useMemo(() => getCardStackMainId(subWallets), [subWallets]);
  const identitySlots = useSelector(state =>
    state.settings.generalWalletSettings.identityColorSlotsByAccount?.[activeAccount?.accountHash],
  );
  const balances = useObjectSelector(state =>
    chainTicker
      ? extractLedgerData(state, 'balances', API_GET_BALANCES, chainTicker)
      : {},
  );
  const balanceErrors = useObjectSelector(state =>
    chainTicker ? extractErrorData(state, API_GET_BALANCES, chainTicker) : {},
  );
  const [frozenSubWallets, setFrozenSubWallets] = useState([]);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [chainFilter, setChainFilter] = useState(ALL_CHAINS);
  const [showBottomScrollCue, setShowBottomScrollCue] = useState(false);
  const [showTopScrollCue, setShowTopScrollCue] = useState(false);
  const [showPinLimit, setShowPinLimit] = useState(false);
  const [noticeHeight, setNoticeHeight] = useState(52);
  const [listViewportHeight, setListViewportHeight] = useState(null);
  const limitNoteVisible = showPinLimit || pins.length > pinLimit;

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      if (chainTicker) refreshWalletChannels(chainTicker, subWallets, [API_GET_BALANCES])
        .catch(() => console.warn('Unable to refresh address balances'));
      didInitialScrollRef.current = false;
      setFrozenSubWallets(sortSubWalletsByBalance(subWallets, balances));
      setQuery('');
      setTypeFilter('all');
      setChainFilter(ALL_CHAINS);
      setShowPinLimit(false);
    }

    if (!visible) didInitialScrollRef.current = false;

    wasVisibleRef.current = visible;
  }, [balances, chainTicker, subWallets, visible]);

  useEffect(() => {
    if (visible && frozenSubWallets.length === 0 && subWallets.length > 0) {
      setFrozenSubWallets(sortSubWalletsByBalance(subWallets, balances));
    }
  }, [balances, frozenSubWallets.length, subWallets, visible]);

  const items = useMemo(
    () =>
      frozenSubWallets.map(wallet => {
        const verusId = isVerusIdWallet(wallet);
        const identifier = getSubWalletDisplayIdentifier(
          wallet,
          activeAccount,
          chainTicker,
          false,
        );
        const type = getSubWalletCardType(wallet);
        const networkLabel = getSubWalletNetworkLabel(wallet, coin);
        const balance = getLedgerTotal(balances?.[wallet.id]);
        const hasBalanceError = Boolean(balanceErrors?.[wallet.id]);
        let amountText =
          balance == null ? '—' : truncateDecimal(balance, 8);
        let balanceAccessibilityLabel =
          balance == null
            ? 'Balance unavailable'
            : `${amountText} ${displayTicker}`.trim();
        const hasBalanceValue = balance != null && !hasBalanceError;

        if (hasBalanceError) {
          amountText = CONNECTION_ERROR;
          balanceAccessibilityLabel = 'Connection error';
        } else if (!showBalance && hasBalanceValue) {
          balanceAccessibilityLabel = 'Balance hidden';
        }

        return {
          wallet,
          identifier,
          displayIdentifier: verusId
            ? identifier
            : identifier === '-'
              ? 'Address unavailable'
              : truncateMiddle(identifier, 6, 6, '…'),
          verusId,
          type,
          networkLabel,
          amountText,
          hasBalanceValue,
          balanceAccessibilityLabel,
          searchText: [
            identifier,
            wallet.name,
            type,
            networkLabel,
            wallet.network,
            getNetworkTicker(wallet.network),
            displayTicker,
          ]
            .filter(Boolean)
            .join(' ')
            .toLocaleLowerCase(),
        };
      }),
    [
      activeAccount,
      balanceErrors,
      balances,
      chainTicker,
      coin,
      displayTicker,
      frozenSubWallets,
      showBalance,
    ],
  );
  const chainOptions = useMemo(
    () =>
      items.reduce((options, item) => {
        if (item.networkLabel && !options.includes(item.networkLabel)) {
          options.push(item.networkLabel);
        }

        return options;
      }, []),
    [items],
  );
  // The search and the filter chips show only from 7 cards. The count ignores
  // the search text and the filters, so they do not disappear while the user
  // uses them. Without them, the list shows every card.
  const searchable = items.length >= APP_SEARCH_MIN_ITEMS;
  const showChainFilters = searchable && chainOptions.length > 1;
  const normalizedQuery = searchable ? query.trim().toLocaleLowerCase() : '';
  const activeTypeFilter = searchable ? typeFilter : 'all';
  const activeChainFilter = searchable ? chainFilter : ALL_CHAINS;
  const filteredItems = useMemo(
    () =>
      items.filter(item => {
        const matchesQuery =
          !normalizedQuery || item.searchText.includes(normalizedQuery);
        const matchesType =
          activeTypeFilter === 'all' ||
          (activeTypeFilter === 'verusids' && item.verusId) ||
          (activeTypeFilter === 'addresses' && !item.verusId);
        const matchesChain =
          activeChainFilter === ALL_CHAINS ||
          item.networkLabel === activeChainFilter;

        return matchesQuery && matchesType && matchesChain;
      }),
    [activeChainFilter, activeTypeFilter, items, normalizedQuery],
  );
  // Rows show their network only when the cards are on more than one
  // network. Otherwise every row would repeat the same name.
  const showNetwork = chainOptions.length > 1;
  const rowHeight = showNetwork ? ROW_HEIGHT : ROW_HEIGHT_ONE_NETWORK;
  const itemStride = rowHeight + ROW_GAP;
  // Headers and the notice are list entries, so initial scroll and the sheet's
  // height include them. The balance order stays frozen while pins move live.
  const listEntries = useMemo(() => {
    const byId = new Map(filteredItems.map(item => [item.wallet.id, item]));
    const pinned = pins.map(id => byId.get(id)).filter(Boolean);
    const others = filteredItems.filter(item => !pins.includes(item.wallet.id));
    const entries = [];
    const addGroup = (title, rows, showNote = false, showTitle = true) => {
      if (!rows.length && !showNote) return;
      if (showTitle) {
        entries.push({
          kind: 'group',
          key: title,
          title,
          length: entries.length ? 42 : 26,
        });
      }
      if (showNote) {
        entries.push({
          kind: 'notice',
          key: 'pin-limit',
          length: noticeHeight + ROW_GAP,
        });
      }
      rows.forEach(item => entries.push({
        kind: 'card', key: item.wallet.id, item, length: itemStride,
      }));
    };
    addGroup('PINNED', pinned, limitNoteVisible);
    // "OTHERS" only makes sense under a visible "PINNED" group.
    addGroup('OTHERS', others, false, entries.length > 0);
    let offset = 0;
    return entries.map(entry => {
      const result = {...entry, offset};
      offset += entry.length;
      return result;
    });
  }, [filteredItems, itemStride, limitNoteVisible, noticeHeight, pins]);
  const listContentHeight = listEntries.reduce(
    (total, entry) => total + entry.length, 0,
  );
  const sheetChromeHeight =
    SHEET_CHROME_BASE +
    (searchable ? SHEET_CHROME_CONTROLS : 0) +
    (showChainFilters ? SHEET_CHROME_CHAIN_ROW : 0);
  // Below 7 cards every card must show without scrolling, so on a short
  // phone such as the iPhone SE the sheet grows past 76% when it has to.
  const defaultSheetHeight = screenHeight * SHEET_MAX_HEIGHT_RATIO;
  const fullCardListHeight = sheetChromeHeight + listContentHeight;
  const sheetGrows = !searchable && fullCardListHeight > defaultSheetHeight;
  const sheetMaxHeight = sheetGrows
    ? Math.min(
        fullCardListHeight,
        screenHeight -
          insets.top -
          Math.max(insets.bottom, 12) -
          SHEET_TOP_CLEARANCE,
      )
    : defaultSheetHeight;
  const maximumListHeight = Math.max(
    itemStride,
    sheetMaxHeight - sheetChromeHeight,
  );
  const listHeight = Math.min(
    Math.max(listContentHeight, itemStride),
    maximumListHeight,
  );
  // The modal's keyboard avoider can leave less room than the window-based
  // height above. Yoga shrinks the list; use that viewport for scroll bounds.
  const viewportHeight = Math.min(listHeight, listViewportHeight ?? listHeight);
  const listScrollable =
    listContentHeight > viewportHeight + SCROLL_END_THRESHOLD;
  const showScrollFades = viewportHeight >= MIN_FADE_VIEWPORT_HEIGHT;

  useEffect(() => {
    if (!visible) {
      setShowBottomScrollCue(false);
      setShowTopScrollCue(false);
      return;
    }

    listRef.current?.scrollToOffset({animated: false, offset: 0});
    setShowTopScrollCue(false);
    setShowBottomScrollCue(listScrollable);
    // Not on viewport changes: the keyboard resizes the list, and focusing
    // search must not move the list back to the top.
  }, [
    activeChainFilter,
    activeTypeFilter,
    filteredItems.length,
    listScrollable,
    normalizedQuery,
    visible,
  ]);

  // When the controls hide, the search text and the filters go back to their
  // defaults, so the controls return unchanged.
  useEffect(() => {
    if (!searchable) {
      setQuery('');
      setTypeFilter('all');
      setChainFilter(ALL_CHAINS);
    }
  }, [searchable]);

  useEffect(() => {
    if (
      !visible ||
      frozenSubWallets.length === 0 ||
      listViewportHeight == null ||
      didInitialScrollRef.current
    ) {
      return undefined;
    }

    const selectedEntry = listEntries.find(
      entry => entry.kind === 'card' && entry.item.wallet.id === selectedSubWalletId,
    );
    if (!selectedEntry) return undefined;

    const pinnedGroupHeight = listEntries.find(
      entry => entry.kind === 'group' && entry.title === 'OTHERS',
    )?.offset ?? listContentHeight;
    const showPinnedGroup =
      pins.includes(selectedSubWalletId) && pinnedGroupHeight <= viewportHeight;
    const offset = showPinnedGroup ? 0 : Math.min(
      Math.max(selectedEntry.offset - (showScrollFades ? SCROLL_CUE_HEIGHT : 0), 0),
      Math.max(listContentHeight - viewportHeight, 0),
    );

    const frame = requestAnimationFrame(() => {
      didInitialScrollRef.current = true;
      listRef.current?.scrollToOffset({
        animated: false,
        offset,
      });
      setShowTopScrollCue(
        listScrollable && offset > SCROLL_END_THRESHOLD,
      );
      setShowBottomScrollCue(
        listScrollable &&
          offset + viewportHeight < listContentHeight - SCROLL_END_THRESHOLD,
      );
    });

    return () => cancelAnimationFrame(frame);
  }, [
    frozenSubWallets,
    itemStride,
    listEntries,
    listContentHeight,
    listViewportHeight,
    listScrollable,
    pins,
    selectedSubWalletId,
    showScrollFades,
    viewportHeight,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !listScrollable || filteredItems.length === 0) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      listRef.current?.flashScrollIndicators?.();
    }, 260);

    return () => clearTimeout(timeout);
  }, [filteredItems.length, listScrollable, normalizedQuery, visible]);

  const scrollToTop = useCallback(() => {
    listRef.current?.scrollToOffset({animated: false, offset: 0});
  }, []);

  const handleQueryChange = useCallback(
    value => {
      setQuery(value);
      scrollToTop();
    },
    [scrollToTop],
  );

  const handleTypeFilter = useCallback(
    filter => {
      setTypeFilter(filter);
      scrollToTop();
    },
    [scrollToTop],
  );

  const handleChainFilter = useCallback(
    filter => {
      setChainFilter(filter);
      scrollToTop();
    },
    [scrollToTop],
  );

  const handleSelect = useCallback(
    wallet => {
      Keyboard.dismiss();
      onSelect(wallet);
    },
    [onSelect],
  );

  const handleTogglePin = useCallback(cardId => {
    const {result} = toggleCardStackPin({
      preferences: stackPreferences,
      cards: subWallets,
      selectedId: selectedSubWalletId,
      cardId,
      compact,
    });
    if (result === 'limit') {
      setShowPinLimit(true);
      scrollToTop();
      return;
    }
    if (result === 'unavailable') return;
    if (result === 'unpinned') {
      setShowPinLimit(pins.length > pinLimit && pins.length - 1 >= pinLimit);
    }
    dispatch(toggleCoinCardPin(chainTicker, cardId, compact));
  }, [chainTicker, compact, dispatch, pinLimit, pins.length, scrollToTop, selectedSubWalletId, stackPreferences, subWallets]);

  const handleListScroll = useCallback(event => {
    const {contentOffset, contentSize, layoutMeasurement} = event.nativeEvent;
    const isAtTop = contentOffset.y <= SCROLL_END_THRESHOLD;
    const isAtEnd =
      contentOffset.y + layoutMeasurement.height >=
      contentSize.height - SCROLL_END_THRESHOLD;

    setShowTopScrollCue(!isAtTop);
    setShowBottomScrollCue(!isAtEnd);
  }, []);

  const handleClosed = useCallback(() => {
    setFrozenSubWallets([]);
    setQuery('');
    setTypeFilter('all');
    setChainFilter(ALL_CHAINS);
    setShowBottomScrollCue(false);
    setShowTopScrollCue(false);
    setShowPinLimit(false);
    setListViewportHeight(null);

    if (typeof onClosed === 'function') onClosed();
  }, [onClosed]);

  const renderFilter = useCallback(
    (filter, selected, onPress) => (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityState={{selected}}
        activeOpacity={0.74}
        key={filter.id}
        onPress={() => onPress(filter.id)}
        style={[
          styles.filterPill,
          selected && styles.filterPillSelected,
        ]}>
        <Text
          style={[
            styles.filterLabel,
            selected && styles.filterLabelSelected,
          ]}>
          {filter.label}
        </Text>
      </TouchableOpacity>
    ),
    [styles],
  );

  const renderItem = useCallback(
    ({item: entry}) => {
      if (entry.kind === 'group') {
        return (
          <View style={[styles.groupHeader, {height: entry.length}]}>
            <Text accessibilityRole="header" style={styles.groupTitle}>
              {entry.title}
            </Text>
          </View>
        );
      }
      if (entry.kind === 'notice') {
        return (
          <View
            onLayout={event => setNoticeHeight(event.nativeEvent.layout.height)}
            style={styles.pinNotice}>
            <Text accessibilityLiveRegion="polite" style={styles.pinNoticeText}>
              {`You can pin ${pinLimit} ${pinLimit === 1 ? 'card' : 'cards'}. Unpin a card first.`}
            </Text>
          </View>
        );
      }
      const {item} = entry;
      const current = item.wallet.id === selectedSubWalletId;
      const pinned = pins.includes(item.wallet.id);
      const pinName = item.verusId
        ? item.identifier
        : item.wallet.name || item.type;
      const fullIdentifier =
        item.identifier === '-' ? item.displayIdentifier : item.identifier;
      const accessibilityLabel = [
        fullIdentifier,
        item.type,
        showNetwork ? item.networkLabel : null,
        item.balanceAccessibilityLabel,
        current ? 'Current address' : null,
      ]
        .filter(Boolean)
        .join('. ');

      return (
        <View
          style={[
            styles.cardRow,
            {height: rowHeight, marginBottom: ROW_GAP},
            current && styles.cardRowCurrent,
          ]}>
          <TouchableOpacity
            accessibilityHint="Selects this address and closes the sheet."
            accessibilityLabel={`${accessibilityLabel}.`}
            accessibilityRole="button"
            accessibilityState={{selected: current}}
            activeOpacity={0.74}
            onPress={() => handleSelect(item.wallet)}
            style={styles.rowSelection}>
            <View style={[styles.swatch, theme.isDark && styles.swatchDark]}>
              <CardMaterial
                colors={getCardColors(item.wallet, identitySlots)}
                radius={5}
              />
            </View>
            <View style={styles.identifierColumn}>
              <Text
                ellipsizeMode="middle"
                numberOfLines={1}
                style={[
                  styles.identifier,
                  !item.verusId && styles.addressIdentifier,
                ]}>
                {item.displayIdentifier}
              </Text>
              {showNetwork ? (
                <Text numberOfLines={1} style={styles.metadata}>
                  {item.networkLabel || displayTicker}
                </Text>
              ) : null}
            </View>
            <View style={styles.balanceColumn}>
              <PrivacyBlurredText
                adjustsFontSizeToFit
                blurRadius={5}
                color={theme.colors.textPrimary}
                containerStyle={styles.balanceFrame}
                hidden={!showBalance && item.hasBalanceValue}
                minimumFontScale={0.72}
                numberOfLines={1}
                style={styles.balance}>
                {item.amountText}
              </PrivacyBlurredText>
              <Text numberOfLines={1} style={styles.balanceTicker}>
                {displayTicker}
              </Text>
            </View>
            {item.wallet.id === mainId ? (
              <View style={styles.pinSlot} />
            ) : null}
          </TouchableOpacity>
          {item.wallet.id !== mainId ? (
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={
                pinned ? `Unpin ${pinName}` : `Pin ${pinName} to the stack`
              }
              accessibilityState={{selected: pinned}}
              activeOpacity={0.72}
              onPress={() => handleTogglePin(item.wallet.id)}
              style={styles.pinSlot}>
              <Pin
                size={20}
                strokeWidth={2}
                color={pinned ? theme.colors.link : theme.colors.textSecondary}
                fill={pinned ? theme.colors.link : 'none'}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      );
    },
    [
      displayTicker,
      handleSelect,
      handleTogglePin,
      identitySlots,
      mainId,
      rowHeight,
      pinLimit,
      pins,
      selectedSubWalletId,
      showBalance,
      showNetwork,
      styles,
      theme.colors.textPrimary,
      theme.colors.link,
      theme.colors.textSecondary,
      theme.isDark,
    ],
  );

  return (
    <BottomSheetModal
      avoidKeyboard
      maxHeight={sheetGrows ? sheetMaxHeight : '76%'}
      onClose={onClose}
      onClosed={handleClosed}
      visible={visible}>
      <View
        accessibilityViewIsModal
        onAccessibilityEscape={onClose}
        style={styles.body}>
        <Text accessibilityRole="header" style={styles.title}>
          Choose an address
        </Text>

        {searchable ? (
          <>
            <AppSearchField
              accessibilityLabel="Search addresses"
              onChangeText={handleQueryChange}
              onClear={() => handleQueryChange('')}
              placeholder="Search addresses"
              resultCount={filteredItems.length}
              style={styles.searchFieldSpacing}
              themeMode={theme.mode}
              value={query}
            />

            <ScrollView
              horizontal
              bounces={false}
              contentContainerStyle={styles.filterContent}
              showsHorizontalScrollIndicator={false}
              style={styles.filterRow}>
              {TYPE_FILTERS.map(filter =>
                renderFilter(
                  filter,
                  typeFilter === filter.id,
                  handleTypeFilter,
                ),
              )}
            </ScrollView>
          </>
        ) : null}

        {showChainFilters ? (
          <ScrollView
            horizontal
            bounces={false}
            contentContainerStyle={styles.filterContent}
            showsHorizontalScrollIndicator={false}
            style={styles.chainFilterRow}>
            {[
              {id: ALL_CHAINS, label: 'All chains'},
              ...chainOptions.map(chain => ({id: chain, label: chain})),
            ].map(filter =>
              renderFilter(
                filter,
                chainFilter === filter.id,
                handleChainFilter,
              ),
            )}
          </ScrollView>
        ) : null}

        {filteredItems.length > 0 ? (
          <View
            onLayout={event => setListViewportHeight(event.nativeEvent.layout.height)}
            style={[styles.listFrame, {height: listHeight}]}>
            <FlatList
              ref={listRef}
              alwaysBounceVertical={false}
              bounces={false}
              contentContainerStyle={styles.listContent}
              data={listEntries}
              getItemLayout={(_, index) => ({
                index,
                length: listEntries[index].length,
                offset: listEntries[index].offset,
              })}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              keyExtractor={entry => entry.key}
              onScroll={handleListScroll}
              renderItem={renderItem}
              scrollEnabled={listScrollable}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={listScrollable}
              style={styles.list}
            />
            {showTopScrollCue && showScrollFades ? (
              <CardPickerScrollCue
                position="top"
                styles={styles}
                theme={theme}
              />
            ) : null}
            {showBottomScrollCue && showScrollFades ? (
              <CardPickerScrollCue
                position="bottom"
                styles={styles}
                theme={theme}
              />
            ) : null}
          </View>
        ) : (
          <View style={[styles.emptyState, {height: listHeight}]}>
            <Text style={styles.emptyText}>
              No addresses match your search and filters.
            </Text>
          </View>
        )}
      </View>
    </BottomSheetModal>
  );
};

const CardPickerScrollCue = ({position, styles, theme}) => {
  const top = position === 'top';
  const gradientId = `coinCardPicker${top ? 'Top' : 'Bottom'}ScrollCue`;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.scrollCue,
        top ? styles.scrollCueTop : styles.scrollCueBottom,
      ]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <Stop
              offset="0"
              stopColor={theme.colors.sheet}
              stopOpacity={top ? 1 : 0}
            />
            <Stop
              offset={top ? '0.28' : '0.72'}
              stopColor={theme.colors.sheet}
              stopOpacity="0.92"
            />
            <Stop
              offset="1"
              stopColor={theme.colors.sheet}
              stopOpacity={top ? 0 : 1}
            />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${gradientId})`} />
      </Svg>
      {!top ? (
        <View style={styles.scrollCueChevron}>
          <MaterialCommunityIcons
            color={theme.colors.textSubtle}
            name="chevron-down"
            size={15}
          />
        </View>
      ) : null}
    </View>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    body: {
      flexShrink: 1,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 18,
    },
    title: {
      color: theme.colors.textPrimary,
      fontSize: 20,
      lineHeight: 26,
      ...fontStyle('semiBold'),
    },
    searchFieldSpacing: {
      marginTop: 14,
    },
    filterRow: {
      marginTop: 12,
      flexGrow: 0,
      flexShrink: 0,
    },
    chainFilterRow: {
      marginTop: 8,
      flexGrow: 0,
      flexShrink: 0,
    },
    filterContent: {
      paddingRight: 2,
      gap: 8,
    },
    filterPill: {
      minHeight: 36,
      paddingHorizontal: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
    },
    filterPillSelected: {
      backgroundColor: theme.colors.primary,
    },
    filterLabel: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      ...fontStyle('semiBold'),
    },
    filterLabelSelected: {
      color: theme.colors.onPrimary,
    },
    listFrame: {
      flexShrink: 1,
      marginTop: 12,
      width: '100%',
      overflow: 'hidden',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 2,
    },
    scrollCue: {
      position: 'absolute',
      left: 0,
      right: 0,
      height: SCROLL_CUE_HEIGHT,
    },
    scrollCueTop: {
      top: 0,
    },
    scrollCueBottom: {
      bottom: 0,
    },
    scrollCueChevron: {
      position: 'absolute',
      bottom: 2,
      alignSelf: 'center',
      width: 20,
      height: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceMuted,
    },
    rowSelection: {
      flex: 1,
      minWidth: 0,
      height: '100%',
      paddingLeft: 14,
      flexDirection: 'row',
      alignItems: 'center',
    },
    pinSlot: {
      width: 44,
      height: 44,
      marginRight: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    groupHeader: {justifyContent: 'flex-end', paddingBottom: 8},
    groupTitle: {
      ...theme.typography.labelCaps,
      color: theme.colors.textSecondary,
    },
    pinNotice: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      marginBottom: ROW_GAP,
      backgroundColor: theme.colors.warningBackground,
    },
    pinNoticeText: {
      ...theme.typography.caption,
      color: theme.colors.warningText,
    },
    cardRowCurrent: {
      backgroundColor: theme.colors.successBackground,
    },
    swatch: {width: 28, height: 19, borderRadius: 5, marginRight: 10, overflow: 'hidden'},
    swatchDark: {borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)'},
    identifierColumn: {
      flex: 1,
      minWidth: 0,
      paddingRight: 12,
    },
    identifier: {
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      ...fontStyle('semiBold'),
    },
    addressIdentifier: {
      fontFamily: MONOSPACE_FONT,
    },
    metadata: {
      marginTop: 3,
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 16,
      ...fontStyle('regular'),
    },
    balanceColumn: {
      maxWidth: 108,
      flexShrink: 0,
      alignItems: 'flex-end',
    },
    balanceFrame: {
      alignSelf: 'stretch',
    },
    balance: {
      maxWidth: '100%',
      color: theme.colors.textPrimary,
      fontSize: 15,
      lineHeight: 20,
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    balanceTicker: {
      marginTop: 3,
      color: theme.colors.textSubtle,
      fontSize: 10,
      lineHeight: 13,
      textAlign: 'right',
      ...fontStyle('semiBold'),
    },
    emptyState: {
      flexShrink: 1,
      marginTop: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      color: theme.colors.textSubtle,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
      ...fontStyle('regular'),
    },
  });

export default CoinCardPickerSheet;
