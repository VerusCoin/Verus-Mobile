import {useRequestBackHandler} from '../useRequestNavigation';
import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Keyboard,
  Platform,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {Text} from 'react-native-paper';
import {Info} from 'lucide-react-native';
import {SPENDABLE_KEY_DETAILS_VDXF_KEY} from 'verus-typescript-primitives';
import {useSelector} from 'react-redux';
import {SafeAreaView} from 'react-native-safe-area-context';
import store from '../../../store';
import {setDeeplinkPassthroughData} from '../../../actions/actions/deeplink/creators/deeplink';
import {
  captureSessionScope,
  sessionScopeIsCurrent,
} from '../../../actions/actions/updates/sessionRequests';
import {
  requestWalletUnlock,
  WALLET_UNLOCK_CANCELLED,
} from '../../../actions/actionDispatchers';
import {
  createAlert,
  resolveAlert,
} from '../../../actions/actions/alert/dispatchers/alert';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import scorePassword from '../../../utils/auth/scorePassword';
import {requestPassword, requestSeeds} from '../../../utils/auth/authBox';
import {
  MIN_PASS_LENGTH,
  MIN_PASS_SCORE,
  PASS_SCORE_LIMIT,
} from '../../../utils/constants/constants';
import {ELECTRUM} from '../../../utils/constants/intervalConstants';
import {withKeepAwake} from '../../../utils/keepAwake/keepAwake';
import {
  WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS,
  WALLET_BACKUP_ENCRYPTION_ITERS_MEDIUM,
  buildWalletBackupOrdinal,
  isValid24WordBip39Mnemonic,
} from '../../../utils/walletBackup/walletBackup';
import {
  getWalletBackupCompletionKey,
  markWalletBackupRequestComplete,
} from '../../../utils/walletBackup/walletBackupCompletionStorage';
import {
  beginWalletBackupNfcSession,
  cancelWalletBackupNfcRequest,
  endWalletBackupNfcSession,
  writeWalletBackupToNfc,
} from '../../../utils/walletBackup/walletBackupNfc';
import {
  getNfcTapFailure,
  getNfcTapText,
  NFC_TAP_PHASE,
  NFC_TAP_TASK,
} from '../../../utils/walletBackup/nfcTapText';
import {walletBackupRequestInfoStyles as createStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import AppButton from '../../../components/AppButton';
import TextAction from '../../../components/TextAction';
import AppTextInput from '../../../components/AppTextInput';
import NfcTapView from '../../../components/NfcTap/NfcTapView';
import PasswordCheck from '../../../components/PasswordCheck';
import KeyboardAvoidingForm from '../../../components/KeyboardAvoidingForm';
import ProgressHeader from '../../../components/ProgressHeader';
import CreateProfile from '../../Onboard/CreateProfile/CreateProfile';
import WalletBackupEntry from './WalletBackupEntry';
import WalletBackupPhrase from './WalletBackupPhrase';
import {savePendingDeeplinkRequest} from '../../../utils/deeplink/pendingDeeplinkStorage';
import SafeBottomActionStack from '../../../components/SafeBottomActionStack';
import SelectionSheet, {SelectionRow} from '../../../components/SelectionSheet';
import useSheetDismissal from '../../../components/useSheetDismissal';
import {
  SettingsProfileSummary,
  SettingsRow,
  SettingsSection,
  SettingsSwitchRow,
} from '../../Settings/components/SettingsScaffold';
import {
  DeepLinkReviewScrollView,
  RequestTitle,
  RequestCard,
} from '../components/RequestReview';

// Same settings as onboarding: on iOS, 'oneTimeCode' stops the strong-password
// suggestion, which can leave a value in the field state that the user never
// saw.
const passwordAutofillProps = Platform.select({
  ios: {
    textContentType: 'oneTimeCode',
    spellCheck: false,
  },
  default: {
    autoComplete: 'off',
    importantForAutofill: 'no',
    textContentType: 'none',
    spellCheck: false,
  },
});
const KEYBOARD_FOOTER_SPACING = 8;
const waitForSpinnerFrame = () =>
  new Promise(resolve => setTimeout(resolve, 0));

const formatKdfIterations = iterations => `${iterations / 1000}k iterations`;

// How the written card is protected. The result screen names the password
// that restores the wallet.
const BACKUP_PROTECTION = {
  WALLET_PASSWORD: 'wallet-password',
  BACKUP_PASSWORD: 'backup-password',
  NONE: 'none',
};

const BACKUP_RESULT_SUBTITLES = {
  [BACKUP_PROTECTION.WALLET_PASSWORD]:
    'Restore it with your current wallet password. The card keeps this password if you change it later.',
  [BACKUP_PROTECTION.BACKUP_PASSWORD]:
    'Restore it with your backup password. Keep the card somewhere safe.',
  [BACKUP_PROTECTION.NONE]:
    'Anyone who has the card can restore this wallet. Keep it somewhere safe.',
};

const isTestProfile = account => {
  return Object.keys(account?.testnetOverrides || {}).length > 0;
};

const passwordStrengthDetails = (password, theme) => {
  if (!password) return null;

  const score = scorePassword(password, MIN_PASS_LENGTH, PASS_SCORE_LIMIT);

  if (score < MIN_PASS_SCORE) {
    return {text: 'weak', color: theme.colors.warning};
  } else if (score < PASS_SCORE_LIMIT - ((PASS_SCORE_LIMIT - MIN_PASS_SCORE) / 2)) {
    return {text: 'fair', color: theme.colors.textSecondary};
  } else {
    return {text: 'strong', color: theme.colors.success};
  }
};

// Returns the field that shows the problem and its message.
const validatePasswordPair = (password, confirmPassword) => {
  if (!password) {
    return {field: 'password', message: 'Enter a password.'};
  } else if (password !== confirmPassword) {
    return {field: 'confirm', message: 'The passwords do not match.'};
  }

  return null;
};

const BackupKdfSheet = ({onClose, onSelect, selectedIterations, visible}) => {
  const dismissal = useSheetDismissal({visible, onClose});

  return (
    <SelectionSheet
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}
      subtitle="Higher resistance takes longer to encrypt and to restore."
      title="Brute-force resistance"
      visible={visible}>
      {WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS.map(option => (
        <SelectionRow
          key={option.key}
          onPress={() => dismissal.dismiss(() => onSelect(option.iterations))}
          selected={option.iterations === selectedIterations}
          subtitle={formatKdfIterations(option.iterations)}
          title={option.label}
        />
      ))}
    </SelectionSheet>
  );
};

