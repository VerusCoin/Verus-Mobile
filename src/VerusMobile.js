import React from "react";
import {
  YellowBox,
  Alert,
  AppState,
  Platform,
  View
} from "react-native";
import Modal from './components/Modal'
import RootStackScreens from './utils/navigation/index';
import { 
  fetchUsers, 
  loadServerVersions,
  loadCachedHeaders,
  loadEthTxReceipts,
  initSettings,
  fetchActiveCoins,
  requestSeedData
} from './actions/actionCreators';
import {
  initCache,
  clearCachedVersions,
  updateActiveCoinList,
  checkAndSetVersion
} from './utils/asyncStore/asyncStore'
import { connect } from 'react-redux';
import { ENABLE_VERUS_IDENTITIES } from '../env/main.json'
import AlertModal from "./components/Alert";
import { activateKeyboardListener } from "./actions/actionDispatchers";
import Colors from "./globals/colors";
import { CoinLogos } from "./utils/CoinData/CoinData";
import { Portal } from 'react-native-paper';

class VerusMobile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      securityCover: false
    };
    
    YellowBox.ignoreWarnings([
      "Warning: componentWillMount is deprecated",
      "Warning: componentWillReceiveProps is deprecated",
      "Warning: componentWillUpdate is deprecated",
      'RCTRootView cancelTouches', 
    ]);
  }

  _handleAppStateChange(nextAppState) {
    if (nextAppState === "active" && this.state.securityCover == true) {
      this.setSecurityCover(false)
    } else if (nextAppState === "inactive" && this.state.securityCover == false) {
      this.handleInactivity()
    }
  };

  handleInactivity() {
    this.setSecurityCover(true)

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
  
  componentDidMount() {    
    activateKeyboardListener()

    if (Platform.OS === "ios") {
      AppState.addEventListener("change", (nextAppState) => this._handleAppStateChange(nextAppState));
    } else if (Platform.OS === "android") {
      AppState.addEventListener("blur", () => {
        this.handleInactivity()
      });
      AppState.addEventListener("focus", () => this.setSecurityCover(false));
    }
    
    //TODO: Figure out what should trigger a cache clear on startup of server 
    //versions. (The action that triggers it should indicate a server upgraded it's 
    //version)
    clearCachedVersions()
    .then(() => {
      return initCache()
    })
    .then(() => {
      return checkAndSetVersion()
    })
    .then(async () => {
      let promiseArr = [
        fetchUsers(),
        initSettings(),
        fetchActiveCoins(),
      ];

      await updateActiveCoinList()

      return Promise.all(promiseArr)
    })
    .then((actionArr) => {
      actionArr.forEach((action) => {
        this.props.dispatch(action)
      })
      return Promise.all([
        loadServerVersions(this.props.dispatch),
        loadCachedHeaders(this.props.dispatch),
        loadEthTxReceipts(this.props.dispatch),
      ]);
    })
    .then(() => {
      this.setState({ loading: false })
    })
    .catch((err) => {
      Alert.alert("Error", err.message)
    })

    if (ENABLE_VERUS_IDENTITIES) {
      this.props.dispatch(requestSeedData());
    }
  }

  render() {    
    const VrscLogo = CoinLogos.vrsc.light

    return (
      <View style={{ flex: 1 }}>
        <Portal.Host>
          <AlertModal />
          <RootStackScreens
            hasAccount={this.props.accountsLength > 0}
            loading={this.state.loading}
            signedIn={this.props.signedIn}
          />
        </Portal.Host>
        <Modal
          animationType={this.state.loading ? "fade" : "slide"}
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
    signedIn: state.authentication.signedIn
  }
};

export default connect(mapStateToProps)(VerusMobile);
