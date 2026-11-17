import React, {forwardRef, useImperativeHandle, useRef, useState} from 'react';
import {Platform, Pressable, StyleSheet, TextInput, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {appTextInputStyles as styles} from '../styles';
import {
  resolveAppTheme,
  useAppTheme,
} from '../theme/app';

const AppTextInput = forwardRef(function AppTextInput(
  {
    autoCapitalize = 'none',
    autoCorrect = false,
    containerStyle,
    errorText,
    endAccessory,
    helperText,
    idleAccessibilityLabel,
    idleContent,
    inputShellStyle,
    inputStyle,
    invalid = false,
    label,
    labelStyle,
    leftAccessory,
    onBlur,
    onChangeText,
    onFocus,
    onRightPress,
    placeholder,
    placeholderTextColor,
    rightAccessibilityLabel,
    rightIcon,
    rightIconColor,
    rightAccessory,
    secureTextEntry = false,
    size = 'default',
    supportingTextStyle,
    themeMode,
    value,
    ...inputProps
  },
  ref,
) {
  const [focused, setFocused] = useState(false);
  const [contentHeight, setContentHeight] = useState(46);
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => inputRef.current);
  const appTheme = useAppTheme();
  const theme = themeMode
    ? resolveAppTheme(themeMode)
    : appTheme;
  const supportingText = errorText || helperText;
  const resolvedPlaceholderTextColor =
    placeholderTextColor || theme.colors.inputPlaceholder;
  const resolvedRightIconColor = rightIconColor || theme.colors.inputPlaceholder;
  const isMultiline = inputProps.multiline === true;
  const isCompact = size === 'compact' && !isMultiline;
  const showIdleContent = !focused && idleContent != null;
  const shellStyle = [
    styles.inputShell,
    isMultiline ? styles.multilineInputShell : styles.singleLineInputShell,
    isCompact && styles.compactInputShell,
    {
      backgroundColor: theme.colors.input,
      borderColor: theme.colors.inputBorder,
    },
    inputShellStyle,
    focused && {borderColor: theme.colors.inputFocusBorder},
    (errorText || invalid) && styles.inputShellError,
    (errorText || invalid) && {borderColor: theme.colors.danger},
  ];
  const {borderColor, borderWidth} = StyleSheet.flatten(shellStyle);

  const handleBlur = event => {
    setFocused(false);
    if (typeof onBlur === 'function') onBlur(event);
  };

  const handleFocus = event => {
    setFocused(true);
    if (typeof onFocus === 'function') onFocus(event);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text
          style={[
            styles.label,
            {color: theme.colors.textSecondary},
            labelStyle,
          ]}>
          {label}
        </Text>
      ) : null}
      <View style={shellStyle}>
        {leftAccessory ? (
          <View
            style={[
              styles.leftAccessory,
              isCompact && styles.compactLeftAccessory,
            ]}>
            {leftAccessory}
          </View>
        ) : null}
        <View style={styles.inputSlot}>
          <TextInput
            {...inputProps}
            accessibilityElementsHidden={showIdleContent}
            importantForAccessibility={
              showIdleContent ? 'no-hide-descendants' : inputProps.importantForAccessibility
            }
            accessibilityLabel={inputProps.accessibilityLabel || label}
            autoCapitalize={autoCapitalize}
            autoCorrect={autoCorrect}
            onBlur={handleBlur}
            onChangeText={onChangeText}
            onFocus={handleFocus}
            onContentSizeChange={event => {
              // Android keeps its native minimum height without this bound.
              // Its content size includes padding; iOS measures text alone.
              if (isMultiline && Platform.OS === 'android') {
                setContentHeight(Math.max(46, Math.ceil(event.nativeEvent.contentSize.height)));
              }
              inputProps.onContentSizeChange?.(event);
            }}
            placeholder={placeholder}
            placeholderTextColor={resolvedPlaceholderTextColor}
            secureTextEntry={secureTextEntry}
            selectionColor={theme.colors.link}
            ref={inputRef}
            scrollEnabled={inputProps.scrollEnabled ?? !isMultiline}
            style={[
              styles.input,
              isMultiline ? styles.multilineInput : styles.singleLineInput,
              isCompact && styles.compactInput,
              theme.typography.inputValue,
              {color: theme.colors.textPrimary},
              isMultiline && Platform.OS === 'android' && {height: contentHeight},
              inputStyle,
              !isMultiline && Platform.OS === 'ios' && styles.iosSingleLineInput,
              showIdleContent && styles.hiddenInput,
            ]}
            value={value}
          />
          {showIdleContent ? (
            <Pressable
              accessibilityLabel={idleAccessibilityLabel}
              accessibilityRole={inputProps.editable === false ? 'text' : 'button'}
              disabled={inputProps.editable === false}
              onPress={() => inputRef.current?.focus()}
              style={styles.idleContent}
              testID={inputProps.testID ? `${inputProps.testID}.idle` : undefined}>
              {idleContent}
            </Pressable>
          ) : null}
        </View>
        {/* Render-function accessories can follow the shell's current outline. */}
        {typeof endAccessory === 'function'
          ? endAccessory({borderColor, borderWidth})
          : endAccessory}
        {rightAccessory ? (
          <View
            pointerEvents="none"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={styles.rightAccessory}>
            {rightAccessory}
          </View>
        ) : null}
        {rightIcon ? (
          <TouchableOpacity
            accessibilityLabel={rightAccessibilityLabel}
            accessibilityRole="button"
            activeOpacity={0.72}
            hitSlop={{top: 2, bottom: 2, left: 2, right: 2}}
            onPress={onRightPress}
            style={[
              styles.rightAction,
              isCompact && styles.compactRightAction,
            ]}>
            <MaterialCommunityIcons
              color={resolvedRightIconColor}
              name={rightIcon}
              size={22}
            />
          </TouchableOpacity>
        ) : null}
      </View>
      {supportingText ? (
        <Text
          style={[
            styles.supportingText,
            {color: theme.colors.textSubtle},
            errorText && styles.errorText,
            errorText && {
              color: theme.colors.dangerText,
            },
            supportingTextStyle,
          ]}>
          {supportingText}
        </Text>
      ) : null}
    </View>
  );
});

export default AppTextInput;
