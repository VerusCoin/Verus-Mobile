import React from "react";
import { Component } from "react"
import { connect } from 'react-redux'
import {
  View,
  Linking,
  Image,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  TextInput as NativeTextInput,
} from "react-native";
import { Text, TextInput, Portal, Button, HelperText, Dialog, RadioButton } from 'react-native-paper'
import { ethers } from "ethers";
import AnimatedActivityIndicator from "../../../../../../components/AnimatedActivityIndicator";
import AnimatedActivityIndicatorBox from "../../../../../../components/AnimatedActivityIndicatorBox";
import {  Button as ElementButton } from 'react-native-elements';
import Colors from "../../../../../../globals/colors";
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import { traditionalCryptoSend, TraditionalCryptoSendFee } from "../../../../../../actions/actionDispatchers";
import { setValuAccountStage } from "../../../../../../actions/actionCreators";
import { CLOSED_MODAL_SESSION } from "../../../../../../utils/constants/storeType";
import ValuProvider from '../../../../../../utils/services/ValuProvider';
import { updateKYCStage } from '../../../../../../actions/actions/services/dispatchers/valu/updates';
import { coinsList } from "../../../../../../utils/CoinData/CoinsList";
import { getRecommendedBTCFees } from "../../../../../../utils/api/channels/general/callCreators";
import { scientificToDecimal } from "../../../../../../utils/math"
import SubWalletSelectorModal from "../../../../../SubWalletSelect/SubWalletSelectorModal";
import Styles from '../../../../../../styles/index';
import BigNumber from "bignumber.js";
import { VALU_SERVICE_ID } from "../../../../../../utils/constants/services"
import {
GENERAL,
WYRE_SERVICE,
API_GET_BALANCES,
ELECTRUM
} from "../../../../../../utils/constants/intervalConstants";
import {
  CONVERSION_SEND_MODAL,
  WITHDRAW_SEND_MODAL,
  SEND_MODAL,
  SEND_MODAL_AMOUNT_FIELD,
  SEND_MODAL_FROM_CURRENCY_FIELD,
  SEND_MODAL_MEMO_FIELD,
  SEND_MODAL_TO_ADDRESS_FIELD,
  SEND_MODAL_TO_CURRENCY_FIELD,
  TRADITIONAL_CRYPTO_SEND_MODAL,
  SEND_MODAL_DESTINATION_FIELD,
  DEPOSIT_SEND_MODAL,
  SEND_MODAL_SOURCE_FIELD,
  SEND_MODAL_IDENTITY_TO_LINK_FIELD,
  LINK_IDENTITY_SEND_MODAL,
  SEND_MODAL_USER_TO_AUTHENTICATE,
  AUTHENTICATE_USER_SEND_MODAL,
  SEND_MODAL_SESSION_SUBMITTED
} from '../../../../../../utils/constants/sendModal';
import { extractDisplaySubWallets } from "../../../../../../utils/subwallet/extractSubWallets";
import { extractLedgerData, extractErrorData } from "../../../../../../utils/ledger/extractLedgerData";
import { createKYCRecipt } from "../ValuServicePlaid/KYCPayment"
import { openSessionSubwalletSendModal } from "../../../../../../actions/actions/sendModal/dispatchers/sendModal";

class KYCPayForService extends Component {
  constructor(props) {
    super(props);
    this.state = {
      totalFiatBalance: '0.00',
      totalCryptoBalances: {},
      loading: true,
      listItemHeights: {},
      verusID: "",
      rAddress: "",
      addresses: [null],
      showCryptoPicker: false,
      crypto: "",
      cryptoAmount: "",
      fiveDollarCrypto: null,
      spinnermessage:"",
      coinObj: null,
      subWalletSelectorOpen: false,
      subWalletSelectorCoin: null,
      id: null,
      errors: {
        verusID: ""
      },
    };
  }

