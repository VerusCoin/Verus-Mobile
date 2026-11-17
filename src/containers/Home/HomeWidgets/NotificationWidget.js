import {registrationNotifications} from '../../../utils/identityRegistration/notifications';
import {verusIdCopy} from '../../../utils/verusid/verusIdCopy';
import React, {useMemo, useState} from 'react';
import {CircleAlert} from 'lucide-react-native';
import {StyleSheet, Text, TouchableOpacity, View} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useIsFocused, useNavigation} from '@react-navigation/native';
import {useDispatch, useSelector} from 'react-redux';
import AppButton from '../../../components/AppButton';
import {
  NOTIFICATION_ICON_ERROR,
  NOTIFICATION_ICON_VERUSID,
  NOTIFICATION_TYPE_BASIC,
  NOTIFICATION_TYPE_LOADING,
  NOTIFICATION_TYPE_VERUS_ID_PROVISIONING,
} from '../../../utils/constants/notifications';
import {
  dispatchAddNotification,
  dispatchRemoveNotification,
} from '../../../actions/actions/notifications/dispatchers/notifications';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {useOnboardingTheme} from '../../../theme/onboarding';
import {fontStyle} from '../../../globals/fonts';
import {BasicNotification, LoadingNotification, VerusIdProvisioningNotification} from '../../../utils/notification';
import VerusIdReadyCard from './VerusIdReadyCard';
import LinkVerusIdSheet from '../../Services/ServiceComponents/VerusIdService/LinkVerusIdSheet';
import {createRegistrationContext} from '../../../utils/identityRegistration';
import {updateRegistrationUiState} from '../../../actions/actions/services/dispatchers/verusid/registration';

// Preserve the existing failed-provisioning wording for old saved notices.
const getNotificationCopy = notification => {
  const segments = Array.isArray(notification.title)
    ? notification.title
    : [notification.title];
  const highlight = segments[0]?.trim() ?? '';

  if (notification.iconType === NOTIFICATION_ICON_ERROR && notification.type === NOTIFICATION_TYPE_VERUS_ID_PROVISIONING) {
    return {highlight, remainder: 'could not be created', label: 'Try again'};
  }

  return {
    highlight,
    remainder: segments.slice(1).join(' ').replace(/\s+/g, ' ').trim(),
    label: formatCtaLabel(notification.body),
  };
};

const formatCtaLabel = body => {
  if (typeof body !== 'string' || body.trim().length === 0) return 'Continue';
  const trimmed = body.trim();
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
};

