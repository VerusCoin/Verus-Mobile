import React from 'react';
import {FingerprintPattern, ScanFace} from 'lucide-react-native';
import {useOnboardingTheme} from '../theme/onboarding';

const BIOMETRY_PRESENTATIONS = {
  TouchID: {
    settingsTitle: 'Touch ID',
    settingsSetupTitle: 'Set up Touch ID',
    turnOnTitle: 'Turn on Touch ID',
    turnOffTitle: 'Turn off Touch ID',
    passwordSetupBody:
      'Enter your password once. Touch ID then unlocks this wallet.',
    onboardingTitle: 'Use Touch ID',
    onboardingBody:
      'Unlock this wallet with Touch ID. You can change this later in settings.',
    icon: FingerprintPattern,
  },
  FaceID: {
    settingsTitle: 'Face ID',
    settingsSetupTitle: 'Set up Face ID',
    turnOnTitle: 'Turn on Face ID',
    turnOffTitle: 'Turn off Face ID',
    passwordSetupBody:
      'Enter your password once. Face ID then unlocks this wallet.',
    onboardingTitle: 'Use Face ID',
    onboardingBody:
      'Unlock this wallet with Face ID. You can change this later in settings.',
    icon: ScanFace,
  },
  Fingerprint: {
    settingsTitle: 'Fingerprint unlock',
    settingsSetupTitle: 'Set up fingerprint unlock',
    turnOnTitle: 'Turn on fingerprint unlock',
    turnOffTitle: 'Turn off fingerprint unlock',
    passwordSetupBody:
      'Enter your password once. Your fingerprint then unlocks this wallet.',
    onboardingTitle: 'Use fingerprint unlock',
    onboardingBody:
      'Unlock this wallet with your fingerprint. You can change this later in settings.',
    icon: FingerprintPattern,
  },
  Face: {
    settingsTitle: 'Face unlock',
    settingsSetupTitle: 'Set up face unlock',
    turnOnTitle: 'Turn on face unlock',
    turnOffTitle: 'Turn off face unlock',
    passwordSetupBody:
      'Enter your password once. Your face then unlocks this wallet.',
    onboardingTitle: 'Use face unlock',
    onboardingBody:
      'Unlock this wallet with facial recognition. You can change this later in settings.',
    icon: ScanFace,
  },
  Iris: {
    settingsTitle: 'Iris recognition',
    settingsSetupTitle: 'Set up iris recognition',
    turnOnTitle: 'Turn on iris recognition',
    turnOffTitle: 'Turn off iris recognition',
    passwordSetupBody:
      'Enter your password once. Iris recognition then unlocks this wallet.',
    onboardingTitle: 'Use biometrics',
    onboardingBody:
      'Unlock this wallet with iris recognition. You can change this later in settings.',
    icon: ScanFace,
  },
};

const DEFAULT_PRESENTATION = {
  settingsTitle: 'Biometric unlock',
  settingsSetupTitle: 'Set up biometric unlock',
  turnOnTitle: 'Turn on biometric unlock',
  turnOffTitle: 'Turn off biometric unlock',
  passwordSetupBody:
    'Enter your password once. Biometrics then unlock this wallet.',
  onboardingTitle: 'Use biometrics',
  onboardingBody:
    'Unlock this wallet with your device biometrics. You can change this later in settings.',
  icon: FingerprintPattern,
};

export const getBiometryPresentation = supportedBiometryType =>
  BIOMETRY_PRESENTATIONS[supportedBiometryType?.type] || DEFAULT_PRESENTATION;

export const getBiometryIconComponent = (
  supportedBiometryType,
  showFallback = false,
) => {
  if (
    !showFallback &&
    (!supportedBiometryType || !supportedBiometryType.biometry)
  ) {
    return null;
  }

  return getBiometryPresentation(supportedBiometryType).icon;
};

const BiometricAffordanceIcon = ({
  supportedBiometryType,
  color,
  showFallback = false,
  size = 22,
  strokeWidth = 1.9,
  style,
}) => {
  const theme = useOnboardingTheme();
  const Icon = getBiometryIconComponent(
    supportedBiometryType,
    showFallback,
  );

  if (Icon == null) {
    return null;
  }

  return (
    <Icon
      color={color || theme.colors.textSubtle}
      size={size}
      strokeWidth={strokeWidth}
      style={style}
    />
  );
};

export default BiometricAffordanceIcon;
