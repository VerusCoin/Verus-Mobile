import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {BackHandler, Keyboard, Text, View} from 'react-native';
import {Portal} from 'react-native-paper';
import {connect} from 'react-redux';
import {resolveAlert} from '../actions/actions/alert/dispatchers/alert';
import {createSignedOutSheetStyles} from '../styles';
import {useOnboardingTheme} from '../theme/onboarding';
import {createAcknowledgeSheetStyles} from './AcknowledgeSheet';
import AppButton from './AppButton';
import BottomSheetModal from './BottomSheetModal';
import SheetScrollView from './SheetScrollView';

export const DEFAULT_ALERT_BUTTON_LABEL = 'Close';

// A button with style "cancel" is the way out. Without one, the last button is
// the action and the others are ways out, as in [No, Yes].
const arrangeButtons = buttons => {
  const list =
    Array.isArray(buttons) && buttons.length > 0
      ? buttons
      : [{text: DEFAULT_ALERT_BUTTON_LABEL, onPress: () => resolveAlert(true)}];
  const cancelIndex = list.findIndex(button => button?.style === 'cancel');

  if (cancelIndex >= 0) {
    const actions = list.filter((_, index) => index !== cancelIndex);
    const cancel = list[cancelIndex];

    return {ordered: [...actions, cancel], dismiss: cancel};
  }

  const action = list[list.length - 1];
  const others = list.slice(0, -1);

  return {
    ordered: [action, ...others],
    dismiss: others[0] || (list.length === 1 ? action : null),
  };
};

// The app-wide alert. createAlert() queues it in Redux; it shows as the
// acknowledgement sheet. It is embedded in the root portal, so it never
// stacks a second native modal: open sheets step aside while it shows. A
// button runs after the sheet has closed, so whatever it opens next can
// present cleanly.
const AlertModal = ({activeAlert}) => {
  const theme = useOnboardingTheme();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const styles = useMemo(() => createAcknowledgeSheetStyles(theme), [theme]);
  const [shown, setShown] = useState(null);
  const [visible, setVisible] = useState(false);
  const choiceRef = useRef(null);
  // A button may resolve the alert after an await; do not show it again.
  const closedUidRef = useRef(null);

  useEffect(() => {
    if (activeAlert == null) {
      // Resolved from outside the sheet: close without running a button.
      if (visible && choiceRef.current == null) setVisible(false);
      return;
    }

    if (shown == null && activeAlert.uid !== closedUidRef.current) {
      Keyboard.dismiss();
      choiceRef.current = null;
      setShown(activeAlert);
      setVisible(true);
    }
  }, [activeAlert, shown, visible]);

  const options = shown?.options || {};
  const blocked = options.disabled === true;
  const dismissable = !blocked && options.cancelable !== false;
  const {ordered, dismiss} = useMemo(
    () => arrangeButtons(shown?.buttons),
    [shown],
  );

  const choose = useCallback(button => {
    if (choiceRef.current != null) return;

    choiceRef.current = button;
    setVisible(false);
  }, []);

  const handleOutsideClose = useCallback(() => {
    if (dismissable && dismiss != null) choose(dismiss);
  }, [choose, dismiss, dismissable]);

  const handleClosed = useCallback(() => {
    const button = choiceRef.current;

    choiceRef.current = null;
    closedUidRef.current = shown?.uid ?? null;
    setShown(null);

    if (button == null) return;

    if (typeof button.onPress === 'function') {
      button.onPress();
    } else {
      resolveAlert(true);
    }
  }, [shown]);

  // The embedded sheet has no native modal, so it handles Android back here.
  useEffect(() => {
    if (!visible) return undefined;

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        handleOutsideClose();
        return true;
      },
    );

    return () => subscription.remove();
  }, [handleOutsideClose, visible]);

  if (shown == null) return null;

  return (
    <Portal>
      <BottomSheetModal
        embedded
        maxHeight="80%"
        onClose={handleOutsideClose}
        onClosed={handleClosed}
        visible={visible}>
        <View
          accessibilityViewIsModal
          style={[styles.sheet, {flexShrink: 1}]}
          testID="app.alert">
          <Text accessibilityRole="header" style={styles.title}>
            {shown.title}
          </Text>
          {shown.message ? (
            <SheetScrollView style={styles.message}>
              <Text style={sheetStyles.bodyText}>{shown.message}</Text>
            </SheetScrollView>
          ) : null}
          {ordered.map((button, index) => (
            <AppButton
              disabled={blocked || button.disabled === true}
              height={56}
              key={`${index}-${button.text}`}
              onPress={() => choose(button)}
              style={index === 0 ? styles.button : styles.dismissButton}
              testID={`app.alert.button.${index}`}
              variant={index === 0
                ? button.style === 'destructive' ? 'destructive' : 'primary'
                : 'secondary'}>
              {button.text}
            </AppButton>
          ))}
        </View>
      </BottomSheetModal>
    </Portal>
  );
};

const mapStateToProps = state => ({
  activeAlert: state.alert.active,
});

export default connect(mapStateToProps)(AlertModal);
