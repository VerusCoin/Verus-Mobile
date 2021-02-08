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
import { send } from "../../../../utils/api/routers/send";
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
import { isNumber, satsToCoins, truncateDecimal } from '../../../../utils/math'
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
import { API_GET_FIATPRICE, API_GET_TRANSACTIONS, ELECTRUM, DLIGHT_PRIVATE, API_GET_BALANCES } from "../../../../utils/constants/intervalConstants"
import BigNumber from "bignumber.js";

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
        feeCurr: null,
        loadingProgress: 0.175,
        loadingMessage: "Preparing transaction..."
    };
  }

  async componentDidMount() {
    const coinObj = this.props.route.params.data.coinObj
    const activeUser = this.props.route.params.data.activeUser
    const toAddress = this.props.route.params.data.toAddress
    const fromAddress = this.props.route.params.data.fromAddress
    const amount = BigNumber(this.props.route.params.data.amount)
    const fee =
      coinObj.id === "BTC"
        ? { feePerByte: BigNumber(this.props.route.params.data.btcFee) }
        : isNumber(this.props.route.params.data.coinObj.fee)
        ? BigNumber(this.props.route.params.data.coinObj.fee)
        : null;
    const network = networks[coinObj.id.toLowerCase()] ? networks[coinObj.id.toLowerCase()] : networks['default']
    //const memo = this.props.route.params.data.memo
    
    this.timeoutTimer = setTimeout(() => {
      if (this.state.loading) {
        this.setState({err: 'timed out while trying to build transaction, this may be a networking error, try sending again', 
          loading: false})
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
      console.warn(`No coin settings data found for ${coinObj.id} in ConfirmSend, assuming highest verification level`)
      verifyMerkle = true
      verifyTxid = true
    }

    try {
      const res = await send(
        coinObj,
        activeUser,
        toAddress,
        amount,
        coinObj.dominant_channel ? coinObj.dominant_channel : ELECTRUM,
        { defaultFee: fee, network, verifyMerkle, verifyTxid }
      );

      if(res.err || !res) {
        this.setState({
          loading: false,
          err: res.result ? res.result : res.message
        });
        clearInterval(this.loadingInterval);
      } else {
        clearInterval(this.loadingInterval);

        this.setState({
          loading: false,
          txid: res.result.txid,
          toAddress: res.result.toAddress || toAddress,
          fromAddress: res.result.fromAddress || fromAddress,
          coinObj,
          network: res.result.params.network || network,
          fee:
            res.result.fee ||
            (coinObj.id === "BTC"
              ? satsToCoins(fee.feePerByte)
              : satsToCoins(fee)),
          feeCurr: res.result.feeCurr,
          amount: res.result.value != null ? res.result.value : amount,
        });

        Alert.alert("Success!", "Transaction sent. Your balance and transactions may take a few minutes to update.")
        
        this.props.dispatch(expireData(coinObj.id, API_GET_FIATPRICE))
        this.props.dispatch(expireData(coinObj.id, API_GET_TRANSACTIONS))
      }
    } catch (e) {
      this.setState({
        loading: false,
        err: e.message ? e.message : "Unknown error while building transaction, double check form data",
        coinObj
      });
      console.log(e)
    }
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
              {"Sent"}
            </Text>
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
                <Text style={Styles.infoTableHeaderCell}>Amount Sent:</Text>
                <Text style={Styles.infoTableCell}>
                  {truncateDecimal(
                    this.state.amount,
                    this.state.coinObj.decimals || 8
                  ) +
                    " " +
                    this.state.coinObj.id}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>
                  {this.state.coinObj.id === "BTC" ? "Fee/byte: " : "Fee: "}
                </Text>
                <Text style={Styles.infoTableCell}>
                  {this.state.fee +
                    " " +
                    (this.state.feeCurr != null
                      ? this.state.feeCurr
                      : this.state.coinObj.id)}
                </Text>
              </View>
              <View style={Styles.infoTableRow}>
                <Text style={Styles.infoTableHeaderCell}>ID:</Text>
                <View style={Styles.infoTableCell}>
                  <Text
                    style={{
                      ...Styles.blockTextAlignRight,
                      ...Styles.linkText,
                    }}
                    onPress={this.copyTxIDToClipboard}
                  >
                    {this.state.txid}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
        <View style={Styles.footerContainer}>
          <View
            style={
              explorers[this.state.coinObj.id]
                ? Styles.standardWidthSpaceBetweenBlock
                : Styles.standardWidthCenterBlock
            }
          >
            {explorers[this.state.coinObj.id] && (
              <StandardButton
                color={Colors.linkButtonColor}
                title="DETAILS"
                onPress={() => this.openExplorer()}
              />
            )}
            <StandardButton
              color={Colors.linkButtonColor}
              title="HOME"
              onPress={() => {
                this.navigateToScreen(this.state.coinObj, "Home");
              }}
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
  return {
    activeAccount: state.authentication.activeAccount,
    coinSettings: state.settings.coinSettings,
  }
};

export default connect(mapStateToProps)(SendResult);