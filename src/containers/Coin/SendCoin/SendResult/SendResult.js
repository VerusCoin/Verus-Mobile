/*
  This component works very similarly to ConfirmSend, 
  in that it takes in the parameters to send and signs
  a transaction. Unlike ConfirmSend, this component
  pushes the transaction to the blockchain and displays
  the result. This component should always be resetTo,
  so that the navigation stack get reset when a transaction
  is sent.
*/

import React, { Component } from "react"
import StandardButton from "../../../../components/StandardButton"
import { connect } from 'react-redux'
import { sendRawTx } from '../../../../utils/api/channels/electrum/callCreators'
import { networks } from 'bitgo-utxo-lib'
import { 
  View, 
  TouchableOpacity, 
  Text, 
  ScrollView, 
  Linking, 
  Alert,
  Clipboard
 } from "react-native"
import { satsToCoins, truncateDecimal } from '../../../../utils/math'
import { explorers } from '../../../../utils/CoinData/CoinData'
import { 
  //needsUpdate, 
  //transactionsNeedUpdate,
  setActiveCoin, 
  setActiveApp,
  setActiveSection,
  expireData,
  //balancesNeedUpdate
 } from '../../../../actions/actionCreators'
import ProgressBar from 'react-native-progress/Bar'
import { Icon } from 'react-native-elements'
import { NO_VERIFICATION, MID_VERIFICATION } from '../../../../utils/constants/constants'
import Styles from '../../../../styles/index'
import Colors from '../../../../globals/colors'
import { API_GET_FIATPRICE, API_GET_TRANSACTIONS, ELECTRUM, DLIGHT, API_GET_BALANCES } from "../../../../utils/constants/intervalConstants"

const TIMEOUT_LIMIT = 120000
const LOADING_TICKER = 5000

class SendResult extends Component {
  constructor(props) {
    super(props)
    this.state = {
        toAddress: "",
        fromAddress: "",
        err: false,
        coinObj: {},
        utxoCrossChecked: false,
        loading: true,
        network: null,
        fee: 0,
        amount: 0,
        txid: "",
        remainingBalance: 0,
        loadingProgress: 0.175,
        loadingMessage: "Preparing transaction..."
    };
  }

  componentDidMount() {
    const coinObj = this.props.route.params.data.coinObj
    const activeUser = this.props.route.params.data.activeUser
    const toAddress = this.props.route.params.data.toAddress
    const fromAddress = this.props.route.params.data.fromAddress
    const amount = Number(this.props.route.params.data.amount)
    const fee = coinObj.id === 'BTC' ? { feePerByte: Number(this.props.route.params.data.btcFee) } : Number(this.props.route.params.data.coinObj.fee)
    const network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']
    
    this.timeoutTimer = setTimeout(() => {
      if (this.state.loading) {
        this.setState({
          err: 'timed out while trying to send transaction', 
          loading: false,
          coinObj: coinObj,
        })
      }
    }, TIMEOUT_LIMIT)

    this.loadingInterval = setInterval(() => {
      this.tickLoading()
    }, LOADING_TICKER);

    let verifyMerkle, verifyTxid

    if (this.props.coinSettings[coinObj.id]) {
      verifyMerkle = this.props.coinSettings[coinObj.id].verificationLvl > MID_VERIFICATION ? true : false
      verifyTxid = this.props.coinSettings[coinObj.id].verificationLvl > NO_VERIFICATION ? true : false 
    } else {
      console.warn(`No coin settings data found for ${coinObj.id} in SendResult, assuming highest verification level`)
      verifyMerkle = true
      verifyTxid = true
    }

    sendRawTx(coinObj, activeUser, toAddress, amount, fee, network, verifyMerkle, verifyTxid)
    .then((res) => {
      if(res.err || !res) {
        this.setState({
          loading: false,
          err: res.result,
          coinObj: coinObj,
        });
        clearInterval(this.loadingInterval);
      } else {
        clearInterval(this.loadingInterval);
        this.setState({
          loading: false,
          txid: res.result,
          remainingBalance: this.props.balances.public.confirmed - (amount + fee),
          toAddress: toAddress,
          fromAddress: fromAddress,
          coinObj: coinObj,
          network: network,
          fee: coinObj.id === 'BTC' ? fee.feePerByte : fee,
          amount: amount,
        });
        
        this.props.dispatch(expireData(coinObj.id, API_GET_FIATPRICE))
        this.props.dispatch(expireData(coinObj.id, API_GET_TRANSACTIONS))
      }
    })
    .catch((e) => {
      this.setState({
        loading: false,
        err: e.message ? e.message : "Unknown error while building transaction, double check form data"
      });
      console.log(e)
    })
  }

  componentWillUnmount() {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
  }

