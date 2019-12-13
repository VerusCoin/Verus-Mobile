/*
  This component is responsible for creating verusQR invoices and 
  showing the user their receiving address. If the user ever wants
  to receive coins from anyone, they should be able to go to this
  screen and configure their invoice within a few button presses.
*/

import React, { Component } from "react"
import Button1 from "../../../symbols/button1"
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Keyboard, 
  Clipboard,
  Alert,
  RefreshControl,
  Modal
 } from "react-native"
import { FormLabel, FormInput, FormValidationMessage, Icon } from 'react-native-elements'
import { connect } from 'react-redux'
import { Dropdown } from 'react-native-material-dropdown'
import QRCode from 'react-native-qrcode-svg';
import QRModal from '../../../components/QRModal'
import { coinsToSats, isNumber, truncateDecimal } from '../../../utils/math'
import { setCoinRates, everythingNeedsUpdate } from '../../../actions/actionCreators'
import styles from './ReceiveCoin.styles'
import Colors from '../../../globals/colors';

class ReceiveCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedCoin: this.props.activeCoin,
      amount: 0,
      address: null,
      memo: null,
      errors: {selectedCoin: null, amount: null, address: null, memo: null },
      verusQRString: null,
      amountFiat: false,
      loading: false,
      showModal: false
    };
  }

  componentDidMount() {
    this.setAddress()
  }

  setAddress = () => {
    let index = 0;
    const activeUser = this.props.activeAccount
    const coinObj = this.state.selectedCoin

    if (activeUser.keys.hasOwnProperty(coinObj.id)) {
      this.setState({ address: activeUser.keys[coinObj.id].pubKey });  
    } else {
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

  forceUpdate = () => {
    //TODO: Figure out why screen doesnt always update if everything is called seperately

    /*this.props.dispatch(transactionsNeedUpdate(this.props.activeCoin.id, this.props.needsUpdate.transanctions))
    this.props.dispatch(needsUpdate("balances"))
    this.props.dispatch(needsUpdate("rates"))*/
    this.props.dispatch(everythingNeedsUpdate())

    this.refresh()
  }

  refresh = () => {
    const _activeCoinsForUser = this.props.activeCoinsForUser

    let promiseArray = []

    if(this.props.needsUpdate.rates) {
      console.log("Rates need update, pushing update to transaction array")
      if (!this.state.loading) {
        this.setState({ loading: true });  
      }  
      promiseArray.push(setCoinRates(_activeCoinsForUser))
    }
  
    this.updateProps(promiseArray)
  }

  updateProps = (promiseArray) => {
    return new Promise((resolve, reject) => {
      Promise.all(promiseArray)
        .then((updatesArray) => {
          if (updatesArray.length > 0) {
            for (let i = 0; i < updatesArray.length; i++) {
              if(updatesArray[i]) {
                this.props.dispatch(updatesArray[i])
              }
            }
            if (this.state.loading) {
              this.setState({ loading: false });  
            }
            resolve(true)
          }
          else {
            resolve(false)
          }
        })
    }) 
  }

  createQRString = (coinTicker, amount, address, memo) => {
    let _price = this.props.rates[this.state.selectedCoin.id]
    let verusQRJSON = {
      verusQR: global.VERUS_QR_VERSION,
      coinTicker: coinTicker,
      address: address,
      amount: this.state.amountFiat ? truncateDecimal(coinsToSats(amount/_price), 0) : coinsToSats(amount),
      memo: memo
    }

    this.setState({verusQRString: JSON.stringify(verusQRJSON), showModal: true})
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

  getPrice = () => {
    const _amount = this.state.amount
    const _price = this.props.rates[this.state.selectedCoin.id]
    
    if (!(_amount.toString()) ||
      !(isNumber(_amount)) ||
      !_price) {
      return 0
    } 

    if (this.state.amountFiat) {
      return truncateDecimal(_amount/_price, 8)
    } else {
      return truncateDecimal(_amount*_price, 2)
    }
  }

  validateFormData = () => {
    this.setState({
      errors: {selectedCoin: null, amount: null, address: null, memo: null },
      verusQRString: null
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

      if (!(_amount.toString()) || _amount.toString().length < 1) {
        this.handleError("Required field", "amount")
        _errors = true
      } else if (!(isNumber(_amount))) {
        this.handleError("Invalid amount", "amount")
        _errors = true
      } else if (Number(_amount) <= 0) {
        this.handleError("Enter an amount greater than 0", "amount")
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
    const _price = this.getPrice()
    return (
      <ScrollView 
        style={styles.root} 
        contentContainerStyle={{alignItems: "center", justifyContent: "center"}}
        refreshControl={
          <RefreshControl
            refreshing={this.state.loading}
            onRefresh={this.forceUpdate}
          />
        }>
        <QRModal
          animationType="slide"
          transparent={false}
          visible={this.state.showModal && this.state.verusQRString && this.state.verusQRString.length > 0}
          qrString={this.state.verusQRString}
          cancel={() => {this.setState({showModal: false})}}/>
        <Text style={styles.wifLabel}>
          {"Generate VerusQR Invoice"}
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
            textColor={Colors.quinaryColor}
            selectedItemColor={Colors.quinaryColor}
            baseColor={Colors.quinaryColor}
            label="Selected Coin:"
            labelTextStyle={{fontFamily: 'Avenir-Book'}}
            labelFontSize={17}
            value={this.state.selectedCoin}
            pickerStyle={{backgroundColor: Colors.tertiaryColor}}
            itemTextStyle={{fontFamily: 'Avenir-Book'}}
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
            underlineColorAndroid={Colors.quinaryColor}
            editable={false}
            value={this.state.address}
            autoCapitalize={"none"}
            autoCorrect={false}
            inputStyle={styles.wifInput}
            multiline={true}
          />
          {this.state.errors.address &&
          <FormValidationMessage>
          {
            this.state.errors.address ? 
              this.state.errors.address
              :
              null
          }
          </FormValidationMessage>}
        </View>
        <TouchableOpacity onPress={this.copyAddressToClipboard} style={{marginTop: 5}}>
          <Icon name="content-copy" size={25} color={Colors.quinaryColor}/>
        </TouchableOpacity>
        <View style={styles.valueContainer}>
          <View style={styles.labelContainer}>
            <FormLabel labelStyle={styles.formLabel}>
            {`Enter an amount in ${this.state.amountFiat ? 'USD' : this.state.selectedCoin.id}:`}
            </FormLabel>
            {this.props.rates[this.state.selectedCoin.id] && (isNumber(_price)) &&
              <TouchableOpacity onPress={() => {this.setState({ amountFiat: !this.state.amountFiat })}}>
                <FormLabel labelStyle={styles.swapInputTypeBtnBordered}>
                  {this.state.amountFiat ? 'USD' : this.state.selectedCoin.id}
                </FormLabel>
              </TouchableOpacity>
            }
          </View>
          <FormInput 
            underlineColorAndroid={Colors.quinaryColor}
            onChangeText={(text) => this.setState({amount: text})}
            shake={this.state.errors.amount}
            inputStyle={styles.formInput}
            keyboardType={"decimal-pad"}
            autoCapitalize='words'
          />
          {this.state.errors.amount &&
          <FormValidationMessage>
          {
            this.state.errors.amount ? 
              this.state.errors.amount
              :
              null
          }
          </FormValidationMessage>}
          {this.props.rates[this.state.selectedCoin.id] && (isNumber(_price)) &&
          <TouchableOpacity onPress={() => {this.setState({ amountFiat: !this.state.amountFiat })}}>
            <FormLabel labelStyle={styles.swapInputTypeBtn}>
              {`~${_price} ${this.state.amountFiat ? this.state.selectedCoin.id : 'USD'}`}
            </FormLabel>
          </TouchableOpacity>}
        </View>
        <View style={styles.valueContainer}>
          <FormLabel labelStyle={styles.formLabel}>
            {"Enter a note for the receiver (optional):"}
          </FormLabel>
          <FormInput 
            underlineColorAndroid={Colors.quinaryColor}
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
        <View style={styles.singleButtonContainer}>
          <Button1 
            style={styles.addAccountButton} 
            buttonContent="GENERATE QR" 
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
    rates: state.ledger.rates,
    needsUpdate: state.ledger.needsUpdate,
  }
};

export default connect(mapStateToProps)(ReceiveCoin);