  componentDidMount() {
    this.fiveDollarsInCrypto(this.props);
    const totalBalances = this.getTotalBalances(this.props);
    this.setState({
      addresses: this.props.addresses, loading: false,
      totalCryptoBalances: totalBalances.crypto,
    });
 
  }
  
  componentDidUpdate(lastProps) {
    if (this.props.balances !== lastProps.balances) {
      const totalBalances = this.getTotalBalances(this.props);

      this.setState({
        totalFiatBalance: totalBalances.fiat,
        totalCryptoBalances: totalBalances.crypto,
      });
    }
    if (this.props.session !== lastProps.session && this.state?.id === this.props.session.id ) {
      console.log("updated", this.props.session);
      if (this.props.session.modalStatus == CLOSED_MODAL_SESSION && this.props.session.txstage == SEND_MODAL_SESSION_SUBMITTED) {
        updateKYCStage(4).then(() =>
        this.props.dispatch(setValuAccountStage(4))).then(
        this.props.navigation.navigate("Service", { VALU_SERVICE_ID }));

      }
    }
  }

  openMenu = () => { this.setState({ showCryptoPicker: true }); }

  closeMenu = () => { 

    this.setState({ showCryptoPicker: false }) 
  
  };

  setCrypto = (choice) => {
   
     let cryptoToPay = this.state.fiveDollarCrypto[choice]
    this.setState({ crypto: choice, cryptoAmount: cryptoToPay })
  
  };

  getTotalBalances = props => {
    let _totalFiatBalance = BigNumber(0);
    let coinBalances = {};
    const balances = props.balances;
    const {displayCurrency, activeCoinsForUser, allSubWallets} = props;

    activeCoinsForUser.map(coinObj => {
      const key = coinObj.id;
      coinBalances[coinObj.id] = BigNumber('0');
     
      allSubWallets[coinObj.id].map(wallet => {
   
        if (
          balances[coinObj.id] != null &&
          balances[coinObj.id][wallet.id] != null
        ) {
          coinBalances[coinObj.id] = coinBalances[coinObj.id].plus(
            balances[key] &&
              balances[key][wallet.id] &&
              balances[key][wallet.id].total != null
              ? BigNumber(balances[key][wallet.id].total)
              : BigNumber('0'),
          );
        }
      });
      coinBalances[coinObj.id] = coinObj.id === "ETH" ? coinBalances[coinObj.id].toFixed(6) : parseFloat(coinBalances[coinObj.id]);
      const rate = this.getRate(key, displayCurrency);

      if (rate != null) {
        const price = BigNumber(rate);


      }
    });

    return {
      crypto: coinBalances,
    };
  };

  async fiveDollarsInCrypto(props) {
    let _allFiveDollarCryptos = {};
    const account = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=verus-coin,bitcoin,ethereum&vs_currencies=usd")
    const data = await account.json();

    const rates =  [{"VRSCTEST": data["verus-coin"].usd}, {"ETH": data["ethereum"].usd}, {"BTC": data["bitcoin"].usd }];

    rates.map(coinObj => {
      const key = Object.keys(coinObj)[0]
      const rate = coinObj[key]

      if (rate != null) {
        const price = BigNumber(rate);
        _allFiveDollarCryptos[key] = parseFloat(BigNumber(5).dividedBy(price).toFixed(6));
      }
    });
    this.setState({fiveDollarCrypto: _allFiveDollarCryptos});
  }

  getRate = (coinId, displayCurrency) => {
    return this.props.rates[WYRE_SERVICE] &&
      this.props.rates[WYRE_SERVICE][coinId] &&
      this.props.rates[WYRE_SERVICE][coinId][displayCurrency]
      ? this.props.rates[WYRE_SERVICE][coinId][displayCurrency]
      : this.props.rates[GENERAL] &&
        this.props.rates[GENERAL][coinId] &&
        this.props.rates[GENERAL][coinId][displayCurrency]
      ? this.props.rates[GENERAL][coinId][displayCurrency]
      : null;
  };

