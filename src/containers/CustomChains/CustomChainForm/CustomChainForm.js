/*
  This component represents the custom coin form a user must fill
  out to add a custom coin manually.
*/ 

import React, { Component } from "react";
import Button1 from "../../../symbols/button1";
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
import { NavigationActions } from 'react-navigation';
import { FormLabel, FormInput, FormValidationMessage, Icon } from 'react-native-elements'
import { connect } from 'react-redux';
import AlertAsync from "react-native-alert-async";
import { namesList } from '../../../utils/CoinData'
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
} from '../../../utils/constants'
import extraCoins from '../../../utils/extraCoins/extraCoins'
import { createCoinObj } from '../../../utils/CoinData'
import { networks } from 'bitgo-utxo-lib';
import { isKomodoCoin } from 'agama-wallet-lib/src/coin-helpers';
import styles from './CustomChainForm.styles'

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
    const resetAction = NavigationActions.reset({
      index: 1, // <-- currect active route from actions array
      actions: [
        NavigationActions.navigate({ routeName: "Home" }),
        NavigationActions.navigate({ routeName: route, params: {data: data} }),
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

      if (!_serverDisclaimer) {
        this.handleError(ELECTRUM_DISCLAIMER_UNREALIZED, "serverDisclaimer")
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
      <TouchableWithoutFeedback onPress={() => { Keyboard.dismiss() }} accessible={false}>
        <ScrollView 
          style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
          {this.props.isModal &&
          <Text style={styles.mainLabel}>
            {"Confirm Coin Data"}
          </Text>}
          <View style={({...styles.valueContainer, marginTop: 15})}>
            <FormLabel labelStyle={styles.formLabel}>
              {'Enter a coin ticker:'}
            </FormLabel>
            <FormInput 
              underlineColorAndroid="#86939d"
              onChangeText={(text) => this.updateTicker(text)}
              value={this.state.ticker}
              autoCapitalize={"none"}
              autoCorrect={false}
              shake={this.state.errors.ticker}
              inputStyle={styles.formInput}
            />
            {this.state.errors.ticker &&
            <FormValidationMessage>
            {
              this.state.errors.ticker ? 
                this.state.errors.ticker
                :
                null
            }
            </FormValidationMessage>}
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
              {'Enter a coin name:'}
            </FormLabel>
            <FormInput 
              underlineColorAndroid="#86939d"
              onChangeText={(text) => this.setState({name: text})}
              value={this.state.name}
              autoCapitalize={"none"}
              autoCorrect={false}
              shake={this.state.errors.name}
              inputStyle={styles.formInput}
            />
           {this.state.errors.name &&
           <FormValidationMessage>
            {
              this.state.errors.name ? 
                this.state.errors.name
                :
                null
            }
            </FormValidationMessage>}
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
              {'Enter a short description (optional):'}
            </FormLabel>
            <FormInput 
              underlineColorAndroid="#86939d"
              onChangeText={(text) => this.setState({description: text})}
              value={this.state.description}
              autoCapitalize={"none"}
              autoCorrect={false}
              shake={this.state.errors.description}
              inputStyle={styles.formInput}
            />
            {this.state.errors.description &&
            <FormValidationMessage>
            {
              this.state.errors.description ? 
                this.state.errors.description
                :
                null
            }
            </FormValidationMessage>}
          </View>
          <View style={styles.valueContainer}>
            <View style={styles.labelContainer}>
              <FormLabel labelStyle={styles.formLabel}>
                { 'Enter the default fee:' }
              </FormLabel>
              <TouchableOpacity onPress={() => {Alert.alert("Default Fee", DEFAULT_FEE_DESC)}}>
                <FormLabel labelStyle={styles.infoBtn}>
                  {'?'}
                </FormLabel>
              </TouchableOpacity>
            </View>
            <FormInput 
              underlineColorAndroid="#86939d"
              onChangeText={(text) => this.setState({defaultFee: text})}
              onSubmitEditing={Keyboard.dismiss}
              value={this.state.defaultFee.toString()}
              shake={this.state.errors.defaultFee}
              inputStyle={styles.formInput}
              keyboardType={"decimal-pad"}
              autoCapitalize='words'
            />
            {this.state.errors.defaultFee &&
            <FormValidationMessage>
            {
              this.state.errors.defaultFee ? 
                this.state.errors.defaultFee
                :
                null
            }
            </FormValidationMessage>}
          </View>
          <View style={styles.valueContainer}>
            <View style={styles.labelContainer}>
              <FormLabel labelStyle={styles.formLabel}>
                {`Enter ${this.state.servers.length > 2 ? this.state.servers.length : 'a minimum of two'} electrum servers:`}
              </FormLabel>
              <TouchableOpacity onPress={() => {Alert.alert("Electrum Servers", ELECTRUM_SERVERS_DESC)}}>
                <FormLabel labelStyle={styles.infoBtn}>
                  {'?'}
                </FormLabel>
              </TouchableOpacity>
            </View>
            {this.state.servers.map((server, index) => {
              return (
                <View key={index} style={styles.serversContainer}>
                  <View style={styles.serverItemContainer}>
                    <FormInput 
                      underlineColorAndroid="#86939d"
                      onChangeText={(text) => this.updateServer(text, index)}
                      onSubmitEditing={() => { Keyboard.dismiss() }}
                      value={this.state.servers[index]}
                      shake={this.state.errors.servers[index]}
                      autoCapitalize={"none"}
                      inputStyle={styles.serverInput}
                      containerStyle={styles.serverInputContainer}
                    />
                    {index > 1 &&
                    <TouchableOpacity 
                      onPress={() => this.removeServer(index)}
                      style={styles.removeServerBtn}>
                      <Icon 
                        name="close" 
                        size={22} 
                        color="rgba(206,68,70,1)"
                      />
                    </TouchableOpacity>}
                  </View>
                  {this.state.errors.servers[index] &&
                  <FormValidationMessage>
                  {
                    this.state.errors.servers[index] ? 
                      this.state.errors.servers[index]
                      :
                      null
                  }
                  </FormValidationMessage>}
                </View>
              )
            })}
            <TouchableOpacity onPress={this.addServer}>
              <FormLabel labelStyle={styles.addServerBtn}>
                {'+ Add Server'}
              </FormLabel>
            </TouchableOpacity>
          </View>
          <View style={styles.valueContainer}>
          <FormLabel labelStyle={styles.formLabel}>
          {"This is a PBaaS chain:"}
          </FormLabel>
          <View style={styles.switchContainer}>
            <Switch 
              value={this.state.isPbaasChain}
              onValueChange={(value) => this.setState({isPbaasChain: value})}
            />
          </View>
          {this.state.errors.isPbaasChain &&
          <FormValidationMessage>
          {
            this.state.errors.isPbaasChain ? 
              this.state.errors.isPbaasChain
              :
              null
          }
          </FormValidationMessage>}
          <FormLabel labelStyle={styles.formLabel}>
          {ELECTRUM_DISCLAIMER}
          </FormLabel>
          <View style={styles.switchContainer}>
            <Switch 
              value={this.state.serverDisclaimer}
              onValueChange={(value) => this.setState({serverDisclaimer: value})}
            />
          </View>
          {this.state.errors.serverDisclaimer &&
          <FormValidationMessage>
          {
            this.state.errors.serverDisclaimer ? 
              this.state.errors.serverDisclaimer
              :
              null
          }
          </FormValidationMessage>}
          </View>
          <View style={this.props.isModal ? styles.buttonContainer : styles.singleButtonContainer}>
            {this.props.isModal &&
              <Button1 
                style={styles.cancelButton} 
                buttonContent="CANCEL" 
                onPress={this.cancel}
              />
            }
            <Button1 
              style={styles.addCoinButton} 
              buttonContent="ADD COIN" 
              onPress={this._handleSubmit}
            />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
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