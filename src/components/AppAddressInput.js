import React, {forwardRef, useEffect, useImperativeHandle, useRef, useState} from 'react';
import {Clipboard, Pressable, Text, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppTextInput from './AppTextInput';
import {appAddressInputStyles as styles} from '../styles';
import {resolveAppTheme, useAppTheme} from '../theme/app';

// The editable value is always complete. Only the idle presentation is shortened.
const AppAddressInput = forwardRef(function AppAddressInput(
  {
    abbreviate = true,
    editable = true,
    errorText,
    inlineLabel,
    inputStyle,
    label,
    onChangeText,
    onScan,
    scanAccessibilityLabel = 'Scan address QR',
    technical = false,
    testID,
    themeMode,
    value = '',
    ...props
  },
  ref,
) {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => inputRef.current);
  const appTheme = useAppTheme();
  const theme = themeMode ? resolveAppTheme(themeMode) : appTheme;
  const [pasteError, setPasteError] = useState(null);
  const pasteRequest = useRef(0);
  const hasValue = value.length > 0;
  const fieldLabel = props.accessibilityLabel || label || 'Address';
  const textStyle = [styles.value, {color: theme.colors.textPrimary}, technical && styles.technical];

  useEffect(() => {
    pasteRequest.current += 1;
    setPasteError(null);
  }, [value]);
  useEffect(() => () => {pasteRequest.current += 1;}, []);

  const change = text => {
    pasteRequest.current += 1;
    setPasteError(null);
    onChangeText(text);
  };
  const paste = async () => {
    // A system clipboard prompt can outlive a later edit or scanner switch.
    const request = ++pasteRequest.current;
    try {
      const text = await Clipboard.getString();
      if (request !== pasteRequest.current) return;
      if (text?.trim()) change(text.trim());
    } catch {
      if (request === pasteRequest.current) {
        setPasteError('Clipboard content could not be read. Try again.');
      }
    }
  };
  const clear = () => {
    change('');
    inputRef.current?.focus();
  };

  const idleContent = hasValue && abbreviate ? (
    <View
      pointerEvents="none"
      style={[styles.idleValue, inlineLabel && styles.idleValueWithTo]}>
      {technical && value.length > 6 ? (
        <>
          <Text numberOfLines={1} ellipsizeMode="tail" style={[textStyle, styles.prefix]}>
            {value.slice(0, -6)}
          </Text>
          <Text style={[textStyle, styles.suffix]}>{value.slice(-6)}</Text>
        </>
      ) : (
        <Text numberOfLines={1} ellipsizeMode="tail" style={[textStyle, styles.prefix]}>{value}</Text>
      )}
    </View>
  ) : null;

  return (
    <AppTextInput
      {...props}
      ref={inputRef}
      accessibilityValue={{text: value}}
      editable={editable}
      errorText={errorText || pasteError}
      idleAccessibilityLabel={`${editable ? 'Edit ' : ''}${fieldLabel}: ${value}`}
      idleContent={idleContent}
      inputStyle={[
        inlineLabel && styles.withToInput,
        hasValue && technical && styles.technical,
        inputStyle,
      ]}
      label={label}
      leftAccessory={inlineLabel ? <Text style={[styles.to, {color: theme.colors.inputPlaceholder}]}>{inlineLabel}</Text> : undefined}
      onChangeText={change}
      testID={testID}
      themeMode={themeMode}
      value={value}
      endAccessory={editable ? (
        <View style={styles.actions}>
          {onScan ? (
            <Pressable
              accessibilityLabel={scanAccessibilityLabel}
              accessibilityRole="button"
              hitSlop={2}
              onPress={() => {
                pasteRequest.current += 1;
                onScan();
              }}
              style={styles.scan}
              testID={testID ? `${testID}.scan` : undefined}>
              <MaterialCommunityIcons name="qrcode-scan" size={20} color={theme.colors.inputActionText} />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={hasValue ? 'Clear address' : 'Paste address'}
            accessibilityRole="button"
            hitSlop={2}
            onPress={hasValue ? clear : paste}
            style={styles.action}
            testID={testID ? `${testID}.${hasValue ? 'clear' : 'paste'}` : undefined}>
            <View style={[styles.pill, {backgroundColor: theme.colors.inputActionBackground}]}>
              <Text style={[styles.actionText, {color: theme.colors.inputActionText}]}>{hasValue ? 'Clear' : 'Paste'}</Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    />
  );
});

export default AppAddressInput;
