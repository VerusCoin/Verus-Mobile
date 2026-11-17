import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {StatusBar, View} from 'react-native';
import {createAlert} from '../../../actions/actions/alert/dispatchers/alert';
import ChooseName from './Forms/ChooseName';
import CreatePassword, {PasswordInfoButton} from './Forms/CreatePassword';
import UseBiometrics from './Forms/UseBiometrics';
import {useDispatch} from 'react-redux';
import {setDeeplinkUrl} from '../../../actions/actionCreators';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {
  createProfileFromSeed,
  getStartingCoinIds,
} from '../../../utils/profile/createProfileFromSeed';
import {CoinDirectory} from '../../../utils/CoinData/CoinDirectory';
import {getAssetPresentation} from '../../../utils/assets/assetPresentation';
import {getBiometryPresentation} from '../../../components/BiometricAffordanceIcon';
import {
  closeWalletSetup,
  failWalletSetup,
  finishWalletSetup,
  reportWalletSetupStep,
  showWalletSetup,
} from '../../../components/WalletSetup/walletSetupStore';
import {getKey} from '../../../utils/keyGenerator/keyGenerator';
import {getSupportedBiometryType} from '../../../utils/keychain/keychain';
import ScanSeed from '../../../components/ScanSeed';
import SeedIntro from '../../CreateWallet/Forms/CreateSeed/Forms/SeedIntro';
import ShieldedAddressSetup from '../../CreateWallet/Forms/CreateSeed/Forms/ShieldedAddressSetup';
import SeedWords, {
  WORDS_PER_STEP,
} from '../../CreateWallet/Forms/CreateSeed/Forms/SeedWords';
import ImportNfc from '../../CreateWallet/Forms/ImportWallet/Forms/ImportNfc';
import ImportSeed from '../../CreateWallet/Forms/ImportWallet/Forms/ImportSeed';
import ImportText from '../../CreateWallet/Forms/ImportWallet/Forms/ImportText';
import CompactSetupHeader from '../components/CompactSetupHeader';
import {
  SETUP_STEP_TITLES,
  getImportSeedTitle,
  getSeedWordsTitle,
} from '../setupStepTitles';
import {DEFAULT_WALLET_AVATAR} from '../../../utils/walletAvatar';
import {createSignedOutFlowStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {
  IMPORT_METHODS,
  SETUP_PATHS,
  normalizeSetupSelection,
  shouldOfferImportShieldedRestore,
} from '../onboardingSetupFlow';
import {getPendingDeeplinkReplay} from '../../../utils/deeplink/pendingDeeplinkStorage';
import store from '../../../store';
import {captureSessionScope} from '../../../actions/actions/updates/sessionRequests';
import {useRequestBackHandler} from '../../DeepLink/useRequestNavigation';

const DEFAULT_SEED_WORD_COUNT = 24;
const IMPORT_SEED_PROGRESS_WEIGHT = 0.75;

const SETUP_STEPS = {
  NAME: 'name',
  PASSWORD: 'password',
  BIOMETRICS: 'biometrics',
  SEED_INTRO: 'seedIntro',
  SEED_WORDS: 'seedWords',
  SHIELDED_ADDRESS: 'shieldedAddress',
  IMPORT_SEED: 'importSeed',
  IMPORT_TEXT: 'importText',
  IMPORT_NFC: 'importNfc',
  IMPORT_SHIELDED_ADDRESS: 'importShieldedAddress',
};

const getImportStepForImportMethod = importMethod => {
  if (importMethod === IMPORT_METHODS.SEED) {
    return SETUP_STEPS.IMPORT_SEED;
  }

  if (importMethod === IMPORT_METHODS.NFC) {
    return SETUP_STEPS.IMPORT_NFC;
  }

  return SETUP_STEPS.IMPORT_TEXT;
};

// "Face ID" and "Touch ID" keep their capitals; other names read as a phrase.
const getBiometrySetupName = supportedBiometryType => {
  const name = getBiometryPresentation(supportedBiometryType).settingsTitle;

  return /^(Face|Touch) ID$/.test(name)
    ? name
    : name.charAt(0).toLowerCase() + name.slice(1);
};

// The starting coins in key order. `slot` is their row order on Home: a new
// wallet has no balances, so Home lists them by name.
const getSetupCoins = testProfile => {
  const coins = getStartingCoinIds(testProfile).map(({startId, coinId}) => ({
    startId,
    coinId,
    presentation: getAssetPresentation(CoinDirectory.getBasicCoinObj(coinId)),
  }));
  const byName = [...coins].sort((a, b) =>
    a.presentation.name.localeCompare(b.presentation.name),
  );

  return coins.map(coin => ({...coin, slot: byName.indexOf(coin)}));
};

const shouldCollectImportBeforeProfile = setupSelection =>
  setupSelection.setupPath === SETUP_PATHS.IMPORT &&
  (setupSelection.importMethod === IMPORT_METHODS.QR ||
    setupSelection.importMethod === IMPORT_METHODS.NFC);

export default function CreateProfileStackScreens(props) {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSignedOutFlowStyles(theme), [theme]);
  const setupSelection = useMemo(
    () => normalizeSetupSelection(props.route?.params),
    [props.route?.params],
  );
  const walletBackupSetup = props.route?.params?.walletBackupSetup === true;
  const testProfile = walletBackupSetup
    ? props.route.params.requestIsTestnet === true
    : props.testProfile === true;
  const isImportSetup = setupSelection.setupPath === SETUP_PATHS.IMPORT;
  const collectImportBeforeProfile =
    shouldCollectImportBeforeProfile(setupSelection);
  const initialStep = collectImportBeforeProfile
    ? getImportStepForImportMethod(setupSelection.importMethod)
    : SETUP_STEPS.NAME;
  const [profileName, setProfileName] = useState('');
  const [walletAvatar, setWalletAvatar] = useState(DEFAULT_WALLET_AVATAR);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const useBiometricsRef = useRef(false);
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [newSeed, setNewSeed] = useState(null);
  const [importedSeed, setImportedSeed] = useState('');
  const [importedSeedReady, setImportedSeedReady] = useState(false);
  const [importSeedEntryProgress, setImportSeedEntryProgress] = useState(0);
  const [importSeedReviewing, setImportSeedReviewing] = useState(false);
  const [passwordInfoVisible, setPasswordInfoVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(
    collectImportBeforeProfile &&
      setupSelection.importMethod === IMPORT_METHODS.QR,
  );
  const [seedWordStep, setSeedWordStep] = useState(0);
  const [biometryAvailable, setBiometryAvailable] = useState(null);
  const [supportedBiometryType, setSupportedBiometryType] = useState(null);
  const creationStarted = useRef(false);
  const dispatch = useDispatch();

  const accounts = useObjectSelector(state => state.authentication.accounts);
  const activeCoinList = useObjectSelector(state => state.coins.activeCoinList);

  const resolveBiometryAvailability = useCallback(async () => {
    if (biometryAvailable != null) return biometryAvailable;

    try {
      const biometryType = await getSupportedBiometryType();
      const supported = !!biometryType.biometry;

      setSupportedBiometryType(biometryType);
      setBiometryAvailable(supported);
      return supported;
    } catch (e) {
      setSupportedBiometryType(null);
      setBiometryAvailable(false);
      return false;
    }
  }, [biometryAvailable]);

  useEffect(() => {
    let active = true;

    getSupportedBiometryType()
      .then(result => {
        if (active) {
          setSupportedBiometryType(result);
          setBiometryAvailable(!!result.biometry);
        }
      })
      .catch(() => {
        if (active) {
          setSupportedBiometryType(null);
          setBiometryAvailable(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const ensureNewSeed = useCallback(async () => {
    if (newSeed) return newSeed;

    try {
      const seed = await getKey(256);

      setNewSeed(seed);
      return seed;
    } catch (e) {
      createAlert(
        'Secret Recovery Phrase not created',
        'The wallet could not generate a new Secret Recovery Phrase. Try again.',
      );
      console.warn(e);
      return null;
    }
  }, [newSeed]);

  const createProfile = async (seed, createAsTestProfile, useSeedAsZ) => {
    if (creationStarted.current) return;
    creationStarted.current = true;
    // Read the latest choice even when this callback came from an earlier render.
    const useBiometrics = useBiometricsRef.current;
    let profileCreated = false;
    let biometrySetupFailed = false;
    const showBiometrySetupFailure = () => {
      if (!biometrySetupFailed) return;
      const biometryName =
        getBiometryPresentation(supportedBiometryType).settingsTitle;
      createAlert(
        `${biometryName} not turned on`,
        `The wallet could not save ${biometryName}. Turn it on in Settings.`,
      );
    };
    const retry = () => {
      closeWalletSetup();
      return createProfile(seed, createAsTestProfile, useSeedAsZ);
    };

    try {
      await showWalletSetup({
        walletName: profileName,
        walletAvatar,
        restoring: isImportSetup,
        biometryName: useBiometrics
          ? getBiometrySetupName(supportedBiometryType)
          : null,
        coins: getSetupCoins(createAsTestProfile),
      });
      await createProfileFromSeed({
        profileName,
        password,
        seed,
        accounts,
        activeCoinList,
        dispatch,
        testProfile: createAsTestProfile,
        includeDlightSeed: useSeedAsZ,
        useBiometrics,
        walletAvatar,
        onStep: reportWalletSetupStep,
        onBiometrySetupFailed: () => {
          biometrySetupFailed = true;
        },
      });
      profileCreated = true;
      const resumePendingDeeplinkId =
        props.route?.params?.resumePendingDeeplinkId;

      const resumeWalletBackupRequest = props.route?.params?.resumeWalletBackupRequest;
      const resumesRequest = !!(resumePendingDeeplinkId || resumeWalletBackupRequest);

      if (resumesRequest) {
        const replay = resumePendingDeeplinkId
          ? await getPendingDeeplinkReplay(resumePendingDeeplinkId, {
              resumeWalletBackup: walletBackupSetup,
            })
          : resumeWalletBackupRequest;

        if (!replay) {
          throw new Error('The saved request could not be reopened.');
        }

        dispatch(setDeeplinkUrl(replay.url, {
          ...replay.passthrough,
          ...(walletBackupSetup && {
            ...props.route.params.walletBackupPassthrough,
            skipWalletBackupRequests: false,
            walletBackupSetup: true,
            walletPasswordTypedScope: captureSessionScope(store.getState()),
          }),
        }));
      }

      await finishWalletSetup({landOnHome: !resumesRequest});
      showBiometrySetupFailure();
    } catch (e) {
      console.error(e);
      // The setup screen shows the failure; an alert if it never opened.
      const showFailure = failure => {
        if (!failWalletSetup(failure)) {
          createAlert(failure.title, failure.message);
        }
      };

      if (profileCreated) {
        await finishWalletSetup({landOnHome: false});
        showBiometrySetupFailure();
        createAlert(
          'Wallet ready',
          'The saved request could not be reopened. Find it under Saved requests on the sign-in screen.',
        );
      } else if (
        e?.code === 'DUPLICATE_ACCOUNT' ||
        e?.message === 'Cannot create duplicate account.'
      ) {
        showFailure({
          title: `${profileName} was not created`,
          message: 'A wallet with this name already exists.',
          primaryLabel: 'Choose another name',
          onPrimary: () => {
            closeWalletSetup();
            setCurrentStep(SETUP_STEPS.NAME);
          },
        });
      } else {
        showFailure({
          title: `${profileName} was not created`,
          message: 'The wallet could not be set up.',
          primaryLabel: 'Try again',
          onPrimary: retry,
          secondaryLabel: 'Back',
          onSecondary: () => closeWalletSetup(),
        });
      }
    } finally {
      if (!profileCreated) creationStarted.current = false;
    }
  };

  const getImportStepForMethod = () =>
    getImportStepForImportMethod(setupSelection.importMethod);

  const finalizeImportedSeed = seedOverride => {
    const seed = seedOverride != null ? seedOverride : importedSeed;

    setImportedSeed(seed);

    if (shouldOfferImportShieldedRestore(seed)) {
      setCurrentStep(SETUP_STEPS.IMPORT_SHIELDED_ADDRESS);
    } else {
      return createProfile(seed, testProfile, false);
    }
  };

  const completeImportedSeed = seedOverride => {
    const seed = seedOverride != null ? seedOverride : importedSeed;

    setImportedSeed(seed);

    if (collectImportBeforeProfile) {
      setImportedSeedReady(true);
      setCurrentStep(SETUP_STEPS.NAME);
      return;
    }

    return finalizeImportedSeed(seed);
  };

  const startWalletSetup = async () => {
    if (!isImportSetup) {
      if (walletBackupSetup) {
        const seed = await ensureNewSeed();
        if (seed) return createProfile(seed, testProfile, true);
        return;
      }
      setCurrentStep(SETUP_STEPS.SEED_INTRO);
      return;
    }

    if (collectImportBeforeProfile && importedSeedReady) {
      return finalizeImportedSeed();
    }

    setCurrentStep(getImportStepForMethod());

    if (setupSelection.importMethod === IMPORT_METHODS.QR) {
      setScannerVisible(true);
    }
  };

  const completeImportShieldedSetup = useSeedAsZ => {
    return createProfile(importedSeed, testProfile, useSeedAsZ);
  };

  const closeScanner = useCallback(() => {
    setScannerVisible(false);
  }, []);

  const handleScan = seed => {
    setScannerVisible(false);

    // A Verus request link, such as a gift card, is not a seed. Leave setup
    // and open it as a request instead of creating a wallet from its text.
    if (
      typeof seed === 'string' &&
      seed.trim().toLowerCase().startsWith('verus://')
    ) {
      if (props.navigation.canGoBack()) props.navigation.goBack();
      dispatch(setDeeplinkUrl(seed.trim()));
      return;
    }

    setImportedSeed(seed);

    if (collectImportBeforeProfile) {
      completeImportedSeed(seed);
    }
  };

  const seedWordCount = useMemo(() => {
    if (!newSeed) return DEFAULT_SEED_WORD_COUNT;

    return newSeed.split(' ').filter(Boolean).length || DEFAULT_SEED_WORD_COUNT;
  }, [newSeed]);

  const seedWordPageCount = Math.max(
    1,
    Math.ceil(seedWordCount / WORDS_PER_STEP),
  );
  const hasBiometryStep = biometryAvailable !== false;
  const securityStepCount = 2 + (hasBiometryStep ? 1 : 0);
  const walletStepStartIndex = securityStepCount;
  const totalStepCount = walletBackupSetup ? securityStepCount + 1 : isImportSetup
    ? securityStepCount + 2
    : walletStepStartIndex + 1 + seedWordPageCount + 2;
  const currentStepIndex = (() => {
    if (currentStep === SETUP_STEPS.NAME) {
      return collectImportBeforeProfile ? 1 : 0;
    }
    if (currentStep === SETUP_STEPS.PASSWORD) {
      return collectImportBeforeProfile ? 2 : 1;
    }
    if (currentStep === SETUP_STEPS.BIOMETRICS) {
      return collectImportBeforeProfile ? 3 : 2;
    }
    if (currentStep === SETUP_STEPS.SEED_INTRO) return walletStepStartIndex;
    if (currentStep === SETUP_STEPS.SHIELDED_ADDRESS && newSeed) {
      return totalStepCount - 1;
    }
    if (currentStep === SETUP_STEPS.IMPORT_SHIELDED_ADDRESS) {
      return totalStepCount - 1;
    }
    if (currentStep === SETUP_STEPS.IMPORT_SEED) {
      return (
        walletStepStartIndex +
        importSeedEntryProgress * IMPORT_SEED_PROGRESS_WEIGHT
      );
    }
    if (
      currentStep === SETUP_STEPS.IMPORT_TEXT ||
      currentStep === SETUP_STEPS.IMPORT_NFC
    ) {
      return collectImportBeforeProfile ? 0 : walletStepStartIndex;
    }

    return walletStepStartIndex + 1 + Math.min(seedWordStep, seedWordPageCount);
  })();
  const progress = (currentStepIndex + 1) / totalStepCount;

  const continueFromPassword = async () => {
    const supported = await resolveBiometryAvailability();

    if (supported) {
      setCurrentStep(SETUP_STEPS.BIOMETRICS);
    } else {
      startWalletSetup();
    }
  };

  const continueToSeedWords = seed => {
    setNewSeed(seed);
    setSeedWordStep(0);
    setCurrentStep(SETUP_STEPS.SEED_WORDS);
  };

  const backToSecurityStep = () => {
    setCurrentStep(
      biometryAvailable ? SETUP_STEPS.BIOMETRICS : SETUP_STEPS.PASSWORD,
    );
  };

  const backToImportStep = () => {
    setCurrentStep(getImportStepForMethod());
  };

  const goBack = () => {
    if (scannerVisible) {
      setScannerVisible(false);
    } else if (currentStep === SETUP_STEPS.NAME) {
      if (collectImportBeforeProfile && importedSeedReady) {
        setImportedSeedReady(false);
        setCurrentStep(getImportStepForMethod());
        return;
      }

      props.navigation.goBack();
    } else if (currentStep === SETUP_STEPS.PASSWORD) {
      setCurrentStep(SETUP_STEPS.NAME);
    } else if (currentStep === SETUP_STEPS.BIOMETRICS) {
      setCurrentStep(SETUP_STEPS.PASSWORD);
    } else if (currentStep === SETUP_STEPS.SEED_INTRO) {
      backToSecurityStep();
    } else if (currentStep === SETUP_STEPS.SHIELDED_ADDRESS) {
      setSeedWordStep(seedWordPageCount);
      setCurrentStep(SETUP_STEPS.SEED_WORDS);
    } else if (currentStep === SETUP_STEPS.IMPORT_SHIELDED_ADDRESS) {
      if (collectImportBeforeProfile) {
        backToSecurityStep();
      } else {
        backToImportStep();
      }
    } else if (
      currentStep === SETUP_STEPS.IMPORT_SEED ||
      currentStep === SETUP_STEPS.IMPORT_TEXT ||
      currentStep === SETUP_STEPS.IMPORT_NFC
    ) {
      if (collectImportBeforeProfile) {
        props.navigation.goBack();
      } else {
        backToSecurityStep();
      }
    } else if (seedWordStep > 0) {
      setSeedWordStep(step => step - 1);
    } else {
      setCurrentStep(SETUP_STEPS.SEED_INTRO);
    }
  };

  const renderStep = () => {
    if (currentStep === SETUP_STEPS.NAME) {
      return (
        <ChooseName
          profileName={profileName}
          setProfileName={setProfileName}
          walletAvatar={walletAvatar}
          setWalletAvatar={setWalletAvatar}
          onNext={() => setCurrentStep(SETUP_STEPS.PASSWORD)}
        />
      );
    }

    if (currentStep === SETUP_STEPS.PASSWORD) {
      return (
        <CreatePassword
          password={password}
          setPassword={setPassword}
          confirmPassword={confirmPassword}
          setConfirmPassword={setConfirmPassword}
          onNext={continueFromPassword}
          infoVisible={passwordInfoVisible}
          onCloseInfo={() => setPasswordInfoVisible(false)}
        />
      );
    }

    if (currentStep === SETUP_STEPS.BIOMETRICS) {
      return (
        <UseBiometrics
          supportedBiometryType={supportedBiometryType}
          setUseBiometrics={choice => {
            useBiometricsRef.current = choice;
          }}
          onNext={startWalletSetup}
        />
      );
    }

    if (currentStep === SETUP_STEPS.SHIELDED_ADDRESS) {
      return (
        <ShieldedAddressSetup
          onComplete={useSeedAsZ =>
            createProfile(newSeed, testProfile, useSeedAsZ)
          }
          showHeader={false}
        />
      );
    }

    if (currentStep === SETUP_STEPS.IMPORT_SHIELDED_ADDRESS) {
      return (
        <ShieldedAddressSetup
          actionLabel="Complete"
          body="Use this Secret Recovery Phrase for private transactions and encryption capabilities. Recommended."
          onComplete={completeImportShieldedSetup}
          optionLabel="Restore shielded address"
          showHeader={false}
        />
      );
    }

    if (currentStep === SETUP_STEPS.IMPORT_SEED) {
      return (
        <ImportSeed
          importedSeed={importedSeed}
          onComplete={() => completeImportedSeed()}
          onImportProgressChange={setImportSeedEntryProgress}
          onReviewModeChange={setImportSeedReviewing}
          setImportedSeed={setImportedSeed}
        />
      );
    }

    if (currentStep === SETUP_STEPS.IMPORT_TEXT) {
      return (
        <ImportText
          importedSeed={importedSeed}
          onComplete={() => completeImportedSeed()}
          setImportedSeed={setImportedSeed}
        />
      );
    }

    if (currentStep === SETUP_STEPS.IMPORT_NFC) {
      return (
        <ImportNfc
          autoStart={collectImportBeforeProfile}
          onComplete={seed => completeImportedSeed(seed)}
          setImportedSeed={setImportedSeed}
        />
      );
    }

    if (currentStep === SETUP_STEPS.SEED_INTRO || !newSeed) {
      return (
        <SeedIntro
          ensureNewSeed={ensureNewSeed}
          onNext={continueToSeedWords}
          showHeader={false}
        />
      );
    }

    return (
      <SeedWords
        formStep={seedWordStep}
        setFormStep={setSeedWordStep}
        newSeed={newSeed}
        onBack={() => setCurrentStep(SETUP_STEPS.SEED_INTRO)}
        onComplete={() => setCurrentStep(SETUP_STEPS.SHIELDED_ADDRESS)}
        showHeader={false}
      />
    );
  };

  useRequestBackHandler(goBack, false, 2, walletBackupSetup);

  // Form steps name themselves in the header. The biometrics, shielded
  // address and NFC screens keep their large title instead.
  const getHeaderTitle = () => {
    switch (currentStep) {
      case SETUP_STEPS.NAME:
        return SETUP_STEP_TITLES.NAME;
      case SETUP_STEPS.PASSWORD:
        return SETUP_STEP_TITLES.PASSWORD;
      case SETUP_STEPS.BIOMETRICS:
      case SETUP_STEPS.SHIELDED_ADDRESS:
      case SETUP_STEPS.IMPORT_SHIELDED_ADDRESS:
      case SETUP_STEPS.IMPORT_NFC:
        return null;
      case SETUP_STEPS.IMPORT_SEED:
        return getImportSeedTitle(importSeedReviewing);
      case SETUP_STEPS.IMPORT_TEXT:
        return SETUP_STEP_TITLES.IMPORT_TEXT;
      default:
        // renderStep shows the intro until a phrase exists.
        if (currentStep === SETUP_STEPS.SEED_INTRO || !newSeed) {
          return SETUP_STEP_TITLES.SEED_INTRO;
        }

        return getSeedWordsTitle(seedWordStep >= seedWordPageCount);
    }
  };

  if (scannerVisible) {
    return <ScanSeed cancel={closeScanner} onScan={handleScan} />;
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle={theme.isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.colors.background}
      />
      <CompactSetupHeader
        onBack={goBack}
        progress={progress}
        rightAction={
          currentStep === SETUP_STEPS.PASSWORD ? (
            <PasswordInfoButton onPress={() => setPasswordInfoVisible(true)} />
          ) : null
        }
        title={getHeaderTitle()}
      />
      {renderStep()}
    </View>
  );
}
