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
import QRCodeScanner from 'react-native-qrcode-scanner';
import { arrayToObject, isJson } from '../../utils/objectManip'
import { NavigationActions } from '@react-navigation/compat';
import { CommonActions } from '@react-navigation/native';
import { connect } from 'react-redux';
import { namesList, findCoinObj } from '../../utils/CoinData/CoinData'
import { coinsList } from '../../utils/CoinData/CoinsList'
import { getRecommendedBTCFees } from '../../utils/api/channels/general/callCreators'
import { removeSpaces } from '../../utils/stringUtils'
import VerusPayParser from '../../utils/verusPay/index'
import {
  setUserCoins,
  addKeypairs,
  addCoin,
  setActiveApp,
  setActiveCoin,
  setActiveSection
 } from '../../actions/actionCreators'
import Spinner from 'react-native-loading-spinner-overlay';
import { satsToCoins } from '../../utils/math'
import {
  FORMAT_UNKNOWN,
  ADDRESS_ONLY,
  INCOMPATIBLE_APP,
  INCOMPATIBLE_COIN,
  INSUFFICIENT_FUNDS,
  INCOMPLETE_VERUS_QR,
  ONLY_ADDRESS,
  BALANCE_NULL,
  PARSE_ERROR
} from '../../utils/constants/constants'
import { activateChainLifecycle } from "../../actions/actions/intervals/dispatchers/lifecycleManager";
import { API_GET_BALANCES, API_GET_INFO, ELECTRUM, DLIGHT_PRIVATE, API_SEND } from "../../utils/constants/intervalConstants";
import { conditionallyUpdateWallet } from "../../actions/actionDispatchers";
import store from "../../store";
import BigNumber from "bignumber.js";
import { Portal } from "react-native-paper";
import SubWalletSelectorModal from "../SubWalletSelect/SubWalletSelectorModal";
import { createAlert, resolveAlert } from "../../actions/actions/alert/dispatchers/alert";

class VerusPay extends Component {
  constructor(props) {
    super(props);
    this.state = {
      btcFeesErr: false,
      loading: false,
      loadingBTCFees: false,
      fromHome: true,
      btcFees: {},
      spinnerOverlay: false,
      spinnerMessage: "Loading...",
      coinObj: null,
      activeUser: null,
      address: null,
      amount: null,
      note: null,
      subWalletSelectorOpen: false,
      subWalletSelectorCoin: null
    };
  }

  componentDidMount() {
    if (
      this.props.route.params &&
      this.props.route.params.fillAddress
    ) {
      this.setState({ fromHome: false });
    }
  }

  componentWillUnmount() {
    if (
      this.props.route.params &&
      this.props.route.params.refresh
    ) {
      this.props.route.params.refresh();
    }
  }

