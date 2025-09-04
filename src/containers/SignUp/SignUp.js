// DEPRECATED

/*
  This component represents the screen that the user is met with
  if there is no account present in AsyncStorage. It allows them
  to create an account by using a seed, username and password.
  It is crucial that they understand the importance of their seed.
*/  

import { Component } from "react"
import { 
  Keyboard
} from "react-native"
import { NavigationActions } from '@react-navigation/compat'
import { addCoin, addUser, disableSelectDefaultAccount } from '../../actions/actionCreators'
import { connect } from 'react-redux'
import AlertAsync from 'react-native-alert-async'
import { clearAllCoinIntervals } from "../../actions/actionDispatchers"
import { DLIGHT_PRIVATE, ELECTRUM, CHANNELS_NULL_TEMPLATE, CHANNELS } from "../../utils/constants/intervalConstants"
import { arrayToObject } from "../../utils/objectManip"
import { getSupportedBiometryType } from "../../utils/keychain/keychain"
import { hashAccountId } from "../../utils/crypto/hash"
import { START_COINS } from "../../utils/constants/constants"
import { SignUpRender } from "./SignUp.render"
import { createAlert } from "../../actions/actions/alert/dispatchers/alert"
import {
  KEY_DERIVATION_VERSION,
} from "../../../env/index";
import { CoinDirectory } from "../../utils/CoinData/CoinDirectory"
import { storeBiometricPassword } from "../../utils/keychain/biometrics"

class SignUp extends Component {
  constructor() {
    super();
    this.state = {
      pin: null,
      confirmPin: null,
      seeds: CHANNELS_NULL_TEMPLATE,
      publicSeedModalOpen: false,
      privateSeedModalOpen: false,
      disclaimerRealized: false,
      enableBiometry: false,
      userName: null,
      biometricAuth: {
        display_name: "",
        biometry: false
      },
      errors: {
        userName: null,
        pin: null,
        confirmPin: null,
        disclaimerRealized: null,
      },
      warnings: [],
      scanning: false,
    };
  }

  async componentDidMount() {
    this.props.dispatch(disableSelectDefaultAccount())

    this.props.activeCoinList.map((coinObj) => {
      clearAllCoinIntervals(coinObj.id);
    });

    if (this.props.route.params && this.props.route.params.data) {
      this.fillSeed(this.props.route.params.data.seed);
    }

    try {
      this.setState({
        biometricAuth: await getSupportedBiometryType()
      })
    } catch(e) {}
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData();
  };

  handleError = (error, field) => {
    let _errors = this.state.errors;
    _errors[field] = error;

    createAlert("Error", error)
    this.setState({ errors: _errors });
  };

  handleWarning = (warning) => {
    let _warnings = this.state.warnings;
    _warnings.push(warning);

    this.setState({ warnings: _warnings });
  };

  hasAccount = () => {
    return this.props.accounts.length > 0
  }

  duplicateAccount = (accountID) => {
    let index = 0;

    while (
      index < this.props.accounts.length &&
      accountID !== this.props.accounts[index].id
    ) {
      index++;
    }

    if (index < this.props.accounts.length) {
      return true;
    } else {
      return false;
    }
  };

  cancel = () => {
    this.props.navigation.dispatch(NavigationActions.back());
  };

