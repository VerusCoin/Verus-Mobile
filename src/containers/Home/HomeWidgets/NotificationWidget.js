import React, {useState} from 'react';
import {View, TouchableOpacity, Alert, Text, StyleSheet} from 'react-native';
import {Card, IconButton} from 'react-native-paper';
import {useSelector} from 'react-redux';
import Colors from '../../../globals/colors';
import {
  NOTIFICATION_TYPE_BASIC,
  NOTIFICATION_TYPE_LOADING,
  NOTIFICATION_ICON_TX,
  NOTIFICATION_ICON_VERUSID,
  NOTIFICATION_ICON_ERROR,
  NOTIFICATION_TYPE_VERUS_ID_PROVISIONING,
} from '../../../utils/constants/notifications';
import {VerusIdAtIcon, ReceivedIcon, VerusIdErrorIcon} from '../../../images/customIcons';
import {BasicNotification, LoadingNotification, VerusIdProvisioningNotification} from '../../../utils/notification';
import {processVerusId} from '../../../containers/Services/ServiceComponents/VerusIdService/VerusIdLogin';
import {dispatchRemoveNotification, dispatchClearNotifications} from '../../../actions/actions/notifications/dispatchers/notifications';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {registrationNotifications} from '../../../utils/identityRegistration/notifications';

const getIcon = (type, index) => {
  const props = {index, width: 22, height: 22};
  switch (type) {
    case NOTIFICATION_ICON_VERUSID:
      return <VerusIdAtIcon {...props} />;
    case NOTIFICATION_ICON_ERROR:
      return <VerusIdErrorIcon {...props} />;
    case NOTIFICATION_ICON_TX:
    default:
      return <ReceivedIcon {...props} />;
  }
};

const getNotifications = (notifications, accountHash) =>
  Object.entries(notifications.directory || {}).flatMap(([uid, notification]) => {
    if (notification.acchash !== accountHash) return [];
    let item;
    if (notification.type === NOTIFICATION_TYPE_VERUS_ID_PROVISIONING) {
      item = VerusIdProvisioningNotification.fromJson(notification, processVerusId);
    } else if (notification.type === NOTIFICATION_TYPE_BASIC) {
      item = BasicNotification.fromJson(notification);
    } else if (notification.type === NOTIFICATION_TYPE_LOADING) {
      item = LoadingNotification.fromJson(notification);
    }
    if (!item) return [];
    item.icon = getIcon(notification.icon, uid);
    return [item];
  });

const NotificationTitle = ({title}) => (
  <Text style={styles.ordinaryTitle}>
    {Array.isArray(title) ? title.map((part, index) => (
      <Text key={index} style={index % 2 === 0 ? styles.highlight : undefined}>{part}</Text>
    )) : title}
  </Text>
);

