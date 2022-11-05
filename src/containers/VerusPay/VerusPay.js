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
} from "react-native";
import { arrayToObject } from '../../utils/objectManip'
import { connect } from 'react-redux';
import base64url from 'base64url';
import { URL } from 'react-native-url-polyfill';
import { primitives } from 'verusid-ts-client'
import {
  ADDRESS_ONLY,
  CALLBACK_HOST,
  INCOMPATIBLE_APP,
  ONLY_ADDRESS,
  SUPPORTED_DLS,
} from '../../utils/constants/constants'
import { activateChainLifecycle } from "../../actions/actions/intervals/dispatchers/lifecycleManager";
import { API_GET_BALANCES, API_GET_FIATPRICE, API_GET_INFO, API_SEND } from "../../utils/constants/intervalConstants";
import { conditionallyUpdateWallet } from "../../actions/actionDispatchers";
import store from "../../store";
import { Portal } from "react-native-paper";
import SubWalletSelectorModal from "../SubWalletSelect/SubWalletSelectorModal";
import { createAlert, resolveAlert } from "../../actions/actions/alert/dispatchers/alert";
import QrScanner from "../../utils/QrScanner/QrScanner";
import styles from "../../styles";
import BarcodeReader from "../../components/BarcodeReader/BarcodeReader";
import AnimatedActivityIndicator from "../../components/AnimatedActivityIndicator";
import { openSubwalletSendModal } from "../../actions/actions/sendModal/dispatchers/sendModal";
import { SEND_MODAL_AMOUNT_FIELD, SEND_MODAL_MEMO_FIELD, SEND_MODAL_TO_ADDRESS_FIELD } from "../../utils/constants/sendModal";
import { SET_DEEPLINK_DATA } from "../../utils/constants/storeType";

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

    const id = url.pathname.replace(/\//g, '');

    if (!SUPPORTED_DLS.includes(id))
      throw new Error('Unsupported deeplink url path.');

    const req = new primitives.LoginConsentRequest();
    req.fromBuffer(
      base64url.toBuffer(
        url.searchParams.get(primitives.LOGIN_CONSENT_REQUEST_VDXF_KEY.vdxfid),
      ),
    );

    this.props.dispatch({
      type: SET_DEEPLINK_DATA,
      payload: {
        id,
        data: req.toJson(),
      },
    });
    this.props.navigation.navigate('DeepLink');
  }

  onSuccess(e) {
    let result = e.data;

    try {
      try {
        this.tryProcessDeeplink(e.data)
        return
      } catch(dlError) {
        console.log(
          `Could not find deeplink uri in QR scan, falling back to payment request, error:  ${dlError.message}`,
        );
      }

      const paymentRequest = QrScanner.processGenericPaymentRequest(result);
      const {coinObj, address, note, amount} = paymentRequest;

      if (coinObj == null) {
        this.addressOnly(address);
      } else if (
        !this.props.acceptAddressOnly ||
        this.props.activeCoin.id === coinObj.id
      ) {
        if (amount === null) {
          this.handleMissingAmount(coinObj, address, note);
        } else {
          this.preConfirm(
            coinObj,
            this.props.activeAccount,
            address,
            amount,
            note,
          );
        }
      } else {
        this.canExitWallet(this.props.activeCoin.id, coinObj.id).then(res => {
          if (res) {
            if (amount === null) {
              this.handleMissingAmount(coinObj, address, note);
            } else {
              this.preConfirm(
                coinObj,
                this.props.activeAccount,
                address,
                amount,
                note,
                true,
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

  // handleAddCoin = (coinTicker) => {
  //   this.setState({ addingCoin: true });
  //   const coinObj = findCoinObj(coinTicker);

  //   return new Promise((resolve, reject) => {
  //     addCoin(
  //       coinObj,
  //       this.props.activeCoinList,
  //       this.props.activeAccount.id,
  //       coinObj.compatible_channels
  //     )
  //       .then(async (response) => {
  //         if (response) {
  //           this.props.dispatch(response);
  //           this.props.dispatch(
  //             setUserCoins(this.props.activeCoinList, this.props.activeAccount.id)
  //           );
  //           this.props.dispatch(
  //             await addKeypairs(
  //               coinObj,
  //               this.props.activeAccount.keys,
  //               this.props.activeAccount.keyDerivationVersion == null
  //                 ? 0
  //                 : this.props.activeAccount.keyDerivationVersion
  //             )
  //           );
  //           activateChainLifecycle(coinTicker);

  //           this.setState({ addingCoin: false });

  //           resolve(true);
  //         } else {
  //           this.errorHandler("Error adding coin");
  //         }
  //       })
  //       .catch((err) => {
  //         this.errorHandler(err.message);
  //       });
  //   });
  // };

  handleMissingAmount = (coinObj, address, note) => {
    // this.canFillAmount(coinObj.id, note, address).then((res) => {
    //   if (res) {
    //     if (coinObj.apps.hasOwnProperty("wallet")) {
    //       this.preConfirm(coinObj, this.props.activeAccount, address, "", note, false);
    //     } else {
    //       this.errorHandler(INCOMPATIBLE_APP);
    //     }
    //   } else {
    //     this.cancelHandler();
    //   }
    // });
    if (coinObj.apps.hasOwnProperty('wallet')) {
      this.preConfirm(
        coinObj,
        this.props.activeAccount,
        address,
        '',
        note,
        false,
      );
    } else {
      this.errorHandler(INCOMPATIBLE_APP);
    }
  };

  preConfirm = (
    coinObj,
    activeUser,
    address,
    amount,
    note,
    sourceSwitch = false,
  ) => {
    const subWallet =
      this.props.channel && !sourceSwitch ? this.props.channel : null;

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
      this.props.sendModal.visible;

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
                  ? "Scan a recipient's QR invoice or address"
                  : 'Scan a QR code'
              }
              onScan={e => this.onSuccess(e)}
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
