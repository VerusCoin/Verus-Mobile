import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

// Keyboard.metrics() and Keyboard.isVisible() stay empty on Android here (the
// window pans instead of resizing), so keep the last reported keyboard frame
// for a form that mounts while the keyboard is already open.
let lastKeyboardFrame = null;
Keyboard.addListener('keyboardDidShow', event => {
  lastKeyboardFrame = event.endCoordinates;
});
Keyboard.addListener('keyboardDidHide', () => {
  lastKeyboardFrame = null;
});

// Only the inner content contracts. The outer onLayout frame stays independent
// of keyboard padding. Use the same parent coordinates and header offset as
// KeyboardAvoidingView, without its state.bottom/contracted-frame feedback.
const AndroidKeyboardAvoidingForm = ({
  children,
  keyboardVerticalOffset = 0,
  style,
}) => {
  const frameRef = useRef(null);
  const keyboardFrameRef = useRef(lastKeyboardFrame);
  const offsetRef = useRef(keyboardVerticalOffset);
  const [bottom, setBottom] = useState(0);

  offsetRef.current = keyboardVerticalOffset;

  // Read the offset through a ref: the header height can change after the
  // keyboard showed, and that must not reset the stored keyboard frame.
  const updateOverlap = useCallback(() => {
    const frame = frameRef.current;
    const keyboard = keyboardFrameRef.current;
    setBottom(
      frame && keyboard
        ? Math.max(
            0,
            frame.y + frame.height + offsetRef.current - keyboard.screenY,
          )
        : 0,
    );
  }, []);

  useEffect(() => {
    // Gboard can resize right after it shows; MainActivity sends that as a
    // second keyboardDidShow, so always keep the latest event.
    const show = Keyboard.addListener('keyboardDidShow', event => {
      keyboardFrameRef.current = event.endCoordinates;
      updateOverlap();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardFrameRef.current = null;
      setBottom(0);
    });

    // A form can mount while the previous step's keyboard is still open.
    keyboardFrameRef.current = lastKeyboardFrame;
    updateOverlap();

    return () => {
      show.remove();
      hide.remove();
    };
  }, [updateOverlap]);

  useEffect(() => {
    updateOverlap();
  }, [keyboardVerticalOffset, updateOverlap]);

  return (
    <View
      onLayout={event => {
        frameRef.current = event.nativeEvent.layout;
        updateOverlap();
      }}
      style={style}>
      <View style={[styles.content, {paddingBottom: bottom}]}>{children}</View>
    </View>
  );
};

// Keeps a form's bottom actions above the software keyboard. iOS pads with
// KeyboardAvoidingView. Android pans the window (adjustPan) instead of
// resizing it, so the form pads itself from keyboard events.
const KeyboardAvoidingForm = ({children, keyboardVerticalOffset = 0, style}) =>
  Platform.OS === 'android' ? (
    <AndroidKeyboardAvoidingForm
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={style}>
      {children}
    </AndroidKeyboardAvoidingForm>
  ) : (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
      style={style}>
      {children}
    </KeyboardAvoidingView>
  );

const styles = StyleSheet.create({content: {flex: 1}});

export default KeyboardAvoidingForm;