const RegistrationNotice = ({notification, onPress}) => (
  <TouchableOpacity
    style={styles.registration}
    onPress={onPress}
    activeOpacity={0.65}
    accessibilityRole="button"
    accessibilityLabel={`${notification.identityName}. ${notification.statusText}. ${notification.body}`}
    accessibilityHint="Opens this identity registration"
    testID={`registration-notice-${notification.jobId}`}>
    <View style={styles.registrationIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {notification.icon}
    </View>
    <View style={styles.registrationContent}>
      <Text style={styles.registrationName} numberOfLines={2}>{notification.identityName}</Text>
      <Text style={styles.status}>{notification.statusText}</Text>
      <Text style={styles.registrationAction}>{notification.body} ›</Text>
    </View>
  </TouchableOpacity>
);

const OrdinaryNotice = ({notification, onAction}) => (
  <View style={styles.ordinary}>
    <View style={styles.ordinaryHeading}>
      <View style={styles.ordinaryIcon} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {notification.icon}
      </View>
      <NotificationTitle title={notification.title} />
      {!notification.persistent && (
        <IconButton
          icon="close"
          iconColor="#69717D"
          size={20}
          style={styles.iconButton}
          accessibilityLabel="Dismiss notification"
          onPress={() => Alert.alert('Clear Notification', 'Are you sure you want to clear the notification?', [
            {text: 'Cancel', style: 'cancel'},
            {text: 'Clear', onPress: () => dispatchRemoveNotification(notification.uid)},
          ])}
        />
      )}
    </View>
    {!!notification.body && (notification.isActionable() ? (
      <TouchableOpacity style={styles.ordinaryAction} onPress={onAction} accessibilityRole="button">
        <Text style={styles.actionText}>{notification.body}</Text>
      </TouchableOpacity>
    ) : <Text style={styles.ordinaryBody}>{notification.body}</Text>)}
  </View>
);

const NotificationWidget = props => {
  const [collapsed, setCollapsed] = useState(false);
  const notifications = useObjectSelector(state => state.notifications);
  const registrationJobs = useObjectSelector(state => state.channelStore_verusid.registrationJobs || {});
  const accountHash = useSelector(state => state.authentication.activeAccount?.accountHash);
  const ordinaryNotifications = getNotifications(notifications, accountHash);
  const trayNotifications = [
    ...registrationNotifications(registrationJobs, accountHash).map(notification => ({
      ...notification,
      icon: getIcon(NOTIFICATION_ICON_VERUSID, notification.uid),
    })),
    ...ordinaryNotifications,
  ];

  if (trayNotifications.length === 0) return <View />;

  return (
    <View style={styles.container}>
      <Card style={styles.card} mode="outlined">
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerToggle}
            onPress={() => setCollapsed(!collapsed)}
            accessibilityRole="button"
            accessibilityLabel={`${collapsed ? 'Show' : 'Hide'} activity, ${trayNotifications.length} notifications`}
            accessibilityState={{expanded: !collapsed}}>
            <Text style={styles.headerTitle}>Activity</Text>
            <View style={styles.count}>
              <Text style={styles.countText}>{trayNotifications.length}</Text>
            </View>
            <IconButton
              icon={collapsed ? 'chevron-down' : 'chevron-up'}
              iconColor="#69717D"
              size={22}
              style={styles.chevron}
              accessible={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
          {!collapsed && ordinaryNotifications.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              accessibilityRole="button"
              onPress={() => Alert.alert('Clear Notifications', 'Clear all dismissible notifications?', [
                {text: 'Cancel', style: 'cancel'},
                {text: 'Clear', onPress: () => dispatchClearNotifications()},
              ])}>
              <Text style={styles.clearLabel}>Clear all</Text>
            </TouchableOpacity>
          )}
        </View>
        {!collapsed && trayNotifications.map(notification => notification.kind === 'identity-registration' ? (
          <RegistrationNotice
            key={notification.uid}
            notification={notification}
            onPress={() => notification.onAction(props)}
          />
        ) : (
          <OrdinaryNotice
            key={notification.uid}
            notification={notification}
            onAction={() => notification.onAction(props)}
          />
        ))}
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {paddingHorizontal: 10, paddingVertical: 10},
  card: {width: '100%', borderRadius: 16, backgroundColor: '#FFFFFF', borderColor: '#E3E7ED', overflow: 'hidden'},
  header: {flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', paddingHorizontal: 14},
  headerToggle: {flexDirection: 'row', flex: 1, minWidth: 150, minHeight: 44, alignItems: 'center'},
  headerTitle: {fontSize: 15, lineHeight: 21, fontWeight: '600', color: '#454F5E', flexShrink: 1},
  count: {marginLeft: 8, minWidth: 22, borderRadius: 11, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#EDF2FC'},
  countText: {fontSize: 12, lineHeight: 16, fontWeight: '600', color: Colors.primaryColor, textAlign: 'center'},
  chevron: {margin: 0, marginLeft: 2, width: 32, height: 40},
  clearButton: {minHeight: 44, justifyContent: 'center', paddingHorizontal: 8, flexShrink: 1},
  clearLabel: {fontSize: 14, lineHeight: 20, color: Colors.primaryColor},
  registration: {flexDirection: 'row', alignItems: 'flex-start', padding: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E3E7ED', minHeight: 96},
  registrationIcon: {width: 36, height: 36, borderRadius: 10, backgroundColor: '#EDF2FC', alignItems: 'center', justifyContent: 'center', marginRight: 12},
  registrationContent: {flex: 1, minWidth: 0},
  registrationName: {fontSize: 16, lineHeight: 22, fontWeight: '600', color: '#202B3C', flexShrink: 1},
  status: {fontSize: 14, lineHeight: 20, color: '#596577', marginTop: 3, flexShrink: 1},
  registrationAction: {fontSize: 15, lineHeight: 21, fontWeight: '600', color: Colors.primaryColor, marginTop: 10, flexShrink: 1},
  ordinary: {padding: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E3E7ED'},
  ordinaryHeading: {flexDirection: 'row', alignItems: 'center'},
  ordinaryIcon: {width: 30, alignItems: 'center', marginRight: 8},
  ordinaryTitle: {flex: 1, minWidth: 0, fontSize: 14, lineHeight: 20, color: '#202B3C'},
  highlight: {color: Colors.primaryColor, fontWeight: '600'},
  iconButton: {margin: 0, marginLeft: 4, width: 44, height: 44},
  ordinaryAction: {minHeight: 44, justifyContent: 'center', marginLeft: 38, alignSelf: 'stretch'},
  actionText: {fontSize: 14, lineHeight: 20, color: Colors.primaryColor, fontWeight: '600', flexShrink: 1},
  ordinaryBody: {fontSize: 14, lineHeight: 20, color: '#596577', marginTop: 4, marginLeft: 38},
});

export default NotificationWidget;
