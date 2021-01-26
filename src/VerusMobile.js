import React from "react";
import { YellowBox, TouchableWithoutFeedback, Keyboard, Alert } from "react-native";
import RootStackScreens from './utils/navigation/index';
import { NavigationContainer } from '@react-navigation/native';
import { 
  fetchUsers, 
  loadServerVersions,
  loadCachedHeaders,
  loadEthTxReceipts,
  initSettings,
  requestSeedData,
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

class VerusMobile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true   
    };
    
    YellowBox.ignoreWarnings([
      "Warning: componentWillMount is deprecated",
      "Warning: componentWillReceiveProps is deprecated",
      "Warning: componentWillUpdate is deprecated",
      'RCTRootView cancelTouches', 
    ]);
  }
  
  componentDidMount() {    
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
    .then(() => {
      let promiseArr = [fetchUsers(), initSettings(), updateActiveCoinList()]

      return Promise.all(promiseArr)
    })
    .then((res) => {
      let actionArr = res.slice(0, res.length - 1)
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
    const Layout = () => RootStackScreens(
      this.props.accountsLength > 0, 
      this.state.loading, 
      this.props.signedIn);

    return (
      <NavigationContainer>
        {this.props.activeAlert != null && (
          <AlertModal
            visible={this.props.activeAlert != null}
            title={this.props.activeAlert.title}
            description={this.props.activeAlert.message}
            buttons={this.props.activeAlert.buttons}
            cancelable={
              this.props.activeAlert.options != null &&
              this.props.activeAlert.cancelable
            }
          />
        )}
        <Layout />
      </NavigationContainer>
    );
  }
}

//TODO: Connect this correctly instead of relying on individual cases
const DismissKeyboard = ({children}) => (
  <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
    {children}
  </TouchableWithoutFeedback>
);

const mapStateToProps = (state) => {
  return {
    accountsLength: state.authentication.accounts.length,
    signedIn: state.authentication.signedIn,
    activeAlert: state.alert.active
  }
};

export default connect(mapStateToProps)(VerusMobile);
