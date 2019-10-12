/*
  This component handles CustomChainScan, the ability
  to add custom PBaaS and Komodo Asset chains to 
  the Verus Mobile wallet. It scans a JSON file from a 
  QR code, verifies it, and it all is well, passes it
  to CustomChainForm so the user can double check and/or
  edit their data.
*/

import React, { Component } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Modal
} from "react-native";
import QRCodeScanner from 'react-native-qrcode-scanner';
import { isJson } from '../../../utils/objectManip'
import { NavigationActions } from 'react-navigation';
import { connect } from 'react-redux';
import { namesList } from '../../../utils/CoinData'
import {
  FORMAT_UNKNOWN,
  INCOMPLETE_CHAIN_QR
} from '../../../utils/constants'
import CustomChainForm from '../CustomChainForm/CustomChainForm'
import styles from './CustomChainScan.styles'

class CustomChainScan extends Component {
  constructor(props) {
    super(props)
    this.state = {
      scanComplete: false,
      modalVisible: false
    };

    this.chainFormState = {}
    this.handleChainQR = this.handleChainQR.bind(this)
  }

  static navigationOptions = ({ navigation }) => {
    return {
      title: typeof(navigation.state.params)==='undefined' || 
      typeof(navigation.state.params.title) === 'undefined' ? 
      'undefined': navigation.state.params.title,
    };
  };

  onSuccess(e) {
    console.log(e)
    let result = e.data

    this.setState({scanComplete: true}, () => {
      if(isJson(result)) {
        let resultParsed = JSON.parse(result)
        console.log(resultParsed)
  
        if (resultParsed.chainQR) {
          this.handleChainQR(resultParsed.chainQR)
        } else if (resultParsed.ticker && resultParsed.name && resultParsed.description && resultParsed.defaultFee && resultParsed.servers) {
          this.handleChainQR({
            ticker: resultParsed.ticker,
            name: resultParsed.name,
            description: resultParsed.description,
            defaultFee: resultParsed.defaultFee,
            servers: resultParsed.servers,
            isPbaasChain: resultParsed.isPbaasChain ? true : false
          })
        } else {
          this.errorHandler(FORMAT_UNKNOWN)
        }
      } else {
        this.errorHandler(FORMAT_UNKNOWN)
      }
    })
  }

  errorHandler = (error) => {
    Alert.alert("Error", error);
    this.props.navigation.dispatch(NavigationActions.back())
  }

  cancelHandler = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  handleChainQR = (chainQR) => {
    const ticker = chainQR.ticker
    const name = chainQR.name
    const description = chainQR.description
    const defaultFee = chainQR.defaultFee
    const servers = chainQR.servers
    const isPbaasChain = chainQR.isPbaasChain ? true : false

    if (ticker != null && name != null && description != null && defaultFee != null && servers != null) {
      chainFormState = {ticker, name, description, defaultFee, servers, isPbaasChain}
      if (this.checkChainFormState(chainFormState)) {
        this.chainFormState = chainFormState
        if (!this.coinExistsInWallet(ticker)) {
          this.toggleChainForm()
        } else {
          this.errorHandler(ticker + ' ' + COIN_TICKER_ALREADY_EXISTS)
        }
      } else {
        this.errorHandler(INCOMPLETE_CHAIN_QR)
      }
    } else {
      this.errorHandler(INCOMPLETE_CHAIN_QR)
    }
  }

  checkChainFormState = (chainFormState) => {
    return (
      typeof chainFormState.ticker === 'string' &&
      typeof chainFormState.name === 'string' &&
      typeof chainFormState.description === 'string' &&
      !isNaN(Number(chainFormState.defaultFee)) &&
      typeof chainFormState.isPbaasChain === 'boolean' &&
      (Array.isArray(chainFormState.servers) && 
        chainFormState.servers.every((server => {return typeof server === 'string'})) &&
        chainFormState.servers.length <= 100 &&
        chainFormState.servers.length >= 2)
    )
  }

  toggleChainForm = () => {
    this.setState({modalVisible: !this.state.modalVisible})
  }

  coinExistsInWallet = (coinTicker) => {
    let index = 0;

    while (index < namesList.length && namesList[index] !== coinTicker) {
      index++;
    }

    if (index < namesList.length) {
      return true
    } else {
      return false
    }
  }

  render() {
    return (
      <View style={styles.root}>
        <Modal 
          visible={this.state.modalVisible}
          animationType={"slide"}>
          {this.state.modalVisible && 
            <CustomChainForm 
              navigation={this.props.navigation} 
              isModal={true} 
              overrideState={this.chainFormState}
              closeModal={this.toggleChainForm}
            />
          }
        </Modal>
        {!this.state.modalVisible && 
          <QRCodeScanner
            onRead={this.onSuccess.bind(this)}
            showMarker={true}
            captureAudio={false}
            cameraStyle={styles.QRCamera}
          />
        }
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoinList: state.coins.activeCoinList,
  }
};

export default connect(mapStateToProps)(CustomChainScan);