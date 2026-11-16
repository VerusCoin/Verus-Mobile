import React, {useEffect, useMemo, useState} from 'react';
import {InteractionManager, StyleSheet, View} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {getFocusedRouteNameFromRoute} from '@react-navigation/native';
import {useDispatch} from 'react-redux';
import WalletStackScreens from '../WalletStackScreens/WalletStackScreens';
import IdentityStackScreens from '../IdentityStackScreens/IdentityStackScreens';
import ServicesStackScreens from '../ServicesStackScreens/ServicesStackScreens';
import VerusPay from '../../VerusPay/VerusPay';
import SettingsStackScreens from '../SettingsStackScreens/SettingsStackScreens';
import VerusIdAtIcon from '../../../images/customIcons/verusid-at-icon.svg';
import {setConfigSection} from '../../../actions/actionCreators';
import {useObjectSelector} from '../../../hooks/useObjectSelector';
import {
  NOTIFICATION_TYPE_VERUSID_ERROR,
  NOTIFICATION_TYPE_VERUSID_READY,
} from '../../../utils/constants/services';
import {useOnboardingTheme} from '../../../theme/onboarding';
import signedInCopy from '../../../copy/signedIn';

const HomeTabs = createBottomTabNavigator();

const isActionableIdentityStatus = status =>
  status === NOTIFICATION_TYPE_VERUSID_READY ||
  status === NOTIFICATION_TYPE_VERUSID_ERROR;

const HomeTabScreens = () => {
  const dispatch = useDispatch();
  const theme = useOnboardingTheme();
  const pendingIds = useObjectSelector(
    state => state.channelStore_verusid?.pendingIds || {},
  );
  const [lastSeenPendingIdentityKey, setLastSeenPendingIdentityKey] = useState('');
  // Services and VerusID load stored data on mount. Mount them hidden once the
  // sign-in transition ends, so their first visit shows no loading frame and
  // Home's first render does not wait for them.
  const [preloadTabs, setPreloadTabs] = useState(false);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() =>
      setPreloadTabs(true),
    );
    return () => task.cancel();
  }, []);

  const pendingIdentityMeta = useMemo(() => {
    const actionable = [];

    for (const chainId of Object.keys(pendingIds)) {
      const chainMap = pendingIds[chainId] || {};
      for (const iAddress of Object.keys(chainMap)) {
        const details = chainMap[iAddress] || {};
        if (!isActionableIdentityStatus(details.status)) continue;

        actionable.push(
          `${chainId}:${iAddress}:${details.status || ''}:` +
            `${details.notificationUid || ''}:${details.createdAt || ''}`,
        );
      }
    }

    actionable.sort();
    return {count: actionable.length, key: actionable.join('|')};
  }, [pendingIds]);

  const hasUnseenIdentityPending =
    pendingIdentityMeta.count > 0 &&
    pendingIdentityMeta.key !== lastSeenPendingIdentityKey;

  return (
    <HomeTabs.Navigator
      screenOptions={({route}) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.isDark
          ? theme.colors.onPrimary
          : theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSubtle,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: 'transparent',
          borderTopWidth: 0,
          // The library default (8) draws a line-like shadow on Android.
          elevation: 0,
          // Full-screen tasks own their bottom safe area.
          ...((route.name === 'ServicesHome' &&
          ['GiftCardCreate', 'GiftCardFund'].includes(
            getFocusedRouteNameFromRoute(route),
          )) || (route.name === 'IdentityTab' &&
          ['IdentityManagement', 'LinkIdentities', 'IdentityRegistration'].includes(
            getFocusedRouteNameFromRoute(route),
          ))
            ? {display: 'none'}
            : {}),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}>
      <HomeTabs.Screen
        name="WalletHome"
        component={WalletStackScreens}
        options={{
          title: signedInCopy.navigation.wallet,
          tabBarIcon: ({color}) => (
            <Feather name="credit-card" color={color} size={22} style={styles.icon} />
          ),
        }}
      />
      <HomeTabs.Screen
        name="ServicesHome"
        component={ServicesStackScreens}
        options={{
          lazy: !preloadTabs,
          title: signedInCopy.navigation.services,
          tabBarIcon: ({color}) => (
            <Feather name="compass" color={color} size={22} style={styles.icon} />
          ),
        }}
      />
      <HomeTabs.Screen
        name="IdentityTab"
        component={IdentityStackScreens}
        listeners={{
          focus: () => setLastSeenPendingIdentityKey(pendingIdentityMeta.key),
        }}
        options={{
          lazy: !preloadTabs,
          title: signedInCopy.navigation.identity,
          tabBarIcon: ({color, focused}) => (
            <View style={styles.identityIconWrap}>
              <VerusIdAtIcon width={22} height={22} fill={color} style={styles.icon} />
              {hasUnseenIdentityPending && !focused && (
                <View
                  style={[
                    styles.identityAlertDot,
                    {
                      backgroundColor: theme.colors.danger,
                      borderColor: theme.colors.surface,
                    },
                  ]}
                />
              )}
            </View>
          ),
        }}
      />
      <HomeTabs.Screen
        name="SettingsHome"
        component={SettingsStackScreens}
        listeners={{
          focus: () => dispatch(setConfigSection('settings-profile')),
        }}
        options={{
          title: signedInCopy.navigation.settings,
          tabBarIcon: ({color}) => (
            <Feather name="settings" color={color} size={22} style={styles.icon} />
          ),
        }}
      />
      <HomeTabs.Screen
        name="VerusPay"
        component={VerusPay}
        options={{
          title: signedInCopy.navigation.scan,
          tabBarIcon: ({color}) => (
            <Feather name="maximize" color={color} size={24} style={styles.icon} />
          ),
        }}
      />
    </HomeTabs.Navigator>
  );
};

const styles = StyleSheet.create({
  icon: {
    marginBottom: 2,
  },
  identityIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  identityAlertDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
  },
});

export default HomeTabScreens;
