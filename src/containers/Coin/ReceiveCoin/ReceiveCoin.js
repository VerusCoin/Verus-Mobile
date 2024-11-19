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
import { coinsToSats, isNumber, truncateDecimal } from '../../../utils/math'
import { conditionallyUpdateWallet } from "../../../actions/actionDispatchers"
import { API_GET_FIATPRICE, API_GET_BALANCES, GENERAL, DLIGHT_PRIVATE } from "../../../utils/constants/intervalConstants"
import { USD } from '../../../utils/constants/currencies'
import { expireCoinData } from "../../../actions/actionCreators"
import Store from "../../../store"
import selectAddresses from "../../../selectors/address"
import VerusPayParser from '../../../utils/verusPay/index'
import BigNumber from "bignumber.js";
import { RenderReceiveCoin } from "./ReceiveCoin.render"
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert"
import selectRates from "../../../selectors/rates"
import { createVerusPayInvoice } from "../../../utils/api/channels/vrpc/callCreators"
import { primitives } from "verusid-ts-client"
import { I_ADDRESS_VERSION, R_ADDRESS_VERSION } from "../../../utils/constants/constants"
import { coinsList } from "../../../utils/CoinData/CoinsList"
import { fromBase58Check } from "verus-typescript-primitives"
import selectNetworkName from "../../../selectors/networkName"

class ReceiveCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      selectedCoin: this.props.activeCoin,
      amount: 0,
      maxSlippage: "0.5",
      allowConversion: false,
      addresses: [null],
      memo: null,
      errors: {selectedCoin: null, amount: null, addresses: null, memo: null, maxSlippage: null },
      verusQRString: null,
      amountFiat: false,
      loading: false,
      loadingBox: false,
      showModal: false,
      showingAddress: false,
      currentTextInputModal: null,
      currentNumberInputModal: null,
      addressSelectModalOpen: false,
      infoIndexes: [],
      showVerusIconInQr: false
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
      let infoIndexes = {}
      this.props.addresses.results.map((addr, index) => {
        if (addr != null && addr.length > 0) infoIndexes[addr] = index
      })

      this.setState({
        addresses: this.props.addresses.results.filter(
          (addr) => infoIndexes[addr] != null
        ),
        infoIndexes
      });
    } else {
      this.setState({
        addresses: []
      });
    }
  }

  toggleAllowConversion = () => {
    this.setState({
      allowConversion: !this.state.allowConversion
    })
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

  createQRString = (coinObj, amount, address, memo, maxSlippage) => {
    const { displayCurrency } = this.props
    const rates = this.props.rates

    let _price = rates[displayCurrency];

    try {
      this.setState({
        loadingBox: true
      }, async () => {
        try {
          let qrString;
          let showVerusIconInQr = false;
          const wallet = this.props.subWallet;

          const amountCrypto = this.state.amountFiat
            ? BigNumber(amount).dividedBy(BigNumber(_price)).toString()
            : amount.toString();
    
          if (coinObj.proto === 'vrsc' && wallet.id !== "PRIVATE_WALLET") {
            const { hash, version } = fromBase58Check(address);
            let destinationType;
    
            if (version === I_ADDRESS_VERSION) {
              destinationType = primitives.DEST_ID;
            } else if (version === R_ADDRESS_VERSION) {
              destinationType = primitives.DEST_PKH;
            } else throw new Error("Unknown or unsupported destination type");
    
            const verusSystem = coinObj.testnet ? coinsList.VRSCTEST.currency_id : coinsList.VRSC.currency_id;
            const nonVerusSystems = wallet.network === verusSystem ? [] : [wallet.network];
    
            const amountBN = new primitives.BigNumber(
              coinsToSats(BigNumber(amountCrypto)).toString(),
              10,
            );
            const amountGtZero = amountBN.gt(new primitives.BigNumber(0));

            const acceptsConversion = this.state.allowConversion && this.state.amount != 0;
    
            const invoice = await createVerusPayInvoice(
              coinObj,
              new primitives.VerusPayInvoiceDetails({
                amount: amountGtZero ? new primitives.BigNumber(
                  coinsToSats(BigNumber(amountCrypto)).toString(),
                  10,
                ) : undefined,
                destination: new primitives.TransferDestination({
                  type: destinationType,
                  destination_bytes: hash,
                }),
                requestedcurrencyid: coinObj.currency_id,
                acceptedsystems: nonVerusSystems,
                maxestimatedslippage: acceptsConversion ? maxSlippage != null ? new primitives.BigNumber(
                  coinsToSats(BigNumber(maxSlippage).dividedBy(100)).toString(),
                  10,
                ) : new primitives.BigNumber(
                  coinsToSats(BigNumber('0.005')).toString(),
                  10,
                ) : undefined,
              }),
            );
    
            invoice.details.setFlags({
              acceptsConversion,
              isTestnet: !!(coinObj.testnet),
              acceptsNonVerusSystems: nonVerusSystems.length > 0,
              acceptsAnyAmount: !amountGtZero
            })
    
            qrString = invoice.toWalletDeeplinkUri();
            showVerusIconInQr = true;
          } else {
            qrString = VerusPayParser.v0.writeVerusPayQR(
              coinObj,
              amountCrypto,
              address,
              memo
            )
          }
    
          this.setState({
            verusQRString: qrString,
            showModal: true,
            loadingBox: false,
            showVerusIconInQr
          });
        } catch(e) {
          console.warn(e)
          createAlert("Error", "Error creating VerusPay invoice.")

          this.setState({
            loadingBox: false
          })
        }
      })
    } catch(e) {
      console.warn(e)
      createAlert("Error", "Error creating QR payment request.")
    }
  }

  showAddressString = () => {
    if (this.state.addresses.length == 0) {
      createAlert("No Address", 'No address to view QR for.')
    } else {
      this.setState({
        verusQRString: this.state.addresses[0],
        showModal: true,
        showingAddress: true
      });
    }
  }

  switchInvoiceCoin = (coinObj) => {
    this.setState({selectedCoin: coinObj},
      () => {
        this.setAddress()
      })
  }

  copyAddressToClipboard = (address) => {
    Clipboard.setString(address);
    createAlert("Address Copied", `"${address}" copied to clipboard.`)
  }

  getPrice = () => {
    const { state, props } = this
    const { amount, selectedCoin, amountFiat } = state
    const { rates, displayCurrency } = props

    let _price = rates[displayCurrency]
    
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

  networksInfoAlert = () => {
    createAlert(
      "Supported Blockchain Networks", 
      "VerusPay invoices can support payment on more than one blockchain network. The QR invoice generated with this form will support payments on any networks listed here."
    )
  }

  validateFormData = (addressIndex) => {
    this.setState({
      errors: {selectedCoin: null, amount: null, addresses: null, memo: null },
      verusQRString: null,
      showVerusIconInQr: false
    }, async () => {
      const processNumeric = (numericString) => {
        return (numericString.toString().includes('.') &&
          numericString.toString().includes(',')) ||
          !numericString
          ? numericString
          : numericString.toString().replace(/,/g, '.');
      }

      const _selectedCoin = this.state.selectedCoin;
      const _amount = processNumeric(this.state.amount);
      let _maxSlippage = null;
      const _address = this.state.addresses[addressIndex];
      const _memo = this.state.memo;
      let _errors = false;
      const useMaxSlippageForm =
        this.state.amount != 0 &&
        this.props.activeCoin.proto === 'vrsc' &&
        this.props.subWallet.id !== 'PRIVATE_WALLET' &&
        this.props.generalWalletSettings.allowSettingVerusPaySlippage && 
        this.state.allowConversion;

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

      if (useMaxSlippageForm) {
        _maxSlippage = processNumeric(this.state.maxSlippage);

        if (!(!(_maxSlippage.toString()) || _maxSlippage.toString().length < 1)) {
          if (!(isNumber(_maxSlippage))) {
            this.handleError("Invalid slippage value", "maxSlippage")
            createAlert("Invalid Slippage", "Please enter a valid slippage value.")
            _errors = true
          } else if (Number(_maxSlippage) <= 0 || (Number(_maxSlippage) > 100)) {
            this.handleError("Enter a slippage value greater than 0", "maxSlippage")
            createAlert("Invalid Slippage", "Please enter a slippage value greater than 0, and not greater than 100.")
            _errors = true
          }
        }  
      }

      if (!_errors) {
        try {
          this.createQRString(_selectedCoin, _amount, _address, _memo, _maxSlippage);
          return true;
        } catch(e) {
          createAlert("Error", e.message);
          return false;
        }
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
  const chainTicker = state.coins.activeCoin.id
  const { results, errors } = selectRates(state)

  return {
    accounts: state.authentication.accounts,
    activeCoin: state.coins.activeCoin,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    rates: results ? results : {},
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD,
    addresses: selectAddresses(state),
    subWallet: state.coinMenus.activeSubWallets[chainTicker],
    networkName: selectNetworkName(state),
    generalWalletSettings: state.settings.generalWalletSettings
  }
};

export default connect(mapStateToProps)(ReceiveCoin);