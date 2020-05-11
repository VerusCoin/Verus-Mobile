import React from "react";
import { YellowBox, TouchableWithoutFeedback, Keyboard, Alert } from "react-native";
import { RootNavigator } from './utils/navigation/index';
import {
  fetchUsers,
  loadServerVersions,
  loadCachedHeaders,
  initSettings
} from './actions/actionCreators';
import {
  initCache,
  clearCachedVersions,
  updateActiveCoinList_v0_1_9_beta,
  checkAndSetVersion
} from './utils/asyncStore/asyncStore'
import { connect } from 'react-redux';

import {
  getAddresses,
  getZTransactions,
  getPrivateBalance,
  getBlockCount,
  getInfo,
  startSync,
  stopSync,
  initializeWallet,
  openWallet
} from "./utils/api/channels/dlight/callCreators";
import VerusLightClient from "react-native-verus-light-client";
import { hashAccountId } from "./utils/crypto/hash";


class VerusMobile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true
    };

    YellowBox.ignoreWarnings([
      "Warning: componentWillMount is deprecated",
      "Warning: componentWillReceiveProps is deprecated",
      "Warning: componentWillUpdate is deprecated"
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
    .then((versionCompare) => {
      let promiseArr = [fetchUsers(), initSettings()]

      //Handle version change stuff here
      /*if (global.APP_VERSION === '0.1.9-beta' && versionCompare === -1) {
        if (__DEV__) console.log("Old version detected, updating active coins for 0.1.9-beta")
        promiseArr.push(updateActiveCoinList_v0_1_9_beta())
      }*/

      return Promise.all(promiseArr)
    })
    .then((res) => {
      let actionArr = res.slice(0, res.length - 1)
      actionArr.forEach((action) => {
        this.props.dispatch(action)
      })

      return Promise.all([loadServerVersions(this.props.dispatch), loadCachedHeaders(this.props.dispatch)])
    })
    .then(() => {
      this.setState({ loading: false })
    })
    .catch((err) => {
      Alert.alert("Error", err.message)
    })
  }

  render() {
    const Layout = RootNavigator(
      this.props.accountsLength > 0,
      this.state.loading,
      this.props.signedIn);

    return(
       <Layout />
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
  }
};

export default connect(mapStateToProps)(VerusMobile);
