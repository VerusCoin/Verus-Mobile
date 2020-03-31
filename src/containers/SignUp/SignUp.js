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
  TouchableOpacity, 
  Switch, 
  ScrollView, 
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Alert
} from "react-native"
import { NavigationActions } from 'react-navigation'
import { FormLabel, Input, FormValidationMessage, CheckBox } from 'react-native-elements'
import { addUser } from '../../actions/actionCreators'
import { connect } from 'react-redux'
import { getKey } from '../../utils/keyGenerator/keyGenerator'
import { spacesLeadOrTrail, hasSpecialCharacters } from '../../utils/stringUtils'
import AlertAsync from 'react-native-alert-async'
import ScanSeed from '../../components/ScanSeed'
import SetupSeedModal from '../../components/SetupSeedModal/SetupSeedModal'
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { clearAllCoinIntervals } from "../../actions/actionDispatchers"
import { DLIGHT, ELECTRUM } from "../../utils/constants/intervalConstants"

class SignUp extends Component {
  constructor() {
    super();
    this.state = {
      wifKey: null,
      pin: null,
      confirmPin: null,
      wifSaved: false,
      seeds: {
        [DLIGHT]: null,
        [ELECTRUM]: null
      },
      publicSeedModalOpen: false,
      privateSeedModalOpen: false,
      disclaimerRealized: false,
      userName: null,
      errors: {
        userName: null,
        wifKey: null,
        pin: null,
        confirmPin: null,
        wifSaved: null,
        disclaimerRealized: null
      },
      warnings: [],
      scanning: false
    };
  }

  componentWillMount() {
    /*if (this.props.updateIntervalID) {
      console.log("Update interval ID detected as " + this.props.updateIntervalID + ", clearing...")
      clearInterval(this.props.updateIntervalID)
      this.props.dispatch(setUpdateIntervalID(null))
    }*/
    this.props.activeCoinList.map(coinObj => {
      clearAllCoinIntervals(coinObj.id);
    });

    if (
      this.props.navigation.state.params &&
      this.props.navigation.state.params.data
    ) {
      this.fillSeed(this.props.navigation.state.params.data.seed);
    }
  }

  setKey = () => {
    this.setState({ wifKey: getKey(24) });
  };

  _handleSubmit = () => {
    Keyboard.dismiss();
    this.validateFormData();
  };

  handleError = (error, field) => {
    let _errors = this.state.errors;
    _errors[field] = error;

    this.setState({ errors: _errors });
  };

  handleWarning = warning => {
    let _warnings = this.state.warnings;
    _warnings.push(warning);

    this.setState({ warnings: _warnings });
  };