const WalletBackupRequestInfo = props => {
  const {
    backupCompletionKey,
    cancel = () => {},
    detailIndex,
    next = async () => {},
    profileBackup = false,
    request,
    response,
    showSpendableKeyBackupChoice = false,
  } = props;

  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const signedIn = useSelector(state => state.authentication.signedIn);
  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeAccount = useObjectSelector(state => state.authentication.activeAccount);
  const passthrough = useObjectSelector(state => state.deeplink?.passthrough);
  const requestId = useSelector(state => state.deeplink.requestId);
  const sessionEpoch = useSelector(state => state.authentication.sessionEpoch);
  const spendableKeyDetail = useMemo(() => request?.details?.find(
    detail => detail?.getIAddressKey?.() === SPENDABLE_KEY_DETAILS_VDXF_KEY.vdxfid,
  ), [request]);
  const giftContext = !profileBackup && !!spendableKeyDetail;
  const walletPasswordTypedScope = props.walletPasswordTypedScope || passthrough?.walletPasswordTypedScope;
  const activeAccountHash = activeAccount?.accountHash;

  const activeAccountIsTestnet = activeAccount ? isTestProfile(activeAccount) : false;
  const requestIsTestnet = profileBackup
    ? activeAccountIsTestnet
    : request != null && request.isTestnet();
  const activeAccountMatchesRequest =
    profileBackup
      ? signedIn && activeAccount != null
      : signedIn &&
        activeAccount &&
        activeAccountIsTestnet === requestIsTestnet;
  const networkName = requestIsTestnet ? 'testnet' : 'mainnet';

  const matchingAccounts = useMemo(() => {
    return accounts.filter(account => isTestProfile(account) === requestIsTestnet);
  }, [accounts, requestIsTestnet]);

  const [showCreateProfile, setShowCreateProfile] = useState(matchingAccounts.length === 0);
  const [onboardingParams, setOnboardingParams] = useState(null);
  const [phraseBackup, setPhraseBackup] = useState(null);
  const [passwordCheckVisible, setPasswordCheckVisible] = useState(false);
  const [passwordCheckError, setPasswordCheckError] = useState(null);
  const typedPasswordRef = useRef(null);
  const passwordDismissal = useSheetDismissal({
    visible: passwordCheckVisible,
    onClose: () => setPasswordCheckVisible(false),
  });
  const [encryptBackup, setEncryptBackup] = useState(true);
  const [useProfilePasswordForBackup, setUseProfilePasswordForBackup] =
    useState(true);
  const [backupPassword, setBackupPassword] = useState('');
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState('');
  const [backupKdfIters, setBackupKdfIters] = useState(
    WALLET_BACKUP_ENCRYPTION_ITERS_MEDIUM,
  );
  const [backupKdfSheetVisible, setBackupKdfSheetVisible] = useState(false);
  // Inline field errors: {field, message}. A change to the field clears it.
  const [backupPasswordError, setBackupPasswordError] = useState(null);
  // The NFC tap step while the backup is written, or the failed write.
  const [nfcTap, setNfcTap] = useState(null);
  const [backupResult, setBackupResult] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  // Keep the add-on separate from the flag that resumes after unlock. Both
  // survive a remount; a new scan starts with a new request's passthrough.
  // The choice stays behind the unlock sheet until a matching wallet is open.
  const backupSelected = passthrough?.walletBackupSelected === true;
  const backupChoiceMade =
    !showSpendableKeyBackupChoice ||
      (passthrough?.walletBackupChoice === 'backup' && activeAccountMatchesRequest);
  const walletBackupCacheRef = useRef(null);
  const writingBackupRef = useRef(false);
  const finishingRef = useRef(false);
  const keyboardFrameRef = useRef(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const backupPasswordDetails = passwordStrengthDetails(backupPassword, theme);
  const backupFieldError = field =>
    backupPasswordError?.field === field
      ? backupPasswordError.message
      : undefined;
  const selectedBackupKdfOption =
    WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS.find(
      option => option.iterations === backupKdfIters,
    ) || WALLET_BACKUP_ENCRYPTION_ITERATION_OPTIONS[1];
  // Settings opens this screen under its own header, which already clears the
  // status bar. A request opens it full screen.
  const safeAreaEdges = profileBackup
    ? ['left', 'right']
    : ['top', 'left', 'right'];
  const moreDetailsFollow =
    !profileBackup &&
    request?.details != null &&
    request.details.length > detailIndex + 1;

  useEffect(() => {
    typedPasswordRef.current = null;
    setPasswordCheckVisible(false);
    setPasswordCheckError(null);
    setPhraseBackup(null);
  }, [activeAccountHash, sessionEpoch]);

  useEffect(() => {
    walletBackupCacheRef.current = null;
  }, [
    activeAccountHash,
    backupKdfIters,
    backupPassword,
    encryptBackup,
    useProfilePasswordForBackup,
  ]);

  useEffect(() => {
    const showEvent =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSubscription = Keyboard.addListener(showEvent, () =>
      setKeyboardVisible(true),
    );
    const hideSubscription = Keyboard.addListener(hideEvent, () =>
      setKeyboardVisible(false),
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const updateWalletBackupChoice = data => {
    const current = store.getState().deeplink;
    if (current.requestId !== requestId) return;
    store.dispatch(setDeeplinkPassthroughData({...current.passthrough, ...data}));
  };

  const returnToGiftChoice = () => updateWalletBackupChoice({
    walletBackupChoice: undefined,
    walletBackupSelected: true,
  });

  const openLogin = async () => {
    if (matchingAccounts.length === 0) {
      createAlert(
        'No wallet found',
        `No ${networkName} wallet is available for this request.`,
      );
      return false;
    }

    try {
      await requestWalletUnlock({
        reason: 'wallet-backup-request',
        title: signedIn
          ? 'Switch wallet to continue'
          : 'Unlock wallet to continue',
        requestLabel: 'Wallet backup',
        accountHashes: matchingAccounts.map(account => account.accountHash),
        networkLabel: requestIsTestnet ? 'Testnet' : 'Mainnet',
      });
      return true;
    } catch (e) {
      if (e?.code !== WALLET_UNLOCK_CANCELLED) {
        createAlert('Cannot continue', e?.message || 'Unable to unlock wallet.');
      }
    }
  };

  const openWalletSetup = async () => {
    try {
      let pendingDeeplinkId = passthrough?.pendingDeeplinkId;
      if (spendableKeyDetail) {
        const saved = await savePendingDeeplinkRequest({
          requestBufferString: request.toBuffer().toString('hex'),
          uri: request.toWalletDeeplinkUri(),
        });
        if (!saved?.id) throw new Error('Request was not saved.');
        pendingDeeplinkId = saved.id;
      }
      setOnboardingParams({
        walletBackupSetup: true,
        requestIsTestnet,
        resumePendingDeeplinkId: pendingDeeplinkId,
        resumeWalletBackupRequest: spendableKeyDetail ? null : {
          url: request.toWalletDeeplinkUri(),
          passthrough,
        },
        walletBackupPassthrough: passthrough,
      });
    } catch {
      createAlert('Cannot open wallet setup', 'The request could not be saved. Try again.');
    }
  };

  const hasTypedWalletPassword = () => {
    const state = store.getState();
    return state.authentication.signedIn && (
      sessionScopeIsCurrent(state, typedPasswordRef.current?.scope) ||
      sessionScopeIsCurrent(state, walletPasswordTypedScope)
    );
  };

  const openPhraseBackup = async () => {
    const scope = captureSessionScope(store.getState(), activeAccountHash);
    try {
      const seeds = await requestSeeds();
      if (!sessionScopeIsCurrent(store.getState(), scope)) return;
      if (!isValid24WordBip39Mnemonic(seeds[ELECTRUM])) throw new Error('Invalid phrase.');
      setPhraseBackup({seed: seeds[ELECTRUM], scope});
    } catch {
      createAlert('Cannot show recovery phrase', 'The wallet could not read its recovery phrase. Try again.');
    }
  };

  const confirmUnencryptedBackup = async () => {
    if (encryptBackup) return true;

    return createAlert(
      'Back up without a password?',
      'Anyone who has the card can open this wallet.',
      [
        {
          text: 'Back up without password',
          onPress: () => resolveAlert(true),
        },
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => resolveAlert(false),
        },
      ],
    );
  };

  const getProfilePasswordForBackup = async () => {
    if (!hasTypedWalletPassword()) throw new Error('Enter your wallet password before writing the backup.');
    const typed = typedPasswordRef.current;
    return typed && sessionScopeIsCurrent(store.getState(), typed.scope)
      ? typed.password
      : requestPassword(walletPasswordTypedScope);
  };

  const getWalletBackupForWrite = async assertAccountCurrent => {
    assertAccountCurrent();
    const backupEncryptionPassword = encryptBackup
      ? useProfilePasswordForBackup
        ? await getProfilePasswordForBackup()
        : backupPassword
      : null;
    assertAccountCurrent();
    const effectiveKdfIters = encryptBackup ? backupKdfIters : 0;
    const cachedWalletBackup = walletBackupCacheRef.current;

    if (
      cachedWalletBackup != null &&
      cachedWalletBackup.accountHash === activeAccountHash &&
      cachedWalletBackup.encryptBackup === encryptBackup &&
      cachedWalletBackup.password === backupEncryptionPassword &&
      cachedWalletBackup.kdfIters === effectiveKdfIters
    ) {
      setNfcTap(getNfcTapText(NFC_TAP_TASK.BACKUP, NFC_TAP_PHASE.PREPARING));
      await waitForSpinnerFrame();
      assertAccountCurrent();

      return cachedWalletBackup.walletBackup;
    }

    setNfcTap({
      ...getNfcTapText(NFC_TAP_TASK.BACKUP, NFC_TAP_PHASE.PREPARING),
      ...(encryptBackup && {
        detail:
          'Encrypting can take a few minutes. Keep this screen open, and do not hold the card yet.',
      }),
    });
    await waitForSpinnerFrame();

    return withKeepAwake(async () => {
      assertAccountCurrent();
      const seeds = await requestSeeds();
      assertAccountCurrent();
      const mnemonic = seeds[ELECTRUM];

      if (!isValid24WordBip39Mnemonic(mnemonic)) {
        throw new Error(
          'The active wallet does not contain a valid 24-word BIP39 Secret Recovery Phrase.',
        );
      }

      const walletBackup = await buildWalletBackupOrdinal({
        mnemonic,
        password: backupEncryptionPassword,
        kdfIters: effectiveKdfIters,
      });
      assertAccountCurrent();

      walletBackupCacheRef.current = {
        accountHash: activeAccountHash,
        encryptBackup,
        password: backupEncryptionPassword,
        kdfIters: effectiveKdfIters,
        walletBackup,
      };

      return walletBackup;
    });
  };

  // A retry after a failed write keeps the choice the user already confirmed.
  const writeBackup = async options => {
    if (writingBackupRef.current) return;
    const retry = options?.retry === true;
    Keyboard.dismiss();

    // Only a retry from the card screen gets here after a wallet switch.
    // Leaving the card screen shows the unlock state.
    if (!activeAccountMatchesRequest) {
      setNfcTap(null);
      return;
    }

    if (encryptBackup && !useProfilePasswordForBackup) {
      const passwordError = validatePasswordPair(
        backupPassword,
        backupPasswordConfirm,
      );

      setBackupPasswordError(passwordError);
      if (passwordError) {
        // A retry from the card screen returns to the fields.
        setNfcTap(null);
        return;
      }
    }

    if (encryptBackup && useProfilePasswordForBackup && !hasTypedWalletPassword()) {
      setNfcTap(null);
      setPasswordCheckError(null);
      setPasswordCheckVisible(true);
      return;
    }

    const sessionScope = captureSessionScope(store.getState(), activeAccountHash);
    const assertAccountCurrent = () => {
      const state = store.getState();
      if (!sessionScope.accountHash || !state.authentication.signedIn ||
        !sessionScopeIsCurrent(state, sessionScope)) {
        const error = new Error('Account changed before the backup was written. Please start the backup again.');
        error.code = 'SESSION_CHANGED';
        throw error;
      }
    };

    writingBackupRef.current = true;
    let nfcSessionPreRegistered = false;
    let nfcWriterStarted = false;
    let backupCompleted = false;

    let failedStep = null;

    try {
      if (!retry && !(await confirmUnencryptedBackup())) return;

      setNfcTap(getNfcTapText(NFC_TAP_TASK.BACKUP, NFC_TAP_PHASE.PREPARING));
      assertAccountCurrent();
      nfcSessionPreRegistered = await beginWalletBackupNfcSession();
      assertAccountCurrent();

      const walletBackup = await getWalletBackupForWrite(assertAccountCurrent);
      assertAccountCurrent();

      nfcWriterStarted = true;
      await writeWalletBackupToNfc(walletBackup, {
        onPhase: phase =>
          setNfcTap(getNfcTapText(NFC_TAP_TASK.BACKUP, phase)),
        sessionPreRegistered: nfcSessionPreRegistered,
        beforeWrite: assertAccountCurrent,
      });

      const completionKey =
        backupCompletionKey ||
        getWalletBackupCompletionKey(
          request,
          detailIndex,
          activeAccount.accountHash,
        );

      await markWalletBackupRequestComplete(completionKey);
      setBackupResult({
        protection: !encryptBackup
          ? BACKUP_PROTECTION.NONE
          : useProfilePasswordForBackup
          ? BACKUP_PROTECTION.WALLET_PASSWORD
          : BACKUP_PROTECTION.BACKUP_PASSWORD,
      });
      backupCompleted = true;
    } catch (e) {
      // A cancelled session goes back to the options without a message.
      failedStep = getNfcTapFailure(NFC_TAP_TASK.BACKUP, e);
      // Known card results are normal steps. Log only unexpected errors.
      if (failedStep != null && e?.code == null) console.error(e);
    } finally {
      try {
        if (nfcSessionPreRegistered && !nfcWriterStarted) {
          await endWalletBackupNfcSession();
        }
      } finally {
        setNfcTap(failedStep);
        // A written card stays latched: the result screen replaces the form,
        // and the card must not be written a second time.
        if (!backupCompleted) {
          writingBackupRef.current = false;
        }
      }
    }
  };

  const finishBackup = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);

    try {
      await next(response, [detailIndex]);
    } catch (e) {
      finishingRef.current = false;
      setFinishing(false);
      createAlert(
        'Cannot finish request',
        e?.message || 'Unable to continue the request.',
      );
    }
  };

  useRequestBackHandler(() => {
    if (onboardingParams) setOnboardingParams(null);
    else if (phraseBackup) setPhraseBackup(null);
    else if (backupResult) finishBackup();
    else if (nfcTap?.phase === NFC_TAP_PHASE.WAITING) cancelWalletBackupNfcRequest();
    else if (nfcTap) setNfcTap(null);
    else if (showSpendableKeyBackupChoice && backupChoiceMade && activeAccountMatchesRequest) returnToGiftChoice();
    else cancel();
  }, finishing || [NFC_TAP_PHASE.PREPARING, NFC_TAP_PHASE.ACTIVE, NFC_TAP_PHASE.RELEASE].includes(nfcTap?.phase));

  const skipBackupAndClaimSpendableKey = async () => {
    await next(response, [detailIndex]);
  };

  const renderScreen = ({title, subtitle, body, footer, keyboard = false, requestReview = false, backupStep = false}) => {
    const signedRequestReview = requestReview && !profileBackup && request?.isSigned?.() === true;
    const content = (
      <SafeAreaView edges={profileBackup || backupStep ? ['left', 'right'] : safeAreaEdges} style={styles.container}>
        {backupStep && <ProgressHeader title="Back up wallet" progress={1}
          onBack={showSpendableKeyBackupChoice ? returnToGiftChoice : cancel} onClose={cancel} />}
        <DeepLinkReviewScrollView
          showScrollCue={requestReview && !profileBackup}
          requestCard={signedRequestReview}
          contentContainerStyle={backupStep ? styles.backupStepContent : undefined}
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          keyboardShouldPersistTaps="handled">
          {signedRequestReview ? (
            <RequestCard
              action="wants you to back up this wallet"
              requester={props}
              caption={giftContext ? undefined : 'The wallet writes the Secret Recovery Phrase to an NFC card.'}
            />
          ) : !backupStep ? (
            <View style={styles.header}>
              <RequestTitle>{title}</RequestTitle>
              {subtitle ? <Text style={styles.mainSubtitle}>{subtitle}</Text> : null}
            </View>
          ) : null}
          {body}
        </DeepLinkReviewScrollView>
        <SafeBottomActionStack
          bottomSpacing={keyboardVisible ? KEYBOARD_FOOTER_SPACING : 30}
          gap={10}
          horizontalSpacing={backupStep ? 32 : 24}
          includeBottomInset={!keyboardVisible}
          style={styles.footer}>
          {footer}
        </SafeBottomActionStack>
      </SafeAreaView>
    );
    return keyboard ? (
      <TouchableWithoutFeedback accessible={false} onPress={Keyboard.dismiss}>
        <View
          ref={keyboardFrameRef}
          onLayout={() => keyboardFrameRef.current?.measureInWindow((_x, y) => setKeyboardOffset(Math.max(0, y)))}
          style={styles.keyboardFrame}>
          <KeyboardAvoidingForm keyboardVerticalOffset={keyboardOffset} style={styles.keyboardFrame}>
            {content}
          </KeyboardAvoidingForm>
        </View>
      </TouchableWithoutFeedback>
    ) : content;
  };

  const renderSecondaryButton = (label, onPress) => (
    <AppButton
      height={56}
      onPress={onPress}
      variant="secondary">
      {label}
    </AppButton>
  );
  const cancelButton = renderSecondaryButton('Cancel', cancel);

  if (onboardingParams) {
    return <CreateProfile
      route={{params: onboardingParams}}
      navigation={{goBack: () => setOnboardingParams(null)}}
    />;
  }

  if (phraseBackup && sessionScopeIsCurrent(store.getState(), phraseBackup.scope)) {
    return <WalletBackupPhrase
      cancel={() => setPhraseBackup(null)}
      seed={phraseBackup.seed}
      onComplete={finishBackup}
      finishing={finishing}
    />;
  }

  if (!backupChoiceMade) {
    return <WalletBackupEntry
      activeAccountMatchesRequest={activeAccountMatchesRequest}
      activeWalletName={activeAccount?.id}
      backupSelected={backupSelected}
      cancel={cancel}
      choice
      onClaim={skipBackupAndClaimSpendableKey}
      onBackupSelectedChange={checked => updateWalletBackupChoice({walletBackupSelected: checked})}
      onBackup={async () => {
        updateWalletBackupChoice({walletBackupChoice: 'backup', walletBackupSelected: true});
        if (!activeAccountMatchesRequest && !(await openLogin())) {
          updateWalletBackupChoice({walletBackupChoice: undefined});
        }
      }}
      requestIsTestnet={requestIsTestnet}
      signedIn={signedIn}
      spendableKeyDetail={spendableKeyDetail}
    />;
  }

  const renderNfcTap = (step, actions = []) => (
    <SafeAreaView edges={safeAreaEdges} style={styles.container}>
      <NfcTapView {...step} actions={actions} testID="walletBackup.nfcTap" />
    </SafeAreaView>
  );

  if (backupResult) {
    return renderNfcTap(
      {
        phase: NFC_TAP_PHASE.DONE,
        title: 'Backup written',
        detail: BACKUP_RESULT_SUBTITLES[backupResult.protection],
      },
      [
        {
          disabled: finishing,
          label: giftContext ? 'Continue to claim' : moreDetailsFollow ? 'Continue' : 'Done',
          onPress: finishBackup,
          variant: 'primary',
        },
      ],
    );
  }

  if (nfcTap != null) {
    const ended =
      nfcTap.phase === NFC_TAP_PHASE.FAILED ||
      nfcTap.phase === NFC_TAP_PHASE.NOTICE;
    // iOS has its own Cancel in the scan sheet.
    const canCancel =
      nfcTap.phase === NFC_TAP_PHASE.WAITING && Platform.OS === 'android';

    return renderNfcTap(
      nfcTap,
      ended
        ? [
            {
              label: 'Try again',
              onPress: () => writeBackup({retry: true}),
              variant: 'primary',
            },
            {cancel: true, label: 'Cancel', onPress: () => setNfcTap(null)},
          ]
        : canCancel
        ? [{cancel: true, label: 'Cancel', onPress: cancelWalletBackupNfcRequest}]
        : [],
    );
  }

  if (!activeAccountMatchesRequest) {
    const switchAccountChoice = matchingAccounts.length > 0 ? (
      <TextAction onPress={() => setShowCreateProfile(true)} style={{alignSelf: 'center'}}>
        Create a new wallet
      </TextAction>
    ) : null;

    if (showCreateProfile || matchingAccounts.length === 0) {
      return <WalletBackupEntry
        cancel={cancel}
        onCreate={openWalletSetup}
        requestIsTestnet={requestIsTestnet}
        spendableKeyDetail={spendableKeyDetail}
      />;
    }

    return renderScreen({
      requestReview: true,
      title: 'Back up wallet',
      subtitle: "Write a wallet's Secret Recovery Phrase to an NFC card.",
      body: switchAccountChoice,
      footer: (
        <>
          <View style={styles.footerInfoRow}>
            <View style={styles.footerInfoIcon}>
              <Info
                color={theme.colors.textSubtle}
                size={16}
                strokeWidth={2.1}
              />
            </View>
            <Text style={styles.footerInfoText}>
              {signedIn
                ? `Switch to a ${networkName} wallet to continue.`
                : `Unlock a ${networkName} wallet to continue.`}
            </Text>
          </View>
          <AppButton height={56} onPress={openLogin} variant="primary">
            {signedIn ? 'Switch wallet' : 'Unlock wallet'}
          </AppButton>
          {cancelButton}
        </>
      ),
    });
  }

  const customPasswordIncomplete =
    encryptBackup &&
    !useProfilePasswordForBackup &&
    (!backupPassword || !backupPasswordConfirm);

  return renderScreen({
    keyboard: true,
    requestReview: true,
    backupStep: !profileBackup,
    title: 'Back up wallet',
    subtitle: "Write this wallet's Secret Recovery Phrase to an NFC card.",
    body: (
      <>
        <PasswordCheck
          account={activeAccount}
          allowBiometry={false}
          body="Enter the password that will lock this backup."
          cancel={passwordDismissal.close}
          createAttemptToken={() => captureSessionScope(store.getState(), activeAccountHash)}
          errorMessage={passwordCheckError}
          onClosed={passwordDismissal.onClosed}
          onInputChange={() => setPasswordCheckError(null)}
          redesigned
          showWalletSummary={false}
          submit={result => {
            if (!sessionScopeIsCurrent(store.getState(), result.attemptToken)) return;
            if (!result.valid) {
              setPasswordCheckError(result.error?.message === 'Incorrect password'
                ? 'Incorrect password.' : 'Unable to access this wallet. Try again.');
              return;
            }
            typedPasswordRef.current = {password: result.password, scope: result.attemptToken};
            passwordDismissal.dismiss(() => writeBackup());
          }}
          submitLabel="Write to NFC card"
          suppressSystemAlerts
          title="Write to NFC card"
          userName={activeAccount.id}
          visible={passwordCheckVisible}
        />
        <BackupKdfSheet
          onClose={() => setBackupKdfSheetVisible(false)}
          onSelect={setBackupKdfIters}
          selectedIterations={backupKdfIters}
          visible={backupKdfSheetVisible}
        />
        <SettingsProfileSummary
          name={activeAccount.id}
          subtitle={requestIsTestnet ? 'Testnet wallet' : null}
          walletAvatar={activeAccount.walletAvatar}
        />
        {giftContext && <Text style={styles.giftBackupBody}>
          Writing the backup replaces the gift on this card. The gift stays on this phone until you claim it.
        </Text>}
        <SettingsSection style={!profileBackup && styles.backupOptions} title={profileBackup ? "Encryption" : undefined}>
          <SettingsSwitchRow
            icon={profileBackup ? "lock-outline" : undefined}
            plain={!profileBackup}
            last={!encryptBackup}
            onValueChange={setEncryptBackup}
            title="Encrypt backup"
            value={encryptBackup}
          />
          {encryptBackup ? (
            <>
              <SettingsSwitchRow
                icon={profileBackup ? "key-outline" : undefined}
                plain={!profileBackup}
                onValueChange={setUseProfilePasswordForBackup}
                title="Use wallet password"
                value={useProfilePasswordForBackup}
              />
              {!useProfilePasswordForBackup ? (
                <View style={styles.passwordStack}>
                  <AppTextInput
                    {...passwordAutofillProps}
                    errorText={backupFieldError('password')}
                    helperText={
                      backupPasswordDetails
                        ? `Password strength: ${backupPasswordDetails.text}`
                        : undefined
                    }
                    label="Backup password"
                    onChangeText={value => {
                      setBackupPasswordError(null);
                      setBackupPassword(value);
                    }}
                    returnKeyType="done"
                    secureTextEntry
                    supportingTextStyle={
                      backupPasswordDetails && !backupFieldError('password')
                        ? {color: backupPasswordDetails.color}
                        : undefined
                    }
                    value={backupPassword}
                  />
                  <AppTextInput
                    {...passwordAutofillProps}
                    errorText={backupFieldError('confirm')}
                    label="Confirm backup password"
                    onChangeText={value => {
                      setBackupPasswordError(null);
                      setBackupPasswordConfirm(value);
                    }}
                    returnKeyType="done"
                    secureTextEntry
                    value={backupPasswordConfirm}
                  />
                </View>
              ) : null}
              <SettingsRow
                icon={profileBackup ? "shield-key-outline" : undefined}
                plain={!profileBackup}
                last
                onPress={() => {
                  Keyboard.dismiss();
                  setBackupKdfSheetVisible(true);
                }}
                title="Brute-force resistance"
                value={selectedBackupKdfOption.label}
              />
            </>
          ) : null}
        </SettingsSection>
        {giftContext && passthrough?.walletBackupSetup === true &&
          sessionScopeIsCurrent(store.getState(), passthrough.walletPasswordTypedScope) && (
            <TextAction onPress={openPhraseBackup} style={styles.phraseAction}>
              Use the Secret Recovery Phrase instead
            </TextAction>
          )}
      </>
    ),
    footer: (
      <>
        <AppButton
          disabled={customPasswordIncomplete}
          height={56}
          onPress={writeBackup}
          variant="primary">
          Write to NFC card
        </AppButton>
        {cancelButton}
      </>
    ),
  });
};

export default WalletBackupRequestInfo;
