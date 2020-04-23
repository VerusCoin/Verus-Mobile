import React from 'react';
import { StackNavigator, DrawerNavigator } from 'react-navigation';
import {
  StyleSheet, TouchableOpacity, Dimensions, Text, Platform,
} from 'react-native';
import { Icon } from 'react-native-elements';

import IconVector from 'react-native-vector-icons/Ionicons';
import Colors from '../../globals/colors';
import SideMenu from '../../containers/SideMenu/SideMenu';

import Login from '../../containers/Login/Login';
import Home from '../../containers/Home/Home';
import AddCoin from '../../containers/AddCoin/AddCoin';
import SignUp from '../../containers/SignUp/SignUp';
import CoinDetails from '../../containers/CoinDetails/CoinDetails';
import LoadingScreen from '../../containers/LoadingScreen/LoadingScreen';
import ConfirmSend from '../../containers/ConfirmSend/ConfirmSend';
import SendResult from '../../containers/Coin/SendCoin/SendResult/SendResult';
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
import ScanBadge from '../../containers/Identity/Home/ScanBadge/View';
import ScannedInformation from '../../containers/Identity/Home/ScannedInformation/View';
import PersonalInfo from '../../containers/Identity/PersonalInfo';
import ClaimDetails from '../../containers/Identity/PersonalInfo/ClaimDetails';
import ClaimCategory from '../../containers/Identity/PersonalInfo/ClaimCategoryDetails';
import AttestationDetails from '../../containers/Identity/Home/AttestationDetails';
import ClaimManager from '../../containers/Identity/PersonalInfo/ClaimManager';
import MoveIntoCategory from '../../containers/Identity/PersonalInfo/ClaimManager/MoveIntoCategory/View';
import AddIdentity from '../../containers/Identity/AddIdentity';


const WALLET = 'wallet';


