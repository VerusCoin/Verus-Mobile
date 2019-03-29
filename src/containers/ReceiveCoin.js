/*
  This component is responsible for creating verusQR invoices and 
  showing the user their receiving address. If the user ever wants
  to receive coins from anyone, they should be able to go to this
  screen and configure their invoice within a few button presses.
*/

import React, { Component } from "react"
import Button1 from "../symbols/button1"
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Keyboard, 
  Clipboard,
  Alert
 } from "react-native"
import { FormLabel, FormInput, FormValidationMessage, Icon } from 'react-native-elements'
import { connect } from 'react-redux'
import { Dropdown } from 'react-native-material-dropdown'
import QRCode from 'react-native-qrcode-svg';
import { coinsToSats, isNumber } from '../utils/math'

const LOGO_DIR = require('../images/customIcons/verusQRLogo.png');

class ReceiveCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedCoin: this.props.activeCoin,
      amount: 0,
      address: null,
      memo: null,
      errors: {selectedCoin: null, amount: null, address: null, memo: null },
      verusQRString: null
    };
  }

  componentDidMount() {
    this.setAddress()
  }

  setAddress = () => {
    let index = 0;
    const activeUser = this.props.activeAccount
    const coinObj = this.state.selectedCoin

    while (index < activeUser.keys.length && coinObj.id !== activeUser.keys[index].id) {
      index++
    }
    if (index < activeUser.keys.length) {
      this.setState({ address: activeUser.keys[index].pubKey });  
    }
    else {
      throw new Error("ReceiveCoin.js: Fatal mismatch error, " + activeUser.id + " user keys for active coin " + coinObj[i].id + " not found!");
    }
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData()
  }

  handleError = (error, field) => {
    let _errors = this.state.errors
    _errors[field] = error

    this.setState({errors: _errors})
  }

  createQRString = (coinTicker, amount, address, memo) => {
    let verusQRJSON = {
      verusQR: global.VERUS_QR_VERSION,
      coinTicker: coinTicker,
      address: address,
      amount: coinsToSats(amount),
      memo: memo
    }

    this.setState({verusQRString: JSON.stringify(verusQRJSON)})
  }

  switchInvoiceCoin = (coinObj) => {
    this.setState({selectedCoin: coinObj},
      () => {
        this.setAddress()
      })
  }

  copyAddressToClipboard = () => {
    Clipboard.setString(this.state.address);
    Alert.alert("Address Copied", "Address copied to clipboard")
  }

  validateFormData = () => {
    this.setState({
      errors: {selectedCoin: null, amount: null, address: null, memo: null }
    }, () => {
      const _selectedCoin = this.state.selectedCoin
      const _amount = this.state.amount
      const _address = this.state.address
      const _memo = this.state.memo
      let _errors = false;

      if (!_selectedCoin) {
        this.handleError("Required field", "selectedCoin")
        _errors = true
      }

      if (!(_amount.toString())) {
        this.handleError("Required field", "amount")
        _errors = true
      } else if (!(isNumber(_amount))) {
        this.handleError("Invalid amount", "amount")
        _errors = true
      } 

      if (!_errors) {
        this.createQRString(_selectedCoin.id, _amount, _address, _memo)
      } else {
        return false;
      }
    });
  }

  render() {
    return (
        <ScrollView style={styles.root} contentContainerStyle={{alignItems: "center", justifyContent: "center"}}>
          <Text style={styles.wifLabel}>
            Generate VerusQR Invoice
          </Text>
          <View style={styles.dropDownContainer}>
            <Dropdown
              containerStyle={styles.dropDown}
              labelExtractor={(item, index) => {
                return item.id
              }}
              valueExtractor={(item, index) => {
                return item
              }}
              data={this.props.activeCoinsForUser}
              onChangeText={(value, index, data) => this.switchInvoiceCoin(value)}
              textColor="#E9F1F7"
              selectedItemColor="#232323"
              baseColor="#E9F1F7"
              label="Selected Coin:"
              value={this.state.selectedCoin}
            />
          </View>
          <View style={styles.valueContainer}>
            <FormValidationMessage>
            {
              this.state.errors.selectedCoin ? 
                this.state.errors.selectedCoin
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Your address:
            </FormLabel>
            <FormInput 
              underlineColorAndroid="#86939d"
              editable={false}
              value={this.state.address}
              autoCapitalize={"none"}
              autoCorrect={false}
              inputStyle={styles.wifInput}
              multiline={true}
            />
            <FormValidationMessage>
            {
              this.state.errors.address ? 
                this.state.errors.address
                :
                null
            }
            </FormValidationMessage>
          </View>
          <TouchableOpacity onPress={this.copyAddressToClipboard}>
            <Icon name="content-copy" size={25} color="#E9F1F7"/>
          </TouchableOpacity>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Enter an amount:
            </FormLabel>
            <FormInput 
              underlineColorAndroid="#86939d"
              onChangeText={(text) => this.setState({amount: text})}
              shake={this.state.errors.amount}
              inputStyle={styles.formInput}
              keyboardType={"numeric"}
            />
            <FormValidationMessage>
            {
              this.state.errors.amount ? 
                this.state.errors.amount
                :
                null
            }
            </FormValidationMessage>
          </View>
          <View style={styles.valueContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            Enter a note for the receiver (optional):
            </FormLabel>
            <FormInput 
              underlineColorAndroid="#86939d"
              onChangeText={(text) => this.setState({memo: text})}
              autoCapitalize={"none"}
              autoCorrect={false}
              shake={this.state.errors.memo}
              inputStyle={styles.formInput}
            />
            <FormValidationMessage>
            {
              this.state.errors.memo ? 
                this.state.errors.memo
                :
                null
            }
            </FormValidationMessage>
          </View>
          { this.state.verusQRString &&
          <View style={{padding: 10, backgroundColor: '#FFF'}}>
            <QRCode
              value={this.state.verusQRString}
              size={250}
            />
          </View>
          }
          <View style={styles.singleButtonContainer}>
            <Button1 
              style={styles.addAccountButton} 
              buttonContent="Generate QR" 
              onPress={this.validateFormData}
            />
          </View>
        </ScrollView>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accounts: state.authentication.accounts,
    activeCoin: state.coins.activeCoin,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(ReceiveCoin);

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
  },
  formLabel: {
    textAlign:"left",
    marginRight: "auto",
  },
  formInput: {
    width: "100%",
  },
  valueContainer: {
    width: "85%",
  },
  wifLabel: {
    backgroundColor: "transparent",
    marginTop: 50,
    marginBottom: 8,
    paddingBottom: 0,
    fontSize: 22,
    color: "#E9F1F7",
    width: "85%",
    textAlign: "center"
  },
  wifInput: {
    width: "100%",
    color: "#009B72"
  },
  singleButtonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  addAccountButton: {
    height: 46,
    backgroundColor: "#2E86AB",
    marginTop: 15,
    marginBottom: 40
  },
  dropDownContainer: {
    width: "85%",
    alignItems: "center"
  },
  dropDown: {
    width: "90%",
    marginBottom: 0,
    marginTop: 0,
  },
});