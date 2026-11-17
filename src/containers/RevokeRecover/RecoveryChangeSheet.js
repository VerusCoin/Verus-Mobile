import React, {useEffect, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import AppAddressInput from '../../components/AppAddressInput';
import BottomSheetModal from '../../components/BottomSheetModal';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import {useAppTheme} from '../../theme/app';
import {RecoveryValue} from './RecoveryValues';

const RecoveryChangeSheet = ({
  type,
  visible,
  draft,
  current,
  hasZAddress,
  error,
  onChange,
  onClose,
  onClosed,
  onSave,
  onReset,
  onScan,
}) => {
  const theme = useAppTheme();
  const {height: windowHeight} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const visibleRef = useRef(visible);
  const scrollRef = useRef(null);
  const focusAtEndRef = useRef(false);
  visibleRef.current = visible;
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        if (visibleRef.current) {
          setKeyboardHeight(Math.max(0, windowHeight - event.endCoordinates.screenY));
        }
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        // Keep the closing sheet in place until its exit animation completes.
        if (visibleRef.current) setKeyboardHeight(0);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [windowHeight]);
  const bottomSpacing = keyboardHeight ? keyboardHeight + 8 : Math.max(insets.bottom, 12);
  const maxHeight = Math.min(windowHeight * 0.88, windowHeight - bottomSpacing - insets.top - 12);
  const authorities = type === 'authorities';
  const primary = type === 'primary';
  let title = hasZAddress ? 'Change Z-address' : 'Add Z-address';
  if (authorities) title = 'Change authorities';
  if (primary) title = 'Change primary R-address';
  const close = () => {
    visibleRef.current = false;
    onClose();
    Keyboard.dismiss();
  };
  return (
    <BottomSheetModal
      embedded
      visible={visible}
      onClose={close}
      onClosed={() => {
        setKeyboardHeight(0);
        onClosed();
      }}
      contentContainerStyle={{marginBottom: bottomSpacing}}
      maxHeight={maxHeight}>
      <View style={styles.layout}>
        <Text
          accessibilityRole="header"
          style={[
            theme.typography.titleSheet,
            styles.heading,
            keyboardHeight > 0 && styles.keyboardHeading,
            {color: theme.colors.textPrimary},
          ]}>
          {title}
        </Text>
        <ScrollView
          ref={scrollRef}
          onLayout={() => {
            if (keyboardHeight && focusAtEndRef.current) {
              scrollRef.current?.scrollToEnd({animated: true});
            }
          }}
          style={styles.scroll}
          contentContainerStyle={[
            styles.fields,
            keyboardHeight > 0 && styles.keyboardFields,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === 'ios' ? 'interactive' : 'on-drag'
          }>
          {primary ? (
            <RecoveryValue
              label="Current address"
              technical
              value={
                (current?.primaryaddresses || []).join('\n') || 'Not available'
              }
            />
          ) : null}
          {authorities ? (
            <>
              <AppAddressInput
                technical={!draft.recovery?.includes('@')}
                label="Recovery authority"
                placeholder="name@ or i..."
                value={draft.recovery || ''}
                onChangeText={text => onChange('recovery', text)}
                onFocus={() => { focusAtEndRef.current = false; }}
              />
              <AppAddressInput
                technical={!draft.revocation?.includes('@')}
                label="Revocation authority"
                placeholder="name@ or i..."
                value={draft.revocation || ''}
                onChangeText={text => onChange('revocation', text)}
                onFocus={() => {
                  focusAtEndRef.current = true;
                  scrollRef.current?.scrollToEnd({animated: true});
                }}
              />
              <Text
                style={[
                  theme.typography.caption,
                  {color: theme.colors.textSecondary},
                ]}>
                Leave a field empty to keep its current authority.
              </Text>
            </>
          ) : (
            <AppAddressInput
              technical
              label={primary ? 'New primary R-address' : 'Z-address'}
              placeholder={primary ? 'R...' : 'zs...'}
              value={draft.address || ''}
              onChangeText={text => onChange('address', text)}
              onFocus={() => {
                focusAtEndRef.current = true;
                scrollRef.current?.scrollToEnd({animated: true});
              }}
              onScan={onScan}
              scanAccessibilityLabel={
                primary ? 'Scan new primary address' : 'Scan Z-address'
              }
              testID={`revokeRecover.edit.${type}.input`}
            />
          )}
          {error ? (
            <Text
              accessibilityLiveRegion="polite"
              style={[theme.typography.caption, {color: theme.colors.danger}]}>
              {error}
            </Text>
          ) : null}
        </ScrollView>
        <SafeBottomActionStack
          horizontalSpacing={20}
          includeBottomInset={false}
          bottomSpacing={12}
          gap={8}>
          <AppButton
            height={keyboardHeight ? 48 : undefined}
            disabled={
              authorities
                ? !draft.recovery?.trim() && !draft.revocation?.trim()
                : !draft.address?.trim()
            }
            onPress={onSave}
            testID="revokeRecover.edit.save">
            {authorities
              ? 'Use these authorities'
              : primary
              ? 'Use this address'
              : 'Use this Z-address'}
          </AppButton>
          {onReset ? (
            <AppButton height={keyboardHeight ? 48 : undefined} variant="secondary" onPress={onReset}>
              Use current values
            </AppButton>
          ) : null}
          <AppButton height={keyboardHeight ? 48 : undefined} variant="secondary" onPress={close}>
            Cancel
          </AppButton>
        </SafeBottomActionStack>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  layout: {flexShrink: 1, minHeight: 0},
  heading: {paddingTop: 22, paddingHorizontal: 20, marginBottom: 18},
  scroll: {flexShrink: 1, minHeight: 0},
  fields: {paddingHorizontal: 20, paddingBottom: 20, gap: 18},
  keyboardHeading: {paddingTop: 16, marginBottom: 12},
  keyboardFields: {paddingBottom: 12, gap: 12},
});
export default RecoveryChangeSheet;