  openSendModal = subWallet => {
    if (subWallet != null) {
      this.setState(
        {
          subWalletSelectorOpen: false,
          subWalletSelectorCoin: null,
        },
        () => {
          const id = openSessionSubwalletSendModal(this.state.coinObj, subWallet, {
            [SEND_MODAL_TO_ADDRESS_FIELD]: this.state.address,
            [SEND_MODAL_AMOUNT_FIELD]: this.state.cryptoAmount.toString(),
            [SEND_MODAL_MEMO_FIELD]: '',
          });
          this.setState({id: id})
        },
      );
    } else {
      this.setState(
        {
          subWalletSelectorCoin: this.state.crypto,
        },
        () => {
          const subWallets =
            this.props.allSubWallets[this.state.crypto];
          console.log("subby", this.props.allSubWallets, this.state.crypto )
          if (subWallets.length == 1) {
            this.openSendModal(subWallets[0]);
          } else {
            this.setState({
              subWalletSelectorOpen: true,
            });
          }
        },
        );
      }
    };
    
    
    async initiateCryptoPayment() {
      try {
        
        await this.setState({ loading: true, spinnermessage: `Creating payment address for ${this.state.crypto} payment`})
        
        
        const coinObj = coinsList[this.state.crypto.toLowerCase()]
        let cryptoToPay = this.state.cryptoAmount;

        console.log(`${this.state.crypto} to pay`, cryptoToPay)

        const payRef = await createKYCRecipt({cryptoType: this.state.crypto, amount: cryptoToPay}) 
        console.log("payref recieved", payRef)
        if(payRef.success) {

          console.log(`Received ${this.state.crypto} payment address: ${payRef.data.cryptoAddress + "\n\n"}` +
          `Sending ${cryptoToPay} ${this.state.crypto} ${"\n\n"}Please wait for payment to be processed.`)

          this.setState({spinnermessage: `Received ${this.state.crypto} payment address: ${payRef.data.cryptoAddress + "\n\n"}` +
                          `Sending ${cryptoToPay} ${this.state.crypto} ${"\n\n"}Please wait for payment to be processed.`, 
                          address: payRef.data.cryptoAddress, coinObj : coinObj, loading: false},
                          async () => {
                            this.openSendModal();
                          });
                         
         return;
      } else {
        throw new Error(payRef.error)
      }
    
    } catch (e) {
  
      await createAlert("Error", `Failed to make your Identity. ${e.message}.`, [
        {
          text: "Try again",
          onPress: async () => {
            resolveAlert(true);
          },
        },
        { text: "Ok", onPress: () => resolveAlert(false) },
      ]);
      this.setState({ loading: false });
      
      throw e
    }
  }

  validateFormData() {
    // Handle pre validation before submission
    const _verusID = this.state.crypto;
    const errorsLoc = {
      crypto: null,
    }

    var _errors = null;

    if (!_verusID) {
      errorsLoc.crypto = "Please Choose a Crypto Currency";
      _errors = true;
    } 
    this.setState({ errors: errorsLoc });
    return (_errors)
  }

  tryCryptoPay = () =>{

    if (!this.validateFormData())
      this.initiateCryptoPayment()    
  }

