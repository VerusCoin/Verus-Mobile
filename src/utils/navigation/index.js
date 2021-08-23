import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/compat';
import {
  StyleSheet, TouchableOpacity, Dimensions, Text, Platform,
} from 'react-native';
import { Icon } from 'react-native-elements';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';

//import IconVector from 'react-native-vector-icons/Ionicons';
import Colors from '../../globals/colors';
import SideMenu from '../../containers/SideMenu/SideMenu';

import Login from '../../containers/Login/Login';
import Home from '../../containers/Home/Home';
import AddCoin from '../../containers/AddCoin/AddCoin';
import SignUp from '../../containers/SignUp/SignUp';
import CoinDetails from '../../containers/CoinDetails/CoinDetails';
import LoadingScreen from '../../containers/LoadingScreen/LoadingScreen';
import ConfirmSend from '../../containers/ConfirmSend/ConfirmSend';
import CoinMenus from '../../containers/Coin/CoinMenus';
import VerusPay from '../../containers/VerusPay/VerusPay';
import SettingsMenus from '../../containers/Settings/SettingsMenus';
import ProfileInfo from '../../containers/Settings/ProfileSettings/ProfileInfo/ProfileInfo';
import ResetPwd from '../../containers/Settings/ProfileSettings/ResetPwd/ResetPwd';
import DisplaySeed from '../../containers/Settings/ProfileSettings/DisplaySeed/DisplaySeed';
import RecoverSeed from '../../containers/Settings/ProfileSettings/RecoverSeed/RecoverSeed';
import DeleteProfile from '../../containers/Settings/ProfileSettings/DeleteProfile/DeleteProfile';
import SecureLoading from '../../containers/SecureLoading/SecureLoading';
import CustomChainMenus from '../../containers/CustomChains/CustomChainMenus';
import GeneralWalletSettings from '../../containers/Settings/WalletSettings/GeneralWalletSettings/GeneralWalletSettings';
import CoinSettings from '../../containers/Settings/WalletSettings/CoinSettings/CoinSettings';
import BuySellCryptoMenus from '../../containers/BuySellCrypto/BuySellCryptoMenus';
import SelectPaymentMethod from '../../containers/BuySellCrypto/PaymentMethod/SelectPaymentMethod/SelectPaymentMethod';
import ManageWyreAccount from '../../containers/BuySellCrypto/PaymentMethod/ManageWyreAccount/ManageWyreAccount';
import ManageWyreEmail from '../../containers/BuySellCrypto/PaymentMethod/ManageWyreAccount/ManageWyreEmail';
import ManageWyreCellphone from '../../containers/BuySellCrypto/PaymentMethod/ManageWyreAccount/ManageWyreCellphone';
import ManageWyreDocuments from '../../containers/BuySellCrypto/PaymentMethod/ManageWyreAccount/ManageWyreDocuments';
import ManageWyrePaymentMethod from '../../containers/BuySellCrypto/PaymentMethod/ManageWyreAccount/ManageWyrePaymentMethod';
import ManageWyrePersonalDetails from '../../containers/BuySellCrypto/PaymentMethod/ManageWyreAccount/ManageWyrePersonalDetails';
import ManageWyreProofOfAddress from '../../containers/BuySellCrypto/PaymentMethod/ManageWyreAccount/ManageWyreProofOfAddress';
import ManageWyreAddress from '../../containers/BuySellCrypto/PaymentMethod/ManageWyreAccount/ManageWyreAddress';
import SendTransaction from '../../containers/BuySellCrypto/PaymentMethod/SendTransaction/SendTransaction';
import { DEVICE_WINDOW_WIDTH } from '../constants/constants';
import { Component } from 'react';
import Personal from '../../containers/Personal/Personal';
import PersonalAttributes from '../../containers/Personal/PersonalAttributes/PersonalAttributes';
import PersonalAttributesEditName from '../../containers/Personal/PersonalAttributes/PersonalAttributesEditName/PersonalAttributesEditName';
import PersonalContact from '../../containers/Personal/PersonalContact/PersonalContact';
import PersonalLocations from '../../containers/Personal/PersonalLocations/PersonalLocations';
import PersonalLocationsEditAddress from "../../containers/Personal/PersonalLocations/PersonalLocationsEditAddress/PersonalLocationsEditAddress";
import PersonalLocationsEditTaxCountry from "../../containers/Personal/PersonalLocations/PersonalLocationsEditTaxCountry/PersonalLocationsEditTaxCountry";
import PersonalPaymentMethods from '../../containers/Personal/PersonalPaymentMethods/PersonalPaymentMethods';
import PersonalPaymentMethodsEditBankAccount from '../../containers/Personal/PersonalPaymentMethods/PersonalPaymentMethodsEditBankAccount/PersonalPaymentMethodsEditBankAccount';
import PersonalPaymentMethodsEditBankAccountAddress from "../../containers/Personal/PersonalPaymentMethods/PersonalPaymentMethodsEditBankAccountAddress/PersonalPaymentMethodsEditBankAccountAddress";
import Services from '../../containers/Services/Services';
import Service from '../../containers/Services/Service/Service';
import WyreServiceAccountData from '../../containers/Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAccountData/WyreServiceAccountData';
import PersonalImages from '../../containers/Personal/PersonalImages/PersonalImages';
import PersonalImagesEditImage from '../../containers/Personal/PersonalImages/PersonalLocationsEditImage/PersonalImagesEditImage';
import WyreServiceAddPaymentMethod from '../../containers/Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAddPaymentMethod/WyreServiceAddPaymentMethod';
import WyreServiceEditPaymentMethod from '../../containers/Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceEditPaymentMethod/WyreServiceEditPaymentMethod';

