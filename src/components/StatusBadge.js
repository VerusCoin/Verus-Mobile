import React from 'react';
import PropTypes from 'prop-types';
import {Text, View} from 'react-native';
import {statusBadgeStyles as styles} from '../styles';
import {useAppTheme} from '../theme/app';
import {ONBOARDING_THEMES} from '../theme/onboarding/tokens';

export const STATUS_BADGE_TONE = {
  SUCCESS: 'success',
  WARNING: 'warning',
  NEUTRAL: 'neutral',
  INFO: 'info',
  DANGER: 'danger',
};

const DARK_COLORS = ONBOARDING_THEMES.dark.colors;
const PAPER_COLORS = ONBOARDING_THEMES.light.colors;
// The gift card material is dark in both appearances. Its neutral pair is a
// light tint of the material, as in the approved SV-1 mockup.
const CARD_NEUTRAL = {
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  color: 'rgba(244, 241, 233, 0.72)',
};

const getToneColors = (tone, colors) => {
  if (tone === STATUS_BADGE_TONE.INFO) {
    return {backgroundColor: colors.primaryBackground, color: colors.link};
  }
  if (tone === STATUS_BADGE_TONE.SUCCESS) {
    return {backgroundColor: colors.successBackground, color: colors.successText};
  }
  if (tone === STATUS_BADGE_TONE.WARNING) {
    return {backgroundColor: colors.warningBackground, color: colors.warningText};
  }
  if (tone === STATUS_BADGE_TONE.DANGER) {
    return {backgroundColor: colors.dangerBackground, color: colors.dangerText};
  }
  return {backgroundColor: colors.surfaceMuted, color: colors.textSecondary};
};

// Tinted status pill: a semantic background with colored text and no dot.
// Fixed materials use their own tone pair in both appearances: dark for
// `variant="card"`, light for the payment-request `variant="paper"`.
const StatusBadge = ({
  accessibilityLabel = null,
  label,
  labelStyle,
  style,
  tone = STATUS_BADGE_TONE.NEUTRAL,
  variant,
}) => {
  const theme = useAppTheme();
  const onCard = variant === 'card';
  const {backgroundColor, color} =
    onCard && tone === STATUS_BADGE_TONE.NEUTRAL
      ? CARD_NEUTRAL
      : getToneColors(tone, onCard ? DARK_COLORS : variant === 'paper' ? PAPER_COLORS : theme.colors);

  return (
    <View
      accessible={Boolean(accessibilityLabel)}
      accessibilityLabel={accessibilityLabel || `Status: ${label}`}
      style={[styles.badge, {backgroundColor}, style]}>
      <Text numberOfLines={1} style={[styles.label, labelStyle, {color}]}>
        {label}
      </Text>
    </View>
  );
};

StatusBadge.propTypes = {
  // eslint-disable-next-line react/require-default-props -- Optional label defaults in the function arguments.
  accessibilityLabel: PropTypes.string,
};

export default StatusBadge;