  render() {

    return (
      this.state.loading ? (
        <View
        style={{
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
      >
        <AnimatedActivityIndicatorBox />
        <Text style={{ textAlign: "center", width: "75%", marginBottom: 200}}>
        {`${this.state.spinnermessage}`}
       </Text>
      </View>
      ) : 
      
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View
          style={{
            backgroundColor: "white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            alignItems: "center",
          }}
        >
          <Portal>
          {this.state.subWalletSelectorOpen && (
            <SubWalletSelectorModal
              visible={this.state.subWalletSelectorOpen}
              chainTicker={this.state.subWalletSelectorCoin}
              cancel={() =>
                this.setState({
                  subWalletSelectorOpen: false,
                  subWalletSelectorCoin: null,
                })
              }
              animationType="slide"
              subWallets={
                this.state.subWalletSelectorCoin == null
                  ? []
                  : this.props.allSubWallets[this.state.subWalletSelectorCoin]
              }
              onSelect={wallet => this.openSendModal(wallet)}
            />
          )}
        </Portal>
          <Text style={{ textAlign: "center", width: "75%", marginBottom: 20 }}>
            {"Please choose a crypto currency to pay for the equivalent of $5 USD for your KYC Attestation"}
          </Text>
          <View 
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              width: "75%",
            }}
          >
            <View>
              <View pointerEvents="box-none">
                <TouchableOpacity onPress={this.openMenu}>
                    <TextInput
                      returnKeyType="done"
                      label={"Choose crypto"}
                      value={this.state.crypto ? ("You will pay: ~" + this.state.crypto + " "+ this.state?.cryptoAmount ) : ""}
                      mode={"outlined"}
                      onChangeText={(text) => { }}
                      autoCapitalize={"none"}
                      editable={false}
                      pointerEvents="none"
                      error={this.state.errors.crypto}
                    />
                    <HelperText type="error" visible={this.state.errors.crypto}>{this.state.errors.crypto}</HelperText>
                  </TouchableOpacity>
              </View>
            </View>
            <Portal>
              <Dialog visible={this.state.showCryptoPicker} onDismiss={this.closeMenu}>
                <Dialog.Title>Select $5 USD of Crypto</Dialog.Title>
                <Dialog.Content>
                  <RadioButton.Group onValueChange={newValue => this.setCrypto(newValue)} value={this.state.crypto}>

                      <RadioButton.Item value="VRSCTEST" label={`VRSCTEST: ${this.state?.totalCryptoBalances.VRSCTEST || "0"}${"\n"}require: ~VRSCTEST: ${this.state?.fiveDollarCrypto?.VRSCTEST}`} />
                      <RadioButton.Item value="BTC" label={`BTC: ${this.state?.totalCryptoBalances.BTC || "0"}${"\n"}require: ~BTC: ${this.state?.fiveDollarCrypto?.BTC}`}/>
                   
                      <RadioButton.Item value="ETH" label={`ETH: ${this.state?.totalCryptoBalances.ETH || "0"}${"\n"}require: ~ETH: ${this.state?.fiveDollarCrypto?.ETH}`}/>
                   
                    {/*  <RadioButton.Item value="USDC" label={`USDC: ${this.state?.totalCryptoBalances.USDC || "0"}${"\n"}require: ~USDC: ${this.state?.fiveDollarCrypto?.USDC}`}/>*/}

                  </RadioButton.Group>
                </Dialog.Content>
                <Dialog.Actions>
                  <Button onPress={this.closeMenu}>Done</Button>
                </Dialog.Actions>
              </Dialog>
            </Portal>
          </View>
          <ElementButton
                titleStyle={{...Styles.whiteText, fontWeight: 'bold'}}
                buttonStyle={{backgroundColor:Colors.primaryColor, paddingTop: 10, paddingBottom: 10, paddingRight: 15, paddingLeft: 15,  borderRadius: 20, marginTop:40} }
                title="PAY"
                onPress={this.tryCryptoPay}
                disabled={this.state.crypto.length == 0}
              />

        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {

 // console.log("state.sendSession",state.sendSession)

  return {
    activeAccount: state.authentication.activeAccount,
    rates: state.ledger.rates,
    displayCurrency:
    state.settings.generalWalletSettings.displayCurrency || USD,
    allSubWallets: extractDisplaySubWallets(state),
    activeCoinsForUser: state.coins.activeCoinsForUser,
    balances: extractLedgerData(state, 'balances', API_GET_BALANCES),
    loading: false,
    accountId: state.channelStore_valu_service.accountId,
    session: state.sendSession
  }
};

export default connect(mapStateToProps)(KYCPayForService);