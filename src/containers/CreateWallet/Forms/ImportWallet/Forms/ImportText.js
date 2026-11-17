import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AppButton from '../../../../../components/AppButton';
import AppTextInput from '../../../../../components/AppTextInput';
import {isCustomImportSeed} from '../../../../../utils/importSeed';
import KeyboardAvoidingForm from '../../../../../components/KeyboardAvoidingForm';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import {createSignedOutFlowStyles} from '../../../../../styles';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {
  ONBOARDING_KEYBOARD_FOOTER_SPACING,
  useOnboardingSmallDeviceLayout,
} from '../../../../../hooks/useOnboardingSmallDeviceLayout';

const CONTENT_ANIMATION_DURATION = 320;

export default function ImportText({
  importedSeed,
  onComplete,
  setImportedSeed,
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const [showSeed, setShowSeed] = useState(false);
  const customSeed = useMemo(() => isCustomImportSeed(importedSeed), [importedSeed]);
  const contentProgress = useRef(new Animated.Value(0)).current;
  const {keyboardVisible, smallDeviceKeyboardVisible} =
    useOnboardingSmallDeviceLayout();

  useEffect(() => {
    let active = true;
    let animation;

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotionEnabled => {
        if (!active) return;

        contentProgress.stopAnimation();

        if (reduceMotionEnabled) {
          contentProgress.setValue(1);
          return;
        }

        contentProgress.setValue(0);
        animation = Animated.timing(contentProgress, {
          toValue: 1,
          duration: CONTENT_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        });
        animation.start();
      })
      .catch(() => {
        if (active) {
          contentProgress.setValue(1);
        }
      });

    return () => {
      active = false;

      if (animation) {
        animation.stop();
      }

      contentProgress.stopAnimation();
    };
  }, [contentProgress]);

  // Import is disabled while the field is empty.
  const handleImport = () => {
    if (!importedSeed || importedSeed.length < 1) return;

    onComplete();
  };

  const contentAnimatedStyle = {
    opacity: contentProgress,
    transform: [
      {
        translateY: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
      {
        scale: contentProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [0.985, 1],
        }),
      },
    ],
  };

  return (
    <KeyboardAvoidingForm style={signedOutFlowStyles.container}>
      <TouchableWithoutFeedback
        accessible={false}
        onPress={() => Keyboard.dismiss()}>
        <View style={styles.content}>
          <ScrollView
            contentContainerStyle={[
              signedOutFlowStyles.scrollContent,
              signedOutFlowStyles.afterHeaderTitle,
              smallDeviceKeyboardVisible &&
                signedOutFlowStyles.scrollContentKeyboardFooterClearance,
            ]}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[signedOutFlowStyles.form, contentAnimatedStyle]}>
              <AppTextInput
                autoComplete="off"
                importantForAutofill="no"
                inputStyle={styles.seedInputText}
                label="Custom seed or private key"
                helperText={customSeed
                  ? 'This is not a private key or recovery phrase. It will be used as a custom seed.'
                  : undefined}
                multiline={showSeed && Platform.OS !== 'ios'}
                onChangeText={setImportedSeed}
                onRightPress={() => setShowSeed(value => !value)}
                rightAccessibilityLabel={
                  showSeed
                    ? 'Hide custom seed or private key'
                    : 'Show custom seed or private key'
                }
                rightIcon={showSeed ? 'eye-off' : 'eye'}
                secureTextEntry={!showSeed}
                testID="onboarding.importText.input"
                textContentType="none"
                value={importedSeed}
              />
            </Animated.View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
      <SafeBottomActionStack
        bottomSpacing={keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 30}
        includeBottomInset={!keyboardVisible}
        safeAreaSpacing={
          keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 12
        }>
        <AppButton
          disabled={importedSeed == null || importedSeed.length === 0}
          height={56}
          onPress={handleImport}
          testID="onboarding.importText.import"
          variant="primary">
          {'Import'}
        </AppButton>
      </SafeBottomActionStack>
    </KeyboardAvoidingForm>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  seedInputText: {
    minHeight: 54,
  },
});
