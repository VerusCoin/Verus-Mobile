/*
  This component represents the custom coin form a user must fill
  out to add a custom coin manually.
*/ 

import React, { Component } from "react";
import StandardButton from "../../../components/StandardButton";
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  Alert
} from "react-native";
import { CommonActions } from '@react-navigation/native';
import { Input, Icon, CheckBox } from 'react-native-elements'
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import { hasSpecialCharacters, isElectrumUrl } from '../../../utils/stringUtils'
import { isNumber, coinsToSats } from '../../../utils/math'
import { 
  DEFAULT_FEE_DESC, 
  ELECTRUM_SERVERS_DESC,
  ADD_COIN_CHECK,
  REQUIRED_FIELD,
  COIN_ALREADY_ACTIVE,
  TICKER_RESERVED,
  NO_SPECIAL_CHARACTERS_NAME,
  INVALID_AMOUNT,
  DEFAULT_FEE_HIGH_WARNING,
  ENTER_AMOUNT_GREATER_THAN_0,
  BAD_SERVER_INPUT_FORMAT,
  ELECTRUM_DISCLAIMER_UNREALIZED,
  ELECTRUM_DISCLAIMER,
  POSSIBLY_UNSUPPORTED_CHAIN
} from '../../../utils/constants/constants'
import extraCoins from '../../../utils/extraCoins/extraCoins'
import { createCoinObj, namesList } from '../../../utils/CoinData/CoinData'
import { networks } from 'bitgo-utxo-lib';
import { isKomodoCoin } from 'agama-wallet-lib/src/coin-helpers';
import Styles from '../../../styles/index'
import Colors from "../../../globals/colors";