  validateFormData = () => {
    this.setState(
      {
        errors: {
          userName: null,
          pin: null,
          confirmPin: null,
          disclaimerRealized: null,
        },
        warnings: [],
      },
      async () => {
        const _userName = this.state.userName;
        const _pin = this.state.pin;
        const _seeds = this.state.seeds;
        const _confirmPin = this.state.confirmPin;
        const _disclaimerRealized = this.state.disclaimerRealized;
        let _errors = false;
        let _warnings = false;

        if (!_userName || _userName.length < 1) {
          this.handleError("Please enter a profile name.", "userName");
          _errors = true;
        } else if (_userName.length > 50) {
          this.handleError("Please enter a profile name shorter than 50 characters.", "userName");
          _errors = true;
        } else if (this.duplicateAccount(_userName)) {
          this.handleError("A profile with this name already exists.", "userName");
          _errors = true;
        }

        if (_seeds[ELECTRUM] == null) {
          createAlert(
            "Error",
            "Please configure at least a primary seed."
          );
          _errors = true;
        }

        if (!_pin || _pin.length < 1) {
          this.handleError("Please enter a password.", "pin");
          _errors = true;
        } else if (_pin.length < 5) {
          this.handleError("Your password must be at least 5 characters long.", "pin");
          _errors = true;
        }

        if (_pin !== _confirmPin) {
          this.handleError("Passwords do not match.", "confirmPin");
          _errors = true;
        }

        // if (!_disclaimerRealized && !_errors) {
        //   //this.handleError("Ensure you are aware of the risks of sharing your passphrase/seed", "disclaimerRealized")
        //   createAlert(
        //     "Wait!",
        //     "Ensure you are aware of the risks of sharing your passphrase/seed"
        //   );
        //   _errors = true;
        // }

        if (!_errors && !_warnings) {
          let biometry = false

          if (this.state.enableBiometry) {
            try {
              await storeBiometricPassword(hashAccountId(this.state.userName), this.state.pin)
              biometry = true
            } catch(e) {
              console.warn(e)
            }
          }

          const hadAccount = this.hasAccount()

          addUser(
            this.state.userName,
            arrayToObject(CHANNELS, (acc, channel) => _seeds[channel], true),
            this.state.pin,
            this.props.accounts,
            biometry,
            KEY_DERIVATION_VERSION
          ).then(async (action) => {
            this.createAccount(action);
            await this.addStartingCoins(this.state.userName)

            if (hadAccount) {
              this.props.navigation.dispatch(NavigationActions.back());
            }
          })
          .catch((e) => {
            console.warn(e);
          });
        } else if (!_errors) {
          this.canMakeAccount()
            .then(async (res) => {
              if (res) {
                let biometry = false

                if (this.state.enableBiometry) {
                  try {
                    await storeBiometricPassword(hashAccountId(this.state.userName), this.state.pin)
                    biometry = true
                  } catch(e) {
                    console.warn(e)
                  }
                }

                const hadAccount = this.hasAccount()
                
                addUser(
                  this.state.userName,
                  arrayToObject(CHANNELS, (acc, channel) => _seeds[channel], true),
                  this.state.pin,
                  this.props.accounts,
                  biometry,
                  KEY_DERIVATION_VERSION
                )
                  .then(async (action) => {
                    this.createAccount(action)
                    await this.addStartingCoins(this.state.userName)

                    if (hadAccount) {
                      this.props.navigation.dispatch(NavigationActions.back());
                    }
                  })
                  .catch((e) => {
                    console.warn(e);
                  });
              }
            })
            .catch((e) => {
              console.warn(e);
            });
        }
      }
    );
  };

  createAccount(accountAction) {
    createAlert(
      "Account Created!",
      `${this.state.userName} account has been created. Login to continue.`
    );

    this.props.dispatch(accountAction);
  }

  async addStartingCoins(accountId) {
    for (const coinId of START_COINS) {
      const fullCoinData = CoinDirectory.findCoinObj(coinId, accountId)

      this.props.dispatch(await addCoin(
        fullCoinData,
        this.props.activeCoinList,
        accountId,
        []
      ))
    }
  }

  scanSeed = () => {
    this.setState({ scanning: true });
  };

  turnOffScan = () => {
    this.setState({ scanning: false });
  };

  setupSeed = (channel) => {
    if (channel === ELECTRUM) {
      this.setState({ publicSeedModalOpen: true });
    } else if (channel === DLIGHT_PRIVATE) {
      this.setState({ privateSeedModalOpen: true });
    }
  };

  canMakeAccount = () => {
    let alertText =
      "Please take the time to double check the following things regarding your new profile " +
      "information. If you are sure everything is correct, press continue." +
      "\n";

    for (let i = 0; i < this.state.warnings.length; i++) {
      alertText += "\n" + this.state.warnings[i] + "\n";
    }

    return AlertAsync(
      "Warning",
      alertText,
      [
        {
          text: "No, take me back",
          onPress: () => Promise.resolve(false),
          style: "cancel",
        },
        { text: "Continue", onPress: () => Promise.resolve(true) },
      ],
      {
        cancelable: false,
      }
    );
  };

  render() {
    return SignUpRender.call(this);
  }
}

const mapStateToProps = (state) => {
  return {
    accounts: state.authentication.accounts,
    //updateIntervalID: state.ledger.updateIntervalID,
    activeCoinList: state.coins.activeCoinList
  }
};

export default connect(mapStateToProps)(SignUp);