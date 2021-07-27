/*
  This component is responsible for creating verusQR invoices and 
  showing the user their receiving address. If the user ever wants
  to receive coins from anyone, they should be able to go to this
  screen and configure their invoice within a few button presses.
*/

import React, { Component } from "react"
import { 
  Keyboard, 
  Clipboard,
 } from "react-native"
import { connect } from 'react-redux'
import { isNumber, truncateDecimal } from '../../../utils/math'
import { conditionallyUpdateWallet } from "../../../actions/actionDispatchers"
import { API_GET_FIATPRICE, API_GET_BALANCES, GENERAL } from "../../../utils/constants/intervalConstants"
import { USD } from '../../../utils/constants/currencies'
import { expireCoinData } from "../../../actions/actionCreators"
import Store from "../../../store"
import selectAddresses from "../../../selectors/address"
import VerusPayParser from '../../../utils/verusPay/index'
import BigNumber from "bignumber.js";
import { RenderReceiveCoin } from "./ReceiveCoin.render"
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert"

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
      showModal: false,
      currentTextInputModal: null,
      currentNumberInputModal: null
    };
  }

  openNumberInputModal(inputKey) {
    this.setState({
      currentNumberInputModal: inputKey
    })
  }

  closeNumberInputModal() {
    this.setState({
      currentNumberInputModal: null
    })
  }

  openTextInputModal(inputKey) {
    this.setState({
      currentTextInputModal: inputKey
    })
  }

  closeTextInputModal() {
    this.setState({
      currentTextInputModal: null
    })
  }

  componentDidMount() {
    this.setAddress()
  }
  
  componentDidUpdate(lastProps) {
    if (lastProps.addresses !== this.props.addresses) {
      this.setAddress()
    }
  }

  setAddress = () => {
    if (this.props.addresses && this.props.addresses.results != null) {
      this.setState({
        address: this.props.addresses.results[0]
      });
    } else {
      this.setState({
        address: ""
      });
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
    const coinObj = this.props.activeCoin
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE))
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_BALANCES))

    this.refresh()
  }

  refresh = () => {
    this.setState({ loading: true }, () => {
      const updates = [API_GET_FIATPRICE, API_GET_BALANCES]
      Promise.all(updates.map(async (update) => {
        await conditionallyUpdateWallet(Store.getState(), this.props.dispatch, this.props.activeCoin.id, update)
      })).then(res => {
        this.setState({ loading: false })
      })
      .catch(error => {
        this.setState({ loading: false })
        console.warn(error)
      })
    })
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

  createQRString = (coinObj, amount, address, memo) => {
    const { rates, displayCurrency } = this.props
    const coinTicker = coinObj.id

    let _price = rates[coinTicker] != null ? rates[coinTicker][displayCurrency] : null

    try {
      const verusQRString = VerusPayParser.v0.writeVerusPayQR(
        coinObj,
        this.state.amountFiat
          ? (BigNumber(amount).dividedBy(BigNumber(_price))).toString()
          : amount.toString(),
        address,
        memo
      )

      this.setState({
        verusQRString,
        showModal: true,
      });
    } catch(e) {
      console.warn(e)
      createAlert("Error", "Error creating QR payment request.")
    }
    
  }

  switchInvoiceCoin = (coinObj) => {
    this.setState({selectedCoin: coinObj},
      () => {
        this.setAddress()
      })
  }

  copyAddressToClipboard = () => {
    Clipboard.setString(this.state.address);
    createAlert("Address Copied", `"${this.state.address}" copied to clipboard.`)
  }

  getPrice = () => {
    const { state, props } = this
    const { amount, selectedCoin, amountFiat } = state
    const { rates, displayCurrency } = props

    let _price = rates[selectedCoin.id] != null ? rates[selectedCoin.id][displayCurrency] : null
    
    if (!(amount.toString()) ||
      !(isNumber(amount)) ||
      !_price) {
      return 0
    } 

    if (amountFiat) {
      return truncateDecimal(amount/_price, 8)
    } else {
      return truncateDecimal(amount*_price, 2)
    }
  }

  validateFormData = () => {
    this.setState({
      errors: {selectedCoin: null, amount: null, address: null, memo: null },
      verusQRString: null
    }, () => {
      const _selectedCoin = this.state.selectedCoin
      const _amount =
        (this.state.amount.toString().includes(".") &&
          this.state.amount.toString().includes(",")) ||
        !this.state.amount
          ? this.state.amount
          : this.state.amount.toString().replace(/,/g, ".");
      const _address = this.state.address
      const _memo = this.state.memo
      let _errors = false;

      if (!_selectedCoin) {
        createAlert("Error", "Please select a coin to receive.")
        _errors = true
      }

      if (!(!(_amount.toString()) || _amount.toString().length < 1 || _amount == 0)) {
        if (!(isNumber(_amount))) {
          this.handleError("Invalid amount", "amount")
          createAlert("Invalid Amount", "Please enter a valid amount.")
          _errors = true
        } else if (Number(_amount) <= 0) {
          this.handleError("Enter an amount greater than 0", "amount")
          createAlert("Invalid Amount", "Please enter an amount greater than 0.")
          _errors = true
        }
      } 

      if (!_errors) {
        this.createQRString(_selectedCoin, _amount, _address, _memo)
      } else {
        return false;
      }
    });
  }

  render() {
    return RenderReceiveCoin.call(this)
  }
}

const mapStateToProps = (state) => {
  return {
    accounts: state.authentication.accounts,
    activeCoin: state.coins.activeCoin,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    rates: state.ledger.rates[GENERAL],
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD,
    addresses: selectAddresses(state)
  }
};

export default connect(mapStateToProps)(ReceiveCoin);