const MainStack = createStackNavigator()
const MainDrawer = createDrawerNavigator()
const ProfileStack = createStackNavigator()
const ServicesStack = createStackNavigator()
const WalletStack = createStackNavigator()
const SignedOutStack = createStackNavigator()
const SignedOutNoKeyStack = createStackNavigator()
const LoadingStack = createStackNavigator()
const RootStack = createStackNavigator()
const HomeTabs = createMaterialBottomTabNavigator()

const styles = StyleSheet.create({
  header_title_noBack: {
    fontFamily: 'Avenir-Black',
    backgroundColor: 'transparent',
    height: 55,
    textAlign: 'center',
    fontSize: 18,
    color: '#E9F1F7',
    paddingTop: 15,
    width: DEVICE_WINDOW_WIDTH, // width of both buttons + no left-right padding
  },

  header_title_back: {
    fontFamily: 'Avenir-Black',
    backgroundColor: 'transparent',
    height: 55,
    textAlign: 'right',
    fontSize: 18,
    color: '#E9F1F7',
    paddingTop: 15,
    width: DEVICE_WINDOW_WIDTH - 110, // width of both buttons + no left-right padding
  },

  menuButton: {
    marginRight: 15,
  },

  goBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  goBackBtnText: {
    color: 'white',
    paddingLeft: 10,
    fontSize: 18,
  },
});

const defaultHeaderOptions = ({ navigation, params, route }) => ({
  headerShown: true,
  headerStyle: {
    backgroundColor: Colors.primaryColor,
  },
  headerTitleStyle: {
    fontFamily: "Avenir-Black",
    fontWeight: "normal",
    fontSize: 22,
    color: Colors.secondaryColor,
  },
  headerRight: () => (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={styles.menuButton}
    >
      <Icon name="menu" size={35} color={Colors.secondaryColor} />
    </TouchableOpacity>
  ),
  headerTintColor: Colors.secondaryColor,
})

function MainScreens() {
  return (
    <MainDrawer.Navigator
      drawerWidth={250}
      drawerPosition="right"
      drawerContent={(props) => <SideMenu {...props} />}
      screenOptions={{
        swipeEnabled: false
      }}
    >
      <MainDrawer.Screen 
        name="MainStack"
        component={MainStackScreens}
      />
    </MainDrawer.Navigator>
  );
}

function ProfileScreens() {
  return (
    <ProfileStack.Navigator
      headerMode="screen"
      screenOptions={defaultHeaderOptions}
    >
      <ProfileStack.Screen
        name="PersonalProfile"
        component={Personal}
        options={{
          title: "Personal Profile",
        }}
      />
      <ProfileStack.Screen
        name="PersonalAttributes"
        component={PersonalAttributes}
        options={{
          title: "Details",
        }}
      />
      <ProfileStack.Screen
        name="PersonalAttributesEditName"
        component={PersonalAttributesEditName}
        options={{
          title: "Name"
        }}
      />
      <ProfileStack.Screen
        name="PersonalContact"
        component={PersonalContact}
        options={{
          title: "Contact",
        }}
      />
      <ProfileStack.Screen
        name="PersonalImages"
        component={PersonalImages}
        options={{
          title: "Images",
        }}
      />
      <ProfileStack.Screen
        name="PersonalImagesEditImage"
        component={PersonalImagesEditImage}
        options={{
          title: "Image"
        }}
      />
      <ProfileStack.Screen
        name="PersonalLocations"
        component={PersonalLocations}
        options={{
          title: "Personal Locations"
        }}
      />
      <ProfileStack.Screen
        name="PersonalLocationsEditAddress"
        component={PersonalLocationsEditAddress}
        options={{
          title: "Address"
        }}
      />
      <ProfileStack.Screen
        name="PersonalLocationsEditTaxCountry"
        component={PersonalLocationsEditTaxCountry}
        options={{
          title: "Tax Country"
        }}
      />
      <ProfileStack.Screen
        name="PersonalPaymentMethods"
        component={PersonalPaymentMethods}
        options={{
          title: "Banking Info"
        }}
      />
      <ProfileStack.Screen
        name="PersonalPaymentMethodsEditBankAccount"
        component={PersonalPaymentMethodsEditBankAccount}
        options={{
          title: "Bank Account"
        }}
      />
      <ProfileStack.Screen
        name="PersonalPaymentMethodsEditBankAccountAddress"
        component={PersonalPaymentMethodsEditBankAccountAddress}
        options={{
          title: "Account Address"
        }}
      />
    </ProfileStack.Navigator>
  );
}

