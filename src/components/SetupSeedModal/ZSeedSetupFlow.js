import React, {useMemo, useState} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {QrCode, ShieldEllipsis} from 'lucide-react-native';
import AppButton from '../AppButton';
import TextAction from '../TextAction';
import AppTextInput from '../AppTextInput';
import SafeBottomActionStack from '../SafeBottomActionStack';
import ScanSeed from '../ScanSeed';
import StepGlyph from '../StepGlyph';
import SeedWords from '../../containers/CreateWallet/Forms/CreateSeed/Forms/SeedWords';
import CompactSetupHeader from '../../containers/Onboard/components/CompactSetupHeader';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingSmallDeviceLayout} from '../../hooks/useOnboardingSmallDeviceLayout';
import {useOnboardingTheme} from '../../theme/onboarding';
import {parseDlightSeed} from '../../utils/keys';

const ZSeedSetupFlow = ({cancel, seed, beginSeedSubmission, seedSubmissionIsCurrent, failSeedSubmission, completeSeedSubmission, resetSeedSubmission}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const {smallDevice} = useOnboardingSmallDeviceLayout();
  const [stage, setStage] = useState('intro');
  const [importValue, setImportValue] = useState('');
  const [importError, setImportError] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [showImportValue, setShowImportValue] = useState(false);

  const progress = stage === 'intro' ? 0.16 : 0.5;

  const finish = value => {
    const submission = beginSeedSubmission();
    if (submission != null) completeSeedSubmission(submission, value);
  };

  const verifyImportedSeed = async () => {
    const trimmedValue = importValue.trim();

    if (!trimmedValue) {
      setImportError(
        'Enter a Secret Recovery Phrase or extended Z spending key.',
      );
      return;
    }

    const submission = beginSeedSubmission();
    if (submission == null) return;
    Keyboard.dismiss();
    setImportLoading(true);
    setImportError(null);

    try {
      await parseDlightSeed(trimmedValue);
      if (!seedSubmissionIsCurrent(submission)) return;
      setImportLoading(false);
      completeSeedSubmission(submission, trimmedValue);
    } catch (error) {
      if (!failSeedSubmission(submission)) return;
      setImportError(
        'Enter a valid BIP39 Secret Recovery Phrase or an extended spending key belonging to a Z address.',
      );
      setImportLoading(false);
    }
  };

  const goBack = () => {
    resetSeedSubmission();
    setImportLoading(false);
    Keyboard.dismiss();

    if (stage === 'intro') {
      cancel();
    } else if (stage === 'scan') {
      setStage('import');
    } else {
      setStage('intro');
    }
  };

  if (stage === 'scan') {
    return (
      <ScanSeed
        cancel={() => setStage('import')}
        onScan={value => {
          setImportValue(value);
          setImportError(null);
          setStage('import');
        }}
      />
    );
  }

  if (stage === 'create') {
    return (
      <SeedWords
        completionLabel="Continue to password"
        newSeed={seed}
        onBack={() => setStage('intro')}
        onComplete={() => finish(seed)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <CompactSetupHeader
        onBack={goBack}
        progress={progress}
        title={stage === 'import' ? 'Import Z secret' : null}
      />
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            smallDevice && styles.scrollContentSmall,
            stage === 'import' && styles.scrollContentAfterHeaderTitle,
          ]}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.form}>
            {stage === 'intro' ? (
              <>
                <StepGlyph icon={ShieldEllipsis} />
                <Text
                  style={[styles.title, smallDevice && styles.titleSmall]}>
                  Set up your Z recovery secret
                </Text>
                <Text style={styles.body}>
                  A secondary Z recovery secret protects private addresses and
                  app-encryption capabilities. It is a separate secret, not a
                  preference toggle.
                </Text>
                <View style={styles.notice}>
                  <MaterialCommunityIcons
                    color={theme.colors.warning}
                    name="alert-outline"
                    size={20}
                  />
                  <Text style={styles.noticeText}>
                    Anyone with this Secret Recovery Phrase or spending key can
                    control its funds. Store it offline before continuing.
                  </Text>
                </View>
              </>
            ) : null}

            {stage === 'import' ? (
              <>
                <Text style={styles.body}>
                  Import a valid BIP39 Secret Recovery Phrase (12, 15, 18, 21, or
                  24 words) or an extended Z spending key. New Secret Recovery
                  Phrases created here contain 24 words.
                </Text>
                <AppTextInput
                  editable={!importLoading}
                  autoComplete="off"
                  autoCorrect={false}
                  errorText={importError}
                  importantForAutofill="no"
                  inputShellStyle={styles.importInputShell}
                  label="Secret Recovery Phrase or spending key"
                  multiline={showImportValue}
                  onChangeText={value => {
                    setImportValue(value);
                    setImportError(null);
                  }}
                  onRightPress={() => setShowImportValue(!showImportValue)}
                  placeholder="Enter or scan your secret"
                  rightAccessibilityLabel={
                    showImportValue ? 'Hide secret' : 'Show secret'
                  }
                  rightIcon={showImportValue ? 'eye-off-outline' : 'eye-outline'}
                  secureTextEntry={!showImportValue}
                  spellCheck={false}
                  testID="settings.zSeed.import"
                  textContentType="none"
                  value={importValue}
                />
                <TextAction
                  Icon={QrCode}
                  disabled={importLoading}
                  onPress={() => setStage('scan')}
                  style={styles.scanAction}>
                  Scan QR code
                </TextAction>
              </>
            ) : null}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>

      {stage === 'intro' ? (
        <SafeBottomActionStack gap={10}>
          <AppButton
            height={56}
            onPress={() => setStage('create')}
            testID="settings.zSeed.create"
            variant="primary">
            Create new phrase
          </AppButton>
          <AppButton
            height={52}
            onPress={() => setStage('import')}
            testID="settings.zSeed.openImport"
            variant="secondary">
            Import phrase or key
          </AppButton>
        </SafeBottomActionStack>
      ) : null}

      {stage === 'import' ? (
        <SafeBottomActionStack gap={10}>
          <AppButton
            disabled={!importValue.trim() || importLoading}
            height={56}
            loading={importLoading}
            onPress={verifyImportedSeed}
            testID="settings.zSeed.completeImport"
            variant="primary">
            Continue to password
          </AppButton>
        </SafeBottomActionStack>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      paddingHorizontal: theme.spacing.screenPadding,
      paddingTop: theme.spacing.stepTop,
      paddingBottom: 32,
    },
    scrollContentSmall: {
      paddingTop: theme.spacing.stepTopSmallDevice,
    },
    scrollContentAfterHeaderTitle: {
      paddingTop: theme.spacing.stepTopWithHeaderTitle,
    },
    form: {
      width: '100%',
      maxWidth: 360,
      alignSelf: 'center',
    },
    title: {
      marginBottom: 18,
      color: theme.colors.textPrimary,
      ...theme.typography.headlineLg,
    },
    titleSmall: {
      marginBottom: theme.spacing.stepTitleMarginSmallDevice,
      ...theme.typography.headlineCompact,
    },
    body: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      lineHeight: 24,
      ...fontStyle('regular'),
    },
    notice: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 24,
      padding: 14,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.rounded.md,
    },
    noticeText: {
      minWidth: 0,
      flex: 1,
      color: theme.colors.textSecondary,
      fontSize: 13,
      lineHeight: 19,
      ...fontStyle('regular'),
    },
    importInputShell: {
      minHeight: 56,
      marginTop: 24,
    },
    scanAction: {
      marginTop: 10,
      alignSelf: 'center',
    },
  });

export default ZSeedSetupFlow;
