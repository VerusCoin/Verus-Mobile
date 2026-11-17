import React from 'react';
import {TouchableOpacity} from 'react-native';
import {Check, Copy} from 'lucide-react-native';
import {copyActionStyles as styles} from '../styles';
import {useAppTheme} from '../theme/app';
import useCopyFeedback from '../hooks/useCopyFeedback';

const CopyAction = ({
  accessibilityLabel = 'Copy',
  activeOpacity = 0.72,
  copiedAccessibilityLabel = 'Copied',
  copiedColor,
  color,
  disabled = false,
  iconSize = 20,
  onCopied,
  style,
  strokeWidth = 2,
  timeoutMs = 1400,
  value,
}) => {
  const theme = useAppTheme();
  const {copied, copy: handlePress, canCopy} = useCopyFeedback(value, {
    disabled, onCopied, timeoutMs,
  });
  const isDisabled = !canCopy;
  const Icon = copied ? Check : Copy;

  return (
    <TouchableOpacity
      accessibilityLabel={
        copied ? copiedAccessibilityLabel : accessibilityLabel
      }
      accessibilityRole="button"
      activeOpacity={activeOpacity}
      disabled={isDisabled}
      onPress={handlePress}
      style={[
        styles.iconButton,
        isDisabled && styles.disabled,
        style,
      ]}>
      <Icon
        color={
          copied
            ? copiedColor || theme.colors.success
            : color || theme.colors.textSubtle
        }
        size={iconSize}
        strokeWidth={strokeWidth}
      />
    </TouchableOpacity>
  );
};

export default CopyAction;
