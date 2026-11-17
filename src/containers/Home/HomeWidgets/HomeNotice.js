import React from 'react';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import AppButton from '../../../components/AppButton';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {noticeCardStyles as styles} from './NotificationWidget';

export const HOME_NOTICE_OFFLINE = 'offline';
export const HOME_NOTICE_UNREACHABLE = 'unreachable';
export const HOME_NOTICE_EMPTY = 'empty';
export const HOME_NOTICE_FOUND = 'found';
export const HOME_NOTICE_SYNC = 'sync';

// One card at a time under the Home balance: the first sentence in semibold
// says the state, the second what to do, and the button does it.
const getCopy = ({kind, count}, handlers) => {
  switch (kind) {
    case HOME_NOTICE_OFFLINE:
      // Home refreshes by itself when the connection returns.
      return {highlight: 'No internet connection.', text: 'Balances may be out of date.'};
    case HOME_NOTICE_UNREACHABLE:
      return {
        highlight: 'Could not connect.',
        text: 'Balances may be out of date.',
        action: 'Try again',
        onAction: handlers.onRetry,
      };
    case HOME_NOTICE_EMPTY:
      return {
        highlight: 'Your wallet is empty.',
        text: 'Receive coins to start.',
        action: 'Receive',
        onAction: handlers.onReceive,
      };
    case HOME_NOTICE_FOUND:
      return {
        highlight: `${count} ${count === 1 ? 'asset' : 'assets'} found.`,
        text: count === 1 ? 'Add it to your wallet.' : 'Add them to your wallet.',
        action: 'Review',
        onAction: handlers.onReview,
        // Review or close: either one ends the card for these currencies.
        onDismiss: handlers.onDismiss,
      };
    case HOME_NOTICE_SYNC:
      return {
        highlight: 'Your Private card is syncing.',
        text: 'Balances may be incomplete.',
        onDismiss: handlers.onDismiss,
      };
    default:
      return null;
  }
};

// Card A from the Home notifications. The found-assets card keeps card A's
// close icon, as does sync; the others go away when their state ends.
const HomeNotice = ({notice, loading, onDismiss, onRetry, onReceive, onReview}) => {
  const theme = useOnboardingTheme();
  const copy = notice
    ? getCopy(notice, {onDismiss, onRetry, onReceive, onReview})
    : null;

  if (!copy) return null;

  return (
    <View style={styles.container}>
      <View
        accessibilityLiveRegion={notice.kind === HOME_NOTICE_SYNC ? 'none' : 'polite'}
        style={[
          styles.card,
          !copy.onDismiss && styles.cardWithoutDismiss,
          {backgroundColor: theme.colors.surfaceMuted},
        ]}>
        {/* The title flexes in a row, as in card A; in the column it would
            collapse to no height. */}
        <View style={styles.topRow}>
          <Text style={[theme.typography.bodySm, styles.title, {color: theme.colors.textPrimary}]}>
            <Text style={styles.highlight}>{copy.highlight}</Text>
            {` ${copy.text}`}
          </Text>
          {copy.onDismiss ? (
            <TouchableOpacity
              accessibilityLabel="Dismiss"
              accessibilityRole="button"
              onPress={copy.onDismiss}
              style={styles.dismissButton}>
              <MaterialCommunityIcons
                color={theme.colors.textSubtle}
                name="close"
                size={18}
              />
            </TouchableOpacity>
          ) : null}
        </View>
        {notice.kind === HOME_NOTICE_SYNC ? (
          <View style={localStyles.progressRow}>
            <View
              accessible
              accessibilityLabel="Private card sync"
              accessibilityRole="progressbar"
              accessibilityValue={{min: 0, max: 100, now: notice.percent}}
              style={[localStyles.progressTrack, {backgroundColor: theme.colors.borderStrong}]}>
              <View style={[localStyles.progressFill, {
                backgroundColor: theme.colors.primary,
                width: `${notice.percent}%`,
              }]} />
            </View>
            <Text style={[theme.typography.caption, localStyles.percent, {color: theme.colors.textSecondary}]}>
              {`${notice.percent}%`}
            </Text>
          </View>
        ) : null}
        {copy.action ? (
          <AppButton
            buttonColor={theme.colors.surface}
            compact
            height={32}
            preserveHeightOnSmallWindow
            labelStyle={[theme.typography.labelSm, styles.actionLabel]}
            loading={notice.kind === HOME_NOTICE_UNREACHABLE && loading}
            onPress={copy.onAction}
            style={styles.action}
            themeMode={theme.mode}
            variant="secondary">
            {copy.action}
          </AppButton>
        ) : null}
      </View>
    </View>
  );
};

const localStyles = StyleSheet.create({
  progressRow: {flexDirection: 'row', alignItems: 'center', marginTop: 10, marginRight: 14},
  progressTrack: {flex: 1, height: 4, borderRadius: 2, overflow: 'hidden'},
  progressFill: {height: '100%', borderRadius: 2},
  percent: {marginLeft: 10, fontVariant: ['tabular-nums']},
});

export default HomeNotice;
