import React, {useRef} from 'react';
import {Modal} from 'react-native';
import NfcTapView from './NfcTapView';

// The NFC tap screen over the whole app. Android Back runs the cancel action,
// if the current step has one.
export default function NfcTapModal({visible, ...viewProps}) {
  // Keep the last step on screen while the modal fades out.
  const shownRef = useRef(viewProps);
  if (visible) shownRef.current = viewProps;
  const shown = shownRef.current;

  const handleRequestClose = () => {
    const cancelAction = (shown.actions || []).find(action => action.cancel);
    if (visible && cancelAction) cancelAction.onPress();
  };

  return (
    <Modal
      animationType="fade"
      onRequestClose={handleRequestClose}
      statusBarTranslucent
      transparent={false}
      visible={visible}>
      <NfcTapView {...shown} includeTopInset />
    </Modal>
  );
}
