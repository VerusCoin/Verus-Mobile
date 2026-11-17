import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import AppButton from '../../../../components/AppButton';
import KeyboardAvoidingForm from '../../../../components/KeyboardAvoidingForm';
import SafeBottomActionStack from '../../../../components/SafeBottomActionStack';
import {useObjectSelector} from '../../../../hooks/useObjectSelector';
import AppTextInput from '../../../../components/AppTextInput';
import WalletAvatar from '../../../../components/WalletAvatar';
import {
  DEFAULT_WALLET_AVATAR,
  normalizeWalletAvatar,
} from '../../../../utils/walletAvatar';
import WalletAvatarPickerSheet from './WalletAvatarPickerSheet';
import {createSignedOutFlowStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  ONBOARDING_KEYBOARD_FOOTER_SPACING,
  useOnboardingSmallDeviceLayout,
} from '../../../../hooks/useOnboardingSmallDeviceLayout';

const CONTENT_ANIMATION_DURATION = 320;
const WALLET_AVATAR_SIZE = 56;
const WALLET_AVATAR_EMOJI_SIZE = 28;
// Label (19) + gap (8), then center the 56-point avatar beside the 48-point field.
const WALLET_AVATAR_INPUT_OFFSET = 23;

export default function ChooseName({
  profileName,
  setProfileName,
  walletAvatar = DEFAULT_WALLET_AVATAR,
  setWalletAvatar,
  navigation,
  onNext,
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const [nameError, setNameError] = useState(null);
  const [avatarSheetVisible, setAvatarSheetVisible] = useState(false);
  const contentProgress = useRef(new Animated.Value(0)).current;
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const selectedWalletAvatar = normalizeWalletAvatar(
    walletAvatar,
    DEFAULT_WALLET_AVATAR,
  );
  const {keyboardVisible, smallDevice, smallDeviceKeyboardVisible} =
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

  const isDuplicateAccount = accountID => {
    let index = 0;

    while (index < accounts.length && accountID !== accounts[index].id) {
      index++;
    }

    if (index < accounts.length) {
      return true;
    } else {
      return false;
    }
  };

  const validate = () => {
    const res = {valid: false, message: ''};

    if (!profileName || profileName.length < 1) {
      res.message = 'Please enter a wallet name.';
      return res;
    } else if (profileName.length > 50) {
      res.message = 'Please enter a wallet name shorter than 50 characters.';
      return res;
    } else if (isDuplicateAccount(profileName)) {
      res.message = 'A wallet with this name already exists.';
      return res;
    }

    res.valid = true;
    return res;
  };

  const next = () => {
    const {valid, message} = validate();

    if (!valid) {
      setNameError(message);
    } else {
      setNameError(null);
      if (onNext) {
        onNext();
      } else if (navigation) {
        navigation.navigate('CreatePassword');
      }
    }
  };

  const updateProfileName = text => {
    if (nameError) setNameError(null);

    setProfileName(text);
  };

  const openAvatarSheet = () => {
    Keyboard.dismiss();
    setAvatarSheetVisible(true);
  };

  const updateWalletAvatar = nextWalletAvatar => {
    if (typeof setWalletAvatar === 'function') {
      setWalletAvatar(
        normalizeWalletAvatar(nextWalletAvatar, DEFAULT_WALLET_AVATAR),
      );
    }
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

  if (!smallDevice) {
    return (
      <KeyboardAvoidingForm style={signedOutFlowStyles.container}>
        <TouchableWithoutFeedback
          onPress={() => Keyboard.dismiss()}
          accessible={false}>
          <View
            style={[
              signedOutFlowStyles.content,
              signedOutFlowStyles.afterHeaderTitle,
            ]}>
            <Animated.View
              style={[signedOutFlowStyles.form, contentAnimatedStyle]}>
              <View style={styles.walletNameRow}>
                <TouchableOpacity
                  accessibilityLabel="Choose wallet icon and color"
                  accessibilityRole="button"
                  activeOpacity={0.74}
                  onPress={openAvatarSheet}
                  style={styles.avatarButton}>
                  <WalletAvatar
                    walletAvatar={selectedWalletAvatar}
                    size={WALLET_AVATAR_SIZE}
                    emojiSize={WALLET_AVATAR_EMOJI_SIZE}
                  />
                </TouchableOpacity>
                <AppTextInput
                  returnKeyType="done"
                  containerStyle={styles.walletNameInput}
                  errorText={nameError}
                  label="Wallet name"
                  value={profileName}
                  onSubmitEditing={next}
                  onChangeText={updateProfileName}
                  testID="onboarding.name.input"
                />
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
        <WalletAvatarPickerSheet
          visible={avatarSheetVisible}
          walletAvatar={selectedWalletAvatar}
          onChange={updateWalletAvatar}
          onClose={() => setAvatarSheetVisible(false)}
        />
        <SafeBottomActionStack
          bottomSpacing={
            keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 30
          }
          includeBottomInset={!keyboardVisible}
          safeAreaSpacing={
            keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 12
          }>
          <AppButton
            onPress={next}
            disabled={profileName.length == 0}
            testID="onboarding.name.next"
            variant="primary"
            height={56}>
            {'Next'}
          </AppButton>
        </SafeBottomActionStack>
      </KeyboardAvoidingForm>
    );
  }

  return (
    <KeyboardAvoidingForm style={signedOutFlowStyles.container}>
      <TouchableWithoutFeedback
        onPress={() => Keyboard.dismiss()}
        accessible={false}>
        <View style={styles.content}>
          <ScrollView
            bounces={false}
            contentContainerStyle={[
              signedOutFlowStyles.scrollContent,
              signedOutFlowStyles.afterHeaderTitle,
            ]}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Animated.View
              style={[signedOutFlowStyles.form, contentAnimatedStyle]}>
              <View style={styles.walletNameRow}>
                <TouchableOpacity
                  accessibilityLabel="Choose wallet icon and color"
                  accessibilityRole="button"
                  activeOpacity={0.74}
                  onPress={openAvatarSheet}
                  style={styles.avatarButton}>
                  <WalletAvatar
                    walletAvatar={selectedWalletAvatar}
                    size={WALLET_AVATAR_SIZE}
                    emojiSize={WALLET_AVATAR_EMOJI_SIZE}
                  />
                </TouchableOpacity>
                <AppTextInput
                  returnKeyType="done"
                  containerStyle={styles.walletNameInput}
                  errorText={nameError}
                  label="Wallet name"
                  value={profileName}
                  onSubmitEditing={next}
                  onChangeText={updateProfileName}
                  testID="onboarding.name.input"
                />
              </View>
            </Animated.View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
      <WalletAvatarPickerSheet
        visible={avatarSheetVisible}
        walletAvatar={selectedWalletAvatar}
        onChange={updateWalletAvatar}
        onClose={() => setAvatarSheetVisible(false)}
      />
      <SafeBottomActionStack
        bottomSpacing={
          smallDeviceKeyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 30
        }
        includeBottomInset={!smallDeviceKeyboardVisible}
        safeAreaSpacing={
          smallDeviceKeyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 12
        }>
        <AppButton
          onPress={next}
          disabled={profileName.length == 0}
          testID="onboarding.name.next"
          variant="primary"
          height={56}>
          {'Next'}
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
  walletNameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  walletNameInput: {
    flex: 1,
    width: 0,
  },
  avatarButton: {
    width: WALLET_AVATAR_SIZE,
    height: WALLET_AVATAR_SIZE,
    marginTop: WALLET_AVATAR_INPUT_OFFSET,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
