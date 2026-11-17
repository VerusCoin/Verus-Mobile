import React, {useEffect, useMemo, useState} from 'react';
import {Keyboard, Platform, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import AppSearchField, {
  APP_SEARCH_MIN_ITEMS,
} from '../../../components/AppSearchField';
import SelectionSheet, {
  SelectionAction,
  SelectionRow,
} from '../../../components/SelectionSheet';
import useSheetDismissal from '../../../components/useSheetDismissal';
import SkeletonLoader, {SkeletonRow} from '../../../components/SkeletonLoader';
import {createSelectionSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  addressBookRecordMatchesContext,
  loadAddressBook,
} from '../../../utils/addressBook/addressBook';

// `matchingCount` is the number of saved addresses that fit the send. The
// recipient step knows it before the sheet opens, so the search field does not
// pop in when the sheet finishes loading.
const AddressBookSheet = ({
  context,
  matchingCount,
  onClose,
  onRecordsLoaded,
  onSelect,
  visible,
}) => {
  const navigation = useNavigation();
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const androidKeyboard = Platform.OS === 'android' && keyboardVisible;

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;
    const show = Keyboard.addListener('keyboardDidShow', () =>
      setKeyboardVisible(true),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () =>
      setKeyboardVisible(false),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // The search field shows only from 7 saved addresses. The count ignores the
  // search text, so the field does not disappear while the user types. Without
  // the field, the list shows every address and the sheet fits its content.
  const searchable = matchingCount >= APP_SEARCH_MIN_ITEMS;

  useEffect(() => {
    if (!searchable) setQuery('');
  }, [searchable]);

  const dismissal = useSheetDismissal({
    visible,
    onClose,
    onClosed: () => setQuery(''),
  });

  useEffect(() => {
    if (!visible) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    loadAddressBook()
      .then(result => {
        if (active) {
          setRecords(result);
          onRecordsLoaded?.(result);
        }
      })
      .catch(() => {
        if (active)
          setError('Could not load saved addresses. Reopen to try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [onRecordsLoaded, visible]);

  const normalizedQuery = searchable ? query.trim().toLowerCase() : '';
  const filtered = useMemo(() => {
    return records.filter(record => {
      if (!addressBookRecordMatchesContext(record, context)) return false;
      return (
        !normalizedQuery ||
        [record.label, record.address, record.verusId]
          .filter(Boolean)
          .some(value => value.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [context, normalizedQuery, records]);

  const manageAddresses = () =>
    dismissal.dismiss(() => {
      navigation.getParent?.()?.navigate('Home', {
        screen: 'ServicesHome',
        params: {screen: 'AddressBook'},
      });
    });

  const manageAction = (
    <SelectionAction title="Manage addresses" onPress={manageAddresses} />
  );

  return (
    <SelectionSheet
      title="Saved addresses"
      visible={visible}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}
      // Android native modals already resize for the software keyboard.
      avoidKeyboard={Platform.OS === 'ios'}
      fillHeight={searchable}
      maxHeight={androidKeyboard ? '90%' : '76%'}
      header={
        searchable ? (
          <AppSearchField
            accessibilityLabel="Search saved addresses"
            onChangeText={setQuery}
            placeholder="Search saved addresses"
            resultCount={filtered.length}
            themeMode={theme.mode}
            value={query}
          />
        ) : undefined
      }
      listProps={
        !loading && !error && filtered.length
          ? {
              data: filtered,
              keyExtractor: item => item.id,
              ListFooterComponent: androidKeyboard ? manageAction : null,
              renderItem: ({item}) => (
                <SelectionRow
                  title={item.label}
                  subtitle={item.verusId || item.address}
                  subtitleMonospace={!item.verusId}
                  onPress={() => dismissal.dismiss(() => onSelect(item))}
                />
              ),
            }
          : undefined
      }
      footer={androidKeyboard ? null : manageAction}>
      {loading ? (
        <SkeletonLoader accessibilityLabel="Loading Address Book">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </SkeletonLoader>
      ) : error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.empty, {color: theme.colors.danger}]}>
          {error}
        </Text>
      ) : !filtered.length ? (
        <View>
          <Text style={styles.empty}>
            {normalizedQuery
              ? 'No matching addresses'
              : 'No saved addresses for this network'}
          </Text>
        </View>
      ) : null}
      {androidKeyboard && (loading || error || !filtered.length)
        ? manageAction
        : null}
    </SelectionSheet>
  );
};

export default AddressBookSheet;
