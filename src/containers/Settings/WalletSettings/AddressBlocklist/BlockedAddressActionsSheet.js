import React, {useMemo} from 'react';
import {Platform, StyleSheet, View} from 'react-native';
import {Text} from 'react-native-paper';
import {Pencil, Trash2} from 'lucide-react-native';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import SignedOutActionRow from '../../../../components/SignedOutActionRow';
import useSheetDismissal from '../../../../components/useSheetDismissal';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

// Opened from a blocked address row. Each action runs after the sheet closes.
const BlockedAddressActionsSheet = ({
  address,
  onClose,
  onClosed,
  onEdit,
  onRemove,
  visible,
}) => {
  const theme = useOnboardingTheme();
  const sheetStyles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const dismissal = useSheetDismissal({visible, onClose, onClosed});

  return (
    <BottomSheetModal
      maxHeight="78%"
      onClose={dismissal.close}
      onClosed={dismissal.onClosed}
      visible={visible}>
      <View style={[sheetStyles.body, sheetStyles.bodyShort]}>
        <Text accessibilityRole="header" style={sheetStyles.title}>
          Blocked address
        </Text>
        <Text style={[sheetStyles.subtitle, styles.address]}>{address}</Text>
        <SignedOutActionRow
          IconComponent={Pencil}
          label="Edit address"
          onPress={() => dismissal.dismiss(onEdit)}
        />
        <SignedOutActionRow
          IconComponent={Trash2}
          label="Remove from blocklist"
          onPress={() => dismissal.dismiss(onRemove)}
        />
      </View>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  address: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.2,
  },
});

export default BlockedAddressActionsSheet;
