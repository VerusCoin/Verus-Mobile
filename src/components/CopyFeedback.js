import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {Check} from 'lucide-react-native';
import useCopyFeedback from '../hooks/useCopyFeedback';
import {useAppTheme} from '../theme/app';

// Keep the original content in layout, including wrapped addresses and memos.
// The feedback overlays that space without changing the row's height.
const CopyFeedback = ({children, contentStyle, copied, style}) => {
  const theme = useAppTheme();
  return (
    <View style={style}>
      <View
        accessibilityElementsHidden={copied}
        importantForAccessibility={copied ? 'no-hide-descendants' : 'auto'}
        style={[contentStyle, copied && styles.hidden]}>
        {children}
      </View>
      {copied ? (
        <View pointerEvents="none" style={styles.feedback}>
          <Check color={theme.colors.success} size={20} strokeWidth={2} />
          <Text accessibilityLiveRegion="polite" style={[theme.typography.caption, styles.label, {color: theme.colors.successText}]}>
            Copied
          </Text>
        </View>
      ) : null}
    </View>
  );
};

// Each VerusID line owns its exact value and accessibility Copy action. Native
// Text press handling yields to the parent scroll view when the finger moves.
// iOS RCTTextView has no onAccessibilityAction, so the action sits on a View.
export const CopyableText = ({children, copyValue, ...props}) => {
  const {copied, canCopy, copyProps} = useCopyFeedback(copyValue, {haptic: true});
  const {onLongPress, ...accessibilityProps} = copyProps;
  return (
    <CopyFeedback copied={copied}>
      <View
        accessible={canCopy || undefined}
        accessibilityLabel={canCopy && typeof children === 'string' ? children : undefined}
        {...accessibilityProps}>
        {/* A focusable child Text would drop out of Android's label for the wrapper. */}
        <Text {...props} accessible={canCopy ? false : props.accessible} onLongPress={onLongPress}>{children}</Text>
      </View>
    </CopyFeedback>
  );
};

const styles = StyleSheet.create({
  hidden: {opacity: 0},
  feedback: {...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end'},
  label: {marginLeft: 6},
});

export default CopyFeedback;
