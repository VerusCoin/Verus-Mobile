import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {Nfc} from 'lucide-react-native';
import {createAlert} from '../../../../../actions/actions/alert/dispatchers/alert';
import AppButton from '../../../../../components/AppButton';
import AppTextInput from '../../../../../components/AppTextInput';
import KeyboardAvoidingForm from '../../../../../components/KeyboardAvoidingForm';
import NfcTapView from '../../../../../components/NfcTap/NfcTapView';
import SafeBottomActionStack from '../../../../../components/SafeBottomActionStack';
import StepGlyph from '../../../../../components/StepGlyph';
import {
  ONBOARDING_KEYBOARD_FOOTER_SPACING,
  useOnboardingSmallDeviceLayout,
} from '../../../../../hooks/useOnboardingSmallDeviceLayout';
import {createSignedOutFlowStyles} from '../../../../../styles';
import {useOnboardingTheme} from '../../../../../theme/onboarding';
import {
  isValid24WordBip39Mnemonic,
  walletBackupOrdinalToMnemonic,
  walletBackupRequiresPassword,
} from '../../../../../utils/walletBackup/walletBackup';
import {
  beginWalletBackupNfcSession,
  cancelWalletBackupNfcRequest,
  endWalletBackupNfcSession,
  readWalletBackupFromNfc,
} from '../../../../../utils/walletBackup/walletBackupNfc';
import {
  getNfcTapFailure,
  getNfcTapText,
  NFC_TAP_PHASE,
  NFC_TAP_TASK,
} from '../../../../../utils/walletBackup/nfcTapText';
import {
  activateKeepAwake,
  deactivateKeepAwake,
} from '../../../../../utils/keepAwake/keepAwake';

// How long the check stays on screen before the next step.
const DONE_HOLD_MS = 900;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