  duplicateAccount = accountID => {
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
          wifKey: null,
          pin: null,
          confirmPin: null,
          wifSaved: null,
          disclaimerRealized: null
        },
        warnings: []
      },
      () => {
        const _userName = this.state.userName;
        const _wifKey = this.state.wifKey;
        const _pin = this.state.pin;
        const _confirmPin = this.state.confirmPin;
        const _wifSaved = this.state.wifSaved;
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

        if (!_wifKey || _wifKey.length < 1) {
          this.handleError("Required field", "wifKey");
          _errors = true;
        } else if (_wifKey.length < 15) {
          this.handleError("Min. 15 characters", "wifKey");
          _errors = true;
        } else if (!hasSpecialCharacters(_wifKey)) {
          this.handleError(
            "Seed cannot include any special characters",
            "wifKey"
          );
          _errors = true;
        } else {
          if (spacesLeadOrTrail(_wifKey)) {
            this.handleWarning("• Seed contains leading or trailing spaces");
            _warnings = true;
          }

          if (_wifKey.length < 30) {
            this.handleWarning(
              "• Seed is less than 30 characters, it is recommended that" +
                " you create a long, complex seed, as anyone with access to it " +
                "will have access to your funds"
            );
            _warnings = true;
          }
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

        if (!_wifSaved && !_errors) {
          //this.handleError("Make sure to save your WIF key", "wifSaved")
          Alert.alert("Wait!", "Make sure to save your WIF key");
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
            { electrum: this.state.wifKey },
            this.state.pin,
            this.props.accounts
          ).then(action => {
            this.props.dispatch(action);
          });
        } else if (!_errors) {
          this.canMakeAccount()
            .then(res => {
              if (res) {
                addUser(
                  this.state.userName,
                  { electrum: this.state.wifKey },
                  this.state.pin,
                  this.props.accounts
                )
                  .then(action => {
                    this.props.dispatch(action);
                  })
                  .catch(e => {
                    console.warn(e);
                  });
              }
            })
            .catch(e => {
              console.warn(e);
            });
        }
      }
    );
  };

  scanSeed = () => {
    this.setState({ scanning: true });
  };

  turnOffScan = () => {
    this.setState({ scanning: false });
  };

  setupSeed = (channel) => {
    const { seeds } = this.state
    const oppositeChannel = channel === ELECTRUM ? DLIGHT : ELECTRUM

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
            style: "cancel"
          },
          { text: "Yes", onPress: () => Promise.resolve(true) }
        ],
        {
          cancelable: false
        }
      ).then(canCopySeed => {
        if (canCopySeed) {
          this.setState(
            {
              seeds: {
                ...seeds,
                [channel]: seeds[oppositeChannel]
              }
            },
            () => {
              console.log(this.state.seeds);
            }
          );
        }
      });
    } else if (channel === ELECTRUM) this.setState({ publicSeedModalOpen: true })
    else if (channel === DLIGHT) this.setState({ privateSeedModalOpen: true })
  }

  handleScan = seed => {
    this.turnOffScan();
    this.setState({ wifKey: seed });
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
          style: "cancel"
        },
        { text: "Continue", onPress: () => Promise.resolve(true) }
      ],
      {
        cancelable: false
      }
    );
  };

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {!this.state.scanning ? (
          <ScrollView
            style={Styles.flexBackground}
            contentContainerStyle={Styles.centerContainer}
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
                  seeds: { ...this.state.seeds, [channel]: seed }
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
                  seeds: { ...this.state.seeds, [channel]: seed }
                });
              }}
              channel={DLIGHT}
            />
            <View style={Styles.headerContainer}>
              <Text style={Styles.centralHeader}>Create New Account</Text>
            </View>
            {/* <View style={Styles.wideBlock}>
              <Input
                label={"Wallet passphrase/WIF key (min. 15 characters):"}
                labelStyle={styles.formLabel}
                underlineColorAndroid={Colors.quinaryColor}
                onChangeText={text => this.setState({ wifKey: text })}
                value={this.state.wifKey}
                autoCapitalize={"none"}
                autoCorrect={false}
                secureTextEntry={true}
                shake={this.state.errors.wifKey}
                inputStyle={styles.wifInput}
                multiline={Platform.OS === "ios" ? false : true}
              />
              <StandardButton
                style={styles.scanSeedButton}
                title="SCAN SEED FROM QR"
                onPress={this.scanSeed}
              />
              <StandardButton
                style={styles.generatePassphraseButton}
                title="GENERATE RANDOM PASSPHRASE"
                onPress={this.setKey}
                buttonStyle={{
                  fontSize: 14,
                  color: "#fff",
                  fontFamily: "Avenir-Black"
                }}
              />
              <Input
                label={"Plaintext Passphrase Display:"}
                labelStyle={styles.passphraseDisplayLabel}
                value={this.state.wifKey}
                inputStyle={styles.wifInput}
                multiline={true}
                editable={false}
                errorMessage={
                  this.state.errors.wifKey ? this.state.errors.wifKey : null
                }
              />
            </View> */}
            <View style={Styles.wideBlock}>
              <Input
                labelStyle={Styles.formInputLabel}
                containerStyle={Styles.fullWidthBlock}
                label={"Enter a username:"}
                underlineColorAndroid={Colors.quinaryColor}
                onChangeText={text => this.setState({ userName: text })}
                autoCapitalize={"none"}
                autoCorrect={false}
                shake={this.state.errors.userName}
                errorMessage={
                  this.state.errors.userName ? this.state.errors.userName : null
                }
              />
            </View>
            <View style={Styles.wideBlock}>
              <CheckBox
                title="Setup Primary (T Address) Seed"
                checked={this.state.seeds[ELECTRUM] != null}
                textStyle={Styles.defaultText}
                onPress={() => this.setupSeed(ELECTRUM)}
              />
              <CheckBox
                title="Setup Secondary (Z Address) Seed"
                checked={this.state.seeds[DLIGHT] != null}
                textStyle={Styles.defaultText}
                onPress={() => this.setupSeed(DLIGHT)}
              />
            </View>
            <View style={Styles.fullWidthFlexCenterBlock}>
              <View style={Styles.wideBlock}>
                <Input
                  labelStyle={Styles.formInputLabel}
                  label={"Enter an account password (min. 5 characters):"}
                  underlineColorAndroid={Colors.quinaryColor}
                  onChangeText={text => this.setState({ pin: text })}
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  secureTextEntry={true}
                  shake={this.state.errors.pin}
                  errorMessage={
                    this.state.errors.pin ? this.state.errors.pin : null
                  }
                />
              </View>
              <View style={Styles.wideBlock}>
                <Input
                  labelStyle={Styles.formInputLabel}
                  label={"Confirm account password:"}
                  underlineColorAndroid={Colors.quinaryColor}
                  onChangeText={text => this.setState({ confirmPin: text })}
                  autoCapitalize={"none"}
                  autoCorrect={false}
                  secureTextEntry={true}
                  shake={this.state.errors.confirmPin}
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
                    disclaimerRealized: !this.state.disclaimerRealized
                  })
                }
              />
            </View>
            <View style={Styles.footerContainer}>
              <View
                style={
                  this.props.accounts.length > 0
                    ? Styles.standardWidthSpaceBetweenBlock
                    : Styles.fullWidthFlexCenterBlock
                }
              >
                {this.props.accounts.length > 0 && (
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
          </ScrollView>
        ) : (
          <ScanSeed cancel={this.turnOffScan} onScan={this.handleScan} />
        )}
      </TouchableWithoutFeedback>
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