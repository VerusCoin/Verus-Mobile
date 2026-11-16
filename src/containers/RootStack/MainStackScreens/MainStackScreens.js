import React, {useEffect, useMemo, useState} from 'react';
import {
  HeaderStyleInterpolators,
  createStackNavigator,
} from "@react-navigation/stack";
import {AccessibilityInfo, Easing} from 'react-native';
import AddCoin from '../../AddCoin/AddCoin'
import CoinDetails from '../../CoinDetails/CoinDetails'
import DisplaySeed from '../../DisplaySeed/DisplaySeed'
import CoinMenus from '../../Coin/CoinMenus'
import VerusPay from '../../VerusPay/VerusPay'
import ProfileInfo from '../../Settings/ProfileSettings/ProfileInfo/ProfileInfo'
import ResetPwd from '../../Settings/ProfileSettings/ResetPwd/ResetPwd'
import RecoverSeed from '../../Settings/ProfileSettings/RecoverSeed/RecoverSeed'
import DeleteProfile from '../../Settings/ProfileSettings/DeleteProfile/DeleteProfile'
import SecureLoading from '../../SecureLoading/SecureLoading'
import HomeTabScreens from '../HomeTabScreens/HomeTabScreens';
import NfcBackup from '../../Settings/WalletSettings/NfcBackup/NfcBackup';
import ReceiveAssetsList from '../../Transfer/ReceiveAssetsList';
import ReceiveAssetDetails from '../../Transfer/ReceiveAssetDetails';
import SendWizardNavigator from '../../SendWizard/SendWizardNavigator';
import AddAssetByIdentifier from '../../ManageAssets/AddAssetByIdentifier';
import ManageAssets, {
  ManageAssetsDirectory,
} from '../../ManageAssets/ManageAssets';
import {
  createRedesignedHeaderOptions,
  createSettingsHeaderOptions,
} from '../../../utils/navigation/header';
import {useOnboardingTheme} from '../../../theme/onboarding';

const MainStack = createStackNavigator();

const MANAGE_ASSETS_OPEN_DURATION = 220;
const MANAGE_ASSETS_CLOSE_DURATION = 150;
const MANAGE_ASSETS_REDUCED_MOTION_DURATION = 150;

const getProgressOpacity = current =>
  current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

const forManageAssets = ({current}) => ({
  cardStyle: {
    opacity: getProgressOpacity(current),
    transform: [
      {
        translateY: current.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [12, 0],
          extrapolate: 'clamp',
        }),
      },
    ],
  },
});

const forManageAssetsReducedMotion = ({current}) => ({
  cardStyle: {
    opacity: getProgressOpacity(current),
  },
});

const createManageAssetsTransitionOptions = reduceMotionEnabled => ({
  transitionSpec: {
    open: {
      animation: 'timing',
      config: {
        duration: reduceMotionEnabled
          ? MANAGE_ASSETS_REDUCED_MOTION_DURATION
          : MANAGE_ASSETS_OPEN_DURATION,
        easing: Easing.out(Easing.cubic),
      },
    },
    close: {
      animation: 'timing',
      config: {
        duration: reduceMotionEnabled
          ? MANAGE_ASSETS_REDUCED_MOTION_DURATION
          : MANAGE_ASSETS_CLOSE_DURATION,
        easing: Easing.out(Easing.cubic),
      },
    },
  },
  cardStyleInterpolator: reduceMotionEnabled
    ? forManageAssetsReducedMotion
    : forManageAssets,
  headerStyleInterpolator: HeaderStyleInterpolators.forFade,
});

const MainStackScreens = props => {
  const theme = useOnboardingTheme();
  const settingsHeaderOptions = createSettingsHeaderOptions(theme);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);
  const manageAssetsTransitionOptions = useMemo(
    () => createManageAssetsTransitionOptions(reduceMotionEnabled),
    [reduceMotionEnabled],
  );

  useEffect(() => {
    let active = true;
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );

    AccessibilityInfo.isReduceMotionEnabled()
      .then(reduceMotion => {
        if (active) setReduceMotionEnabled(reduceMotion);
      })
      .catch(() => {});

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return (
    <MainStack.Navigator
      screenOptions={createRedesignedHeaderOptions(theme)}
    >
      <MainStack.Screen
        name="Home"
        component={HomeTabScreens}
        options={{ headerShown: false }}
      />

      <MainStack.Screen
        name="AddCoin"
        component={AddCoin}
        options={{
          title: "Add Coin",
        }}
      />

      <MainStack.Screen
        name="ManageAssets"
        component={ManageAssets}
        options={{
          ...settingsHeaderOptions,
          ...manageAssetsTransitionOptions,
          headerShown: false,
          title: 'Manage assets',
        }}
      />

      <MainStack.Screen
        name="ManageAssetsDirectory"
        component={ManageAssetsDirectory}
        options={{
          ...settingsHeaderOptions,
          title: 'Discover assets',
          headerShown: false,
        }}
      />

      <MainStack.Screen
        name="AddAssetByIdentifier"
        component={AddAssetByIdentifier}
        options={{
          ...settingsHeaderOptions,
          title: 'Add by identifier',
          headerShown: false,
        }}
      />

      <MainStack.Screen
        name="CoinDetails"
        component={CoinDetails}
        options={{
          title: "Details",
        }}
      />

      <MainStack.Screen
        name="DisplaySeed"
        component={DisplaySeed}
        options={{
          ...settingsHeaderOptions,
          title: "Recovery secrets",
        }}
      />

      <MainStack.Screen name="CoinMenus" component={CoinMenus} />

      <MainStack.Screen
        name="ReceiveAssetsList"
        component={ReceiveAssetsList}
        options={{title: 'Receive assets'}}
      />

      <MainStack.Screen
        name="ReceiveAssetDetails"
        component={ReceiveAssetDetails}
        options={{title: 'Receive'}}
      />

      <MainStack.Screen
        name="SendWizard"
        component={SendWizardNavigator}
        options={{headerShown: false}}
      />

      <MainStack.Screen
        name="ProfileInfo"
        component={ProfileInfo}
        options={{
          ...settingsHeaderOptions,
          title: "Info",
        }}
      />

      <MainStack.Screen
        name="ResetPwd"
        component={ResetPwd}
        options={{
          ...settingsHeaderOptions,
          title: "Reset",
        }}
      />

      <MainStack.Screen
        name="RecoverSeed"
        component={RecoverSeed}
        options={{
          ...settingsHeaderOptions,
          title: "Recover",
        }}
      />

      <MainStack.Screen
        name="NfcBackup"
        component={NfcBackup}
        options={{
          ...settingsHeaderOptions,
          title: "NFC backup",
        }}
      />

      <MainStack.Screen
        name="DeleteProfile"
        component={DeleteProfile}
        options={{
          ...settingsHeaderOptions,
          title: "Delete",
        }}
      />

      <MainStack.Screen
        name="SecureLoading"
        component={SecureLoading}
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </MainStack.Navigator>
  );
};

export default MainStackScreens
