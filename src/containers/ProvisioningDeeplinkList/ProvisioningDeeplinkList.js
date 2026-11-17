import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {IconButton, Text} from 'react-native-paper';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {useDispatch} from 'react-redux';
import {GENERIC_REQUEST_DEEPLINK_VDXF_KEY} from 'verus-typescript-primitives';
import {setDeeplinkData} from '../../actions/actionCreators';
import {
  createAlert,
  resolveAlert,
} from '../../actions/actions/alert/dispatchers/alert';
import AppButton from '../../components/AppButton';
import ServiceManagerHeader from '../../components/ServiceManagerHeader';
import SkeletonLoader, {
  SkeletonBlock,
  SkeletonText,
} from '../../components/SkeletonLoader';
import {fontStyle} from '../../globals/fonts';
import {useOnboardingTheme} from '../../theme/onboarding';
import {
  getPendingDeeplinkPassthrough,
  loadPendingDeeplinkRequests,
  PENDING_REQUEST_KIND_SPENDABLE_KEY,
  removePendingDeeplinkRequest,
} from '../../utils/deeplink/pendingDeeplinkStorage';

const formatDate = timestamp => {
  if (!timestamp) return null;

  try {
    return new Date(timestamp).toLocaleString(undefined, {
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch (_) {
    return null;
  }
};

const getRequestTitle = request => {
  if (request.title && request.title !== 'Pending request') {
    return request.title;
  }

  if (request.requestKind === PENDING_REQUEST_KIND_SPENDABLE_KEY) {
    return 'Spendable key claim';
  }

  return 'Saved request';
};

const getRequestIcon = request => {
  if (request.requestKind === PENDING_REQUEST_KIND_SPENDABLE_KEY) {
    return 'key-outline';
  }

  return 'file-clock-outline';
};

const getRequestActivityLabel = request => {
  if (request.completed) {
    const completedDate = formatDate(request.completedAt);
    return completedDate ? `Completed ${completedDate}` : 'Completed request';
  }

  const savedDate = formatDate(request.createdAt);
  return savedDate ? `Saved ${savedDate}` : 'Saved on this device';
};

const ProvisioningDeeplinkList = props => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const theme = useOnboardingTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [showHeaderDivider, setShowHeaderDivider] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setLoadError(false);

    try {
      setRequests(await loadPendingDeeplinkRequests());
    } catch (_) {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();

    const unsubscribe = props.navigation.addListener('focus', loadRequests);
    return unsubscribe;
  }, [loadRequests, props.navigation]);

  const openRequest = request => {
    const pendingPassthrough = getPendingDeeplinkPassthrough(request) || {};

    dispatch(
      setDeeplinkData(
        GENERIC_REQUEST_DEEPLINK_VDXF_KEY.vdxfid,
        request.requestBufferString,
        request.fromService || null,
        {
          fqnToAutoLink: request.fqnToAutoLink || null,
          ...pendingPassthrough,
          replayedPendingDeeplink: true,
          skipWalletBackupRequests: true,
        },
      ),
    );

    const parentNavigation =
      props.navigation.getParent?.() ||
      props.navigation.dangerouslyGetParent?.();

    if (parentNavigation) {
      parentNavigation.navigate('DeepLink', {screen: 'VerifyDeepLink'});
    } else {
      props.navigation.navigate('DeepLink', {screen: 'VerifyDeepLink'});
    }
  };

  const confirmRemoveRequest = async request => {
    const confirmed = await createAlert(
      'Remove saved request?',
      'It cannot be opened again after removal.',
      [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => resolveAlert(false),
        },
        {text: 'Remove', style: 'destructive', onPress: () => resolveAlert(true)},
      ],
    );

    if (!confirmed) return;

    await removePendingDeeplinkRequest(request.id);
    await loadRequests();
  };

  const renderRequest = request => {
    const requestTitle = getRequestTitle(request);
    const activityLabel = getRequestActivityLabel(request);
    const requestContent = (
      <>
        <View style={styles.itemIcon}>
          <MaterialCommunityIcons
            color={theme.colors.textSecondary}
            name={getRequestIcon(request)}
            size={22}
          />
        </View>
        <View style={styles.itemText}>
          <Text numberOfLines={1} style={styles.itemTitle}>
            {requestTitle}
          </Text>
          <Text numberOfLines={1} style={styles.itemSubtitle}>
            {activityLabel}
          </Text>
        </View>
        {!request.completed && (
          <MaterialCommunityIcons
            color={theme.colors.textSubtle}
            name="chevron-right"
            size={22}
          />
        )}
      </>
    );

    return (
      <View key={request.id} style={styles.itemRow}>
        {request.completed ? (
          <View
            accessible
            accessibilityLabel={`${requestTitle}. ${activityLabel}`}
            style={styles.itemContent}>
            {requestContent}
          </View>
        ) : (
          <TouchableOpacity
            accessibilityLabel={`${requestTitle}. ${activityLabel}`}
            accessibilityRole="button"
            style={styles.itemContent}
            onPress={() => openRequest(request)}
            activeOpacity={0.74}>
            {requestContent}
          </TouchableOpacity>
        )}
        <IconButton
          accessibilityLabel={`Remove ${requestTitle}, ${activityLabel}`}
          icon="trash-can-outline"
          size={20}
          iconColor={theme.colors.textSecondary}
          onPress={() => confirmRemoveRequest(request)}
        />
      </View>
    );
  };

  const openRequests = requests.filter(request => !request.completed);
  const completedRequests = requests.filter(request => request.completed);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.container}>
      <ServiceManagerHeader
        onBack={() => props.navigation.goBack()}
        showDivider={showHeaderDivider}
        title="Saved requests"
      />
      {loading ? (
        <SkeletonLoader
          accessibilityLabel="Loading saved requests"
          style={styles.skeletonLoader}>
          {[0, 1, 2, 3].map(index => (
            <View key={index} style={styles.skeletonRow}>
              <SkeletonBlock height={42} radius={14} width={42} />
              <View style={styles.skeletonText}>
                <SkeletonText height={16} width="56%" />
                <SkeletonText
                  height={13}
                  style={styles.skeletonSubtitle}
                  width="40%"
                />
              </View>
            </View>
          ))}
        </SkeletonLoader>
      ) : loadError ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle}>Saved requests unavailable</Text>
          <Text style={styles.emptySubtitle}>
            Try loading your saved requests again.
          </Text>
          <AppButton onPress={loadRequests} style={styles.retryButton}>
            Retry
          </AppButton>
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle}>No saved requests</Text>
          <Text style={styles.emptySubtitle}>
            Requests you can return to later will appear here.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          onScroll={event =>
            setShowHeaderDivider(event.nativeEvent.contentOffset.y > 1)
          }
          scrollEventThrottle={16}
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + 32},
          ]}>
          <Text style={styles.intro}>
            Requests are saved on this device so you can return to them later.
          </Text>
          {openRequests.length > 0 && (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                To continue
              </Text>
              {openRequests.map(renderRequest)}
            </View>
          )}
          {completedRequests.length > 0 && (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.sectionTitle}>
                Completed
              </Text>
              {completedRequests.map(renderRequest)}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const createStyles = theme =>
  StyleSheet.create({
    container: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    centerContent: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 28,
    },
    emptyTitle: {
      ...theme.typography.titleSheet,
      color: theme.colors.textPrimary,
      textAlign: 'center',
    },
    emptySubtitle: {
      ...theme.typography.bodyMd,
      color: theme.colors.textSecondary,
      marginTop: 8,
      maxWidth: 300,
      textAlign: 'center',
    },
    retryButton: {
      marginTop: 24,
      minWidth: 132,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 4,
    },
    intro: {
      ...theme.typography.bodyMd,
      color: theme.colors.textSecondary,
      maxWidth: 420,
      paddingBottom: 26,
    },
    section: {
      paddingBottom: 26,
    },
    sectionTitle: {
      ...theme.typography.labelMd,
      color: theme.colors.textPrimary,
      paddingBottom: 8,
    },
    itemRow: {
      alignItems: 'center',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      minHeight: 74,
    },
    itemContent: {
      alignItems: 'center',
      flex: 1,
      flexDirection: 'row',
      minHeight: 74,
      paddingVertical: 10,
    },
    itemIcon: {
      alignItems: 'center',
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 14,
      height: 42,
      justifyContent: 'center',
      width: 42,
    },
    itemText: {
      flex: 1,
      minWidth: 0,
      paddingHorizontal: 12,
    },
    itemTitle: {
      ...theme.typography.bodyMd,
      ...fontStyle('semiBold'),
      color: theme.colors.textPrimary,
    },
    itemSubtitle: {
      ...theme.typography.caption,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    skeletonLoader: {
      paddingHorizontal: 20,
      paddingTop: 62,
    },
    skeletonRow: {
      alignItems: 'center',
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      minHeight: 74,
    },
    skeletonText: {
      flex: 1,
      paddingLeft: 12,
    },
    skeletonSubtitle: {
      marginTop: 7,
    },
  });

export default ProvisioningDeeplinkList;
