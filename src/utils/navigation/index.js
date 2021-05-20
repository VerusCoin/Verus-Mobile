import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createStackNavigator } from '@react-navigation/stack';
import { DrawerActions } from '@react-navigation/compat';
import {
  StyleSheet, TouchableOpacity, Dimensions, Text, Platform,
} from 'react-native';
import { Icon } from 'react-native-elements';

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
import Identity from '../../containers/Identity';
import ScanBadge from '../../containers/Identity/Home/ScanBadge';
import PersonalInfo from '../../containers/Identity/PersonalInfo';
import ClaimDetails from '../../containers/Identity/PersonalInfo/ClaimDetails';
import ClaimCategory from '../../containers/Identity/PersonalInfo/ClaimCategoryDetails';
import AttestationDetails from '../../containers/Identity/Home/AttestationDetails';
import ClaimManager from '../../containers/Identity/PersonalInfo/ClaimManager';
import MoveIntoCategory from '../../containers/Identity/PersonalInfo/ClaimManager/MoveIntoCategory';
import AddIdentity from '../../containers/Identity/AddIdentity';
import { DEVICE_WINDOW_WIDTH } from '../constants/constants';
import { Component } from 'react';

const WALLET = 'wallet';

const MainStack = createStackNavigator()
const MainDrawer = createDrawerNavigator()
const SignedOutStack = createStackNavigator()
const SignedOutNoKeyStack = createStackNavigator()
const LoadingStack = createStackNavigator()
const RootStack = createStackNavigator()

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

function MainStackScreens() {
  return (
    <MainStack.Navigator
      headerMode="screen"
      screenOptions={({ navigation, params }) => ({
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
      })}
    >
      <MainStack.Screen
        name="Home"
        component={Home}
        options={{
          title: "Home",
          headerLeft: () => null,
        }}
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
        name="ClaimManager"
        component={ClaimManager}
        options={{
          title: "Claim Manager",
        }}
      />

      <MainStack.Screen
        name="MoveIntoCategory"
        component={MoveIntoCategory}
        options={({ navigation, route }) => ({
          title: "Categories",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (route.params != null) {
                  route.params.clearClaims();
                  navigation.goBack();
                }
              }}
              style={styles.goBackBtn}
            >
              {/* <IconVector
                name={
                  Platform.OS === "ios" ? "ios-arrow-back" : "md-arrow-back"
                }
                size={35}
                color="white"
                style={{ paddingLeft: 8 }}
              /> */}
              <Text style={styles.goBackBtnText}>Back</Text>
            </TouchableOpacity>
          ),
        })}
      />

      <MainStack.Screen
        name="AttestationDetails"
        component={AttestationDetails}
        options={({ route }) => ({
          title: route.params != null ? route.params.id : null,
        })}
      />

      <MainStack.Screen
        name="Identity"
        component={Identity}
        options={({ route }) => ({
          title: route.params != null ? route.params.selectedScreen : null,
        })}
      />

      <MainStack.Screen
        name="AddIdentity"
        component={AddIdentity}
        options={{
          title: "Add Identity",
        }}
      />

      <MainStack.Screen
        name="ClaimDetails"
        component={ClaimDetails}
        options={({ route }) => ({
          title: route.params != null ? route.params.claimName : null,
        })}
      />

      <MainStack.Screen
        name="ClaimCategory"
        component={ClaimCategory}
        options={({ route }) => ({
          title: route.params != null ? route.params.claimCategoryName : null,
        })}
      />

      <MainStack.Screen
        name="ScanBadge"
        component={ScanBadge}
        options={{
          title: "Verify Attestation",
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
