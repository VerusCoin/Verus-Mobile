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
  updateActiveCoinList,
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

    //DELETE/REFACTOR
    /*VerusLightClient.addWallet('ZEC', 'btc', "lightwalletd.testnet.z.cash", 9067, "abcde12345", "a seed that is at least 32 bytes long so that it will work with the ZIP 32 protocol.")
    .then(res => {
      console.log("ADD WALLET RES")
      console.log(res)

      return VerusLightClient.request(20, "getblockcount", ["ZEC", "abcde12345", "btc"])
    }) 
    .then(res => {
      console.log("BLOCK COUNT")
      console.log(res)
    })
    .catch(err => {
      console.log("ADD WALLET OR REQ REJ")
      console.log(err)
    })*/
    /*initializeWallet('ZEC', 'btc', "lightwalletd.testnet.z.cash", 9067, "8ccb033c0e48b27ff91e1ab948367e3bbc6921487c97624ed7ad064025e3dc99", 100, "a seed that is at least 32 bytes long so that it will work with the ZIP 32 protocol.", 0)
    .then(res => {
      console.log("INIT WALLET RES")
      console.log(res)

      return openWallet('ZEC', 'btc', '8ccb033c0e48b27ff91e1ab948367e3bbc6921487c97624ed7ad064025e3dc99')
    })
    .then(res => {
      console.log("ADD WALLET RES")
      console.log(res)

      return startSync('ZEC', 'btc', '8ccb033c0e48b27ff91e1ab948367e3bbc6921487c97624ed7ad064025e3dc99')
    }) 
    .then(res => {
      console.log("START SYNC RES")
      console.log(res)
    })
    .catch(e => {
      console.log("ERROR")
      console.log(e)
    })*/


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