export default function ImportNfc({
  autoStart = false,
  setImportedSeed,
  onComplete,
}) {
  const theme = useOnboardingTheme();
  const signedOutFlowStyles = useMemo(
    () => createSignedOutFlowStyles(theme),
    [theme],
  );
  const {keyboardVisible, smallDevice} = useOnboardingSmallDeviceLayout();
  const scrollRef = useRef(null);
  // The NFC tap step while the card is read, or the failed read.
  const [nfcTap, setNfcTap] = useState(null);
  const [walletBackupOrdinal, setWalletBackupOrdinal] = useState(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const autoStartHandled = useRef(false);
  const importInProgressRef = useRef(false);

  const waitForSpinnerFrame = () => {
    return new Promise(resolve => setTimeout(resolve, 0));
  };

  const finishImport = async mnemonic => {
    setImportedSeed(mnemonic);
    await onComplete(mnemonic, {
      useSeedAsZ: isValid24WordBip39Mnemonic(mnemonic),
    });
  };

  const importWalletBackup = async (
    backupOrdinal,
    password,
    showDecrypting = false,
  ) => {
    if (showDecrypting) {
      setDecrypting(true);
      await waitForSpinnerFrame();
    }

    let keepAwakeActive = false;

    try {
      activateKeepAwake();
      keepAwakeActive = true;

      await waitForSpinnerFrame();

      const mnemonic = walletBackupOrdinalToMnemonic({
        walletBackupOrdinal: backupOrdinal,
        password,
      });

      await finishImport(mnemonic);
    } catch (e) {
      createAlert('Error', e.message || 'Unable to import NFC wallet backup.');
    } finally {
      if (keepAwakeActive) {
        deactivateKeepAwake();
      }

      if (showDecrypting) {
        setDecrypting(false);
      }
    }
  };

  const scanCard = async () => {
    if (importInProgressRef.current) return;
    importInProgressRef.current = true;

    let nfcSessionPreRegistered = false;
    let nfcReaderStarted = false;
    let failedStep = null;
    let doneAt = null;

    try {
      Keyboard.dismiss();
      setNfcTap(getNfcTapText(NFC_TAP_TASK.RESTORE, NFC_TAP_PHASE.WAITING));
      nfcSessionPreRegistered = await beginWalletBackupNfcSession();

      nfcReaderStarted = true;
      const scannedBackupOrdinal = await readWalletBackupFromNfc({
        onPhase: phase => {
          if (phase === NFC_TAP_PHASE.DONE) doneAt = Date.now();
          setNfcTap(getNfcTapText(NFC_TAP_TASK.RESTORE, phase));
        },
        sessionPreRegistered: nfcSessionPreRegistered,
      });

      const shownFor = doneAt == null ? 0 : Date.now() - doneAt;
      if (shownFor < DONE_HOLD_MS) await delay(DONE_HOLD_MS - shownFor);

      if (walletBackupRequiresPassword(scannedBackupOrdinal)) {
        setWalletBackupOrdinal(scannedBackupOrdinal);
        setBackupPassword('');
        return;
      }

      await importWalletBackup(scannedBackupOrdinal, null);
    } catch (e) {
      // A cancelled session goes back to the start without a message.
      failedStep = getNfcTapFailure(NFC_TAP_TASK.RESTORE, e);
      // Known card results are normal steps. Log only unexpected errors.
      if (failedStep != null && e?.code == null) console.error(e);
    } finally {
      try {
        if (nfcSessionPreRegistered && !nfcReaderStarted) {
          await endWalletBackupNfcSession();
        }
      } finally {
        setNfcTap(failedStep);
        importInProgressRef.current = false;
      }
    }
  };

  useEffect(() => {
    if (!autoStart || autoStartHandled.current) return;

    autoStartHandled.current = true;
    scanCard();
  }, [autoStart]);

  const importEncryptedBackup = async () => {
    if (importInProgressRef.current) return;
    importInProgressRef.current = true;

    try {
      Keyboard.dismiss();
      await importWalletBackup(walletBackupOrdinal, backupPassword, true);
    } finally {
      importInProgressRef.current = false;
    }
  };

  if (nfcTap != null) {
    const ended =
      nfcTap.phase === NFC_TAP_PHASE.FAILED ||
      nfcTap.phase === NFC_TAP_PHASE.NOTICE;
    // iOS has its own Cancel in the scan sheet.
    const canCancel =
      nfcTap.phase === NFC_TAP_PHASE.WAITING && Platform.OS === 'android';

    return (
      <NfcTapView
        {...nfcTap}
        actions={
          ended
            ? [
                {label: 'Try again', onPress: scanCard, variant: 'primary'},
                {cancel: true, label: 'Cancel', onPress: () => setNfcTap(null)},
              ]
            : canCancel
            ? [
                {
                  cancel: true,
                  label: 'Cancel',
                  onPress: cancelWalletBackupNfcRequest,
                },
              ]
            : []
        }
        testID="importNfc.nfcTap"
      />
    );
  }

  const encrypted = walletBackupOrdinal != null;
  // Above the keyboard the password field can reach the actions; keep it in
  // view, as the password step does.
  const scrollToEndWithKeyboard = () => {
    if (keyboardVisible) scrollRef.current?.scrollToEnd({animated: true});
  };

  // An icon-led step: the glyph, the large title and one line, then either the
  // scan action or the password for an encrypted backup.
  return (
    <KeyboardAvoidingForm style={signedOutFlowStyles.container}>
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <View style={styles.content}>
          <ScrollView
            ref={scrollRef}
            bounces={false}
            contentContainerStyle={[
              signedOutFlowStyles.scrollContent,
              smallDevice && signedOutFlowStyles.scrollContentSmallDevice,
            ]}
            keyboardDismissMode={
              Platform.OS === 'ios' ? 'interactive' : 'on-drag'
            }
            keyboardShouldPersistTaps="handled"
            onContentSizeChange={scrollToEndWithKeyboard}
            onLayout={scrollToEndWithKeyboard}
            showsVerticalScrollIndicator={false}>
            <View style={signedOutFlowStyles.form}>
              <StepGlyph icon={Nfc} />
              <Text
                style={[
                  signedOutFlowStyles.title,
                  smallDevice && signedOutFlowStyles.titleSmallDevice,
                  styles.title,
                ]}>
                {'Import using NFC'}
              </Text>
              <Text style={signedOutFlowStyles.body}>
                {encrypted
                  ? 'This NFC wallet backup is encrypted.'
                  : 'Scan a Verus NFC wallet backup card to import its Secret Recovery Phrase.'}
              </Text>
              {encrypted ? (
                <AppTextInput
                  containerStyle={styles.passwordField}
                  editable={!decrypting}
                  helperText={
                    decrypting
                      ? 'Decrypting your wallet backup. This can take a few minutes.'
                      : 'The wallet password or backup password used when the card was written.'
                  }
                  label="Password"
                  onChangeText={setBackupPassword}
                  onRightPress={() => setShowPassword(!showPassword)}
                  onSubmitEditing={
                    backupPassword.length > 0
                      ? importEncryptedBackup
                      : undefined
                  }
                  returnKeyType="done"
                  rightAccessibilityLabel={
                    showPassword
                      ? 'Hide backup password'
                      : 'Show backup password'
                  }
                  rightIcon={showPassword ? 'eye-off' : 'eye'}
                  secureTextEntry={!showPassword}
                  themeMode={theme.mode}
                  value={backupPassword}
                />
              ) : null}
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
      <SafeBottomActionStack
        bottomSpacing={
          keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 30
        }
        gap={10}
        includeBottomInset={!keyboardVisible}
        safeAreaSpacing={
          keyboardVisible ? ONBOARDING_KEYBOARD_FOOTER_SPACING : 12
        }>
        {encrypted ? (
          <>
            <AppButton
              disabled={decrypting || backupPassword.length === 0}
              loading={decrypting}
              onPress={importEncryptedBackup}
              variant="primary">
              {'Decrypt and import'}
            </AppButton>
            <AppButton
              disabled={decrypting}
              onPress={() => {
                setWalletBackupOrdinal(null);
                setBackupPassword('');
              }}
              variant="secondary">
              {'Scan different card'}
            </AppButton>
          </>
        ) : (
          <AppButton onPress={scanCard} variant="primary">
            {'Scan NFC backup'}
          </AppButton>
        )}
      </SafeBottomActionStack>
    </KeyboardAvoidingForm>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 32,
  },
  title: {
    marginBottom: 14,
  },
  passwordField: {
    marginTop: 24,
  },
});
