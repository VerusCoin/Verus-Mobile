import {useCallback, useEffect, useRef, useState} from 'react';
import {Clipboard} from 'react-native';
import {triggerLightHaptic} from '../utils/haptics/haptics';

// CopyAction and long-press facts share value changes, repeat-copy timing and
// unmount cleanup. Haptics are opt-in to preserve CopyAction's behavior.
const useCopyFeedback = (value, {
  disabled = false,
  haptic = false,
  onCopied,
  timeoutMs = 1400,
} = {}) => {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef(null);
  const copyText = value == null ? '' : String(value);
  const canCopy = !disabled && copyText.length > 0;

  useEffect(() => {
    setCopied(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [copyText]);

  const copy = useCallback(() => {
    if (!canCopy) return;
    Clipboard.setString(copyText);
    if (haptic) triggerLightHaptic();
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCopied(true);
    if (typeof onCopied === 'function') onCopied(copyText);
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, timeoutMs);
  }, [canCopy, copyText, haptic, onCopied, timeoutMs]);

  return {
    copied,
    copy,
    canCopy,
    copyProps: canCopy ? {
      accessibilityActions: [{name: 'copy', label: 'Copy'}],
      onAccessibilityAction: event => {
        if (event.nativeEvent.actionName === 'copy') copy();
      },
      onLongPress: copy,
    } : {},
  };
};

export default useCopyFeedback;
