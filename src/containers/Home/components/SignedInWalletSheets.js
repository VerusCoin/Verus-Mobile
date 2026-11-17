import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {Keyboard, Platform, Text} from 'react-native';
import AppSearchField from '../../../components/AppSearchField';
import SelectionSheet, {SelectionRow} from '../../../components/SelectionSheet';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {createSelectionSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  CURRENCY_NAMES,
  SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES,
} from '../../../utils/constants/currencies';

export const DisplayCurrencySheet = ({
  displayCurrency,
  onClose,
  onSelect,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSelectionSheetStyles(theme), [theme]);
  const [query, setQuery] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const listRef = useRef(null);
  const scrollFrame = useRef(null);
  const androidKeyboard = Platform.OS === 'android' && keyboardVisible;
  const dismissal = useSheetDismissal({
    visible,
    onClose,
    onClosed: () => setQuery(''),
  });

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

  useEffect(() => () => cancelAnimationFrame(scrollFrame.current), [query, visible]);

  const currencies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES;

    return SUPPORTED_UNIVERSAL_DISPLAY_CURRENCIES.filter(currency => {
      const currencyName = CURRENCY_NAMES[currency] || '';
      return (
        currency.toLowerCase().includes(normalizedQuery) ||
        currencyName.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [query]);

  const selectCurrency = useCallback(
    currency => dismissal.dismiss(() => onSelect(currency)),
    [dismissal.dismiss, onSelect],
  );

  return (
    <SelectionSheet
      title="Currencies"
      visible={visible}
      showClose
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}
      // Android native modals resize; iOS needs avoidance around the sheet.
      avoidKeyboard={Platform.OS === 'ios'}
      fillHeight
      maxHeight={androidKeyboard ? '90%' : '76%'}
      scrollViewProps={{
        ref: listRef,
        onContentSizeChange: () => {
          if (!visible || query.trim()) return;
          const index = currencies.indexOf(displayCurrency);
          if (index < 0) return;
          cancelAnimationFrame(scrollFrame.current);
          scrollFrame.current = requestAnimationFrame(() => {
            listRef.current?.scrollToIndex({index, animated: false, viewPosition: 0.5});
          });
        },
      }}
      header={
        <AppSearchField
          accessibilityLabel="Search currencies"
          onChangeText={setQuery}
          placeholder="Search currencies"
          resultCount={currencies.length}
          themeMode={theme.mode}
          value={query}
        />
      }
      listProps={
        currencies.length ? {
          data: currencies,
          // Measure all 33 rows before scrolling, including wrapped/scaled names.
          initialNumToRender: currencies.length,
          keyExtractor: currency => currency,
          // Rows can still be unmeasured on the first layout (seen on small
          // Android). Without this handler, scrollToIndex throws.
          onScrollToIndexFailed: ({index, averageItemLength}) => {
            listRef.current?.scrollToOffset({
              offset: index * averageItemLength,
              animated: false,
            });
          },
          renderItem: ({item}) => (
            <SelectionRow
              title={item}
              subtitle={CURRENCY_NAMES[item]}
              selected={item === displayCurrency}
              onPress={() => selectCurrency(item)}
            />
          ),
        } : undefined
      }>
      {!currencies.length ? (
        <Text style={styles.empty}>No matching currencies</Text>
      ) : null}
    </SelectionSheet>
  );
};
