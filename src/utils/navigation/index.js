import React from "react";
import { StackNavigator, DrawerNavigator } from "react-navigation";
import { StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { Icon } from "react-native-elements";

import SideMenu from '../../containers/SideMenu/SideMenu';

import Login from '../../containers/Login/Login';
import Home from '../../containers/Home/Home';
import AddCoin from '../../containers/AddCoin/AddCoin';
import SignUp from '../../containers/SignUp/SignUp';
import CoinDetails from '../../containers/CoinDetails/CoinDetails';
import TransactionDetails from '../../containers/TransactionDetails/TransactionDetails';
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
import CoinSettings from '../../containers/Settings/CoinSettings/CoinSettings';
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

const WALLET = 'wallet';

const styles = StyleSheet.create({
  header_title_noBack: {
    backgroundColor: 'transparent',
    height: 55,
    textAlign: 'center',
    fontSize: 22,
    color: "#E9F1F7",
    paddingTop: 12,
    width: Dimensions.get('window').width // width of both buttons + no left-right padding
  },

  header_title_back: {
    backgroundColor: 'transparent',
    height: 55,
    textAlign: 'center',
    fontSize: 22,
    color: "#E9F1F7",
    paddingTop: 12,
    width: Dimensions.get('window').width - 110// width of both buttons + no left-right padding
  },

  menuButton: {
    marginRight:15
  }
});

export const MainScreens =
  StackNavigator({
    Home: {
      screen: Home,
      navigationOptions: {
        title: "Home",
        headerLeft: null
      }
    },
    AddCoin: {
      screen: AddCoin,
      navigationOptions: {
        title: "Add Coin",
      }
    },
    CoinDetails: {
      screen: CoinDetails,
      navigationOptions: {
        title: "Details",
      }
    },
    TxDetails: {
      screen: TransactionDetails,
      navigationOptions: {
        title: "Info",
      }
    },
    ConfirmSend: {
      screen: ConfirmSend,
      navigationOptions: {
        title: "Confirm Send",
      }
    },
    SendResult: {
      screen: SendResult,
      navigationOptions: {
        title: "Send Result",
        headerLeft: null,
        headerRight: null,
        drawerLockMode: 'locked-closed'
      }
    },
    DisplaySeed: {
      screen: DisplaySeed,
      navigationOptions: {
        title: "Seed",
        headerRight: null,
        drawerLockMode: 'locked-closed'
      }
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
        title: "VerusPay",
      }
    },
    ProfileInfo: {
      screen: ProfileInfo,
      navigationOptions: {
        title: "Info",
      }
    },
    ResetPwd: {
      screen: ResetPwd,
      navigationOptions: {
        title: "Reset",
      }
    },
    RecoverSeed: {
      screen: RecoverSeed,
      navigationOptions: {
        title: "Recover",
      }
    },
    GeneralWalletSettings: {
      screen: GeneralWalletSettings,
      navigationOptions: {
        title: "General Wallet Settings"
      }
    },
    CoinSettings: {
      screen: CoinSettings,
    },
    DeleteProfile: {
      screen: DeleteProfile,
      navigationOptions: {
        title: "Delete",
      }
    },
    SecureLoading: {
      screen: SecureLoading,
      navigationOptions: {
        title: "Loading",
        headerRight: null,
        headerLeft: null,
        drawerLockMode: 'locked-closed'
      }
    },
    CustomChainMenus: {
      screen: CustomChainMenus,
    },
    BuySellCryptoMenus: {
      screen: BuySellCryptoMenus
    },
    SelectPaymentMethod: {
      screen: SelectPaymentMethod,
      navigationOptions: {
        title: 'Select Payment Method',
        drawerLockMode: 'locked-closed'
      }
    },
    ManageWyreAccount: {
      screen: ManageWyreAccount,
      navigationOptions: {
        title: 'Manage Wyre Account',
        drawerLockMode: 'locked-closed'
      }
    },
    ManageWyreEmail: {
      screen: ManageWyreEmail,
      navigationOptions: {
        title: 'Manage Wyre Email',
        headerRight: null,
        drawerLockMode: 'locked-closed'
      }
    },
    ManageWyreCellphone: {
      screen: ManageWyreCellphone,
      navigationOptions: {
        title: 'Manage Wyre Cellphone',
        headerRight: null,
        drawerLockMode: 'locked-closed'
      }
    },
    ManageWyreDocuments: {
      screen: ManageWyreDocuments,
      navigationOptions: {
        title: 'Upload Documents',
        headerRight: null,
        drawerLockMode: 'locked-closed'
      }
    },
    ManageWyrePaymentMethod: {
      screen: ManageWyrePaymentMethod,
      navigationOptions: {
        title: 'Manage Payment Method',
        headerRight: null,
        drawerLockMode: 'locked-closed'
      }
    },
    ManageWyrePersonalDetails: {
      screen: ManageWyrePersonalDetails,
      navigationOptions: {
        title: 'Upload Personal Details',
        headerRight: null,
        drawerLockMode: 'locked-closed'
      }
    },
    ManageWyreProofOfAddress: {
      screen: ManageWyreProofOfAddress,
      navigationOptions: {
        title: 'Upload Proof of Address',
        headerRight: null,
        drawerLockMode: 'locked-closed'
      }
    },
    ManageWyreAddress: {
      screen: ManageWyreAddress,
      navigationOptions: {
        title: 'Manage Wyre Address',
        headerRight: null,
        drawerLockMode: 'locked-closed'
      }
    },
    SendTransaction: {
      screen: SendTransaction,
      navigationOptions: {
        title: 'Confirm transaction',
        headerRight: null,
        drawerLockMode: 'locked-closed',
      }
    },
  }, {
    headerMode: 'screen',
    navigationOptions: ({navigation}) => ({
      headerStyle: {
        backgroundColor: '#2E86AB',
      },
      headerRight: (
      <TouchableOpacity onPress={() =>
        navigation.navigate('DrawerOpen')} style={styles.menuButton}>
        <Icon name="menu" size={35} color="#E9F1F7"/>
      </TouchableOpacity>),
      gesturesEnabled: false,
      headerTintColor: '#E9F1F7',
    }),
  })

