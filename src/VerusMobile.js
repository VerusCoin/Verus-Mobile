import React from "react";
import {
  LogBox,
  Alert,
  AppState,
  Platform,
  View,
  Linking
} from "react-native";
import Modal from './components/Modal'
import RootStackScreens from './containers/RootStack/RootStackScreens';
import { 
  fetchUsers, 
  loadServerVersions,
  loadCachedHeaders,
  loadEthTxReceipts,
  initSettings,
  fetchActiveCoins,
  requestSeedData,
  initNotifications,
  initInstanceKey
} from './actions/actionCreators';
import {
  initCache,
  clearCachedVersions,
  updateActiveCoinList,
  checkAndSetVersion,
  purgeUnusedCoins,
  clearCachedVrpcResponses
} from './utils/asyncStore/asyncStore'
import { connect } from 'react-redux';
import { ENABLE_VERUS_IDENTITIES } from '../env/index'
import AlertModal from "./components/Alert";
import { activateKeyboardListener, updateDeeplinkUrl } from "./actions/actionDispatchers";
import Colors from "./globals/colors";
import { CoinLogos } from "./utils/CoinData/CoinData";
import { Portal } from 'react-native-paper';
import SendModal from "./components/SendModal/SendModal";
import { NavigationContainer } from "@react-navigation/native";
import LoadingModal from "./components/LoadingModal/LoadingModal";
import { CoinDirectory } from "./utils/CoinData/CoinDirectory";
import { removeInactiveCurrencyDefinitions } from "./utils/asyncStore/currencyDefinitionStorage";
import { removeInactiveContractDefinitions } from "./utils/asyncStore/contractDefinitionStorage";
import { initInstance } from "./utils/auth/authBox";

class VerusMobile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      securityCover: false
    };
  }

  // TODO: Implement own lifecycle manager to account for 
  // android "inactivity"
  _handleAppStateChange(nextAppState) {
    if (Platform.OS === 'ios') {
      if (nextAppState === "active" && this.state.securityCover == true) {
        this.setSecurityCover(false)
      } else if (nextAppState === "inactive" && this.state.securityCover == false) {
        this.handleInactivity()
      }
    }
  };

  handleInactivity() {
    if (this.props.sendModal.type == null) {
      this.setSecurityCover(true)
    }
    
    // TODO: Add lock on app re-entry
    // if (this.props.signedIn) {
    //   this.props.dispatch(signOut())
    // }
  }

  setSecurityCover(cover) {
    this.setState({
      securityCover: cover
    })
  }

  setLoading(loading) {
    this.setState({
      loading
    })
  }
  
  componentDidMount() {
    LogBox.ignoreLogs(['EventEmitter']);

    activateKeyboardListener()

    AppState.addEventListener("change", (nextAppState) => this._handleAppStateChange(nextAppState));

    // Handle deeplinks
    Linking.addEventListener("url", ({ url }) => {
      updateDeeplinkUrl(url)
    })
    const updateUrlState = async () => {
      const url = await Linking.getInitialURL()

      updateDeeplinkUrl(url)
    }

    updateUrlState()
    
    //TODO: Figure out what should trigger a cache clear on startup of server 
    //versions. (The action that triggers it should indicate a server upgraded it's 
    //version)
    clearCachedVersions()
    .then(async () => {
      const settingsAction = await initSettings();
      this.props.dispatch(settingsAction);

      this.props.dispatch(initInstanceKey(await initInstance()));

      CoinDirectory.setVrpcOverrides(settingsAction.settings.generalWalletSettings ? settingsAction.settings.generalWalletSettings.vrpcOverrides : {});

      await clearCachedVrpcResponses()

      const usedCoins = await purgeUnusedCoins()
      await removeInactiveCurrencyDefinitions(usedCoins)
      await removeInactiveContractDefinitions(usedCoins)

      await CoinDirectory.populateEthereumContractDefinitionsFromStorage()
      await CoinDirectory.populatePbaasCurrencyDefinitionsFromStorage()

      return initCache()
    })
    .then(() => {
      return checkAndSetVersion()
    })
    .then(async () => {
      await updateActiveCoinList()
      
      let promiseArr = [
        fetchUsers(),
        initNotifications(),
        fetchActiveCoins(),
      ];

      return Promise.all(promiseArr)
    })
    .then((actionArr) => {
      actionArr.forEach((action) => {
        this.props.dispatch(action)
      })
      return Promise.all([
        loadServerVersions(this.props.dispatch),
        loadCachedHeaders(this.props.dispatch),
        loadEthTxReceipts(this.props.dispatch)
      ]);
    })
    .then(() => {
      this.setState({ loading: false })
    })
    .catch((err) => {
      console.error(err)

      Alert.alert("Error", err.message)
    })

    if (ENABLE_VERUS_IDENTITIES) {
      this.props.dispatch(requestSeedData());
    }
  }

  render() {    
    const VrscLogo = CoinLogos.VRSC.light

    return (
      <View style={{ flex: 1 }}>
        <Portal.Host>
          <AlertModal />
          {this.props.sendModal.type != null && <SendModal />}
          {this.props.loadingModal.visible && <LoadingModal />}
          <NavigationContainer>
            <RootStackScreens
              hasAccount={this.props.accountsLength > 0}
              loading={this.state.loading}
              signedIn={this.props.signedIn}
            />
          </NavigationContainer>
        </Portal.Host>
        <Modal
          animationType={this.state.loading ? "fade" : "none"}
          transparent={false}
          visible={this.state.securityCover || this.state.loading}
        >
          <View
            style={[
              {
                width: "100%",
                height: "100%",
                backgroundColor: Colors.primaryColor,
              },
              {
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <VrscLogo height={100} width={100} />
          </View>
        </Modal>
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accountsLength: state.authentication.accounts.length,
    signedIn: state.authentication.signedIn,
    sendModal: state.sendModal,
    loadingModal: state.loadingModal
  }
};

export default connect(mapStateToProps)(VerusMobile);
