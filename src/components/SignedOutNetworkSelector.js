import React, {useState} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Check, ChevronDown, Network} from 'lucide-react-native';
import BottomSheetModal from './BottomSheetModal';
import StatusBadge from './StatusBadge';
import {fontStyle} from '../globals/fonts';
import {useOnboardingTheme} from '../theme/onboarding';

const NETWORK_OPTIONS = [
  {
    label: 'Mainnet',
    testProfile: false,
  },
  {
    label: 'Testnet',
    testProfile: true,
  },
];

const TESTNET_WARNING =
  'Testnet assets have no value and may disappear when networks reset.';
const MAINNET_ICON_COLOR = '#C6CBD3';

const SignedOutNetworkSelector = ({
  testProfile = false,
  setTestProfile,
  showLabel = false,
  privateTestnet = false,
}) => {
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const [sheetVisible, setSheetVisible] = useState(false);
  const iconColor = theme.isDark ? theme.colors.textSubtle : MAINNET_ICON_COLOR;
  const selectedNetwork = testProfile ? 'Testnet' : 'Mainnet';

  const handleSelectNetwork = nextTestProfile => {
    if (typeof setTestProfile === 'function') {
      setTestProfile(nextTestProfile);
    }

    setSheetVisible(false);
  };

  const trigger = (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Wallet network: ${selectedNetwork}`}
      accessibilityHint="Open wallet network selector"
      activeOpacity={0.72}
      hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}
      onPress={() => setSheetVisible(true)}
      style={[
        showLabel ? styles.labeledTrigger : styles.trigger,
        !showLabel && {
          top: insets.top + 16,
          right: insets.right + 22,
        },
      ]}>
      {showLabel ? (
        <>
          <Text
            numberOfLines={1}
            style={[
              theme.typography.caption,
              styles.networkLabel,
              {color: theme.colors.textSecondary},
            ]}>
            {selectedNetwork}
          </Text>
          <ChevronDown
            color={theme.colors.textSubtle}
            size={14}
            strokeWidth={2}
          />
        </>
      ) : (
        <View style={styles.triggerContent}>
          <Network color={iconColor} size={24} strokeWidth={2.2} />
          {testProfile && (
            <Text style={[styles.testnetIndicator, {color: iconColor}]}>
              {'T'}
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      {showLabel ? (
        <View style={styles.labeledSelector}>
          {trigger}
          {__DEV__ && testProfile && privateTestnet && (
            <StatusBadge
              label="Private testnet"
              tone="warning"
              style={styles.privateBadge}
            />
          )}
        </View>
      ) : (
        trigger
      )}

      <BottomSheetModal
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        maxHeight="52%">
        <View style={styles.sheetBody}>
          <Text style={[styles.sheetTitle, {color: theme.colors.textPrimary}]}>
            {'Wallet network'}
          </Text>
          <View style={styles.options}>
            {NETWORK_OPTIONS.map(option => (
              <NetworkOption
                key={option.label}
                label={option.label}
                selected={testProfile === option.testProfile}
                theme={theme}
                onPress={() => handleSelectNetwork(option.testProfile)}
              />
            ))}
          </View>
          <Text style={[styles.warning, {color: theme.colors.textSubtle}]}>
            {TESTNET_WARNING}
          </Text>
        </View>
      </BottomSheetModal>
    </>
  );
};

const NetworkOption = ({label, selected, theme, onPress}) => (
  <TouchableOpacity
    accessibilityRole="button"
    accessibilityState={{selected}}
    activeOpacity={0.74}
    onPress={onPress}
    style={[
      styles.optionRow,
      {
        backgroundColor: selected
          ? theme.colors.successBackground
          : theme.colors.surfaceMuted,
      },
    ]}>
    <Text style={[styles.optionLabel, {color: theme.colors.textPrimary}]}>
      {label}
    </Text>
    <View style={styles.checkContainer}>
      {selected && (
        <Check color={theme.colors.success} size={20} strokeWidth={2.4} />
      )}
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  labeledSelector: {
    flexShrink: 1,
    alignItems: 'flex-end',
  },
  labeledTrigger: {
    minHeight: 44,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  networkLabel: {
    flexShrink: 1,
    textAlign: 'right',
  },
  privateBadge: {
    marginBottom: 8,
  },
  trigger: {
    position: 'absolute',
    zIndex: 10,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  triggerContent: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testnetIndicator: {
    position: 'absolute',
    left: -2,
    fontSize: 17,
    lineHeight: 19,
    ...fontStyle('semiBold'),
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sheetBody: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
  },
  sheetTitle: {
    fontSize: 18,
    ...fontStyle('semiBold'),
    marginBottom: 12,
  },
  options: {
    gap: 8,
  },
  optionRow: {
    minHeight: 56,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F6FA',
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    ...fontStyle('semiBold'),
  },
  checkContainer: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warning: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
});

export default SignedOutNetworkSelector;