export const SignedOut = StackNavigator({
  SignIn: {
    screen: Login,
    navigationOptions: {
        header: null
    }
  },
  RecoverSeed: {
    screen: RecoverSeed,
    navigationOptions: {
      title: "Recover",
    }
  },
  DisplaySeed: {
    screen: DisplaySeed,
    navigationOptions: {
      title: "Seed",
    }
  },
  DeleteProfile: {
    screen: DeleteProfile,
    navigationOptions: {
      title: "Delete",
    }
  },
  SecureLoading: {
    screen: SecureLoading,
    navigationOptions: {
      title: "Loading",
      headerRight: null,
      headerLeft: null,
      drawerLockMode: 'locked-closed'
    }
  },
});

export const SignedOutNoKey = StackNavigator({
    SignIn: {
      screen: SignUp,
      navigationOptions: {
        header: null
      }
    },
});

export const Loading = StackNavigator({
  Splash: {
    screen: LoadingScreen,
    navigationOptions: {
      header: null
    }
  },
});

export const RootNavigator = (hasAccount, loading, signedIn) => {
  return DrawerNavigator(
    {
      SignedIn: {
        screen: MainScreens,
        headerMode: 'screen',
        navigationOptions: {
          gesturesEnabled: false,
        }
      },
      SignedOut: {
        screen: SignedOut,
        navigationOptions: {
          gesturesEnabled: false,
          drawerLockMode: 'locked-closed',
          headerRight: null
        }
      },
      SignedOutNoKey: {
        screen: SignedOutNoKey,
        navigationOptions: {
          gesturesEnabled: false,
          drawerLockMode: 'locked-closed'
        }
      },
      Loading: {
        screen: Loading,
        navigationOptions: {
          gesturesEnabled: false,
          drawerLockMode: 'locked-closed'
        }
      }
    }, {
      contentComponent: SideMenu,
      drawerWidth: 250,
      drawerPosition: 'left',
      drawerOpenRoute: 'DrawerOpen',
      drawerCloseRoute: 'DrawerClose',
      drawerToggleRoute: 'DrawerToggle',
      mode: "modal",
      initialRouteName: loading ? "Loading" : (hasAccount ? (signedIn ? "SignedIn" : "SignedOut") : "SignedOutNoKey")
    }
  );
};
