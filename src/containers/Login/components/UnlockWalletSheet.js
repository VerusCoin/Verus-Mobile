import {INCORRECT_PASSWORD_MESSAGE} from '../../../utils/constants/errors';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  initializeAccountData,
  refreshAccountData,
} from '../../../actions/actionDispatchers';
import AppButton from '../../../components/AppButton';
import TextAction from '../../../components/TextAction';
import AppTextInput from '../../../components/AppTextInput';
import {getBiometryIconComponent} from '../../../components/BiometricAffordanceIcon';
import BottomSheetModal from '../../../components/BottomSheetModal';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import WalletUnlockLoadingContent from '../../../components/WalletUnlockLoadingContent';
import WalletAvatar from '../../../components/WalletAvatar';
import {fontStyle} from '../../../globals/fonts';
import {useOnboardingSmallDeviceLayout} from '../../../hooks/useOnboardingSmallDeviceLayout';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {getBiometricPassword} from '../../../utils/keychain/biometrics';
import {getSupportedBiometryType} from '../../../utils/keychain/keychain';
import {normalizeWalletAvatar} from '../../../utils/walletAvatar';
import {useButtonHeight} from '../../../hooks/useButtonHeight';

const BIOMETRY_UNAVAILABLE_MESSAGE =
  'Biometric unlock is unavailable. Enter your password to continue.';
const PASSWORD_AUTO_FOCUS_DELAY_MS = 260;
// The Android modal root starts below the status bar, but keyboard avoidance
// measures from the window top. Without this offset the sheet ends below the
// keyboard top by the status bar height.
const KEYBOARD_ROOT_OFFSET =
  Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0;
const KEYBOARD_SHEET_BOTTOM_SPACING = 8;
const KEYBOARD_SHEET_TOP_SPACING = 12;
const PASSWORD_FIELD_HEIGHT = 83;
const PASSWORD_BUTTON_TOP_MARGIN = 16;
const BIOMETRY_ACTION_TOTAL_HEIGHT = 78;
// A wallet with Face ID or Touch ID shows the unlocking state while the
// biometric read runs. The password form shows only after the read fails, is
// cancelled, or biometrics are unavailable. "Idle" is the state before the
// automatic read on opening, so the first frame already shows the loader.
const BIOMETRY_IDLE = 'idle';
const BIOMETRY_RUNNING = 'running';
const BIOMETRY_DONE = 'done';

const formatErrorMessage = error => {
  if (isIncorrectPasswordError(error)) return INCORRECT_PASSWORD_MESSAGE;

  const message =
    error && error.message ? error.message : 'Unable to unlock wallet';

  return /[.!?]$/.test(message) ? message : `${message}.`;
};

const isIncorrectPasswordError = error =>
  error && error.message === 'Incorrect password';

const getBiometryDisplayName = supportedBiometryType => {
  const displayName = supportedBiometryType
    ? supportedBiometryType.display_name
    : null;

  return displayName && displayName !== 'None' ? displayName : null;
};

const getBiometryLabel = supportedBiometryType => {
  const displayName = getBiometryDisplayName(supportedBiometryType);

  return displayName ? `Use ${displayName}` : 'Use biometrics';
};

// The iOS keychain reports a cancelled prompt as errSecUserCanceled (-128).
// The Android biometric module reports its own code.
const isBiometricCancelError = error =>
  error != null &&
  (String(error.code) === '-128' ||
    error.code === 'E_BIOMETRIC_AUTH_CANCELLED');

const getBiometryCancelledMessage = supportedBiometryType => {
  const displayName = getBiometryDisplayName(supportedBiometryType);

  return displayName
    ? `${displayName} was cancelled.`
    : 'Biometric unlock was cancelled.';
};

