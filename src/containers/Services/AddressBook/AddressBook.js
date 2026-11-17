import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ScrollView, StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {BookUser, CircleAlert} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useSelector} from 'react-redux';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import CopyAction from '../../../components/CopyAction';
import AppSearchField, {
  APP_SEARCH_MIN_ITEMS,
} from '../../../components/AppSearchField';
import EmptyState from '../../../components/EmptyState';
import ServiceManagerHeader from '../../../components/ServiceManagerHeader';
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonText,
} from '../../../components/SkeletonLoader';
import signedInCopy from '../../../copy/signedIn';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {RenderPlainCoinLogo} from '../../../utils/CoinData/Graphics';
import {
  loadAddressBook,
  saveAddressBook,
} from '../../../utils/addressBook/addressBook';
import AddressBookEditSheet from './AddressBookEditSheet';

const EMPTY_RECORD = {
  id: '',
  label: '',
  address: '',
  asset: '',
  network: '',
  verusId: '',
};

const FILTERS = [
  {id: 'all', label: 'All'},
  {id: 'verus', label: 'Verus'},
  {id: 'ethereum', label: 'Ethereum'},
  {id: 'bitcoin', label: 'Bitcoin'},
];

const ICON_HIT_SLOP = {top: 10, right: 10, bottom: 10, left: 10};

const truncateAddress = address => {
  if (!address || address.length <= 19) return address;
  return `${address.slice(0, 8)}...${address.slice(-8)}`;
};

const getRecordGroup = record => {
  const address = record.address?.toLowerCase() || '';
  const metadata = [record.asset, record.network, record.verusId]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    address.startsWith('0x') ||
    metadata.includes('ethereum') ||
    /(^|\s)eth($|\s)/.test(metadata)
  ) {
    return 'ethereum';
  }

  if (
    address.startsWith('bc1') ||
    address.startsWith('1') ||
    address.startsWith('3') ||
    metadata.includes('bitcoin') ||
    /(^|\s)btc($|\s)/.test(metadata)
  ) {
    return 'bitcoin';
  }

  return 'verus';
};

const getRecordTicker = record => {
  const address = record.address?.toLowerCase() || '';
  if (address.startsWith('0x')) return 'ETH';
  if (
    address.startsWith('bc1') ||
    address.startsWith('1') ||
    address.startsWith('3')
  ) {
    return 'BTC';
  }
  return (record.asset || record.network || 'VRSC').toUpperCase();
};

