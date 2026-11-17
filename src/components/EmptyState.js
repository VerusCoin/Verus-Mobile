import React, {useMemo} from 'react';
import {Text, View} from 'react-native';
import AppButton from './AppButton';
import {
  EMPTY_STATE_GLYPH_SIZE,
  GLYPH_STROKE_WIDTH,
  emptyStateStyles as createStyles,
} from '../styles';
import {useAppTheme} from '../theme/app';

// An empty or failed list: one Lucide glyph, a title, an optional line and
// one action. The glyph names the service; the title says the state.
const EmptyState = ({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  style,
  testID,
}) => {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(), []);

  return (
    <View style={[styles.container, style]} testID={testID}>
      {Icon ? (
        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.glyph}>
          <Icon
            color={theme.colors.textSubtle}
            size={EMPTY_STATE_GLYPH_SIZE}
            strokeWidth={GLYPH_STROKE_WIDTH}
          />
        </View>
      ) : null}
      <Text
        accessibilityRole="header"
        style={[
          theme.typography.titleSheet,
          styles.title,
          {color: theme.colors.textPrimary},
        ]}>
        {title}
      </Text>
      {message ? (
        <Text style={[styles.message, {color: theme.colors.textSecondary}]}>
          {message}
        </Text>
      ) : null}
      {actionLabel ? (
        <AppButton onPress={onAction} style={styles.action}>
          {actionLabel}
        </AppButton>
      ) : null}
    </View>
  );
};

export default EmptyState;
