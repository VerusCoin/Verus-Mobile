import React, {useEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, Text} from 'react-native';
import AppButton from '../../../../components/AppButton';
import AppSearchField, {APP_SEARCH_MIN_ITEMS} from '../../../../components/AppSearchField';
import SelectionSheet, {SelectionRow} from '../../../../components/SelectionSheet';
import useSheetDismissal from '../../../../components/useSheetDismissal';
import {useOnboardingTheme} from '../../../../theme/onboarding';

// Currency choices apply after dismissal. Identity choices remain a draft until
// the bottom action applies them; outside tap and Back leave the gift intact.
const GiftCardContentsPickerSheet = ({
  identities = false,
  onApply,
  onClose,
  onClosed,
  onSelect,
  options,
  selectedKeys,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const wasVisible = useRef(false);
  const [query, setQuery] = useState('');
  const [draftKeys, setDraftKeys] = useState([]);
  const dismissal = useSheetDismissal({
    visible,
    onClose,
    onClosed: () => {
      setQuery('');
      onClosed?.();
    },
  });

  useEffect(() => {
    if (visible && !wasVisible.current) {
      setDraftKeys(selectedKeys);
      setQuery('');
    }
    wasVisible.current = visible;
  }, [selectedKeys, visible]);

  const searchable = options.length >= APP_SEARCH_MIN_ITEMS;
  useEffect(() => {
    if (!searchable) setQuery('');
  }, [searchable]);
  const normalizedQuery = searchable ? query.trim().toLocaleLowerCase() : '';
  const filteredOptions = options.filter(option => {
    const searchText = identities
      ? option.fullyQualifiedName || option.identityAddress
      : option.searchText;
    return !normalizedQuery || searchText.toLocaleLowerCase().includes(normalizedQuery);
  });
  const showSystems = useMemo(
    () => new Set(options.map(option => option.coinObj?.system_id)).size > 1,
    [options],
  );
  const selected = new Set(identities ? draftKeys : selectedKeys);
  // Count only VerusIDs that are new to the gift. Removals, or a mix of
  // additions and removals, apply through the neutral "Done".
  const addedCount = draftKeys.filter(key => !selectedKeys.includes(key)).length;
  const removedAny = selectedKeys.some(key => !draftKeys.includes(key));
  const applyLabel = addedCount === 0 || removedAny
    ? 'Done'
    : `Add ${addedCount} ${addedCount === 1 ? 'VerusID' : 'VerusIDs'}`;

  return (
    <SelectionSheet
      avoidKeyboard
      footer={identities ? (
        <AppButton
          onPress={() => dismissal.dismiss(() => onApply(draftKeys))}
          style={styles.action}>
          {applyLabel}
        </AppButton>
      ) : null}
      header={searchable ? (
        <AppSearchField
          accessibilityLabel={identities ? 'Search VerusIDs' : 'Search currencies'}
          onChangeText={setQuery}
          onClear={() => setQuery('')}
          placeholder={identities ? 'Search VerusIDs' : 'Search currencies'}
          resultCount={filteredOptions.length}
          value={query}
        />
      ) : null}
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}
      title={identities ? 'Choose VerusIDs' : 'Choose a currency'}
      visible={visible}>
      {filteredOptions.map(option => (
        <SelectionRow
          accessibilityRole={identities ? 'checkbox' : 'button'}
          key={option.key}
          onPress={() => {
            if (identities) {
              setDraftKeys(current => current.includes(option.key)
                ? current.filter(key => key !== option.key)
                : [...current, option.key]);
            } else {
              dismissal.dismiss(() => onSelect(option.key));
            }
          }}
          selected={selected.has(option.key)}
          showChevron={!identities}
          subtitle={!identities && showSystems && option.systemName !== option.name
            ? option.systemName : undefined}
          title={identities ? option.fullyQualifiedName || option.identityAddress : option.ticker}
          titleNumberOfLines={1}
          value={identities ? undefined : option.balanceText}
        />
      ))}
      {filteredOptions.length === 0 ? (
        <Text style={[theme.typography.bodySm, styles.empty, {color: theme.colors.textSecondary}]}>
          {identities ? 'No VerusIDs match your search.' : 'No currencies match your search.'}
        </Text>
      ) : null}
    </SelectionSheet>
  );
};

const styles = StyleSheet.create({
  action: {marginTop: 8},
  empty: {paddingVertical: 20},
});

export default GiftCardContentsPickerSheet;
