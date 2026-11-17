import React, {useMemo, useRef} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {FileClock, Gift, KeyRound, ShieldCheck} from 'lucide-react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../components/BottomSheetModal';
import {createSignedOutSheetStyles} from '../../../styles';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {useNfcSupported} from '../../../hooks/useNfcSupported';

const OTHER_ACTIONS = [
  {
    label: 'Revoke or recover VerusID',
    IconComponent: ShieldCheck,
    actionKey: 'onRevokeRecoverVerusId',
  },
  {
    label: 'Saved requests',
    IconComponent: FileClock,
    actionKey: 'onProvisioningRequests',
  },
];

const OtherOptionsSheet = ({
  visible,
  onClose,
  onClaimFromNfc,
  onRecoverProfileSeed,
  onRevokeRecoverVerusId,
  onProvisioningRequests,
  walletCount,
}) => {
  const theme = useOnboardingTheme();
  const nfcSupported = useNfcSupported();
  const showClaimFromNfc =
    typeof onClaimFromNfc === 'function' && nfcSupported;
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const pendingActionRef = useRef(null);
  const recoveryDisabled = walletCount === 0;
  const actionHandlers = {
    onRecoverProfileSeed,
    onRevokeRecoverVerusId,
    onProvisioningRequests,
  };

  const handleAction = action => {
    pendingActionRef.current = typeof action === 'function' ? action : null;
    onClose();
  };

  const handleClosed = () => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;

    if (typeof pendingAction === 'function') {
      pendingAction();
    }
  };

  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      onClosed={handleClosed}
      maxHeight="78%">
      <View style={[sheetStyles.body, sheetStyles.bodyShort]}>
        {showClaimFromNfc && (
          <OtherActionRow
            label="Claim from NFC card"
            IconComponent={Gift}
            sheetStyles={sheetStyles}
            testID="login.otherOptions.claimNfc"
            theme={theme}
            onPress={() => handleAction(onClaimFromNfc)}
          />
        )}
        <OtherActionRow
          disabled={recoveryDisabled}
          label="View wallet recovery secrets"
          IconComponent={KeyRound}
          sheetStyles={sheetStyles}
          theme={theme}
          onPress={() => handleAction(onRecoverProfileSeed)}
        />
        {OTHER_ACTIONS.map(({label, IconComponent, actionKey}) => (
          <OtherActionRow
            key={label}
            label={label}
            IconComponent={IconComponent}
            sheetStyles={sheetStyles}
            theme={theme}
            onPress={() => handleAction(actionHandlers[actionKey])}
          />
        ))}
      </View>
    </BottomSheetModal>
  );
};

const OtherActionRow = ({
  disabled = false,
  label,
  IconComponent,
  sheetStyles,
  testID,
  theme,
  onPress,
}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{disabled}}
    activeOpacity={0.74}
    disabled={disabled}
    onPress={onPress}
    testID={testID}
    style={[sheetStyles.actionRow, disabled && styles.actionRowDisabled]}>
    <View style={[sheetStyles.actionIconContainer, sheetStyles.actionIcon]}>
      <IconComponent size={24} color={theme.colors.textPrimary} />
    </View>
    <Text style={sheetStyles.actionLabel}>{label}</Text>
    <MaterialCommunityIcons
      name="chevron-right"
      size={22}
      color={theme.colors.textSubtle}
    />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  actionRowDisabled: {
    opacity: 0.48,
  },
});

export default OtherOptionsSheet;
