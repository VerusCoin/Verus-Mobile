/*
  This component handles VerusPay, the Verus Mobile one step
  payment solution. It should be as general as possible, and 
  able to handle as many different kinds of payment protocols
  as possible while still looking and feeling the same from the
  user side of things.
*/

import React, { Component } from "react";
import {
  View,
  Alert
} from "react-native";
import { arrayToObject } from '../../utils/objectManip'
import { connect } from 'react-redux';
import base64url from 'base64url';
import { URL } from 'react-native-url-polyfill';
import { primitives } from 'verusid-ts-client'
import {
  CALLBACK_HOST,
  INCOMPATIBLE_APP,
  ONLY_ADDRESS,
  SUPPORTED_DLS,
} from '../../utils/constants/constants'
import { API_GET_BALANCES, API_GET_FIATPRICE, API_GET_INFO, API_SEND, IS_PBAAS } from "../../utils/constants/intervalConstants";
import { conditionallyUpdateWallet } from "../../actions/actionDispatchers";
import store from "../../store";
import { Button, Portal } from "react-native-paper";
import SubWalletSelectorModal from "../SubWalletSelect/SubWalletSelectorModal";
import { createAlert, resolveAlert } from "../../actions/actions/alert/dispatchers/alert";
import QrScanner from "../../utils/QrScanner/QrScanner";
import styles from "../../styles";
import BarcodeReader from "../../components/BarcodeReader/BarcodeReader";
import AnimatedActivityIndicator from "../../components/AnimatedActivityIndicator";
import { openSubwalletSendModal } from "../../actions/actions/sendModal/dispatchers/sendModal";
import { SEND_MODAL_AMOUNT_FIELD, SEND_MODAL_MEMO_FIELD, SEND_MODAL_TO_ADDRESS_FIELD } from "../../utils/constants/sendModal";
import { SET_DEEPLINK_DATA } from "../../utils/constants/storeType";
import { getCurrency } from "../../utils/api/channels/verusid/callCreators";
import { CommonActions } from "@react-navigation/routers";