function ServicesScreens() {
  return (
    <ServicesStack.Navigator
      headerMode="screen"
      screenOptions={defaultHeaderOptions}
    >
      <ServicesStack.Screen
        name="Services"
        component={Services}
        options={{
          title: "Services",
        }}
      />
      <ServicesStack.Screen
        name="Service"
        component={Service}
      />
      <ServicesStack.Screen
        name="WyreServiceAccountData"
        component={WyreServiceAccountData}
      />
      <ServicesStack.Screen
        name="WyreServiceAddPaymentMethod"
        component={WyreServiceAddPaymentMethod}
        options={{
          title: "Connect",
        }}
      />
      <ServicesStack.Screen
        name="WyreServiceEditPaymentMethod"
        component={WyreServiceEditPaymentMethod}
        options={{
          title: "Edit Account",
        }}
      />
    </ServicesStack.Navigator>
  );
}

function WalletScreens() {
  return (
    <WalletStack.Navigator
      headerMode="screen"
      screenOptions={defaultHeaderOptions}
    >
      <WalletStack.Screen
        name="Wallets"
        component={Home}
        options={{
          title: "Wallets",
        }}
      />
    </WalletStack.Navigator>
  );
}

function HomeScreens() {
  return (
    <HomeTabs.Navigator
      headerMode="screen"
      barStyle={{ backgroundColor: Colors.primaryColor }}
    >
      <HomeTabs.Screen
        name="WalletHome"
        component={WalletScreens}
        options={{
          title: "Wallets",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="wallet" color={color} size={26} />
          ),
        }}
      />
      <HomeTabs.Screen
        name="PersonalHome"
        component={ProfileScreens}
        options={{
          title: "Personal Profile",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="fingerprint"
              color={color}
              size={26}
            />
          ),
        }}
      />
      <HomeTabs.Screen
        name="ServicesHome"
        component={ServicesScreens}
        options={{
          title: "Services",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="room-service"
              color={color}
              size={26}
            />
          ),
        }}
      />
    </HomeTabs.Navigator>
  );
}

