/*
  VerusIdOptionsSheet
  - The ⋯ options of the VerusID page, drawn with the gift card options rows
    (unfilled 62-point rows, dimmed icon, semibold label, chevron).
  - A tapped action runs after the sheet has finished closing.
*/
import React, {useMemo, useRef} from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';

const OptionRow = ({danger, icon, label, onPress, styles, theme}) => (
  <TouchableOpacity
    accessibilityLabel={label}
    accessibilityRole="button"
    activeOpacity={0.74}
    onPress={onPress}
    style={styles.actionRow}>
    <View style={[styles.actionIconContainer, styles.actionIcon]}>
      <MaterialCommunityIcons
        color={danger ? theme.colors.danger : theme.colors.textPrimary}
        name={icon}
        size={24}
      />
    </View>
    <Text style={[styles.actionLabel, danger && {color: theme.colors.danger}]}>
      {label}
    </Text>
    <MaterialCommunityIcons
      color={theme.colors.textSubtle}
      name="chevron-right"
      size={22}
    />
  </TouchableOpacity>
);

// actions: [{key, label, icon, danger, onPress}]
const VerusIdOptionsSheet = ({actions = [], onClose, visible}) => {
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createSignedOutSheetStyles(theme), [theme]);
  const pendingActionRef = useRef(null);

  const runAfterClose = action => {
    // The first choice wins: a tap during the close must not replace it.
    if (pendingActionRef.current) return;
    pendingActionRef.current = action.onPress;
    onClose();
  };

  const handleClosed = () => {
    const pendingAction = pendingActionRef.current;
    pendingActionRef.current = null;

    if (typeof pendingAction === 'function') pendingAction();
  };

  return (
    <BottomSheetModal
      maxHeight="78%"
      onClose={onClose}
      onClosed={handleClosed}
      visible={visible}>
      <View style={[styles.body, styles.bodyShort, localStyles.body]}>
        {actions.map(action => (
          <OptionRow
            key={action.key}
            danger={action.danger}
            icon={action.icon}
            label={action.label}
            onPress={() => runAfterClose(action)}
            styles={styles}
            theme={theme}
          />
        ))}
      </View>
    </BottomSheetModal>
  );
};

const localStyles = StyleSheet.create({
  body: {paddingTop: 4},
});

export default VerusIdOptionsSheet;