  openExplorer = () => {
    let url = `${explorers[this.state.coinObj.id]}/tx/${this.state.txid}`
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        console.log("Don't know how to open URI: " + url);
      }
    });
  }

  navigateToScreen = (coinObj, route) => {
    let navigation = this.props.navigation
    let data = {}

    if (route === "Send") {
      data = {
        coinObj: coinObj,
        balance: this.props.balances.public.result.confirmed,
        activeAccount: this.props.activeAccount
      }
    } else {
      data = coinObj
    }

    navigation.navigate(route, {
      data: data
    });
  }

  backToCoin = () => {
    let coinObj = this.state.coinObj

    let navigation = this.props.navigation  
    this.props.dispatch(setActiveCoin(coinObj))
    this.props.dispatch(setActiveApp(coinObj.defaultApp))
    this.props.dispatch(setActiveSection(coinObj.apps[coinObj.defaultApp].data[0]))

    navigation.navigate("CoinMenus", { title: 'Overview' });
  }

  copyTxIDToClipboard = () => {
    Clipboard.setString(this.state.txid);
    Alert.alert("ID Copied", "Transaction ID copied to clipboard")
  }

  tickLoading = () => {
    //This is cheeky but it actually does all these things
    let loadingMessages = [
      'Bundling transaction info...',
      'Verifying transaction info again...',
      'Verifying merkle root again...',
      'Signing Transaction...'
    ]
    
    let index = 0

    while (index < loadingMessages.length && loadingMessages[index] !== this.state.loadingMessage) {
      index++
    }

    if (index < (loadingMessages.length - 1)) {
      this.setState({loadingMessage: loadingMessages[index+1], loadingProgress: this.state.loadingProgress + 0.175})
    } else if (index === loadingMessages.length) {
      this.setState({loadingMessage: loadingMessages[0], loadingProgress: this.state.loadingProgress + 0.175})
    }
  }

  renderTransactionResult = () => {
    clearTimeout(this.timeoutTimer);
    return (
      <React.Fragment>
        <View style={Styles.headerContainer}>
          <View style={Styles.centerContainer}>
            <Text
              style={{
                ...Styles.mediumCentralPaddedHeader,
                ...Styles.successText,
              }}
            >
              {'Sent'}
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={{
            ...Styles.centerContainer,
            ...Styles.innerHeaderFooterContainer
          }}
          style={Styles.secondaryBackground}
        >
          <View style={Styles.wideBlock}>
            <View style={Styles.infoTable}>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>From:</Text>
                <View style={Styles.infoTableCell}>
                  <Text style={Styles.blockTextAlignRight}>
                    {this.state.fromAddress}
                  </Text>
                </View>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>To:</Text>
                <View style={Styles.infoTableCell}>
                  <Text style={Styles.blockTextAlignRight}>
                    {this.state.toAddress}
                  </Text>
                </View>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>Balance:</Text>
                <Text style={Styles.infoTableCell}>
                  {truncateDecimal(this.state.balance, 8) +
                    " " +
                    this.state.coinObj.id}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>
                  Amount Sent:
                </Text>
                <Text style={Styles.infoTableCell}>
                  {truncateDecimal(
                    satsToCoins(this.state.amount),
                    8
                  ) +
                    " " +
                    this.state.coinObj.id}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>{this.state.coinObj.id === 'BTC' ? 'Fee/byte: ' : 'Fee: '}</Text>
                <Text style={Styles.infoTableCell}>{satsToCoins(this.state.fee) + ' ' + this.state.coinObj.id}</Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>ID:</Text>
                <View style={Styles.infoTableCell}>
                  <Text style={{...Styles.blockTextAlignRight, ...Styles.linkText}} onPress={this.copyTxIDToClipboard}>
                    {this.state.txid}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
        <View style={Styles.footerContainer}>
          <View style={Styles.standardWidthSpaceBetweenBlock}>
            <StandardButton
              color={Colors.linkButtonColor}
              title="DETAILS"
              onPress={() => this.openExplorer()}
            />
            <StandardButton
              color={Colors.linkButtonColor}
              title="HOME"
              onPress={() => {this.navigateToScreen(this.state.coinObj, "Home")}}
            />
          </View>
        </View>
      </React.Fragment>
    );
  }

  renderError = () => {
    clearTimeout(this.timeoutTimer);
    return (
      <React.Fragment>
        <View style={Styles.headerContainer}>
          <View style={Styles.centerContainer}>
            <Text style={{...Styles.mediumCentralPaddedHeader, ...Styles.errorText}}>Error</Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={{
            ...Styles.centerContainer,
            ...Styles.innerHeaderFooterContainer,
          }}
          style={Styles.secondaryBackground}
        >
        <View style={Styles.wideBlock}>
          <View style={Styles.infoTable}>
            <View style={Styles.infoTableRow}>
              <Text style={Styles.infoTableHeaderCell}>Error Type:</Text>
              <View style={Styles.infoTableCell}>
                <Text style={Styles.blockTextAlignRight}>
                  {this.state.err}
                </Text>
              </View>
            </View>
          </View>
          </View>
        </ScrollView>
        <View style={Styles.footerContainer}>
          <View style={Styles.fullWidthFlexCenterBlock}>
            <StandardButton
              color={Colors.linkButtonColor}
              title="HOME"
              onPress={() => {this.navigateToScreen(this.state.coinObj, "Home")}}
            />
          </View>
        </View>
      </React.Fragment>
    );
  }

  renderLoading = () => {
    return(
      <View style={Styles.focalCenter}>
        <ProgressBar progress={this.state.loadingProgress} width={200} color={Colors.linkButtonColor}/>
        <Text style={Styles.mediumCentralPaddedHeader}>{this.state.loadingMessage}</Text>
      </View>
    )
  }

  render() {
    return (
        this.state.loading ? this.renderLoading() : this.state.err ? this.renderError() : this.renderTransactionResult()
    );
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id

  return {
    balances: {
      public: state.ledger.balances[ELECTRUM][chainTicker],
      private: state.ledger.balances[DLIGHT][chainTicker],
      errors: {
        public: state.errors[API_GET_BALANCES][ELECTRUM][chainTicker],
        private: state.errors[API_GET_BALANCES][DLIGHT][chainTicker],
      }
    },
    //needsUpdate: state.ledger.needsUpdate,
    activeAccount: state.authentication.activeAccount,
    coinSettings: state.settings.coinSettings,
  }
};

export default connect(mapStateToProps)(SendResult);