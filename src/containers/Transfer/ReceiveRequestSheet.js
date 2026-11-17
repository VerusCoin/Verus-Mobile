import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import AppButton from '../../components/AppButton';
import BottomSheetModal from '../../components/BottomSheetModal';
import SafeBottomActionStack from '../../components/SafeBottomActionStack';
import useSheetDismissal from '../../components/useSheetDismissal';
import {createSignedOutSheetStyles} from '../../styles';
import {useOnboardingTheme} from '../../theme/onboarding';

const EMPTY_KEYBOARD = {height: 0, visible: false};

// The compact AddressBookEditSheet composition, shared by the two request forms.
// onApply validates first and returns the action to run after the sheet closes.
const ReceiveRequestSheet = ({children, onApply, onClose, title, visible}) => {
  const theme = useOnboardingTheme();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const {height} = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const preserveKeyboardLayout = useRef(false);
  const scrollRef = useRef(null);
  const contentHeight = useRef(0);
  const [keyboard, setKeyboard] = useState(EMPTY_KEYBOARD);
  const dismissal = useSheetDismissal({visible, onClose});

  useEffect(() => {
    if (!visible) return undefined;
    preserveKeyboardLayout.current = false;
    setKeyboard(EMPTY_KEYBOARD);
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => {
        if (!preserveKeyboardLayout.current) {
          setKeyboard({height: event?.endCoordinates?.height || 0, visible: true});
        }
      },
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        if (!preserveKeyboardLayout.current) setKeyboard(EMPTY_KEYBOARD);
      },
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [visible]);

  const close = useCallback(() => {
    preserveKeyboardLayout.current = true;
    dismissal.close();
  }, [dismissal]);

  const done = () => {
    const apply = onApply();
    if (typeof apply !== 'function') return;
    preserveKeyboardLayout.current = true;
    dismissal.dismiss(apply);
  };

  return (
    <BottomSheetModal
      avoidKeyboard
      contentContainerStyle={keyboard.visible ? styles.keyboardGap : null}
      maxHeight={keyboard.visible
        ? Math.max(1, height - keyboard.height - insets.top - 20)
        : '80%'}
      onClose={close}
      onClosed={() => {
        preserveKeyboardLayout.current = false;
        setKeyboard(EMPTY_KEYBOARD);
        dismissal.onClosed();
      }}
      visible={visible}>
      <View style={styles.layout}>
        <Text accessibilityRole="header" style={[sheetStyles.title, styles.title]}>
          {title}
        </Text>
        <View style={styles.scrollFrame}>
          <ScrollView
            ref={scrollRef}
            bounces={false}
            contentContainerStyle={styles.form}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled"
            // Content that grows under an open keyboard (an inline error, a
            // longer note) would sit behind Done on a small phone: follow it.
            onContentSizeChange={(_, nextHeight) => {
              const grew = nextHeight > contentHeight.current;
              contentHeight.current = nextHeight;
              if (grew && keyboard.visible) scrollRef.current?.scrollToEnd({animated: true});
            }}
            showsVerticalScrollIndicator={keyboard.visible}>
            {children}
          </ScrollView>
        </View>
        <SafeBottomActionStack
          bottomSpacing={keyboard.visible ? 8 : 12}
          horizontalSpacing={20}
          includeBottomInset={false}
          safeAreaSpacing={0}
          style={styles.actions}>
          <AppButton onPress={done}>Done</AppButton>
        </SafeBottomActionStack>
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  layout: {flexGrow: 0, flexShrink: 1, paddingTop: 8},
  title: {marginHorizontal: 20, marginBottom: 20},
  scrollFrame: {flexGrow: 0, flexShrink: 1, minHeight: 0, overflow: 'hidden'},
  form: {paddingHorizontal: 20, paddingBottom: 12},
  actions: {paddingTop: 12},
  keyboardGap: {marginBottom: 8},
});

export default ReceiveRequestSheet;
