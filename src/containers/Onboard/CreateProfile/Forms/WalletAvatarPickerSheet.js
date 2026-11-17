import React, {useMemo} from 'react';
import {StyleSheet, TouchableOpacity, View} from 'react-native';
import {Text} from 'react-native-paper';
import AppButton from '../../../../components/AppButton';
import BottomSheetModal from '../../../../components/BottomSheetModal';
import {WalletAvatarEmoji} from '../../../../components/WalletAvatar';
import {fontStyle} from '../../../../globals/fonts';
import {createSignedOutSheetStyles} from '../../../../styles';
import {useOnboardingTheme} from '../../../../theme/onboarding';
import {
  DEFAULT_WALLET_AVATAR,
  WALLET_AVATAR_COLORS,
  WALLET_AVATAR_ICONS,
  normalizeWalletAvatar,
} from '../../../../utils/walletAvatar';

const WalletAvatarPickerSheet = ({
  visible,
  walletAvatar,
  onChange,
  onClose,
  onSubmit,
  submitting = false,
  submitLabel = 'Done',
  submitVariant = 'secondary',
  // One short failure line above the action, such as "Not saved. Try again."
  errorText = null,
}) => {
  const theme = useOnboardingTheme();
  const signedOutSheetStyles = useMemo(
    () => createSignedOutSheetStyles(theme),
    [theme],
  );
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selectedAvatar = normalizeWalletAvatar(
    walletAvatar,
    DEFAULT_WALLET_AVATAR,
  );

  const selectEmoji = emoji => {
    onChange({
      ...selectedAvatar,
      emoji,
    });
  };

  const selectColor = backgroundColor => {
    onChange({
      ...selectedAvatar,
      backgroundColor,
    });
  };

  return (
    <BottomSheetModal visible={visible} onClose={onClose} maxHeight="62%">
      <View style={signedOutSheetStyles.body}>
        <View style={styles.header}>
          <Text style={signedOutSheetStyles.title}>{'Wallet icon'}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.iconGrid}>
            {WALLET_AVATAR_ICONS.map(({emoji, label}) => {
              const selected = selectedAvatar.emoji === emoji;

              return (
                <TouchableOpacity
                  key={emoji}
                  accessibilityLabel={`${label} wallet icon`}
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  activeOpacity={0.74}
                  onPress={() => selectEmoji(emoji)}
                  style={[styles.iconChoice, selected && styles.choiceActive]}>
                  <WalletAvatarEmoji emoji={emoji} emojiSize={28} />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.colorGrid}>
            {WALLET_AVATAR_COLORS.map(({backgroundColor, label}) => {
              const selected =
                selectedAvatar.backgroundColor === backgroundColor;

              return (
                <TouchableOpacity
                  key={backgroundColor}
                  accessibilityLabel={`${label} wallet color`}
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  activeOpacity={0.74}
                  onPress={() => selectColor(backgroundColor)}
                  style={[styles.colorChoice, selected && styles.choiceActive]}>
                  <View
                    style={[
                      styles.swatch,
                      {
                        backgroundColor,
                      },
                    ]}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {errorText ? (
          <Text accessibilityLiveRegion="polite" style={styles.errorText}>
            {errorText}
          </Text>
        ) : null}

        <AppButton
          accessibilityLabel={submitLabel}
          disabled={submitting}
          height={56}
          loading={submitting}
          onPress={onSubmit || onClose}
          style={styles.doneButton}
          variant={submitVariant}>
          {submitLabel}
        </AppButton>
      </View>
    </BottomSheetModal>
  );
};

const createStyles = theme =>
  StyleSheet.create({
  header: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  doneButton: {
    marginTop: 22,
  },
  errorText: {
    marginTop: 9,
    color: theme.colors.danger,
    fontSize: 13,
    lineHeight: 18,
    ...fontStyle('regular'),
  },
  section: {
    marginTop: 12,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconChoice: {
    width: '22%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  choiceActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceMuted,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorChoice: {
    width: '13.5%',
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  swatch: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: theme.colors.sheet,
  },
});

export default WalletAvatarPickerSheet;