const UnlockWalletSheet = ({
  visible,
  account,
  title,
  requestLabel,
  useRefreshAccountData = false,
  closeOnUnlocked = true,
  onClose,
  onClosed,
  onUnlocked,
}) => {
  const theme = useOnboardingTheme();
  const buttonHeight = useButtonHeight();
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const {smallDeviceKeyboardVisible} = useOnboardingSmallDeviceLayout();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [biometryStatus, setBiometryStatus] = useState(BIOMETRY_IDLE);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [displayAccount, setDisplayAccount] = useState(account);
  const [keyboardTop, setKeyboardTop] = useState(null);
  const passwordInputRef = useRef(null);
  const scrollRef = useRef(null);
  // The closing sheet keeps showing the last account after the parent clears it.
  const sheetAccount = account || displayAccount;
  const biometryEnabled = !!(sheetAccount && sheetAccount.biometry);
  const awaitingBiometry =
    biometryStatus === BIOMETRY_RUNNING ||
    (biometryEnabled && biometryStatus === BIOMETRY_IDLE);
  const showLoading = loading || awaitingBiometry;

  const focusPasswordInput = useCallback(() => {
    if (passwordInputRef.current != null) {
      passwordInputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (account == null) {
      return;
    }

    setDisplayAccount(account);
  }, [account]);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setLoading(false);
      setErrorMessage(null);
      setBiometryStatus(BIOMETRY_IDLE);
      setSupportedBiometryType(null);
      setShowPassword(false);
    }
  }, [account ? account.accountHash : null, visible]);

  useEffect(() => {
    setKeyboardTop(null);
    if (!visible) return undefined;

    const showSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      event => setKeyboardTop(event.endCoordinates.screenY),
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardTop(null),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [visible]);

  const tryUnlockAccount = useCallback(
    async key => {
      if (!account || !key || loading) {
        return;
      }

      setLoading(true);
      setErrorMessage(null);
      Keyboard.dismiss();

      try {
        if (useRefreshAccountData) {
          await refreshAccountData(
            account.accountHash,
            key,
            undefined,
            false,
          );
        } else {
          await initializeAccountData(
            account,
            key,
            undefined,
            false,
          );
        }

        if (typeof onUnlocked === 'function') {
          onUnlocked(account);
        }

        if (closeOnUnlocked) {
          onClose();
        }
      } catch (e) {
        if (!isIncorrectPasswordError(e)) {
          console.warn(e);
        }

        setLoading(false);
        setErrorMessage(formatErrorMessage(e));
      }
    },
    [
      account,
      closeOnUnlocked,
      loading,
      onClose,
      onUnlocked,
      useRefreshAccountData,
    ],
  );

  const tryBiometricUnlock = useCallback(
    async (fromButton = false) => {
      if (!visible || !account || loading || !account.biometry) {
        return;
      }

      const usePassword = (message = BIOMETRY_UNAVAILABLE_MESSAGE) => {
        if (fromButton) {
          setErrorMessage(message);
        }

        setBiometryStatus(BIOMETRY_DONE);
      };

      // The automatic read keeps the loader from the first frame. A tap on the
      // button checks support first, so an unavailable sensor keeps the form
      // and its keyboard in place.
      if (!fromButton) {
        setBiometryStatus(BIOMETRY_RUNNING);
      }

      let supported = null;

      try {
        supported = await getSupportedBiometryType();

        setSupportedBiometryType(supported);

        if (!supported.biometry) {
          usePassword();
          return;
        }

        setBiometryStatus(BIOMETRY_RUNNING);
        setErrorMessage(null);
        Keyboard.dismiss();

        const biometricPassword = await getBiometricPassword(
          account.accountHash,
          'Authenticate to unlock wallet',
        );

        if (biometricPassword == null) {
          usePassword();
          return;
        }

        setPassword(biometricPassword);
        // The unlock shows its own loading state and error. The biometric
        // wait ends after it, so the form never shows between the two.
        await tryUnlockAccount(biometricPassword);
        setBiometryStatus(BIOMETRY_DONE);
      } catch (e) {
        if (isBiometricCancelError(e)) {
          usePassword(getBiometryCancelledMessage(supported));
          return;
        }

        console.warn(e);
        usePassword();
      }
    },
    [account, loading, tryUnlockAccount, visible],
  );

  useEffect(() => {
    if (!visible || !account || showLoading) {
      return undefined;
    }

    const focusTimeout = setTimeout(
      focusPasswordInput,
      PASSWORD_AUTO_FOCUS_DELAY_MS,
    );

    return () => clearTimeout(focusTimeout);
  }, [
    account ? account.accountHash : null,
    focusPasswordInput,
    showLoading,
    visible,
  ]);

  useEffect(() => {
    if (
      !visible ||
      !account ||
      !account.biometry ||
      loading ||
      biometryStatus !== BIOMETRY_IDLE
    ) {
      return;
    }

    tryBiometricUnlock(false);
  }, [account, biometryStatus, loading, tryBiometricUnlock, visible]);

  // With the keyboard open the form can be taller than the sheet. Show the
  // field and its spacing above the Unlock button.
  useEffect(() => {
    if (keyboardTop == null || showLoading) return undefined;

    const timer = setTimeout(() => {
      if (scrollRef.current != null) {
        scrollRef.current.scrollToEnd({animated: false});
      }
    }, 80);

    return () => clearTimeout(timer);
  }, [keyboardTop, showLoading]);

  // Reset once the sheet has closed, so its next opening shows the right state
  // on the first frame.
  const handleClosed = useCallback(() => {
    setPassword('');
    setLoading(false);
    setErrorMessage(null);
    setBiometryStatus(BIOMETRY_IDLE);

    if (typeof onClosed === 'function') {
      onClosed();
    }
  }, [onClosed]);

  const walletAvatar = normalizeWalletAvatar(
    sheetAccount ? sheetAccount.walletAvatar : null,
  );
  const disabled = password.length === 0 || loading || !account;
  const showBiometryAction = biometryEnabled;
  const loadingContentHeight = PASSWORD_FIELD_HEIGHT + buttonHeight +
    (showBiometryAction ? BIOMETRY_ACTION_TOTAL_HEIGHT : PASSWORD_BUTTON_TOP_MARGIN);
  const keyboardVisible = keyboardTop != null;
  // A percentage would shrink again inside the keyboard-avoiding container.
  // Screen coordinates also avoid subtracting the keyboard twice on Android.
  const keyboardSheetHeight = Math.max(
    1,
    Math.min(
      windowHeight * 0.64,
      Math.min(windowHeight, keyboardTop) -
        insets.top -
        KEYBOARD_SHEET_TOP_SPACING -
        KEYBOARD_SHEET_BOTTOM_SPACING,
    ),
  );

  return (
    <BottomSheetModal
      visible={visible}
      onClose={showLoading ? () => {} : onClose}
      onClosed={handleClosed}
      avoidKeyboard
      keyboardVerticalOffset={KEYBOARD_ROOT_OFFSET}
      maxHeight={keyboardVisible ? keyboardSheetHeight : '64%'}
      contentContainerStyle={
        keyboardVisible && {marginBottom: KEYBOARD_SHEET_BOTTOM_SPACING}
      }>
      <View style={styles.sheetLayout}>
        <View style={styles.scrollFrame}>
          <ScrollView
            ref={scrollRef}
            bounces={false}
            contentContainerStyle={[
              signedOutSheetStyles.body,
              !showLoading && styles.formContent,
              !showLoading && !showBiometryAction && styles.passwordContent,
            ]}
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            keyboardShouldPersistTaps="handled">
            {(title || requestLabel) && (
              <View
                style={[
                  styles.contextHeader,
                  smallDeviceKeyboardVisible && styles.contextHeaderTight,
                ]}>
                {title && <Text style={styles.contextTitle}>{title}</Text>}
                {requestLabel && (
                  <Text style={styles.contextLabel}>{requestLabel}</Text>
                )}
              </View>
            )}
            <View
              style={[
                styles.header,
                smallDeviceKeyboardVisible && styles.headerTight,
              ]}>
              <View style={styles.walletIdentity}>
                <View style={styles.walletIcon}>
                  {walletAvatar ? (
                    <WalletAvatar
                      walletAvatar={walletAvatar}
                      size={42}
                      emojiSize={22}
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name="wallet-outline"
                      size={26}
                      color={theme.colors.primary}
                    />
                  )}
                </View>
                <Text numberOfLines={1} style={styles.walletName}>
                  {sheetAccount ? sheetAccount.id : ''}
                </Text>
              </View>
            </View>
            {showLoading ? (
              <WalletUnlockLoadingContent height={loadingContentHeight} />
            ) : (
              <>
                <AppTextInput
                  ref={passwordInputRef}
                  themeMode={theme.mode}
                  returnKeyType="done"
                  label="Password"
                  value={password}
                  onChangeText={text => {
                    setPassword(text);
                    setErrorMessage(null);
                  }}
                  onSubmitEditing={() => {
                    if (!disabled) {
                      tryUnlockAccount(password);
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  enablesReturnKeyAutomatically
                  placeholder="Enter password"
                  rightAccessibilityLabel={
                    showPassword ? 'Hide password' : 'Show password'
                  }
                  rightIcon={showPassword ? 'eye-off' : 'eye'}
                  secureTextEntry={!showPassword}
                  onRightPress={() => setShowPassword(value => !value)}
                />
                {errorMessage != null && (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                )}
                {showBiometryAction && (
                  <TextAction
                    Icon={getBiometryIconComponent(supportedBiometryType, true)}
                    onPress={() => tryBiometricUnlock(true)}
                    style={styles.biometryAction}>
                    {getBiometryLabel(supportedBiometryType)}
                  </TextAction>
                )}
              </>
            )}
          </ScrollView>
        </View>
        {!showLoading && (
          <SafeBottomActionStack
            bottomSpacing={keyboardVisible ? KEYBOARD_SHEET_BOTTOM_SPACING : 22}
            gap={0}
            horizontalSpacing={20}
            includeBottomInset={false}
            safeAreaSpacing={0}>
            <AppButton
              themeMode={theme.mode}
              onPress={() => tryUnlockAccount(password)}
              disabled={disabled}
              height={buttonHeight}>
              {'Unlock'}
            </AppButton>
          </SafeBottomActionStack>
        )}
      </View>
    </BottomSheetModal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
  sheetLayout: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollFrame: {
    flexGrow: 0,
    flexShrink: 1,
    minHeight: 0,
    overflow: 'hidden',
  },
  formContent: {
    paddingBottom: 0,
  },
  contextHeader: {
    marginBottom: 20,
  },
  contextHeaderTight: {
    marginBottom: 12,
  },
  contextTitle: {
    color: theme.colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    ...fontStyle('semiBold'),
  },
  contextLabel: {
    marginTop: 4,
    color: theme.colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  header: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTight: {
    marginBottom: 12,
  },
  walletIdentity: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  walletIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: theme.colors.surfaceMuted,
  },
  walletName: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 22,
    ...fontStyle('semiBold'),
  },
  errorText: {
    marginTop: 8,
    color: theme.colors.danger,
    fontSize: 13,
    ...fontStyle('regular'),
  },
  biometryAction: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 14,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  passwordContent: {
    paddingBottom: PASSWORD_BUTTON_TOP_MARGIN,
  },
});

export default UnlockWalletSheet;
