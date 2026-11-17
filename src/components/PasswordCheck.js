import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button, Dialog, Portal, Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {checkPinForUser} from '../utils/asyncStore/asyncStore';
import {getSupportedBiometryType} from '../utils/keychain/keychain';
import {getBiometricPassword} from '../utils/keychain/biometrics';
import {normalizeWalletAvatar} from '../utils/walletAvatar';
import AppButton from './AppButton';
import AppTextInput from './AppTextInput';
import BottomSheetModal from './BottomSheetModal';
import PasswordInput from './PasswordInput';
import SafeBottomActionStack from './SafeBottomActionStack';
import WalletUnlockLoadingContent from './WalletUnlockLoadingContent';
import WalletAvatar from './WalletAvatar';
import {fontStyle} from '../globals/fonts';
import {useOnboardingTheme} from '../theme/onboarding';

const DEFAULT_DESCRIPTION =
  'Authenticate before continuing with this security-sensitive action.';

const PasswordCheck = props => {
  const {
    account,
    allowBiometry,
    body = DEFAULT_DESCRIPTION,
    cancel,
    centeredLoadingMessage = null,
    createAttemptToken,
    errorMessage,
    networkLabel,
    onInputChange,
    onClosed,
    preferBiometry = false,
    redesigned = false,
    returnSecrets = false,
    submit,
    submitLabel = 'Continue',
    showCenteredLoadingMessage = true,
    showWalletSummary = true,
    suppressSystemAlerts = false,
    title,
    userName,
    visible,
  } = props;
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const {height: windowHeight} = useWindowDimensions();
  const [keyboardFrame, setKeyboardFrame] = useState(null);
  const [password, setPassword] = useState('');
  const [freeze, setFreeze] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [biometryChecked, setBiometryChecked] = useState(false);
  const [biometryAttempted, setBiometryAttempted] = useState(false);
  const [showPasswordFallback, setShowPasswordFallback] = useState(
    !preferBiometry,
  );
  const walletAvatar = normalizeWalletAvatar(account?.walletAvatar);
  const scrollRef = useRef(null);

  // Use the Address Book sheet's available-height rule. Android supplies the
  // frame in show events; Keyboard.metrics() is unavailable in this app.
  useEffect(() => {
    if (!redesigned || !visible) return undefined;
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, event =>
      setKeyboardFrame(event.endCoordinates),
    );
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardFrame(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [redesigned, visible]);

  const revealPassword = useCallback(() => {
    if (keyboardFrame) scrollRef.current?.scrollToEnd({animated: false});
  }, [keyboardFrame]);

  useEffect(revealPassword, [errorMessage, revealPassword]);

  useEffect(() => {
    let active = true;

    setBiometryChecked(false);

    if (!allowBiometry || !account?.biometry) {
      setBiometryType(null);
      setBiometryChecked(true);
      return () => {
        active = false;
      };
    }

    getSupportedBiometryType()
      .then(result => {
        if (active) {
          setBiometryType(result);
          setBiometryChecked(true);
        }
      })
      .catch(() => {
        if (active) {
          setBiometryType(null);
          setBiometryChecked(true);
        }
      });

    return () => {
      active = false;
    };
  }, [account?.biometry, allowBiometry]);

  useEffect(() => {
    if (visible) {
      setBiometryAttempted(false);
      setShowPasswordFallback(!preferBiometry);
    } else {
      setPassword('');
      setFreeze(false);
    }
  }, [account?.accountHash, preferBiometry, visible]);

  const updatePassword = text => {
    setPassword(text);
    if (typeof onInputChange === 'function') onInputChange(text);
  };

  const validatePassword = useCallback(
    async candidate => {
      setFreeze(true);

      try {
        const seeds = await checkPinForUser(
          candidate,
          userName,
          false,
          false,
          !suppressSystemAlerts,
        );

        return returnSecrets
          ? {seeds, valid: true}
          : {password: candidate, valid: true};
      } catch (error) {
        return returnSecrets
          ? {error, valid: false}
          : {error, password: candidate, valid: false};
      } finally {
        setFreeze(false);
      }
    },
    [returnSecrets, suppressSystemAlerts, userName],
  );

  const beginAttempt = useCallback(
    () =>
      typeof createAttemptToken === 'function'
        ? createAttemptToken()
        : undefined,
    [createAttemptToken],
  );

  const submitPassword = useCallback(
    async (candidate, attemptToken = beginAttempt()) => {
      const result = await validatePassword(candidate);
      await submit(
        attemptToken === undefined ? result : {...result, attemptToken},
      );

      if (result.valid) setPassword('');
      return result;
    },
    [beginAttempt, submit, validatePassword],
  );

  const tryBiometricAuth = useCallback(async () => {
    if (!biometryType?.biometry || !account?.accountHash) {
      if (preferBiometry) setShowPasswordFallback(true);
      return;
    }

    const attemptToken = beginAttempt();

    try {
      if (preferBiometry) setShowPasswordFallback(false);
      setFreeze(true);
      const biometricPassword = await getBiometricPassword(
        account.accountHash,
        `Authenticate to access ${account.id}`,
      );
      const result = await submitPassword(biometricPassword, attemptToken);

      if (preferBiometry && !result.valid) {
        setShowPasswordFallback(true);
      }
    } catch {
      if (preferBiometry) setShowPasswordFallback(true);
    } finally {
      setFreeze(false);
      setPassword('');
    }
  }, [
    account?.accountHash,
    account?.id,
    beginAttempt,
    biometryType?.biometry,
    preferBiometry,
    submitPassword,
  ]);

  useEffect(() => {
    if (
      !visible ||
      !preferBiometry ||
      !biometryChecked ||
      biometryAttempted
    ) {
      return;
    }

    setBiometryAttempted(true);

    if (!account?.biometry || !biometryType?.biometry) {
      setShowPasswordFallback(true);
      return;
    }

    tryBiometricAuth();
  }, [
    account?.biometry,
    biometryAttempted,
    biometryChecked,
    biometryType?.biometry,
    preferBiometry,
    tryBiometricAuth,
    visible,
  ]);

  const passwordFallbackVisible = !preferBiometry || showPasswordFallback;
  const waitingForPreferredBiometry =
    preferBiometry &&
    visible &&
    !showPasswordFallback &&
    !biometryChecked;
  const showCenteredLoading =
    centeredLoadingMessage != null &&
    (freeze || waitingForPreferredBiometry);

  if (redesigned) {
    return (
      <BottomSheetModal
        avoidKeyboard
        closeDisabled={freeze}
        contentContainerStyle={[
          styles.sheet,
          keyboardFrame && styles.sheetWithKeyboard,
        ]}
        maxHeight={
          keyboardFrame
            ? Math.max(1, windowHeight - keyboardFrame.height - insets.top - 12 - 8)
            : '86%'
        }
        onClose={cancel}
        onClosed={() => {
          setKeyboardFrame(null);
          onClosed?.();
        }}
        visible={visible}>
        <View style={styles.sheetLayout}>
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          <View style={[styles.scrollFrame, !body && styles.contentWithoutBody]}>
            <ScrollView
              ref={scrollRef}
              bounces={false}
              contentContainerStyle={styles.content}
              keyboardDismissMode={
                Platform.OS === 'ios' ? 'interactive' : 'on-drag'
              }
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={revealPassword}
              onLayout={revealPassword}
              showsVerticalScrollIndicator={Boolean(keyboardFrame)}>
              {showWalletSummary && account ? (
                <View style={styles.walletSummary}>
                  <View style={styles.walletIcon}>
                    {walletAvatar ? (
                      <WalletAvatar
                        emojiSize={19}
                        size={36}
                        walletAvatar={walletAvatar}
                      />
                    ) : (
                      <MaterialCommunityIcons
                        color={theme.colors.textSubtle}
                        name="wallet-outline"
                        size={24}
                      />
                    )}
                  </View>
                  <View style={styles.walletCopy}>
                    <Text numberOfLines={1} style={styles.walletName}>
                      {account.id}
                    </Text>
                    {networkLabel ? (
                      <Text style={styles.walletNetwork}>{networkLabel}</Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {showCenteredLoading ? (
                <WalletUnlockLoadingContent
                  message={centeredLoadingMessage}
                  showMessage={showCenteredLoadingMessage}
                />
              ) : (
                <>
                  {passwordFallbackVisible ? (
                    <AppTextInput
                      autoComplete="off"
                      autoCorrect={false}
                      importantForAutofill="no"
                      label="Wallet password"
                      onChangeText={updatePassword}
                      onSubmitEditing={() => {
                        if (!freeze && password.length > 0) {
                          submitPassword(password);
                        }
                      }}
                      placeholder="Enter password"
                      returnKeyType="go"
                      secureTextEntry
                      testID="settings.passwordCheck.password"
                      textContentType="none"
                      value={password}
                    />
                  ) : null}
                  {errorMessage ? (
                    <Text
                      accessibilityLiveRegion="polite"
                      style={styles.error}
                      testID="settings.passwordCheck.error">
                      {errorMessage}
                    </Text>
                  ) : null}
                  {freeze || waitingForPreferredBiometry ? (
                    <View style={styles.loadingRow}>
                      <ActivityIndicator
                        color={theme.colors.primary}
                        size="small"
                      />
                      <Text style={styles.loadingText}>
                        {freeze
                          ? 'Authenticating…'
                          : 'Preparing biometric unlock…'}
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </View>
          {!showCenteredLoading ? (
            <SafeBottomActionStack
              bottomSpacing={keyboardFrame ? 8 : 20}
              horizontalSpacing={20}
              includeBottomInset={false}
              safeAreaSpacing={0}
              style={[
                styles.buttonStack,
                keyboardFrame && styles.buttonStackWithKeyboard,
              ]}>
              <View style={styles.actions}>
                <AppButton
                  disabled={freeze}
                  height={52}
                  onPress={cancel}
                  style={styles.action}
                  variant="secondary">
                  Cancel
                </AppButton>
                {passwordFallbackVisible &&
                allowBiometry &&
                biometryType?.biometry ? (
                  <AppButton
                    disabled={freeze}
                    height={52}
                    onPress={tryBiometricAuth}
                    style={styles.action}
                    variant="secondary">
                    {biometryType.display_name}
                  </AppButton>
                ) : null}
                {passwordFallbackVisible ? (
                  <AppButton
                    disabled={freeze || password.length === 0}
                    height={52}
                    onPress={() => submitPassword(password)}
                    style={styles.action}
                    testID="settings.passwordCheck.submit"
                    variant="primary">
                    {submitLabel}
                  </AppButton>
                ) : null}
              </View>
            </SafeBottomActionStack>
          ) : null}
        </View>
      </BottomSheetModal>
    );
  }

  return (
    <Portal>
      <Dialog dismissable={!freeze} onDismiss={cancel} visible={visible}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <PasswordInput value={password} onChangeText={updatePassword} />
        </Dialog.Content>
        <Dialog.Actions>
          <Button disabled={freeze} onPress={cancel}>
            Cancel
          </Button>
          {allowBiometry && biometryType?.biometry ? (
            <Button disabled={freeze} onPress={tryBiometricAuth}>
              {biometryType.display_name}
            </Button>
          ) : null}
          <Button disabled={freeze} onPress={() => submitPassword(password)}>
            Done
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    sheet: {
      paddingTop: 22,
    },
    sheetWithKeyboard: {
      paddingTop: 12,
      marginBottom: 8,
    },
    sheetLayout: {
      flexShrink: 1,
    },
    scrollFrame: {
      flexShrink: 1,
      minHeight: 0,
      overflow: 'hidden',
    },
    content: {
      width: '100%',
      paddingHorizontal: 20,
    },
    contentWithoutBody: {
      marginTop: 18,
    },
    title: {
      ...theme.typography.titleSheet,
      color: theme.colors.textPrimary,
      marginHorizontal: 20,
    },
    body: {
      marginHorizontal: 20,
      marginTop: 6,
      marginBottom: 18,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      ...fontStyle('regular'),
    },
    walletSummary: {
      minHeight: 58,
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.rounded.md,
    },
    walletIcon: {
      width: 36,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    walletCopy: {
      minWidth: 0,
      flex: 1,
    },
    walletName: {
      color: theme.colors.textPrimary,
      fontSize: 16,
      lineHeight: 21,
      ...fontStyle('semiBold'),
    },
    walletNetwork: {
      marginTop: 1,
      color: theme.colors.textSubtle,
      fontSize: 12,
      lineHeight: 17,
      ...fontStyle('regular'),
    },
    error: {
      marginTop: 9,
      color: theme.colors.danger,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
    },
    loadingText: {
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
      ...fontStyle('regular'),
    },
    actions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    buttonStack: {
      flexShrink: 0,
      paddingTop: 22,
    },
    buttonStackWithKeyboard: {
      paddingTop: 12,
    },
    action: {
      minWidth: 96,
      flexGrow: 1,
    },
  });

export default PasswordCheck;
