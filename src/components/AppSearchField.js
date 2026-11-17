import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import {AccessibilityInfo, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {appSearchStyles as styles} from '../styles';
import {
  resolveOnboardingTheme,
  useOnboardingTheme,
} from '../theme/onboarding';
import AppTextInput from './AppTextInput';

// The asset and currency lists show a search field only from this many items.
// Up to 6 rows fit on the smallest phones without scrolling.
export const APP_SEARCH_MIN_ITEMS = 7;

const AppSearchField = forwardRef(function AppSearchField(
  {
    accessibilityLabel,
    disabled = false,
    onBlur,
    onChangeText,
    onClear,
    onFocus,
    placeholder,
    resultCount,
    style,
    testID,
    themeMode,
    value,
  },
  forwardedRef,
) {
  const inputRef = useRef(null);
  const [focused, setFocused] = useState(false);
  const onboardingTheme = useOnboardingTheme();
  const theme = themeMode
    ? resolveOnboardingTheme(themeMode)
    : onboardingTheme;
  const hasValue = typeof value === 'string' && value.length > 0;

  useImperativeHandle(forwardedRef, () => inputRef.current);

  useEffect(() => {
    if (
      disabled ||
      !focused ||
      !hasValue ||
      !Number.isFinite(resultCount)
    ) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      const message =
        resultCount === 0
          ? 'No results'
          : `${resultCount} ${resultCount === 1 ? 'result' : 'results'}`;

      if (
        typeof AccessibilityInfo.announceForAccessibilityWithOptions ===
        'function'
      ) {
        AccessibilityInfo.announceForAccessibilityWithOptions(message, {
          queue: true,
        });
      } else {
        AccessibilityInfo.announceForAccessibility(message);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [disabled, focused, hasValue, resultCount, value]);

  const handleBlur = event => {
    setFocused(false);
    if (typeof onBlur === 'function') onBlur(event);
  };

  const handleClear = () => {
    if (typeof onClear === 'function') {
      onClear();
    } else {
      onChangeText('');
    }

    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleFocus = event => {
    setFocused(true);
    if (typeof onFocus === 'function') onFocus(event);
  };

  return (
    <View style={[styles.fieldContainer, style]}>
      <AppTextInput
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{disabled}}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!disabled}
        inputShellStyle={
          disabled
            ? {
                backgroundColor: theme.colors.disabledButton,
                borderColor: theme.colors.borderStrong,
              }
            : undefined
        }
        inputStyle={{
          color: disabled ? theme.colors.disabledText : theme.colors.textPrimary,
        }}
        leftAccessory={
          <MaterialCommunityIcons
            accessible={false}
            color={
              disabled ? theme.colors.disabledText : theme.colors.inputPlaceholder
            }
            importantForAccessibility="no"
            name="magnify"
            size={20}
          />
        }
        onBlur={handleBlur}
        onChangeText={onChangeText}
        onFocus={handleFocus}
        onRightPress={hasValue && !disabled ? handleClear : undefined}
        placeholder={placeholder}
        placeholderTextColor={
          disabled ? theme.colors.disabledText : theme.colors.inputPlaceholder
        }
        returnKeyType="search"
        rightAccessibilityLabel={
          hasValue && !disabled ? 'Clear search' : undefined
        }
        rightIcon={hasValue && !disabled ? 'close' : undefined}
        rightIconColor={theme.colors.inputPlaceholder}
        size="compact"
        testID={testID}
        themeMode={themeMode}
        value={value}
        ref={inputRef}
      />
    </View>
  );
});

export default AppSearchField;