const getBackButton = (navigation, title, navigateTo, parms) => (
  <TouchableOpacity
    onPress={() => navigation.navigate(navigateTo, parms)}
    style={styles.goBackBtn}
  >
    <IconVector
      name={Platform.OS === 'ios' ? 'ios-arrow-back' : 'md-arrow-back'}
      size={35}
      color="white"
      style={{ paddingLeft: 8 }}
    />
    <Text style={styles.goBackBtnText}>{title}</Text>
  </TouchableOpacity>
);
const styles = StyleSheet.create({
  header_title_noBack: {
    fontFamily: 'Avenir-Black',
    backgroundColor: 'transparent',
    height: 55,
    textAlign: 'center',
    fontSize: 18,
    color: '#E9F1F7',
    paddingTop: 15,
    width: Dimensions.get('window').width, // width of both buttons + no left-right padding
  },

  header_title_back: {
    fontFamily: 'Avenir-Black',
    backgroundColor: 'transparent',
    height: 55,
    textAlign: 'right',
    fontSize: 18,
    color: '#E9F1F7',
    paddingTop: 15,
    width: Dimensions.get('window').width - 110, // width of both buttons + no left-right padding
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

export const MainScreens = StackNavigator({
  Home: {
    screen: Home,
    navigationOptions: {
      title: 'Home',
      headerLeft: null,
    },
  },
  AddCoin: {
    screen: AddCoin,
    navigationOptions: {
      title: 'Add Coin',
    },
  },
  CoinDetails: {
    screen: CoinDetails,
    navigationOptions: {
      title: 'Details',
    },
  },
  ClaimManager: {
    screen: ClaimManager,
    navigationOptions: {
      title: 'Claim Manager',
    },
  },
  MoveIntoCategory: {
    screen: MoveIntoCategory,
    navigationOptions: {
      title: 'Categories',
    },
  },

  AttestationDetails: {
    screen: AttestationDetails,
    navigationOptions: ({ navigation }) => ({
      title: navigation.state.params.id,
    }),
  },
  Identity: {
    screen: Identity,
    navigationOptions: ({ navigation }) => ({
      headerLeft: getBackButton(navigation, 'Home', 'Home'),
    }),
  },
  PersonalInfo: {
    screen: PersonalInfo,
  },
  AddIdentity: {
    screen: AddIdentity,
    navigationOptions: {
      title: 'Identity',
    },
  },
  ScannedInformation: {
    screen: ScannedInformation,
    navigationOptions: {
      title:'Scan to verify',
    },
  },
  ClaimDetails: {
    screen: ClaimDetails,
    navigationOptions: ({ navigation }) => ({
      title: navigation.state.params.claimName,
    }),
  },

  ClaimCategory: {
    screen: ClaimCategory,
    navigationOptions: ({ navigation }) => ({
      title: navigation.state.params.claimCategoryName,
    }),
  },

  ScanBadge: {
    screen: ScanBadge,
    navigationOptions: {
      title: 'Scan badge',
    },
  },
  ConfirmSend: {
    screen: ConfirmSend,
    navigationOptions: {
      title: 'Confirm Send',
    },
  },
  SendResult: {
    screen: SendResult,
    navigationOptions: {
      title: 'Send Result',
      headerLeft: null,
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
  DisplaySeed: {
    screen: DisplaySeed,
    navigationOptions: {
      title: 'Seed',
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
  CoinMenus: {
    screen: CoinMenus,
  },
  SettingsMenus: {
    screen: SettingsMenus,
  },
  VerusPay: {
    screen: VerusPay,
    navigationOptions: {
      title: 'VerusPay',
    },
  },
  ProfileInfo: {
    screen: ProfileInfo,
    navigationOptions: {
      title: 'Info',
    },
  },
  ResetPwd: {
    screen: ResetPwd,
    navigationOptions: {
      title: 'Reset',
    },
  },
  RecoverSeed: {
    screen: RecoverSeed,
    navigationOptions: {
      title: 'Recover',
    },
  },
  GeneralWalletSettings: {
    screen: GeneralWalletSettings,
    navigationOptions: {
      title: 'General Wallet Settings',
    },
  },
  CoinSettings: {
    screen: CoinSettings,
  },
  DeleteProfile: {
    screen: DeleteProfile,
    navigationOptions: {
      title: 'Delete',
    },
  },
  SecureLoading: {
    screen: SecureLoading,
    navigationOptions: {
      title: 'Loading',
      headerRight: null,
      headerLeft: null,
      drawerLockMode: 'locked-closed',
    },
  },
  CustomChainMenus: {
    screen: CustomChainMenus,
  },
  BuySellCryptoMenus: {
    screen: BuySellCryptoMenus,
  },
  SelectPaymentMethod: {
    screen: SelectPaymentMethod,
    navigationOptions: {
      title: 'Select Payment Method',
      drawerLockMode: 'locked-closed',
    },
  },
  ManageWyreAccount: {
    screen: ManageWyreAccount,
    navigationOptions: {
      title: 'Manage Wyre Account',
      drawerLockMode: 'locked-closed',
    },
  },
  ManageWyreEmail: {
    screen: ManageWyreEmail,
    navigationOptions: {
      title: 'Manage Wyre Email',
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
  ManageWyreCellphone: {
    screen: ManageWyreCellphone,
    navigationOptions: {
      title: 'Manage Wyre Cellphone',
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
  ManageWyreDocuments: {
    screen: ManageWyreDocuments,
    navigationOptions: {
      title: 'Upload Documents',
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
  ManageWyrePaymentMethod: {
    screen: ManageWyrePaymentMethod,
    navigationOptions: {
      title: 'Manage Payment Method',
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
  ManageWyrePersonalDetails: {
    screen: ManageWyrePersonalDetails,
    navigationOptions: {
      title: 'Upload Personal Details',
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
  ManageWyreProofOfAddress: {
    screen: ManageWyreProofOfAddress,
    navigationOptions: {
      title: 'Upload Proof of Address',
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
  ManageWyreAddress: {
    screen: ManageWyreAddress,
    navigationOptions: {
      title: 'Manage Wyre Address',
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
  SendTransaction: {
    screen: SendTransaction,
    navigationOptions: {
      title: 'Confirm transaction',
      headerRight: null,
      drawerLockMode: 'locked-closed',
    },
  },
}, {
  headerMode: 'screen',
  navigationOptions: ({ navigation }) => ({
    headerStyle: {
      backgroundColor: Colors.primaryColor,
    },
    headerTitleStyle: {
      fontFamily: 'Avenir-Black',
      fontWeight: 'normal',
      fontSize: 22,
      color: Colors.secondaryColor,
    },
    headerRight: (
      <TouchableOpacity
        onPress={() => navigation.navigate('DrawerOpen')}
        style={styles.menuButton}
      >
        <Icon name="menu" size={35} color={Colors.secondaryColor} />
      </TouchableOpacity>),
    gesturesEnabled: false,
    headerTintColor: Colors.secondaryColor,
  }),
});

export const SignedOut = StackNavigator({
  SignIn: {
    screen: Login,
    navigationOptions: {
      header: null,
    },
  },
  RecoverSeed: {
    screen: RecoverSeed,
    navigationOptions: {
      title: 'Recover',
    },
  },
  DisplaySeed: {
    screen: DisplaySeed,
    navigationOptions: {
      title: 'Seed',
    },
  },
  DeleteProfile: {
    screen: DeleteProfile,
    navigationOptions: {
      title: 'Delete',
    },
  },
  SecureLoading: {
    screen: SecureLoading,
    navigationOptions: {
      title: 'Loading',
      headerRight: null,
      headerLeft: null,
      drawerLockMode: 'locked-closed',
    },
  },
});

export const SignedOutNoKey = StackNavigator({
  SignIn: {
    screen: SignUp,
    navigationOptions: {
      header: null,
    },
  },
});

export const Loading = StackNavigator({
  Splash: {
    screen: LoadingScreen,
    navigationOptions: {
      header: null,
    },
  },
});

export const RootNavigator = (hasAccount, loading, signedIn) => DrawerNavigator(
  {
    SignedIn: {
      screen: MainScreens,
      headerMode: 'screen',
      navigationOptions: {
        gesturesEnabled: false,
      },
    },
    SignedOut: {
      screen: SignedOut,
      navigationOptions: {
        gesturesEnabled: false,
        drawerLockMode: 'locked-closed',
        headerRight: null,
      },
    },
    SignedOutNoKey: {
      screen: SignedOutNoKey,
      navigationOptions: {
        gesturesEnabled: false,
        drawerLockMode: 'locked-closed',
      },
    },
    Loading: {
      screen: Loading,
      navigationOptions: {
        gesturesEnabled: false,
        drawerLockMode: 'locked-closed',
      },
    },
  }, {
    contentComponent: SideMenu,
    drawerWidth: 250,
    drawerPosition: 'right',
    drawerOpenRoute: 'DrawerOpen',
    drawerCloseRoute: 'DrawerClose',
    drawerToggleRoute: 'DrawerToggle',
    mode: 'modal',
    initialRouteName: loading ? 'Loading' : (hasAccount ? (signedIn ? 'SignedIn' : 'SignedOut') : 'SignedOutNoKey'),
  },
);