class VerusPay extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: false,
      coinObj: null,
      activeUser: null,
      address: null,
      amount: null,
      note: null,
      subWalletSelectorOpen: false,
      subWalletSelectorCoin: null,
      subWalletSelectorDisplayTicker: null
    };
  }

  componentWillUnmount() {
    this.refresh();
  }

  refresh() {
    this.props.activeCoinsForUser.map(async coinObj => {
      await conditionallyUpdateWallet(
        store.getState(),
        this.props.dispatch,
        coinObj.id,
        API_GET_FIATPRICE,
      );
      await conditionallyUpdateWallet(
        store.getState(),
        this.props.dispatch,
        coinObj.id,
        API_GET_BALANCES,
      );
      await conditionallyUpdateWallet(
        store.getState(),
        this.props.dispatch,
        coinObj.id,
        API_GET_INFO,
      );
    });
  }

  tryProcessDeeplink(urlstring) {
    const url = new URL(urlstring);

    if (url.host !== CALLBACK_HOST)
      throw new Error('Unsupported deeplink host url.');

    const id = url.pathname.split('/')[1];

    if (!SUPPORTED_DLS.includes(id)) {
      throw new Error('Unsupported deeplink url path.');
    }
      

    let dl;

    if (id === primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid) {
      dl = new primitives.LoginConsentRequest();
      dl.fromBuffer(
        base64url.toBuffer(
          url.searchParams.get(primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid),
        ),
      );
    } else if (id === primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid) {
      dl = primitives.VerusPayInvoice.fromWalletDeeplinkUri(urlstring);
    }

    this.props.dispatch({
      type: SET_DEEPLINK_DATA,
      payload: {
        id,
        data: dl.toJson(),
      },
    });
    this.props.navigation.dispatch(CommonActions.reset({
      index: 0,
      routes: [{name: 'DeepLink'}],
    }));
  }

  onSuccess(codes) {
    let result = codes[0];

    try {
      try {
        this.tryProcessDeeplink(result)
        return
      } catch(dlError) {
        console.log(
          `Could not find deeplink uri in QR scan, falling back to payment request, error:  ${dlError.message}`,
        );
      }

      const paymentRequest = QrScanner.processGenericPaymentRequest(result);
      const {coinObj, address, note, amount, system} = paymentRequest;

      if (coinObj == null) {
        this.addressOnly(address);
      } else if (
        !this.props.acceptAddressOnly ||
        this.props.activeCoin.id === coinObj.id
      ) {
        if (amount === null) {
          this.handleMissingAmount(coinObj, address, note, system);
        } else {
          this.preConfirm(
            coinObj,
            this.props.activeAccount,
            address,
            amount,
            note,
            false,
            system
          );
        }
      } else {
        this.canExitWallet(this.props.activeCoin.display_ticker, coinObj.display_ticker).then(res => {
          if (res) {
            if (amount === null) {
              this.handleMissingAmount(coinObj, address, note, system);
            } else {
              this.preConfirm(
                coinObj,
                this.props.activeAccount,
                address,
                amount,
                note,
                true,
                system
              );
            }
          } else {
            this.cancelHandler();
          }
        });
      }
    } catch (e) {
      console.warn(e);
      this.errorHandler(e.message);
    }
  }

  errorHandler = error => {
    createAlert('Error', error);

    this.cancelHandler();
  };

  cancelHandler = () => {
    this.setState({
      loading: false,
    });
  };

  handleMissingAmount = (coinObj, address, note, system) => {
    if (coinObj.apps.hasOwnProperty('wallet')) {
      this.preConfirm(
        coinObj,
        this.props.activeAccount,
        address,
        '',
        note,
        false,
        system
      );
    } else {
      this.errorHandler(INCOMPATIBLE_APP);
    }
  };

  preConfirm = async (
    coinObj,
    activeUser,
    address,
    amount,
    note,
    sourceSwitch = false,
    system
  ) => {
    const subWallet =
    this.props.channel && !sourceSwitch ? this.props.channel : null;

    if (coinObj.tags.includes(IS_PBAAS) && system != null) {
      const getCurrencyRes = await getCurrency(coinObj.system_id, system);
      if (getCurrencyRes.error)
        Alert.alert(
          'Network Warning',
          `This invoice was created using the network with ID ${system}. Ensure that you send ${coinObj.display_ticker} on that network. You can send across networks through the convert or cross-chain modal under the send tab.`,
        );
      else {
        const name = getCurrencyRes.result.fullyqualifiedname;
        Alert.alert(
          'Network Warning',
          `This invoice was created using the ${name} network. Ensure that you send ${coinObj.display_ticker} on the ${name} network. You can send across networks through the convert or cross-chain modal under the send tab.`,
        );
      }
    }

    this.setState(
      {
        coinObj: coinObj,
        activeUser: activeUser,
        address: address,
        amount: amount,
        note: note,
      },
      () => {
        this.handleUpdates().then(() => {
          this.openSendModal(subWallet);
        });
      },
    );
  };

  canExitWallet = (fromTicker, toTicker) => {
    return createAlert(
      'Leaving Wallet',
      'This invoice is requesting funds in ' +
        toTicker +
        ', but you are currently ' +
        'in the ' +
        fromTicker +
        ' wallet. Would you like to proceed?',
      [
        {
          text: 'No, take me back',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => resolveAlert(true)},
      ],
    );
  };

  canFillAmount = (currency, note, address) => {
    return createAlert(
      'Missing Amount',
      'This invoice does not specify an amount, in order to proceed you ' +
        'will need to fill in the amount yourself, would you like to continue?' +
        (currency ? '\n\n Currency: ' + currency : null) +
        '\n\n To: ' +
        address +
        (note ? '\n\n Memo: ' + note : ''),
      [
        {
          text: 'No, take me back',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => resolveAlert(true)},
      ],
    );
  };

  canAddCoin = coinTicker => {
    return createAlert(
      'Coin Inactive',
      'This invoice is requesting funds in ' +
        coinTicker +
        ', but you have not ' +
        'activated that coin yet, would you like to activate ' +
        coinTicker +
        ' and proceed?',
      [
        {
          text: 'No, take me back',
          onPress: () => resolveAlert(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => resolveAlert(true)},
      ],
      {
        cancelable: false,
      },
    );
  };

  openSendModal = subWallet => {
    if (subWallet != null) {
      this.setState(
        {
          subWalletSelectorOpen: false,
          subWalletSelectorCoin: null,
        },
        () => {
          openSubwalletSendModal(this.state.coinObj, subWallet, {
            [SEND_MODAL_TO_ADDRESS_FIELD]: this.state.address,
            [SEND_MODAL_AMOUNT_FIELD]: this.state.amount.toString(),
            [SEND_MODAL_MEMO_FIELD]: '',
          });
        },
      );
    } else {
      this.setState(
        {
          subWalletSelectorCoin: this.state.coinObj.id,
          subWalletSelectorDisplayTicker: this.state.coinObj.display_ticker
        },
        () => {
          const subWallets =
            this.props.allSubWallets[this.state.subWalletSelectorCoin];

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

  handleUpdates = async () => {
    return new Promise((resolve, reject) => {
      this.setState(
        {
          loading: true,
        },
        async () => {
          const updates = [API_GET_BALANCES, API_GET_INFO];

          for (const update of updates) {
            await conditionallyUpdateWallet(
              store.getState(),
              this.props.dispatch,
              this.state.coinObj.id,
              update,
            );
          }

          this.setState({loading: false});
          resolve();
        },
      );
    });
  };

  addressOnly = address => {
    if (this.props.acceptAddressOnly) {
      this.preConfirm(
        this.props.coinObj,
        this.props.activeAccount,
        address,
        '',
        '',
        false,
      );
    } else {
      this.errorHandler(ONLY_ADDRESS);
    }
  };

  render() {
    const containerStyle =
      this.props.containerStyle == null ? {} : this.props.containerStyle;
    const loading =
      this.state.loading ||
      this.state.addingCoin ||
      this.props.activeAlert != null ||
      this.props.sendModal.visible || 
      this.props.showSpinner;

    return (
      <View style={{...styles.blackRoot, ...containerStyle}}>
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
              displayTicker={this.state.subWalletSelectorDisplayTicker}
            />
          )}
        </Portal>
        {loading ? (
          <View style={styles.focalCenter}>
            <AnimatedActivityIndicator
              style={{
                width: 128,
              }}
            />
          </View>
        ) : (
          <React.Fragment>
            <BarcodeReader
              prompt={
                this.props.acceptAddressOnly
                  ? "Scan an invoice or address"
                  : 'Scan a QR code'
              }
              onScan={codes => this.onSuccess(codes)}
              button={this.props.button}
              maskProps={this.props.maskProps}
            />
          </React.Fragment>
        )}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoin: state.coins.activeCoin,
    activeAccount: state.authentication.activeAccount,
    balances: {
      results: arrayToObject(
        Object.keys(state.ledger.balances),
        (curr, key) => state.ledger.balances[key],
        true
      ),
      errors: arrayToObject(
        Object.keys(state.errors[API_GET_BALANCES]),
        (curr, key) => state.errors[API_GET_BALANCES][key],
        true
      ),
    },
    coinSettings: state.settings.coinSettings,
    activeCoinList: state.coins.activeCoinList,
    allSubWallets: state.coinMenus.allSubWallets,
    activeAlert: state.alert.active,
    sendModal: state.sendModal
  };
};

export default connect(mapStateToProps)(VerusPay);
