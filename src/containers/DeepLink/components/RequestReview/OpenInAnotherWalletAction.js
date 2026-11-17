import React from 'react';
import {StyleSheet} from 'react-native';
import TextAction from '../../../../components/TextAction';

const OpenInAnotherWalletAction = ({onPress, disabled = false, compact = false, style}) => {
  return (
    <TextAction
      accessibilityLabel="Open in another wallet"
      accessibilityRole="link"
      accessibilityState={{disabled}}
      disabled={disabled}
      // Pay with keeps a 32-point row. Extend its target into the top padding.
      hitSlop={compact ? {top: 12, bottom: 0, left: 0, right: 0} : undefined}
      onPress={onPress}
      size="small"
      style={[styles.action, compact && styles.compact, style]}>
      Open in another wallet
    </TextAction>
  );
};

const styles = StyleSheet.create({
  action: {minHeight: 44, justifyContent: 'center', alignSelf: 'flex-end'},
  compact: {minHeight: 32},
});

export default OpenInAnotherWalletAction;
