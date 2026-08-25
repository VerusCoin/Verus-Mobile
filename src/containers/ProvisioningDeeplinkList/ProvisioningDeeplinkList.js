import React, {useCallback, useEffect, useState} from 'react';
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import {ActivityIndicator, IconButton, Text} from 'react-native-paper';
import {useDispatch} from 'react-redux';
import {GENERIC_REQUEST_DEEPLINK_VDXF_KEY} from 'verus-typescript-primitives';
import {setDeeplinkData} from '../../actions/actionCreators';
import Colors from '../../globals/colors';
import {
  getPendingDeeplinkPassthrough,
  loadPendingDeeplinkRequests,
  PENDING_REQUEST_KIND_PROVISIONING,
  PENDING_REQUEST_KIND_SPENDABLE_KEY,
  removePendingDeeplinkRequest,
} from '../../utils/deeplink/pendingDeeplinkStorage';

const formatDate = timestamp => {
  if (!timestamp) return null;

  try {
    return new Date(timestamp).toLocaleString();
  } catch (_) {
    return null;
  }
};

const getRequestTitle = request => {
  if (request.title) return request.title;

  if (request.requestKind === PENDING_REQUEST_KIND_PROVISIONING) {
    return 'VerusID provisioning request';
  }

  if (request.requestKind === PENDING_REQUEST_KIND_SPENDABLE_KEY) {
    return 'Spendable key claim';
  }

  return 'Pending request';
};

const ProvisioningDeeplinkList = props => {
  const dispatch = useDispatch();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadRequests = useCallback(async () => {
    setLoading(true);

    try {
      setRequests(await loadPendingDeeplinkRequests());
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
          replayedProvisioningDeeplink:
            request.requestKind === PENDING_REQUEST_KIND_PROVISIONING,
          skipWalletBackupRequests: true,
        },
      ),
    );

    const parentNavigation =
      props.navigation.getParent?.() ||
      props.navigation.dangerouslyGetParent?.();

    if (parentNavigation) {
      parentNavigation.navigate('DeepLink');
    } else {
      props.navigation.navigate('DeepLink');
    }
  };

  const confirmRemoveRequest = request => {
    Alert.alert(
      'Remove pending request?',
      'You may lose the ability to resume this request if you remove it.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removePendingDeeplinkRequest(request.id);
            await loadRequests();
          },
        },
      ],
      {cancelable: true},
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={Colors.primaryColor} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySubtitle}>
            Pending deeplink requests will appear here after they are opened.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}>
          {requests.map(request => {
            const savedDate = formatDate(request.createdAt);
            const completedDate = formatDate(request.completedAt);

            return (
              <View key={request.id} style={styles.itemRow}>
                <TouchableOpacity
                  style={styles.itemContent}
                  onPress={() => openRequest(request)}
                  activeOpacity={0.75}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {getRequestTitle(request)}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        request.completed && styles.completedBadge,
                      ]}>
                      <Text
                        style={[
                          styles.statusText,
                          request.completed && styles.completedText,
                        ]}>
                        {request.completed ? 'Completed' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemSubtitle} numberOfLines={1}>
                    {request.completed && completedDate
                      ? `Completed ${completedDate}`
                      : savedDate
                      ? `Saved ${savedDate}`
                      : 'Saved pending request'}
                  </Text>
                </TouchableOpacity>
                <IconButton
                  icon="close"
                  size={22}
                  iconColor={Colors.verusDarkGray}
                  onPress={() => confirmRemoveRequest(request)}
                />
              </View>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondaryColor,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  emptyTitle: {
    color: Colors.primaryColor,
    fontSize: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptySubtitle: {
    color: Colors.verusDarkGray,
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryColor,
    borderColor: '#DCE3EC',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    minHeight: 78,
  },
  itemContent: {
    flex: 1,
    paddingLeft: 14,
    paddingVertical: 12,
  },
  itemHeader: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  itemTitle: {
    color: Colors.primaryColor,
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 10,
  },
  itemSubtitle: {
    color: Colors.verusDarkGray,
    fontSize: 13,
    marginTop: 6,
  },
  statusBadge: {
    backgroundColor: '#FFF5DD',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  completedBadge: {
    backgroundColor: '#E7F6EF',
  },
  statusText: {
    color: '#8A5B00',
    fontSize: 12,
    fontWeight: '600',
  },
  completedText: {
    color: Colors.verusGreenColor,
  },
});

export default ProvisioningDeeplinkList;
