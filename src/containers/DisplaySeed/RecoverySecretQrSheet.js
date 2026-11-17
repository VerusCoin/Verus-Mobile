import React, {useMemo} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import {QrCode} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import AppButton from '../../components/AppButton';
import {createAcknowledgeSheetStyles} from '../../components/AcknowledgeSheet';
import BottomSheetModal from '../../components/BottomSheetModal';
import {copyActionStyles, createSignedOutSheetStyles} from '../../styles';
import {useOnboardingTheme} from '../../theme/onboarding';
import {MAX_SEED_CHARS_FOR_QR_DISPLAY} from '../../utils/constants/constants';

export const canShowSecretQr = value =>
  typeof value === 'string' &&
  value.length > 0 &&
  value.length < MAX_SEED_CHARS_FOR_QR_DISPLAY;

// Sits next to CopyAction and matches its 44-point target and icon.
export const SecretQrAction = ({accessibilityLabel, onPress}) => {
  const theme = useOnboardingTheme();

  return (
    <TouchableOpacity
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      activeOpacity={0.72}
      onPress={onPress}
      style={copyActionStyles.iconButton}>
      <QrCode color={theme.colors.textSubtle} size={18} strokeWidth={2} />
    </TouchableOpacity>
  );
};

// The QR code of one recovery secret, on the acknowledgement sheet's
// measurements. The QR keeps Receive's white surface in both appearances.
const RecoverySecretQrSheet = ({onClose, onClosed, secret, visible}) => {
  const theme = useOnboardingTheme();
  const {height} = useWindowDimensions();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const styles = useMemo(() => createAcknowledgeSheetStyles(theme), [theme]);
  const compact = height <= 667;
  const qrSize = compact ? 184 : 216;

  return (
    <BottomSheetModal
      maxHeight="86%"
      onClose={onClose}
      onClosed={onClosed}
      visible={visible}>
      {secret ? (
        <View style={styles.sheet}>
          <Text accessibilityRole="header" style={styles.title}>
            {secret.title}
          </Text>
          <View
            accessibilityLabel={`QR code of the ${secret.title.toLowerCase()}`}
            accessible
            style={[localStyles.qrSurface, compact && localStyles.qrSurfaceCompact]}>
            <QRCode size={qrSize} value={secret.value} />
          </View>
          <Text style={[sheetStyles.bodyText, styles.message]}>
            Anyone who scans this code can control the associated funds.
          </Text>
          <AppButton
            height={56}
            onPress={onClose}
            style={styles.button}
            testID="settings.displaySeed.qrDone"
            variant="primary">
            Done
          </AppButton>
        </View>
      ) : null}
    </BottomSheetModal>
  );
};

const localStyles = StyleSheet.create({
  qrSurface: {
    alignSelf: 'center',
    marginTop: 20,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  qrSurfaceCompact: {
    marginTop: 16,
    padding: 12,
    borderRadius: 18,
  },
});

export default RecoverySecretQrSheet;