const AddressBook = ({navigation}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const accountHash = useSelector(
    state => state.authentication.activeAccount.accountHash,
  );
  const [records, setRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [showHeaderDivider, setShowHeaderDivider] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecords(await loadAddressBook());
    } catch (e) {
      console.warn(e);
      setError(e.message || 'Address book unavailable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // The search and the network filter show only from 7 saved addresses. The
  // count ignores both, so they do not disappear while the user uses them.
  // Without them, the list shows every address, and when they hide, the search
  // text and the filter go back to their defaults.
  const showSearchAndFilters = records.length >= APP_SEARCH_MIN_ITEMS;
  const appliedSearch = showSearchAndFilters ? search : '';
  const appliedFilter = showSearchAndFilters ? activeFilter : 'all';

  useEffect(() => {
    if (!showSearchAndFilters) {
      setSearch('');
      setActiveFilter('all');
    }
  }, [showSearchAndFilters]);

  const filteredRecords = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase();
    return [...records]
      .filter(
        record =>
          appliedFilter === 'all' || getRecordGroup(record) === appliedFilter,
      )
      .filter(record => {
        if (!query) return true;
        return [
          record.label,
          record.address,
          record.asset,
          record.network,
          record.verusId,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [appliedFilter, appliedSearch, records]);

  const openEditor = useCallback(record => {
    setEditing({...record});
    setSheetVisible(true);
  }, []);

  const closeEditor = useCallback(() => {
    setSheetVisible(false);
  }, []);

  const handleEditorClosed = useCallback(() => {
    setEditing(null);
  }, []);

  const persist = async nextRecords => {
    setRecords(await saveAddressBook(nextRecords, accountHash));
    closeEditor();
  };

  const saveEditing = async nextEditing => {
    const record = {
      ...nextEditing,
      label: nextEditing.label.trim(),
      address: nextEditing.address.trim(),
      id:
        nextEditing.id ||
        `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    };
    const nextRecords = records.some(item => item.id === record.id)
      ? records.map(item => (item.id === record.id ? record : item))
      : [...records, record];
    try {
      await persist(nextRecords);
    } catch (saveError) {
      // The edit sheet stays open and shows the error.
      console.warn(saveError);
      throw saveError;
    }
  };

  const removeRecord = async record => {
    const confirmed = await createAlert(
      'Delete this address?',
      `This removes "${record.label}" from the address book.`,
      [
        {text: 'Delete', style: 'destructive', onPress: () => resolveAlert(true)},
        {text: 'Not now', style: 'cancel', onPress: () => resolveAlert(false)},
      ],
    );

    if (confirmed !== true) return;

    try {
      await persist(records.filter(item => item.id !== record.id));
    } catch (deleteError) {
      console.warn(deleteError);
      createAlert(
        'Address not deleted',
        'The wallet could not save the address book. Try again.',
      );
    }
  };

  const hasRecords = records.length > 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <ServiceManagerHeader
        addAccessibilityLabel="Add address"
        onAdd={() => openEditor(EMPTY_RECORD)}
        onBack={() => navigation.goBack()}
        showDivider={showHeaderDivider}
        title="Address book">
        {showSearchAndFilters && (
          <>
            <View style={styles.filterContainer}>
              {FILTERS.map(filter => {
                const selected = activeFilter === filter.id;
                return (
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{selected}}
                    key={filter.id}
                    onPress={() => setActiveFilter(filter.id)}
                    style={[
                      styles.filterPill,
                      selected && styles.filterPillActive,
                    ]}>
                    <Text
                      style={[
                        styles.filterLabel,
                        selected && styles.filterLabelActive,
                      ]}>
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <AppSearchField
              accessibilityLabel="Search addresses"
              onChangeText={setSearch}
              placeholder="Search addresses"
              resultCount={filteredRecords.length}
              value={search}
            />
          </>
        )}
      </ServiceManagerHeader>

      {loading ? (
        <SkeletonLoader
          accessibilityLabel="Loading Address Book"
          style={styles.skeletonLoader}>
          {[0, 1, 2].map(index => (
            <View key={index} style={styles.skeletonRow}>
              <SkeletonBlock height={28} radius={14} width={28} />
              <View style={styles.skeletonText}>
                <SkeletonText height={16} width="42%" />
                <SkeletonText
                  height={14}
                  style={styles.skeletonAddress}
                  width="72%"
                />
              </View>
            </View>
          ))}
        </SkeletonLoader>
      ) : error ? (
        <EmptyState
          actionLabel={signedInCopy.actions.retry}
          icon={CircleAlert}
          onAction={refresh}
          title="Unable to load addresses"
        />
      ) : !hasRecords ? (
        <EmptyState
          actionLabel="Add your first address"
          icon={BookUser}
          onAction={() => openEditor(EMPTY_RECORD)}
          title="No saved addresses"
        />
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + 80},
          ]}
          keyboardShouldPersistTaps="handled"
          onScroll={event =>
            setShowHeaderDivider(event.nativeEvent.contentOffset.y > 1)
          }
          scrollEventThrottle={16}>
          {filteredRecords.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                {appliedSearch.trim()
                  ? 'No addresses match your search'
                  : 'No addresses in this category'}
              </Text>
            </View>
          ) : (
            filteredRecords.map(record => (
              <View key={record.id} style={styles.addressRow}>
                <View style={styles.coinIcon}>
                  {RenderPlainCoinLogo(getRecordTicker(record), {}, 28, 28)}
                </View>
                <View style={styles.addressContent}>
                  <Text numberOfLines={1} style={styles.addressLabel}>
                    {record.label}
                  </Text>
                  <Text numberOfLines={1} style={styles.addressText}>
                    {truncateAddress(record.address)}
                  </Text>
                </View>
                <View style={styles.rowActions}>
                  <CopyAction
                    accessibilityLabel={`Copy ${record.label}`}
                    iconSize={18}
                    style={styles.actionButton}
                    value={record.address}
                  />
                  <TouchableOpacity
                    accessibilityLabel={`Edit ${record.label}`}
                    accessibilityRole="button"
                    hitSlop={ICON_HIT_SLOP}
                    onPress={() => openEditor(record)}
                    style={styles.actionButton}>
                    <MaterialCommunityIcons
                      color={theme.colors.textSecondary}
                      name="pencil-outline"
                      size={18}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    accessibilityLabel={`Remove ${record.label}`}
                    accessibilityRole="button"
                    hitSlop={ICON_HIT_SLOP}
                    onPress={() => removeRecord(record)}
                    style={styles.actionButton}>
                    <MaterialCommunityIcons
                      color={theme.colors.textSecondary}
                      name="trash-can-outline"
                      size={18}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
      <AddressBookEditSheet
        editing={editing}
        onClose={closeEditor}
        onClosed={handleEditorClosed}
        onSave={saveEditing}
        visible={sheetVisible && Boolean(editing)}
      />
    </SafeAreaView>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    filterContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 4,
      marginBottom: 16,
    },
    filterPill: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: theme.colors.surfaceMuted,
    },
    filterPillActive: {
      backgroundColor: theme.colors.primary,
    },
    filterLabel: {
      ...fontStyle('semiBold'),
      color: theme.colors.textSecondary,
      fontSize: 14,
      lineHeight: 18,
    },
    filterLabelActive: {
      color: theme.colors.onPrimary,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    addressRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    coinIcon: {
      width: 28,
      height: 28,
      marginRight: 12,
    },
    addressContent: {
      flex: 1,
      minWidth: 0,
    },
    addressLabel: {
      ...fontStyle('semiBold'),
      marginBottom: 2,
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 20,
    },
    addressText: {
      ...fontStyle('regular'),
      color: theme.colors.textSubtle,
      fontSize: 14,
      lineHeight: 18,
    },
    rowActions: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    actionButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 18,
    },
    noResults: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 48,
    },
    noResultsText: {
      ...fontStyle('regular'),
      color: theme.colors.textSecondary,
      fontSize: 15,
      lineHeight: 22,
      textAlign: 'center',
    },
    skeletonLoader: {
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    skeletonRow: {
      minHeight: 76,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
      borderRadius: 12,
      backgroundColor: theme.colors.surfaceMuted,
    },
    skeletonText: {
      flex: 1,
      marginLeft: 12,
    },
    skeletonAddress: {
      marginTop: 8,
    },
  });

export default AddressBook;