const NotificationWidget = ({followsHomeNotice = false}) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const isFocused = useIsFocused();
  const notifications = useObjectSelector(state => state.notifications);
  const activeAccount = useSelector(state => state.authentication.activeAccount);
  const accountHash = activeAccount?.accountHash ?? null;
  const jobs = useObjectSelector(state => state.channelStore_verusid.registrationJobs || {});
  const registrationNotices = registrationNotifications(jobs, accountHash);
  const [linkTarget, setLinkTarget] = useState(null);
  // The link sheet stays mounted until its close animation ends, also when its
  // card was the last one.
  const [linkSheetOpen, setLinkSheetOpen] = useState(false);
  const openLinkSheet = target => {
    setLinkSheetOpen(true);
    setLinkTarget(target);
  };

  const actionableNotifications = useMemo(() => {
    if (!notifications?.directory || !accountHash) return [];
    return Object.entries(notifications.directory)
      .filter(
        ([, value]) =>
          value.acchash === accountHash &&
          [NOTIFICATION_TYPE_VERUS_ID_PROVISIONING, NOTIFICATION_TYPE_BASIC, NOTIFICATION_TYPE_LOADING].includes(value.type),
      )
      .map(([uid, value]) => {
        const notification = value.type === NOTIFICATION_TYPE_BASIC
          ? BasicNotification.fromJson(value)
          : value.type === NOTIFICATION_TYPE_LOADING
          ? LoadingNotification.fromJson(value)
          : VerusIdProvisioningNotification.fromJson(
              value,
              (_props, identityAddress, chain) => openLinkSheet({identityAddress, chain,
                name: getNotificationCopy(value).highlight, notificationUid: uid}),
            );
        notification.uid = uid;
        notification.iconType = value.icon ?? NOTIFICATION_ICON_VERUSID;
        notification.celebrated = value.celebrated === true;
        return notification;
      });
  }, [accountHash, notifications]);

  // The celebration plays once: the stored notification remembers it.
  const markCelebrated = uid => {
    const entry = notifications?.directory?.[uid];

    if (entry && entry.celebrated !== true) {
      dispatchAddNotification({...entry, uid, celebrated: true});
    }
  };

  const updateReady = (jobId, patch) => updateRegistrationUiState(jobId, patch, createRegistrationContext()).catch(() => {
    // Keep the card recoverable when this optional presentation write fails.
  });
  if (actionableNotifications.length === 0 && registrationNotices.length === 0 && !linkTarget && !linkSheetOpen) return null;

  return (
    <View style={[styles.container, followsHomeNotice && styles.followingContainer]}>
      <LinkVerusIdSheet target={linkTarget} onClose={() => setLinkTarget(null)} onClosed={() => setLinkSheetOpen(false)} />
      {registrationNotices.map((notice, index) => notice.ready ? <View key={notice.uid} style={styles.cardSpacing}>
        <VerusIdReadyCard active={isFocused} celebrate={!notice.celebrated} highlight={notice.identityName} remainder="is ready"
          label="Link VerusID" theme={theme} onAction={() => openLinkSheet({jobId: notice.jobId, name: notice.identityName})}
          onCelebrated={() => updateReady(notice.jobId, {readyCelebrated: true})}
          onDismiss={() => updateReady(notice.jobId, {readyDismissed: true})} />
      </View> : (
        <View key={notice.uid} style={[styles.card, styles.cardWithoutDismiss,
          (index < registrationNotices.length - 1 || actionableNotifications.length > 0) && styles.cardSpacing,
          {backgroundColor: theme.colors.surfaceMuted}]}>
          {/* No flex here: these lines sit in a column, where flex 1 gave them zero height.
              The status is its own sentence, so it gets its own line under the name. */}
          <Text style={[theme.typography.bodySm, styles.title, styles.columnTitle, styles.highlight, {color: theme.colors.textPrimary}]}>
            {notice.identityName}
          </Text>
          <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
          {!!notice.tone && <CircleAlert size={14} color={theme.colors[`${notice.tone}Text`]} />}
          <Text style={[theme.typography.caption, styles.noticeStatus, {flexShrink: 1, color: notice.tone ? theme.colors[`${notice.tone}Text`] : theme.colors.textSecondary}]}>
            {verusIdCopy(notice.statusText)}
          </Text>
          </View>
          <AppButton compact height={32} preserveHeightOnSmallWindow variant="secondary" themeMode={theme.mode}
            buttonColor={theme.colors.surface} labelStyle={[theme.typography.labelSm, styles.actionLabel]} style={styles.action}
            onPress={() => notice.onAction({navigation, dispatch})}>
            {notice.body}
          </AppButton>
        </View>
      ))}
      {actionableNotifications.map((notification, index) => {
        const {highlight, label, remainder} = getNotificationCopy(notification);

        if (notification.iconType !== NOTIFICATION_ICON_ERROR && notification.isActionable()) {
          return (
            <View
              key={notification.uid}
              style={
                index < actionableNotifications.length - 1 && styles.cardSpacing
              }>
              <VerusIdReadyCard
                active={isFocused}
                celebrate={!notification.celebrated}
                highlight={highlight}
                label={label}
                onAction={() => notification.onAction({navigation, dispatch})}
                onCelebrated={() => markCelebrated(notification.uid)}
                onDismiss={() => dispatchRemoveNotification(notification.uid)}
                remainder={remainder}
                theme={theme}
              />
            </View>
          );
        }

        return (
          <View
            key={notification.uid}
            style={[
              styles.card,
              {backgroundColor: theme.colors.surfaceMuted},
              index < actionableNotifications.length - 1 && styles.cardSpacing,
            ]}>
            <View style={styles.topRow}>
              <Text style={[theme.typography.bodySm, styles.title, {color: theme.colors.textPrimary}]}>
                <Text style={styles.highlight}>{highlight}</Text>
                {remainder.length > 0 ? ` ${remainder}` : ''}
              </Text>
              <TouchableOpacity
                accessibilityLabel="Dismiss notification"
                accessibilityRole="button"
                onPress={() => dispatchRemoveNotification(notification.uid)}
                style={styles.dismissButton}>
                <MaterialCommunityIcons
                  color={theme.colors.textSubtle}
                  name="close"
                  size={18}
                />
              </TouchableOpacity>
            </View>
            {!notification.isActionable() && !!notification.body && (
              <Text style={[theme.typography.caption, styles.body, {color: theme.colors.textSecondary}]}>
                {notification.body}
              </Text>
            )}
            {/* The page color, not the light-blue tint: the tint disappears
                on the gray card (owner-approved card A, 2026-10-22). */}
            {notification.isActionable() && <AppButton
              buttonColor={theme.colors.surface}
              compact
              height={32}
              preserveHeightOnSmallWindow
              labelStyle={[theme.typography.labelSm, styles.actionLabel]}
              onPress={() => notification.onAction({navigation, dispatch})}
              style={styles.action}
              themeMode={theme.mode}
              variant="secondary">
              {label}
            </AppButton>}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {paddingTop: 4, paddingBottom: 6},
  followingContainer: {paddingTop: 2},
  card: {
    width: '100%',
    borderRadius: 16,
    paddingTop: 12,
    paddingRight: 0,
    paddingBottom: 12,
    paddingLeft: 14,
  },
  cardWithoutDismiss: {paddingRight: 14},
  cardSpacing: {marginBottom: 8},
  topRow: {flexDirection: 'row', alignItems: 'flex-start'},
  title: {
    flex: 1,
  },
  columnTitle: {flex: 0},
  noticeStatus: {marginTop: 2},
  body: {paddingRight: 14},
  highlight: {...fontStyle('semiBold')},
  // A 44-point target around the 18-point icon, centered on the first 20-point line.
  dismissButton: {
    width: 44,
    height: 44,
    marginTop: -12,
    marginBottom: -12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: {alignSelf: 'flex-start', marginTop: 10, borderRadius: 10},
  actionLabel: {
    marginVertical: 0,
    marginHorizontal: 12,
  },
});

// The connection notice on Home uses the same gray card.
export {styles as noticeCardStyles};

export default NotificationWidget;
