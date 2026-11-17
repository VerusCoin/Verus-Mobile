import React, {useMemo} from 'react';
import {StyleSheet} from 'react-native';
import {Portal, Text} from 'react-native-paper';
import {SafeAreaView} from 'react-native-safe-area-context';
import AnimatedActivityIndicator from '../AnimatedActivityIndicator';
import TextAction from '../TextAction';
import SemiModal from '../SemiModal';
import {useObjectSelector} from '../../hooks/useObjectSelector';
import {useAppTheme} from '../../theme/app';

// SemiModal supplies the theme's sheet color, so this modal follows dark mode.
export default function LoadingModal() {
  const theme = useAppTheme();
  const {visible, message, height, onCancel, cancelLabel} = useObjectSelector(
    state => state.loadingModal,
  );
  const messageStyle = useMemo(
    () => [
      theme.typography.titleSheet,
      localStyles.message,
      {color: theme.colors.textPrimary},
    ],
    [theme],
  );

  return (
    <Portal>
      <SemiModal
        animationType="slide"
        transparent={true}
        visible={visible}
        contentContainerStyle={{
          height,
          flex: 0,
        }}>
        <SafeAreaView edges={['bottom']} style={localStyles.body}>
          <AnimatedActivityIndicator
            style={{
              width: 128,
            }}
          />
          {message != null && message.length > 0 && (
            <Text accessibilityLiveRegion="polite" style={messageStyle}>
              {message}
            </Text>
          )}
          {onCancel != null && (
            <TextAction
              onPress={onCancel}
              style={localStyles.cancel}>
              {cancelLabel}
            </TextAction>
          )}
        </SafeAreaView>
      </SemiModal>
    </Portal>
  );
}

const localStyles = StyleSheet.create({
  // Like the shared focalCenter layout, without its fixed white background.
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    marginTop: 8,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  cancel: {
    alignSelf: 'center',
    marginTop: 16,
  },
});
