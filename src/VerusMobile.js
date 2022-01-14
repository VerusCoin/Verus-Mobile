import {NavigationContainer} from '@react-navigation/native';
import React from 'react';
import {
  Alert,
  AppState,
  Image,
  LogBox,
  Platform,
  View,
  StyleSheet,
} from 'react-native';
import {Portal} from 'react-native-paper';
import {connect} from 'react-redux';
import {ENABLE_VERUS_IDENTITIES} from '../env/index';
import {
  fetchActiveCoins,
  fetchUsers,
  initSettings,
  loadCachedHeaders,
  loadEthTxReceipts,
  loadServerVersions,
  requestSeedData,
} from './actions/actionCreators';
import {activateKeyboardListener} from './actions/actionDispatchers';
import AlertModal from './components/Alert';
import Modal from './components/Modal';
import SendModal from './components/SendModal/SendModal';
import Colors from './globals/colors';
import {NewLogo} from './images/customIcons/index';
import {
  checkAndSetVersion,
  clearCachedVersions,
  initCache,
  updateActiveCoinList,
} from './utils/asyncStore/asyncStore';
import RootStackScreens from './utils/navigation/index';
import NewLogoComponent from './components/NewLogo';

class VerusMobile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      securityCover: false,
    };

    LogBox.ignoreLogs([
      'Warning: componentWillMount is deprecated',
      'Warning: componentWillReceiveProps is deprecated',
      'Warning: componentWillUpdate is deprecated',
      'RCTRootView cancelTouches',
    ]);
  }

  // TODO: Implement own lifecycle manager to account for
  // android "inactivity"
  _handleAppStateChange(nextAppState) {
    if (Platform.OS === 'ios') {
      if (nextAppState === 'active' && this.state.securityCover == true) {
        this.setSecurityCover(false);
      } else if (
        nextAppState === 'inactive' &&
        this.state.securityCover == false
      ) {
        this.handleInactivity();
      }
    }
  }

  handleInactivity() {
    this.setSecurityCover(true);

    // TODO: Add lock on app re-entry
    // if (this.props.signedIn) {
    //   this.props.dispatch(signOut())
    // }
  }

  setSecurityCover(cover) {
    this.setState({
      securityCover: cover,
    });
  }

  componentDidMount() {
    activateKeyboardListener();

    AppState.addEventListener('change', nextAppState =>
      this._handleAppStateChange(nextAppState),
    );

    //TODO: Figure out what should trigger a cache clear on startup of server
    //versions. (The action that triggers it should indicate a server upgraded it's
    //version)
    clearCachedVersions()
      .then(() => {
        return initCache();
      })
      .then(() => {
        return checkAndSetVersion();
      })
      .then(async () => {
        await updateActiveCoinList();

        let promiseArr = [fetchUsers(), initSettings(), fetchActiveCoins()];

        return Promise.all(promiseArr);
      })
      .then(actionArr => {
        actionArr.forEach(action => {
          this.props.dispatch(action);
        });
        return Promise.all([
          loadServerVersions(this.props.dispatch),
          loadCachedHeaders(this.props.dispatch),
          loadEthTxReceipts(this.props.dispatch),
        ]);
      })
      .then(() => {
        this.setState({loading: false});
      })
      .catch(err => {
        Alert.alert('Error', err.message);
      });

    if (ENABLE_VERUS_IDENTITIES) {
      this.props.dispatch(requestSeedData());
    }
  }

  render() {
    return (
      <View style={styles.container}>
        <Portal.Host>
          <AlertModal />
          {this.props.sendModal.type != null && <SendModal />}
          <NavigationContainer>
            <RootStackScreens
              hasAccount={this.props.accountsLength > 0}
              loading={this.state.loading}
              signedIn={this.props.signedIn}
            />
          </NavigationContainer>
        </Portal.Host>
        <Modal
          animationType={this.state.loading ? 'fade' : 'none'}
          transparent={false}
          visible={this.state.securityCover || this.state.loading}>
          <View style={styles.containerModal}>
            {/* <Image style={styles.logo} source={NewLogo} /> */}
            <NewLogoComponent />
          </View>
        </Modal>
      </View>
    );
  }
}

const mapStateToProps = state => {
  return {
    accountsLength: state.authentication.accounts.length,
    signedIn: state.authentication.signedIn,
    sendModal: state.sendModal,
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerModal: {
    width: '100%',
    height: '100%',
    backgroundColor: Colors.secondaryColor,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 200,
    width: 200,
  },
});

export default connect(mapStateToProps)(VerusMobile);
