import React, {useMemo, useRef} from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import BottomSheetModal from '../../components/BottomSheetModal';
import SignedOutActionRow from '../../components/SignedOutActionRow';
import {createSignedOutSheetStyles} from '../../styles';
import {useOnboardingTheme} from '../../theme/onboarding';
import {IMPORT_METHODS} from '../Onboard/onboardingSetupFlow';

const AUTHORITY_IMPORT_ACTIONS = [
  {
    label: 'Import Secret Recovery Phrase',
    method: IMPORT_METHODS.SEED,
    testID: 'revokeRecover.authority.importSeed',
  },
  {
    label: 'Scan QR code',
    method: IMPORT_METHODS.QR,
    testID: 'revokeRecover.authority.importQr',
  },
  {
    label: 'Restore from NFC backup',
    method: IMPORT_METHODS.NFC,
    testID: 'revokeRecover.authority.importNfc',
  },
  {
    label: 'Enter custom seed or private key',
    method: IMPORT_METHODS.TEXT,
    testID: 'revokeRecover.authority.importText',
  },
];

const RevokeRecoverAuthoritySheet = ({
  visible,
  isRecovery,
  onClose,
  onSelectMethod,
}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const pendingMethodRef = useRef(null);

  const selectMethod = method => {
    pendingMethodRef.current = method;
    onClose();
  };

  const handleClosed = () => {
    const pendingMethod = pendingMethodRef.current;
    pendingMethodRef.current = null;

    if (pendingMethod != null) {
      onSelectMethod(pendingMethod);
    }
  };

  return (
    <BottomSheetModal
      contentContainerStyle={localStyles.sheet}
      maxHeight="78%"
      onClose={onClose}
      onClosed={handleClosed}
      visible={visible}>
      <ScrollView
        style={{flexShrink: 1}}
        contentContainerStyle={[styles.body, localStyles.body]}>
        <Text
          accessibilityRole="header"
          style={[
            theme.typography.titleSheet,
            {color: theme.colors.textPrimary},
          ]}>
          {isRecovery
            ? 'Import recovery authority'
            : 'Import revocation authority'}
        </Text>
        <Text
          style={[
            theme.typography.bodySm,
            localStyles.subtitle,
            {color: theme.colors.textSecondary},
          ]}>
          {isRecovery
            ? 'Choose how to provide the authority that can restore this VerusID.'
            : 'Choose how to provide the authority that can revoke this VerusID.'}
        </Text>
        <View
          style={[
            localStyles.notice,
            {backgroundColor: theme.colors.warningBackground},
          ]}>
          <Text
            style={[
              theme.typography.caption,
              localStyles.noticeText,
              {
                color: theme.isDark
                  ? theme.colors.warning
                  : theme.colors.textSecondary,
              },
            ]}>
            {isRecovery
              ? 'The secret stays on this device and only signs this recovery.'
              : 'The secret stays on this device and only signs this revocation.'}
          </Text>
        </View>
        <View style={localStyles.actions}>
          {AUTHORITY_IMPORT_ACTIONS.map(action => (
            <SignedOutActionRow
              key={action.method}
              style={localStyles.actionRow}
              labelStyle={theme.typography.titleRow}
              label={action.label}
              onPress={() => selectMethod(action.method)}
              testID={action.testID}
            />
          ))}
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
};

const localStyles = StyleSheet.create({
  sheet: {paddingTop: 0},
  body: {paddingTop: 18, paddingBottom: 18},
  subtitle: {marginTop: 6, marginBottom: 16},
  notice: {paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14},
  noticeText: {lineHeight: 19},
  actions: {paddingTop: 8},
  actionRow: {minHeight: 58, paddingVertical: 8, paddingHorizontal: 4},
});

export default RevokeRecoverAuthoritySheet;