class CustomChainForm extends Component {
  constructor(props) {
    super(props);
    if (this.props.overrideState) {
      this.state = {
        ticker: '',
        loadingTicker: false,
        name: '',
        loadingName: false,
        description: '',
        defaultFee: 0.0001,
        servers: ['', ''],
        serverDisclaimer: false,
        isPbaasChain: false,
        errors: {
          ticker: null,
          name: null,
          description: null,
          defaultFee: null,
          servers: [null, null],
          serverDisclaimer: null,
          isPbaasChain: null
        },
        ...this.props.overrideState
      };
    } else {
      this.state = {
        ticker: '',
        loadingTicker: false,
        name: '',
        loadingName: false,
        description: '',
        defaultFee: 0.0001,
        servers: ['', ''],
        serverDisclaimer: false,
        errors: {
          ticker: null,
          name: null,
          description: null,
          defaultFee: null,
          servers: [null, null],
          serverDisclaimer: null,
          isPbaasChain: null
        }
      };
    }
    
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  handleError = (error, field, index) => {
    let _errors = this.state.errors
    isNumber(index) ? _errors[field][index] = error : _errors[field] = error

    this.setState({errors: _errors})
  }

  handleWarning = (warning) => {
    let _warnings = this.state.warnings
    _warnings.push(warning)

    this.setState({warnings: _warnings})
  }

  cancel = () => {
    if (this.props.isModal) this.props.closeModal()
  }

  submitForm = () => {
    let navigation = this.props.navigation 

    let coinData = createCoinObj(
      this.state.ticker,
      this.state.name, 
      this.state.description, 
      coinsToSats(this.state.defaultFee),
      this.state.servers,
      this.props.activeAccount.id)

    if (this.props.isModal) {
      this.resetToScreen("CoinDetails", coinData)
    } else {
      navigation.navigate("CoinDetails", {
        data: coinData
      });
    }

    if (this.props.isModal) this.props.closeModal()
  }

  resetToScreen = (route, data) => {
    const resetAction = CommonActions.reset({
      index: 1, // <-- currect active route from actions array
      routes: [
        { name: "Home" },
        { name: route, params: {data: data} },
      ],
    })

    this.props.navigation.dispatch(resetAction)
  }

  /**
   * Checks if a ticker is included in the default coins that
   * ship with Verus Mobile
   * (not case sensitive)
   * 
   * @param {String} ticker The ticker symbol to check
   */
  isReservedTicker = (ticker) => {
    return namesList.includes(ticker.toUpperCase())
  }

  /**
   * Checks if a ticker is included in the currently active coins
   * (not case sensitive)
   * 
   * @param {String} ticker The ticker symbol to check
   */
  coinInUse = (ticker) => {
    const _coins = this.props.activeCoinsForUser
    
    for (let i = 0; i < _coins.length; i++) {
      if (_coins[i].id === ticker.toUpperCase()) {
        return true
      }
    }

    return false
  }

  canAddCoin = () => {
    let alertText = 
                ('Please take the time to double check the following things regarding your custom coin ' + 
                'information. If you are sure everything is correct, press continue.' + 
                "\n")

    for (let i = 0; i < this.state.warnings.length; i++) {
      alertText += "\n" + this.state.warnings[i] + "\n"
    }

    return AlertAsync(
      'Warning',
      alertText,
      [
        {
          text: 'Take me back',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Continue', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  updateTicker = (ticker) => {
    this.setState({ticker: ticker, loadingName: true}, () => {
      this.setState({name: extraCoins[ticker] ? extraCoins[ticker] : '', loadingName: false})
    })
  }

  updateServer = (server, index) => {
    let _servers = this.state.servers.slice()
    _servers[index] = server
    this.setState({servers: _servers})
  }

  addServer = () => {
    let _servers = this.state.servers.slice()
    _servers.push('')

    let _serverErrors = this.state.errors.servers.slice()
    _serverErrors.push(null)

    let _errors = this.state.errors
    _errors[_servers] = _serverErrors

    this.setState({servers: _servers})
  }

  removeServer = (index) => {
    let _servers = this.state.servers.slice()
    _servers.splice(index, 1)

    let _serverErrors = this.state.errors.servers.slice()
    _serverErrors.splice(index, 1)

    let _errors = this.state.errors
    _errors[_servers] = _serverErrors

    this.setState({servers: _servers})
  }

  validateFormData = () => {
    let serverErrors = []
    this.state.servers.forEach(() => {
      serverErrors.push(null)
    })

    this.setState({
      errors: {
        ticker: null,
        name: null,
        description: null,
        defaultFee: null,
        servers: serverErrors,
        serverDisclaimer: null,
        isPbaasChain: null
      },
      warnings: []
    }, () => {
      const _ticker = this.state.ticker
      const _name = this.state.name
      //TODO: Maybe add description errors
      const _description = this.state.description
      const _defaultFee = this.state.defaultFee
      const _servers = this.state.servers
      const _serverDisclaimer = this.state.serverDisclaimer
      const _isPbaasChain = this.state.isPbaasChain
      let _errors = false;
      let _warnings = false;

      if (!_ticker || _ticker.length < 1) {
        this.handleError(REQUIRED_FIELD, "ticker")
        _errors = true
      } else if (this.coinInUse(_ticker)) {
        this.handleError(COIN_ALREADY_ACTIVE, "ticker")
        _errors = true
      } else if (this.isReservedTicker(_ticker)) {
        this.handleError(TICKER_RESERVED, "ticker")
        _errors = true
      }

      if (!_name || _name.length < 1) {
        this.handleError(REQUIRED_FIELD, "name")
        _errors = true
      } else if (!hasSpecialCharacters(_name)) {
        this.handleError(NO_SPECIAL_CHARACTERS_NAME, "name")
        _errors = true
      }

      if (!(_defaultFee.toString()) || _defaultFee.toString().length < 1) {
        this.handleError(REQUIRED_FIELD, "defaultFee")
        _errors = true
      } else if (!(isNumber(_defaultFee))) {
        this.handleError(INVALID_AMOUNT, "defaultFee")
        _errors = true
      } else if (Number(_defaultFee) <= 0) {
        this.handleError(ENTER_AMOUNT_GREATER_THAN_0, "defaultFee")
        _errors = true
      } else if (_defaultFee >= 1) {
        this.handleWarning(DEFAULT_FEE_HIGH_WARNING)
        _warnings = true
      }

      _servers.forEach((server, index) => {
        if (!server || server.length < 1) {
          this.handleError(REQUIRED_FIELD, "servers", index)
          _errors = true
        } else if (!isElectrumUrl(server)) {
          this.handleError(BAD_SERVER_INPUT_FORMAT, "servers", index)
          _errors = true
        } else {
          serverSplit = server.split(':')

          if (serverSplit[2] !== 'ssl' && serverSplit[2] !== 'tcp') {
            this.handleError(BAD_SERVER_INPUT_FORMAT, "servers", index)
            _errors = true
          }
        }
      })

      if (!_serverDisclaimer && !_errors) {
        Alert.alert("Wait!", "Please confirm you are aware of the risks of using custom electrum servers.")
        _errors = true
      }

      if (!_errors && !networks.hasOwnProperty(_ticker) && !isKomodoCoin(_ticker) && !_isPbaasChain) {
        this.handleWarning(POSSIBLY_UNSUPPORTED_CHAIN)
        _warnings = true
      }

      if (!_errors && !_warnings) {
        this.submitForm()
      } else if (!_errors) {
        this.canAddCoin()
        .then((res) => {
          if (res) {
            this.submitForm()
          } 
        })
        .catch((e) => {
          console.warn(e)
        })
      } 
    });
  }

  //TODO: Hook up UI to new state and data, and fix titles to match Custom Chain form screen
  render() {
    return (
      <View style={Styles.defaultRoot}>
        <ScrollView style={Styles.fullWidth}
          contentContainerStyle={Styles.innerHeaderFooterContainerCentered}>
          {this.props.isModal &&
          <View style={Styles.headerContainer}>
            <Text style={Styles.largeCentralPaddedHeader}>
              {"Confirm Coin Data"}
            </Text>
          </View>}
          <View style={Styles.wideBlock}>
            <Input 
              label="Enter a coin ticker:"
              labelStyle={Styles.formInputLabel}
              containerStyle={Styles.fullWidthBlock}
              inputStyle={Styles.inputTextDefaultStyle}
              onChangeText={(text) => this.updateTicker(text)}
              value={this.state.ticker}
              autoCapitalize={"none"}
              autoCorrect={false}
              shake={this.state.errors.ticker}
              errorMessage={
                this.state.errors.ticker ? 
                  this.state.errors.ticker
                  :
                  null
              }
            />
          </View>
          <View style={Styles.wideBlock}>
            <Input 
              label="Enter a coin name:"
              labelStyle={Styles.formInputLabel}
              containerStyle={Styles.fullWidthBlock}
              inputStyle={Styles.inputTextDefaultStyle}
              onChangeText={(text) => this.setState({name: text})}
              value={this.state.name}
              autoCapitalize={"none"}
              autoCorrect={false}
              errorMessage={
                this.state.errors.name ? 
                  this.state.errors.name
                  :
                  null
              }
            />
          </View>
          <View style={Styles.wideBlock}>
            <Input 
              label="Enter a short description (optional):"
              labelStyle={Styles.formInputLabel}
              containerStyle={Styles.fullWidthBlock}
              inputStyle={Styles.inputTextDefaultStyle}
              onChangeText={(text) => this.setState({description: text})}
              value={this.state.description}
              autoCapitalize={"none"}
              autoCorrect={false}
              shake={this.state.errors.description}
              errorMessage= {
                this.state.errors.description ? 
                  this.state.errors.description
                  :
                  null
              }
            />
          </View>
          <View style={Styles.wideBlock}>
            <Input 
              label = {
                <View style={Styles.startRow}>
                  <Text style={Styles.mediumFormInputLabel}>
                    { 'Enter the ' }
                  </Text>
                  <Text
                    style={Styles.mediumInlineLink}
                    onPress={() => {Alert.alert("Default Fee", DEFAULT_FEE_DESC)}}
                  >
                    {'default fee:'}
                  </Text>
                </View>
              }
              onChangeText={(text) => this.setState({defaultFee: text})}
              onSubmitEditing={Keyboard.dismiss}
              value={this.state.defaultFee.toString()}
              keyboardType={"decimal-pad"}
              autoCapitalize='words'
              errorMessage={
                this.state.errors.defaultFee ? 
                  this.state.errors.defaultFee
                  :
                  null
              }
            />
          </View>
          <View style={Styles.wideBlock}>
            <View style={Styles.startRow}>
              <Text style={Styles.mediumFormInputLabelLeftPadded}>
                {`Enter `}
              </Text>
              <Text
                style={Styles.mediumInlineLink}
                onPress={() => {Alert.alert("Electrum Servers", ELECTRUM_SERVERS_DESC)}}
              >
                {'electrum servers:'}
              </Text>
            </View>
            {this.state.servers.map((server, index) => {
              return (
                <View key={index} style={Styles.fullWidthAlignCenterRowBlock}>
                    <Input 
                      onChangeText={(text) => this.updateServer(text, index)}
                      onSubmitEditing={() => { Keyboard.dismiss() }}
                      value={this.state.servers[index]}
                      autoCapitalize={"none"}
                      containerStyle={Styles.flex}
                      errorMessage={
                        this.state.errors.servers[index] ? 
                          this.state.errors.servers[index]
                          :
                          null
                      }
                    />
                    {index > 1 &&
                    <TouchableOpacity 
                      onPress={() => this.removeServer(index)}
                      style={Styles.inlineXButton}>
                      <Icon 
                        name="close" 
                        size={22} 
                        color="rgba(206,68,70,1)"
                      />
                    </TouchableOpacity>}
                </View>
              )
            })}
            <TouchableOpacity onPress={this.addServer}>
              <Text style={{...Styles.mediumFormInputLabelLeftPadded, ...Styles.mediumInlineLink}}>
                {'+ Add Server'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={Styles.wideBlock}>
            <CheckBox
              title="This is a PBaaS chain"
              checked={this.state.isPbaasChain}
              textStyle={Styles.defaultText}
              onPress={() => this.setState({isPbaasChain: !this.state.isPbaasChain})}
            />
            <CheckBox
              title={ELECTRUM_DISCLAIMER}
              checked={this.state.serverDisclaimer}
              textStyle={Styles.defaultText}
              onPress={() => this.setState({serverDisclaimer: !this.state.serverDisclaimer})}
            />
          </View>
          <View style={Styles.footerContainer}>
            <View style={
              this.props.isModal
                ? Styles.standardWidthSpaceBetweenBlock
                : Styles.fullWidthFlexCenterBlock
            }>
              {this.props.isModal &&
                <StandardButton 
                  color={Colors.warningButtonColor}
                  title="CANCEL" 
                  onPress={this.cancel}
                />
              }
              <StandardButton 
                color={Colors.linkButtonColor}
                title="ADD COIN" 
                onPress={this._handleSubmit}
              />
            </View>
          </View>
        </ScrollView>
        </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(CustomChainForm);