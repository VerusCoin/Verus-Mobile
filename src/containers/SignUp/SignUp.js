/*
  This component represents the screen that the user is met with
  if there is no account present in AsyncStorage. It allows them
  to create an account by using a seed, username and password.
  It is crucial that they understand the importance of their seed.
*/  

import React, { Component } from "react"
import StandardButton from "../../components/StandardButton"
import { 
  View, 
  Text, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  Alert,
  ListView
} from "react-native"
import { NavigationActions } from '@react-navigation/compat'
import { Input, CheckBox } from 'react-native-elements'
import { addUser } from '../../actions/actionCreators'
import { connect } from 'react-redux'
import AlertAsync from 'react-native-alert-async'
import SetupSeedModal from '../../components/SetupSeedModal/SetupSeedModal'
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { clearAllCoinIntervals } from "../../actions/actionDispatchers"
import { DLIGHT, ELECTRUM } from "../../utils/constants/intervalConstants"

class SignUp extends Component {
  constructor() {
    super();
    this.state = {
      pin: null,
      confirmPin: null,
      seeds: {
        [DLIGHT]: null,
        [ELECTRUM]: null,
      },
      publicSeedModalOpen: false,
      privateSeedModalOpen: false,
      disclaimerRealized: false,
      userName: null,
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

  componentDidMount() {
    this.props.activeCoinList.map((coinObj) => {
      clearAllCoinIntervals(coinObj.id);
    });

    if (this.props.route.params && this.props.route.params.data) {
      this.fillSeed(this.props.route.params.data.seed);
    }
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData();
  };

  handleError = (error, field) => {
    let _errors = this.state.errors;
    _errors[field] = error;

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
      () => {
        const _userName = this.state.userName;
        const _pin = this.state.pin;
        const _seeds = this.state.seeds;
        const _confirmPin = this.state.confirmPin;
        const _disclaimerRealized = this.state.disclaimerRealized;
        let _errors = false;
        let _warnings = false;

        if (!_userName || _userName.length < 1) {
          this.handleError("Required field", "userName");
          _errors = true;
        } else if (_userName.length > 15) {
          this.handleError("Max character count exceeded", "userName");
          _errors = true;
        } else if (this.duplicateAccount(_userName)) {
          this.handleError("Account with this name already exists", "userName");
          _errors = true;
        }

        if (_seeds[ELECTRUM] == null || (_seeds[DLIGHT] == null && global.ENABLE_DLIGHT === true)) {
          Alert.alert(
            "Error",
            "Please configure both a primary seed, and a secondary seed."
          );
          _errors = true;
        }

        if (!_pin || _pin.length < 1) {
          this.handleError("Required field", "pin");
          _errors = true;
        } else if (_pin.length < 5) {
          this.handleError("Min 5 characters", "pin");
          _errors = true;
        }

        if (_pin !== _confirmPin) {
          this.handleError("Passwords do not match", "confirmPin");
          _errors = true;
        }

        if (!_disclaimerRealized && !_errors) {
          //this.handleError("Ensure you are aware of the risks of sharing your passphrase/seed", "disclaimerRealized")
          Alert.alert(
            "Wait!",
            "Ensure you are aware of the risks of sharing your passphrase/seed"
          );
          _errors = true;
        }

        if (!_errors && !_warnings) {
          addUser(
            this.state.userName,
            {
              [ELECTRUM]: _seeds[ELECTRUM],
              [DLIGHT]: global.ENABLE_DLIGHT
                ? _seeds[ELECTRUM]
                : _seeds[DLIGHT],
            },
            this.state.pin,
            this.props.accounts
          ).then((action) => {
            this.createAccount(action);
          });
        } else if (!_errors) {
          this.canMakeAccount()
            .then((res) => {
              if (res) {
                addUser(
                  this.state.userName,
                  { [ELECTRUM]: _seeds[ELECTRUM], [DLIGHT]: _seeds[DLIGHT] },
                  this.state.pin,
                  this.props.accounts
                )
                  .then((action) => {
                    this.createAccount(action)
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
    Alert.alert(
      "Account Created!",
      `${this.state.userName} account has been created. Login to continue.`
    );

    this.props.dispatch(accountAction);
  }

  scanSeed = () => {
    this.setState({ scanning: true });
  };

  turnOffScan = () => {
    this.setState({ scanning: false });
  };

  setupSeed = (channel) => {
    const { seeds } = this.state;
    const oppositeChannel = channel === ELECTRUM ? DLIGHT : ELECTRUM;

    if (!seeds[channel] && seeds[oppositeChannel]) {
      AlertAsync(
        "Copy Seed?",
        "Would you like to use the same seed as both your primary seed, and secondary seed?." +
          "\n\n" +
          "If you use private addresses and transactions, this would make your private addresses derived from the same source as your transparent addresses.",
        [
          {
            text: "No",
            onPress: () => Promise.resolve(false),
            style: "cancel",
          },
          { text: "Yes", onPress: () => Promise.resolve(true) },
        ],
        {
          cancelable: false,
        }
      ).then((canCopySeed) => {
        if (canCopySeed) {
          this.setState({
            seeds: {
              ...seeds,
              [channel]: seeds[oppositeChannel],
            },
          });
        } else if (channel === ELECTRUM) {
          this.setState({ publicSeedModalOpen: true });
        } else if (channel === DLIGHT)
          this.setState({ privateSeedModalOpen: true });
      });
    } else if (channel === ELECTRUM) {
      this.setState({ publicSeedModalOpen: true });
    } else if (channel === DLIGHT)
      this.setState({ privateSeedModalOpen: true });
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
    return (
      <React.Fragment>
        <View style={Styles.headerContainer}>
          <Text style={Styles.centralHeader}>Create New Account</Text>
        </View>
        <TouchableWithoutFeedback
          onPress={Keyboard.dismiss}
          accessible={false}
        >
          <View style={Styles.flexBackground}>
            <ScrollView
              contentContainerStyle={{
                ...Styles.centerContainer,
                ...Styles.innerHeaderFooterContainer,
              }}
            >
              <SetupSeedModal
                animationType="slide"
                transparent={false}
                visible={this.state.publicSeedModalOpen}
                qrString={this.state.verusQRString}
                cancel={() => {
                  this.setState({ publicSeedModalOpen: false });
                }}
                setSeed={(seed, channel) => {
                  this.setState({
                    seeds: { ...this.state.seeds, [channel]: seed },
                  });
                }}
                channel={ELECTRUM}
              />
              <SetupSeedModal
                animationType="slide"
                transparent={false}
                visible={this.state.privateSeedModalOpen}
                qrString={this.state.verusQRString}
                cancel={() => {
                  this.setState({ privateSeedModalOpen: false });
                }}
                setSeed={(seed, channel) => {
                  this.setState({
                    seeds: { ...this.state.seeds, [channel]: seed },
                  });
                }}
                channel={DLIGHT}
              />
              <View style={Styles.wideBlock}>
                <Input
                  labelStyle={Styles.formInputLabel}
                  containerStyle={Styles.fullWidthBlock}
                  inputStyle={Styles.inputTextDefaultStyle}
                  label={"Enter a username:"}
                  onChangeText={(text) => this.setState({ userName: text })}
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  errorMessage={
                    this.state.errors.userName
                      ? this.state.errors.userName
                      : null
                  }
                />
              </View>
              <View style={Styles.wideBlock}>
                <CheckBox
                  title={global.ENABLE_DLIGHT ? "Setup Primary (T Address) Seed" : "Setup Wallet Seed"}
                  checked={this.state.seeds[ELECTRUM] != null}
                  textStyle={Styles.defaultText}
                  onPress={() => this.setupSeed(ELECTRUM)}
                />
                {global.ENABLE_DLIGHT && (
                  <CheckBox
                    title="Setup Secondary (Z Address) Seed"
                    checked={this.state.seeds[DLIGHT] != null}
                    textStyle={Styles.defaultText}
                    onPress={() => this.setupSeed(DLIGHT)}
                  />
                )}
              </View>
              <View style={Styles.fullWidthFlexCenterBlock}>
                <View style={Styles.wideBlock}>
                  <Input
                    labelStyle={Styles.formInputLabel}
                    label={"Enter an account password (min. 5 characters):"}
                    inputStyle={Styles.inputTextDefaultStyle}
                    onChangeText={(text) => this.setState({ pin: text })}
                    autoCapitalize={"none"}
                    autoCorrect={false}
                    secureTextEntry={true}
                    errorMessage={
                      this.state.errors.pin ? this.state.errors.pin : null
                    }
                  />
                </View>
                <View style={Styles.wideBlock}>
                  <Input
                    labelStyle={Styles.formInputLabel}
                    label={"Confirm account password:"}
                    inputStyle={Styles.inputTextDefaultStyle}
                    onChangeText={(text) =>
                      this.setState({ confirmPin: text })
                    }
                    autoCapitalize={"none"}
                    autoCorrect={false}
                    secureTextEntry={true}
                    errorMessage={
                      this.state.errors.confirmPin
                        ? this.state.errors.confirmPin
                        : null
                    }
                  />
                </View>
              </View>
              <View style={Styles.wideBlock}>
                <CheckBox
                  title="I realize anybody with access to my seeds/passphrases will have access to my funds:"
                  checked={this.state.disclaimerRealized}
                  textStyle={Styles.defaultText}
                  onPress={() =>
                    this.setState({
                      disclaimerRealized: !this.state.disclaimerRealized,
                    })
                  }
                />
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
        <View style={Styles.footerContainer}>
          <View
            style={
              this.hasAccount()
                ? Styles.standardWidthSpaceBetweenBlock
                : Styles.fullWidthFlexCenterBlock
            }
          >
            {this.hasAccount() && (
              <StandardButton
                title="CANCEL"
                onPress={this.cancel}
                color={Colors.warningButtonColor}
              />
            )}
            <StandardButton
              title="ADD ACCOUNT"
              onPress={this._handleSubmit}
              color={Colors.successButtonColor}
            />
          </View>
        </View>
      </React.Fragment>
    );
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