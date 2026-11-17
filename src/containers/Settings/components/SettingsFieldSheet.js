/*
  A compact form sheet for one wallet setting value. It copies the title,
  input, chip row, keyboard handling and bottom actions of
  src/containers/Services/AddressBook/AddressBookEditSheet.js.

  onSave(value) may return:
  - a string: the sheet shows it under the field and stays open;
  - true: the caller closes the sheet, so the Save spinner stays;
  - anything else: the sheet stays open and Save is enabled again.
*/

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {ActivityIndicator, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../components/AppButton';
import AppTextInput from '../../../components/AppTextInput';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import {fontStyle} from '../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';

const DEFAULT_SHEET_MAX_HEIGHT = '80%';
const KEYBOARD_SHEET_BOTTOM_SPACING = 8;
const KEYBOARD_SHEET_TOP_SPACING = 12;
const EMPTY_KEYBOARD_METRICS = {height: 0, visible: false};

const SettingsFieldSheet = ({
  busyText,
  chips = [],
  helperText,
  initialValue = '',
  keyboardType = 'default',
  label,
  monospace = false,
  onClose,
  onClosed,
  onSave,
  placeholder,
  saveAccessibilityLabel,
  title,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const preserveKeyboardLayout = useRef(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState(null);
  const [keyboardMetrics, setKeyboardMetrics] = useState(
    EMPTY_KEYBOARD_METRICS,
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    preserveKeyboardLayout.current = false;
    setValue(initialValue == null ? '' : String(initialValue));
    setError(null);
    setKeyboardMetrics(EMPTY_KEYBOARD_METRICS);
    setSaving(false);
  }, [initialValue, visible]);

  useEffect(() => {
    if (!visible) return undefined;

    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, event => {
      if (preserveKeyboardLayout.current) return;
      setKeyboardMetrics({
        height: event?.endCoordinates?.height || 0,
        visible: true,
      });
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      if (preserveKeyboardLayout.current) return;
      setKeyboardMetrics(EMPTY_KEYBOARD_METRICS);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  const valid = value.trim().length > 0;
  const keyboardSheetHeight = Math.max(
    1,
    windowHeight -
      keyboardMetrics.height -
      insets.top -
      KEYBOARD_SHEET_TOP_SPACING -
      KEYBOARD_SHEET_BOTTOM_SPACING,
  );

  const changeValue = useCallback(nextValue => {
    setValue(nextValue);
    setError(null);
  }, []);

  const close = useCallback(() => {
    if (saving) return;
    preserveKeyboardLayout.current = true;
    Keyboard.dismiss();
    onClose();
  }, [onClose, saving]);

  const save = useCallback(async () => {
    if (!valid || saving) return;
    preserveKeyboardLayout.current = true;
    Keyboard.dismiss();
    setError(null);
    setSaving(true);

    let result;
    try {
      result = await onSave(value.trim());
    } catch (saveError) {
      console.warn(
        `Failed to save ${title}: ${saveError?.message || saveError}`,
      );
      result = null;
    }

    if (result === true) return;

    preserveKeyboardLayout.current = false;
    setKeyboardMetrics(EMPTY_KEYBOARD_METRICS);
    setSaving(false);
    if (typeof result === 'string' && result.length > 0) {
      setError(result);
    }
  }, [onSave, saving, title, valid, value]);

  const handleClosed = useCallback(() => {
    preserveKeyboardLayout.current = false;
    setKeyboardMetrics(EMPTY_KEYBOARD_METRICS);
    setSaving(false);
    setError(null);
    if (typeof onClosed === 'function') {
      onClosed();
    }
  }, [onClosed]);

  return (
    <BottomSheetModal
      avoidKeyboard
      closeDisabled={saving}
      contentContainerStyle={
        keyboardMetrics.visible
          ? {
              marginBottom: KEYBOARD_SHEET_BOTTOM_SPACING,
            }
          : null
      }
      maxHeight={
        keyboardMetrics.visible ? keyboardSheetHeight : DEFAULT_SHEET_MAX_HEIGHT
      }
      onClose={close}
      onClosed={handleClosed}
      visible={visible}>
      <View style={styles.sheetLayout}>
        <Text
          accessibilityRole="header"
          style={[sheetStyles.title, styles.title]}>
          {title}
        </Text>

        <View style={styles.scrollFrame}>
          <ScrollView
            bounces={false}
            contentContainerStyle={styles.formContent}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={keyboardMetrics.visible}>
            <AppTextInput
              accessibilityValue={{text: value}}
              editable={!saving}
              errorText={error}
              helperText={saving && busyText ? busyText : helperText}
              inputStyle={monospace && styles.monospaceInput}
              keyboardType={keyboardType}
              label={label}
              onChangeText={changeValue}
              onSubmitEditing={Keyboard.dismiss}
              placeholder={placeholder}
              returnKeyType="done"
              themeMode={theme.mode}
              value={value}
            />

            {chips.length > 0 ? (
              <View style={styles.actionsRow}>
                {chips.map(chip => (
                  <TouchableOpacity
                    accessibilityLabel={chip.accessibilityLabel || chip.label}
                    accessibilityRole="button"
                    activeOpacity={0.7}
                    disabled={saving}
                    key={chip.key}
                    onPress={() => chip.onPress({setValue: changeValue})}
                    style={styles.actionChip}>
                    <MaterialCommunityIcons
                      color={theme.colors.textSecondary}
                      name={chip.icon}
                      size={16}
                    />
                    <Text style={styles.actionChipText}>{chip.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>

        <SafeBottomActionStack
          bottomSpacing={
            keyboardMetrics.visible ? KEYBOARD_SHEET_BOTTOM_SPACING : 12
          }
          gap={10}
          horizontalSpacing={20}
          includeBottomInset={false}
          safeAreaSpacing={0}
          style={styles.buttonStack}>
          <AppButton
            accessibilityLabel={saveAccessibilityLabel || 'Save'}
            disabled={!valid || saving}
            height={56}
            onPress={save}
            themeMode={theme.mode}>
            {saving ? (
              <ActivityIndicator color={theme.colors.onPrimary} size={18} />
            ) : (
              'Save'
            )}
          </AppButton>
          <AppButton
            accessibilityLabel="Cancel"
            disabled={saving}
            height={56}
            onPress={close}
            themeMode={theme.mode}
            variant="secondary">
            Cancel
          </AppButton>
        </SafeBottomActionStack>
      </View>
    </BottomSheetModal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    sheetLayout: {
      flexGrow: 0,
      flexShrink: 1,
      paddingTop: 8,
    },
    title: {
      marginHorizontal: 20,
      marginBottom: 20,
    },
    scrollFrame: {
      flexGrow: 0,
      flexShrink: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
    formContent: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
    monospaceInput: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      letterSpacing: 0.2,
    },
    actionsRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10},
    actionChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
    },
    actionChipText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      ...fontStyle('medium'),
    },
    buttonStack: {
      paddingTop: 12,
    },
  });

export default SettingsFieldSheet;
