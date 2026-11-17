import {useCallback, useEffect, useRef} from 'react';
import {Keyboard} from 'react-native';

// Queue at most one choice or navigation action. Cancelled close animations
// (a rapid reopen) must never apply an old choice to a newly opened sheet.
export default function useSheetDismissal({visible, onClose, onClosed}) {
  const pending = useRef(null);
  const closing = useRef(false);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;

  useEffect(() => {
    if (visible) {
      pending.current = null;
      closing.current = false;
    }
  }, [visible]);

  const dismiss = useCallback(
    action => {
      if (!visibleRef.current || closing.current) return;
      closing.current = true;
      pending.current = action;
      Keyboard.dismiss();
      onClose();
    },
    [onClose],
  );

  const close = useCallback(() => dismiss(null), [dismiss]);
  const handleClosed = useCallback(() => {
    if (visibleRef.current) return;
    const action = pending.current;
    pending.current = null;
    closing.current = false;
    onClosed?.();
    action?.();
  }, [onClosed]);

  return {close, dismiss, onClosed: handleClosed};
}