  resetToScreen = (route, title, data) => {
    const resetAction = CommonActions.reset({
      index: 1, // <-- currect active route from actions array
      routes: [
        { name: "Home" },
        {
          name: route,
          params: { title: title, data: data }
        }
      ]
    });

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction);
  };

  onSuccess(e) {
    let result = e.data;

    if (isJson(result)) {
      let resultParsed = JSON.parse(result);

      if (resultParsed.verusQR) {
        this.handleVerusQR({
          ...resultParsed,
          amount: resultParsed.amount
            ? satsToCoins(BigNumber(resultParsed.amount))
            : BigNumber(resultParsed.amount),
        });
      } else {
        //TODO: Handle other style QR codes here
        if (resultParsed.address && resultParsed.amount && resultParsed.coin) {
          let resultConverted = {
            coinTicker: resultParsed.coin,
            amount: BigNumber(resultParsed.amount),
            address: resultParsed.address
          };

          this.handleVerusQR(resultConverted);
        } else {
          this.errorHandler(FORMAT_UNKNOWN);
        }
      }
    } else {
      if (typeof result === "string") {
        try {
          const request = VerusPayParser.v0.readVerusPay(result)
          const coinObj = this.findCurrencyByImportId(request)
          
          this.handleVerusQR({
            coinTicker: coinObj.id,
            address: request.destination,
            amount: BigNumber(request.amount),
            note: request.note
          })
        } catch(e) {
          try {
            let coinURLParsed = this.parseCoinURL(result);

            if (coinURLParsed) {
              this.handleVerusQR(coinURLParsed);
            } else {
              this.addressOnly(result);
            } 
          } catch (e) {
            this.errorHandler(e.message);
          }
        }
      } else {
        this.errorHandler(FORMAT_UNKNOWN);
      }
    }
  }

  errorHandler = error => {
    createAlert("Error", error);
    this.props.navigation.dispatch(NavigationActions.back());
  };

  //Coinbase qr returns a string in the following format:
  //<coinName>:<address>
  isCoinURL = qrString => {
    let splitString = qrString.split(":");

    if (
      Array.isArray(splitString) &&
      splitString.length === 2 &&
      splitString[1].length >= 34 &&
      splitString[1].length <= 35
    ) {
      return splitString[1];
    } else {
      return false;
    }
  };

  findCurrencyByImportId = (importObj) => {
    const allCoins = Object.values(coinsList)

    const coinObj = allCoins.find(coin => {
      return (
        coin.system_id === importObj.system_id &&
        coin.currency_id === importObj.currency_id
      );
    })

    return coinObj
  }

  parseCoinURL = qrString => {
    //TODO: Add support for messages in btc urls as well (&message=Hello)

    let fullURL = /^\w{1,30}:\w{33,36}\?amount\=\d*\.{1}\d*/;
    //<coinName>:<address>?amount=<amount>
    let partialURL = /\w{1,30}:\w{33,36}/;
    //<coinName>:<address>

    try {
      let firstTry = qrString.match(fullURL);

      if (firstTry) {
        //parse full URL here
        let coinName = firstTry[0].substring(0, firstTry[0].indexOf(":"));
        let address = firstTry[0].substring(
          firstTry[0].indexOf(":") + 1,
          firstTry[0].indexOf("?")
        );
        let amount = firstTry[0].substring(firstTry[0].indexOf("=") + 1);

        if (coinName && address && amount) {
          //Find coin ticker from coin data here, URL uses full name

          for (key in coinsList) {
            if (
              coinsList[key] &&
              (removeSpaces(coinsList[key].display_name).toLowerCase() ===
                coinName.toLowerCase() ||
                coinsList[key].alt_names.some(
                  (name) => name === coinName.toLowerCase()
                ))
            ) {
              //Create verusQR compatible data from coin URL
              return {
                coinTicker: coinsList[key].id,
                address: address,
                amount: BigNumber(amount),
              };
            }
          }

          throw new Error(INCOMPATIBLE_COIN)
        }
      } else {
        let secondTry = qrString.match(partialURL);

        if (secondTry) {
          //Parse partial URL here
          let coinName = secondTry[0].substring(0, secondTry[0].indexOf(":"));
          let address = secondTry[0].substring(secondTry[0].indexOf(":") + 1);

          for (key in coinsList) {
            const coinObj = coinsList[key];

            if (
              removeSpaces(coinObj.display_name).toLowerCase() ===
                coinName.toLowerCase() ||
              coinObj.alt_names.some((name) => name === coinName.toLowerCase())
            ) {
              //Create verusQR compatible data from coin URL
              return {
                coinTicker: coinObj.id,
                address: address,
              };
            }
          }

          throw new Error(INCOMPATIBLE_COIN)
        } else {
          return false;
        }
      }
    } catch (e) {
      if (e.message !== INCOMPATIBLE_COIN) {
        console.warn(e);
        throw new Error(PARSE_ERROR)
      } else throw e
    }
  };

  cancelHandler = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  };

  handleVerusQR = verusQR => {
    const coinTicker = verusQR.coinTicker;
    const address = verusQR.address;
    const amount = verusQR.hasOwnProperty("amount")
      ? verusQR.amount
      : null;
    const note = verusQR.note;

    if (coinTicker != null && address != null) {
      if (this.coinExistsInWallet(coinTicker)) {
        let activeCoin = this.getCoinFromActiveCoins(coinTicker);

        if (activeCoin) {
          if (this.state.fromHome || this.props.activeCoin.id === coinTicker) {
            if (amount === null || amount.isLessThanOrEqualTo(0)) {
              this.handleMissingAmount(activeCoin, address, note);
            } else {
              if (this.checkBalance(amount, activeCoin)) {
                this.preConfirm(
                  activeCoin,
                  this.props.activeAccount,
                  address,
                  amount,
                  note
                );
              }
            }
          } else {
            this.canExitWallet(this.props.activeCoin.id, coinTicker).then(
              res => {
                if (res) {
                  if (amount === null || amount.isLessThanOrEqualTo(0)) {
                    this.handleMissingAmount(activeCoin, address, note);
                  } else {
                    if (this.checkBalance(amount, activeCoin)) {
                      this.preConfirm(
                        activeCoin,
                        this.props.activeAccount,
                        address,
                        amount,
                        note,
                        true
                      );
                    }
                  }
                } else {
                  this.cancelHandler();
                }
              }
            );
          }
        } else {
          this.errorHandler(
            `This invoice is requesting funds in ${coinTicker}. Activate ${coinTicker} and rescan to continue.`
          );
        }
      } else {
        //TODO: Handle adding coin that doesn't exist yet in wallet here
        this.errorHandler(INCOMPLETE_VERUS_QR);
      }
    } else {
      this.errorHandler(INCOMPLETE_VERUS_QR);
    }
  };

  handleAddCoin = coinTicker => {
    this.setState({ addingCoin: true });
    const coinObj = findCoinObj(coinTicker)
    
    return new Promise((resolve, reject) => {
      addCoin(
        coinObj,
        this.props.activeCoinList,
        this.props.activeAccount.id,
        // this.props.coinSettings[coinTicker]
        // ? this.props.coinSettings[coinTicker].channels
        // : coinObj.compatible_channels
        coinObj.compatible_channels
      )
        .then(async response => {
          if (response) {
            this.props.dispatch(response);
            this.props.dispatch(
              setUserCoins(
                this.props.activeCoinList,
                this.props.activeAccount.id
              )
            );
            this.props.dispatch(
              await addKeypairs(
                coinObj,
                this.props.activeAccount.keys,
                this.props.activeAccount.keyDerivationVersion == null
                  ? 0
                  : this.props.activeAccount.keyDerivationVersion
              )
            );
            activateChainLifecycle(coinTicker);

            this.setState({ addingCoin: false });

            resolve(true);
          } else {
            this.errorHandler("Error adding coin");
          }
        })
        .catch(err => {
          this.errorHandler(err.message);
        });
    });
  };

  handleMissingAmount = (coinObj, address, note) => {
    this.canFillAmount(coinObj.id, note, address).then(res => {
      if (res) {
        if (coinObj.apps.hasOwnProperty("wallet")) {
          let wallet = coinObj.apps.wallet;
          let sendIndex = wallet.data.findIndex(
            section => section.key === "wallet-send"
          );

          if (sendIndex >= 0) {
            this.props.dispatch(setActiveCoin(coinObj));
            this.props.dispatch(setActiveApp("wallet"));
            this.props.dispatch(setActiveSection(wallet.data[sendIndex]));
            this.resetToScreen("CoinMenus", "Send", { address: address });
          } else {
            this.errorHandler(INCOMPATIBLE_APP);
          }
        } else {
          this.errorHandler(INCOMPATIBLE_APP);
        }
      } else {
        this.cancelHandler();
      }
    });
  };

  preConfirm = (coinObj, activeUser, address, amount, note, sourceSwitch = false) => {
    const channel = this.props.route.params && !sourceSwitch
      ? this.props.route.params.channel
      : null;

    this.setState(
      {
        coinObj: coinObj,
        activeUser: activeUser,
        address: address,
        amount: amount,
        note: note
      },
      () => {
        this.handleUpdates().then(() => {
          this.goToConfirmScreen(channel);
        });
      }
    );
  };

  updateBtcFees = () => {
    return new Promise((resolve, reject) => {
      getRecommendedBTCFees().then(res => {
        if (res) {
          this.setState(
            {
              btcFees: res,
              loadingBTCFees: false
            },
            resolve
          );
        } else {
          this.setState(
            {
              btcFeesErr: true,
              loadingBTCFees: false
            },
            resolve
          );
        }
      });
    });
  };

  // TODO: Fix this to account for different channels
  checkBalance = (amount, activeCoin) => {
    // const { balances } = this.props
    // const channel = activeCoin.dominant_channel != null ? activeCoin.dominant_channel : ELECTRUM

    // if (
    //   activeCoin &&
    //   balances.results &&
    //   balances.results[channel] &&
    //   balances.results[channel][activeCoin.id]
    // ) {
    //   const spendableBalance = BigNumber(
    //     balances.results[channel][activeCoin.id].confirmed
    //   );

    //   if (amount.isGreaterThan(spendableBalance)) {
    //     this.errorHandler(INSUFFICIENT_FUNDS);
    //     return false;
    //   } else {
    //     return true;
    //   }
    // } else {
    //   this.errorHandler(BALANCE_NULL);
    // }
    return true
  };

  canExitWallet = (fromTicker, toTicker) => {
    return createAlert(
      "Leaving Wallet",
      "This invoice is requesting funds in " +
        toTicker +
        ", but you are currently " +
        "in the " +
        fromTicker +
        " wallet. Would you like to proceed?",
      [
        {
          text: "No, take me back",
          onPress: () => resolveAlert(false),
          style: "cancel"
        },
        { text: "Yes", onPress: () => resolveAlert(true) }
      ]
    );
  };

  canFillAmount = (currency, note, address) => {
    return createAlert(
      "Missing Amount",
      "This invoice does not specify an amount, in order to proceed you " +
        "will need to fill in the amount yourself, would you like to continue?" +
        (currency ? ("\n\n Currency: " + currency) : null) +
        "\n\n To: " +
        address +
        (note ? ("\n\n Memo: " + note) : ''),
      [
        {
          text: "No, take me back",
          onPress: () => resolveAlert(false),
          style: "cancel"
        },
        { text: "Yes", onPress: () => resolveAlert(true) }
      ]
    );
  };

  canAddCoin = coinTicker => {
    return createAlert(
      "Coin Inactive",
      "This invoice is requesting funds in " +
        coinTicker +
        ", but you have not " +
        "activated that coin yet, would you like to activate " +
        coinTicker +
        " and proceed?",
      [
        {
          text: "No, take me back",
          onPress: () => resolveAlert(false),
          style: "cancel"
        },
        { text: "Yes", onPress: () => resolveAlert(true) }
      ],
      {
        cancelable: false
      }
    );
  };

  goToConfirmScreen = (channel) => {
    if (channel != null) {
      const route = "ConfirmSend";

      let data = {
        coinObj: this.state.coinObj,
        activeUser: this.state.activeUser,
        address: this.state.address,
        amount: this.state.amount.toString(),
        btcFee: this.state.btcFees.average,
        balance: this.props.balances.results[channel][this.state.coinObj.id]
          .confirmed,
        note: this.state.note,
        channel,
      };

      this.resetToScreen(route, "Confirm", data);
    } else {
      this.setState({
        subWalletSelectorCoin: this.state.coinObj.id,
      }, () => {
        const subWallets = this.props.allSubWallets[
          this.state.subWalletSelectorCoin
        ]

        if (subWallets.length == 1) {
          this.goToConfirmScreen(subWallets[0].api_channels[API_SEND])
        } else {
          createAlert(
            "Select a Card",
            `Select a card from which to send ${this.state.amount.toString()} ${
              this.state.coinObj.id
            } to the address "${this.state.address}".`,
            [
              {
                text: "Continue",
                onPress: () => {
                  this.setState({
                    subWalletSelectorOpen: true,
                  });
                  resolveAlert(true);
                },
              },
            ]
          );
        }
      });
    }
  };

  handleUpdates = async () => {
    return new Promise((resolve, reject) => {
      let promises = [];
      const finishPromise = () => {
        Promise.all(promises)
          .then(res => {
            resolve(res);
          })
          .catch(err => {
            reject(err);
          });
      };

      this.setState(
        {
          loading: true,
          loadingBTCFees:
            this.state.coinObj &&
            this.state.coinObj.id === "BTC" &&
            !this.state.loadingBTCFees
              ? true
              : false
        },
        () => {
          const updates = [API_GET_BALANCES, API_GET_INFO];
          promises.push(() =>
            Promise.all(
              updates.map(async update => {
                await conditionallyUpdateWallet(
                  store.getState(),
                  this.props.dispatch,
                  this.props.activeCoin.id,
                  update
                );
              })
            )
              .then(() => {
                this.setState({ loading: false });
              })
              .catch(error => {
                this.setState({ loading: false });
                console.warn(error)
              })
          );
          if (this.state.loadingBTCFees) promises.push(this.updateBtcFees());
          finishPromise();
        }
      );
    });
  };

  coinExistsInWallet = coinTicker => {
    let index = 0;

    while (index < namesList.length && namesList[index] !== coinTicker) {
      index++;
    }

    if (index < namesList.length) {
      return true;
    } else {
      return false;
    }
  };

  getCoinFromActiveCoins = coinTicker => {
    let index = 0;

    while (
      index < this.props.activeCoinsForUser.length &&
      this.props.activeCoinsForUser[index].id !== coinTicker
    ) {
      index++;
    }

    if (index < namesList.length) {
      return this.props.activeCoinsForUser[index];
    } else {
      return false;
    }
  };

  addressOnly = address => {
    if (
      this.props.route.params &&
      this.props.route.params.fillAddress
    ) {
      createAlert("Address Only", ADDRESS_ONLY);
      this.props.route.params.fillAddress(address);
      this.props.navigation.dispatch(NavigationActions.back());
    } else {
      this.errorHandler(ONLY_ADDRESS);
    }
  };

  render() {
    return (
      <View style={Styles.blackRoot}>
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
                  : this.props.allSubWallets[
                      this.state.subWalletSelectorCoin
                    ]
              }
              onSelect={(wallet) =>
                this.goToConfirmScreen(wallet.api_channels[API_SEND])
              }
            />
          )}
        </Portal>
        <QRCodeScanner
          onRead={this.onSuccess.bind(this)}
          showMarker={true}
          captureAudio={false}
          cameraStyle={Styles.fullHeight}
        />
        <Spinner
          visible={
            (this.state.loading ||
              this.state.loadingBTCFees ||
              this.state.addingCoin ||
              this.state.spinnerOverlay) &&
            !this.state.subWalletSelectorOpen &&
            this.state.subWalletSelectorCoin == null
          }
          textContent={
            this.state.addingCoin
              ? "Adding coin..."
              : this.state.loadingBTCFees
              ? "Fetching BTC fees..."
              : this.state.loading
              ? "Loading coin data..."
              : null
          }
          textStyle={{ color: "#FFF" }}
        />
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
  };
};

export default connect(mapStateToProps)(VerusPay);