function MainStackScreens() {
  return (
    <MainStack.Navigator
      headerMode="screen"
      screenOptions={defaultHeaderOptions}
    >
      <MainStack.Screen
        name="Home"
        component={HomeScreens}
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
        name="CoinDetails"
        component={CoinDetails}
        options={{
          title: "Details",
        }}
      />

      <MainStack.Screen
        name="ConfirmSend"
        component={ConfirmSend}
        options={{
          title: "Send",
          headerRight: () => null,
          headerLeft: () => null,
        }}
      />

      <MainStack.Screen
        name="DisplaySeed"
        component={DisplaySeed}
        options={{
          title: "Seed",
          headerRight: () => null,
        }}
      />

      <MainStack.Screen name="CoinMenus" component={CoinMenus} />

      <MainStack.Screen name="SettingsMenus" component={SettingsMenus} />

      <MainStack.Screen
        name="VerusPay"
        component={VerusPay}
        options={{
          title: "VerusPay",
        }}
      />

      <MainStack.Screen
        name="ProfileInfo"
        component={ProfileInfo}
        options={{
          title: "Info",
        }}
      />

      <MainStack.Screen
        name="ResetPwd"
        component={ResetPwd}
        options={{
          title: "Reset",
        }}
      />

      <MainStack.Screen
        name="RecoverSeed"
        component={RecoverSeed}
        options={{
          title: "Recover",
        }}
      />

      <MainStack.Screen
        name="GeneralWalletSettings"
        component={GeneralWalletSettings}
        options={{
          title: "General",
        }}
      />

      <MainStack.Screen
        name="CoinSettings"
        component={CoinSettings}
        options={({ route }) => ({
          title: route.params != null ? route.params.title : null,
        })}
      />

      <MainStack.Screen
        name="DeleteProfile"
        component={DeleteProfile}
        options={{
          title: "Delete",
        }}
      />

      <MainStack.Screen
        name="SecureLoading"
        component={SecureLoading}
        options={{
          title: "Loading",
          headerRight: () => null,
          headerLeft: () => null,
        }}
      />

      <MainStack.Screen
        name="CustomChainMenus"
        component={CustomChainMenus}
      />

      <MainStack.Screen
        name="BuySellCryptoMenus"
        component={BuySellCryptoMenus}
      />

      <MainStack.Screen
        name="SelectPaymentMethod"
        component={SelectPaymentMethod}
        options={{
          title: "Select Payment Method",
        }}
      />

      <MainStack.Screen
        name="ManageWyreAccount"
        component={ManageWyreAccount}
        options={{
          title: "Manage Wyre Account",
        }}
      />

      <MainStack.Screen
        name="ManageWyreEmail"
        component={ManageWyreEmail}
        options={{
          title: "Manage Wyre Email",
          headerRight: () => null,
        }}
      />

      <MainStack.Screen
        name="ManageWyreCellphone"
        component={ManageWyreCellphone}
        options={{
          title: "Manage Wyre Cellphone",
          headerRight: () => null,
        }}
      />

      <MainStack.Screen
        name="ManageWyreDocuments"
        component={ManageWyreDocuments}
        options={{
          title: "Upload Documents",
          headerRight: () => null,
        }}
      />

      <MainStack.Screen
        name="ManageWyrePaymentMethod"
        component={ManageWyrePaymentMethod}
        options={{
          title: "Manage Payment Method",
          headerRight: () => null,
        }}
      />

      <MainStack.Screen
        name="ManageWyrePersonalDetails"
        component={ManageWyrePersonalDetails}
        options={{
          title: "Upload Personal Details",
          headerRight: () => null,
        }}
      />

      <MainStack.Screen
        name="ManageWyreProofOfAddress"
        component={ManageWyreProofOfAddress}
        options={{
          title: "Upload Proof of Address",
          headerRight: () => null,
        }}
      />

      <MainStack.Screen
        name="ManageWyreAddress"
        component={ManageWyreAddress}
        options={{
          title: "Manage Wyre Address",
          headerRight: () => null,
        }}
      />

      <MainStack.Screen
        name="SendTransaction"
        component={SendTransaction}
        options={{
          title: "Confirm transaction",
          headerRight: () => null,
        }}
      />
    </MainStack.Navigator>
  );
}

function SignedOutStackScreens() {
  return (
    <SignedOutStack.Navigator>
      <SignedOutStack.Screen
        name="Login"
        component={Login}
        options={{
          headerShown: false,
        }}
      />

      <SignedOutStack.Screen
        name="SignIn"
        component={SignUp}
        options={{
          headerShown: false,
        }}
      />

      <SignedOutStack.Screen
        name="RecoverSeed"
        component={RecoverSeed}
        options={{
          title: 'Recover',
        }}
      />

      <SignedOutStack.Screen
        name="DisplaySeed"
        component={DisplaySeed}
        options={{
          title: 'Seed',
        }}
      />

      <SignedOutStack.Screen
        name="DeleteProfile"
        component={DeleteProfile}
        options={{
          title: 'Delete',
        }}
      />

      <SignedOutStack.Screen
        name="SecureLoading"
        component={SecureLoading}
        options={{
          title: 'Loading',
          headerRight: () => null,
          headerLeft: () => null,
          drawerLockMode: 'locked-closed',
        }}
      />
    </SignedOutStack.Navigator>
  );
}

function SignedOutNoKeyStackScreens() {
  return (
    <SignedOutNoKeyStack.Navigator>
      <SignedOutStack.Screen
        name="SignIn"
        component={SignUp}
        options={{
          headerShown: false,
        }}
      />
    </SignedOutNoKeyStack.Navigator>
  );
}

function LoadingStackScreens() {
  return (
    <LoadingStack.Navigator>
      <LoadingStack.Screen
        name="Splash"
        component={LoadingScreen}
        options={{
          headerShown: false,
        }}
      />
    </LoadingStack.Navigator>
  );
}

export default class RootStackScreens extends Component {
  render() {
    return (
      <RootStack.Navigator
        screenOptions={{
          mode: "modal",
          headerShown: false,
        }}
      >
        {this.props.loading ? (
          <RootStack.Screen
            name="LoadingStack"
            component={LoadingStackScreens}
          />
        ) : this.props.hasAccount ? (
          this.props.signedIn ? (
            <RootStack.Screen name="SignedIn" component={MainScreens} />
          ) : (
            <RootStack.Screen
              name="SignedOutStack"
              component={SignedOutStackScreens}
              options={{
                headerRight: () => null,
              }}
            />
          )
        ) : (
          <RootStack.Screen
            name="SignedOutNoKeyStack"
            component={SignedOutNoKeyStackScreens}
          />
        )}
      </RootStack.Navigator>
    );
  }
}
