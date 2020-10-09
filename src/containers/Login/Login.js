/*
  This component's purpose is to present the user with the option 
  to log into their accounts, and will only be shown if at least on account 
  exists on the mobile device. It uses the user-entered username and password
  to find and decrypt the wallet seed in asyncStorage. When mounted, it clears
  any detecting app update heartbeats located from before, and upon successfull 
  login, creates a new update heartbeat interval.
*/

import React, { Component } from "react";
import { 
  View,
  ScrollView,
  Text, 
  Keyboard, 
  TouchableWithoutFeedback, 
  ActivityIndicator, 
  Image,
  Alert
} from "react-native";
import { connect } from 'react-redux';
import { 
  validateLogin, 
  setUserCoins, 
  fetchActiveCoins,
  signIntoAuthenticatedAccount,
  COIN_MANAGER_MAP, 
  saveGeneralSettings
 } from '../../actions/actionCreators';
import { Dropdown } from 'react-native-material-dropdown';
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { clearAllCoinIntervals } from "../../actions/actionDispatchers";
import { activateChainLifecycle } from "../../actions/actions/intervals/dispatchers/lifecycleManager";
import StandardButton from "../../components/StandardButton";
import PasswordInput from '../../components/PasswordInput'
import { DISABLED_CHANNELS } from '../../../env/main.json'

import { removeIdentityData } from '../../utils/asyncStore/identityStorage';
import { getBiometricPassword, getSupportedBiometryType } from "../../utils/biometry/biometry";
import { VerusLogo } from "../../images/customIcons";

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      password: null,
      selectedAccount: {id: null},
      loading: false,
      validating: false,
      simpleLayout: true,
      makeDefaultAccount: false,
      errors: {selectedAccount: null, password: null}
    };

    this.passwordInput = React.createRef();
  }

  componentDidMount() {
    this.props.activeCoinList.map(coinObj => {
      clearAllCoinIntervals(coinObj.id)
    })

    if (this.props.defaultAccount != null && this.props.selectDefaultAccount) {
      const defaultAccountObj = this.props.accounts.find(
        (account) => account.accountHash === this.props.defaultAccount
      );

      if (defaultAccountObj) {
        this.selectAccount(defaultAccountObj)
      }
    }
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    const account = this.state.selectedAccount;

    this.setState({ validating: true }, () => {
      validateLogin(account, this.state.password)
      .then(async response => {
        if(response !== false) {
          if (this.state.makeDefaultAccount) {
            await saveGeneralSettings({
              defaultAccount: account.accountHash
            })
          }

          this.setState({loading: true})
          let promiseArr = [fetchActiveCoins(), response]
          return Promise.all(promiseArr);
        }
        else {
          this.setState({validating: false})
          throw new Error("Account not validated")
        }
      })
      .then(async (resArr) => {
        const accountAuthenticator = resArr[1]
        const coinList = resArr[0]
        const setUserCoinsAction = setUserCoins(coinList.activeCoinList, account.id)
        const { activeCoinsForUser } = setUserCoinsAction

        this.props.dispatch(accountAuthenticator)
        this.props.dispatch(coinList)
        this.props.dispatch(setUserCoinsAction)

        for (let i = 0; i < activeCoinsForUser.length; i++) {
          const coinObj = activeCoinsForUser[i]

          await Promise.all(coinObj.compatible_channels.map(channel => {
            if (!DISABLED_CHANNELS.includes(channel) && COIN_MANAGER_MAP.initializers[channel]) {
              return COIN_MANAGER_MAP.initializers[channel](coinObj)
            } else return null
          }))
  
          activateChainLifecycle(coinObj.id);
        }

        this.props.dispatch(signIntoAuthenticatedAccount())
      })
      .catch(err => {
        console.warn(err)
        this.setState({
          validating: false,
          simpleLayout: false
        })
      });
    })
  }

  handleError = (error, field) => {
    let _errors = this.state.errors
    _errors[field] = error

    this.setState({errors: _errors})
  }

  validateFormData = () => {
    this.setState({
      errors: {selectedAccount: null, password: null}
    }, () => {
      const _selectedAccount = this.state.selectedAccount
      const _password = this.state.password

      let _errors = false;

      if (!_selectedAccount.id) {
        Alert.alert("No Account Selected", "Please select a profile.")
        _errors = true
      } 

      if (!_password || _password.length < 1) {
        this.handleError("Required field", "password")
        _errors = true
      } 

      if (!_errors) {
        this._handleSubmit()
      } else {
        return false;
      }
    });
  }

  _handleAddUser = () => {
    let navigation = this.props.navigation;
    navigation.navigate("SignIn")
  }

  _selectAccount = (index) => {
    let account = this.props.accounts[index]
    this.setState({selectedAccount: account})
  }

  clearIdentityStorage = () => {
    removeIdentityData();
  }

  selectAccount = (account) => {
    Keyboard.dismiss()
  
    this.setState({ selectedAccount: account }, async () => {
      if (account.biometry && (await getSupportedBiometryType()).biometry) {
        try {
          const password = await getBiometricPassword(account.accountHash, "Authenticate to unlock profile")

          this.setState({ password }, this._handleSubmit)
        } catch(e) {
          console.warn(e)
          this.setState({
            simpleLayout: false,
            validating: false
          })
        }
      } else {
        this.setState({
          simpleLayout: false
        })
      }
    })
  }

  render() {
    return (
      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        <ScrollView
          contentContainerStyle={Styles.focalCenter}
          style={Styles.backgroundColorWhite}
        >
          <VerusLogo
            width={"60%"}
            height={"15%"}
            style={{ marginBottom: "5%" }}
          />
          {/* {<TouchableHighlight onPress={this.clearIdentityStorage}><Text>Clear identity storage</Text></TouchableHighlight>} */}
          <Text style={Styles.centralHeader}>
            {this.state.simpleLayout
              ? "Select a Profile"
              : "Enter Your Password"}
          </Text>
          <Dropdown
            containerStyle={Styles.standardWidthBlock}
            labelExtractor={(item, index) => {
              return item.id;
            }}
            valueExtractor={(item, index) => {
              return item;
            }}
            value={
              this.state.selectedAccount.id == null
                ? ""
                : this.state.selectedAccount
            }
            data={this.props.accounts}
            onChangeText={(value) => this.selectAccount(value)}
            textColor={Colors.quinaryColor}
            selectedItemColor={Colors.quinaryColor}
            baseColor={Colors.quinaryColor}
            label="Select Profile..."
            labelTextStyle={Styles.defaultText}
            pickerStyle={{ backgroundColor: Colors.tertiaryColor }}
            itemTextStyle={Styles.defaultText}
          />
          {!this.state.simpleLayout && !this.state.validating && (
            <PasswordInput
              onChangeText={(text) => this.setState({ password: text })}
              errorMessage={
                this.state.errors.password
                  ? this.state.errors.password
                  : null
              }
            />
          )}
          {this.state.loading ? (
            <View style={Styles.fullWidthFlexCenterBlock}>
              <Text style={Styles.centralHeader}>Unlocking Wallet</Text>
              <ActivityIndicator
                animating={this.state.loading}
                size="large"
              />
            </View>
          ) : this.state.validating ? (
            <View style={Styles.fullWidthFlexCenterBlock}>
              <Text style={Styles.centralHeader}>Validating User</Text>
              <ActivityIndicator
                animating={this.state.validating}
                size="large"
              />
            </View>
          ) : (
            <View style={Styles.fullWidthFlexCenterBlock}>
              {!this.state.simpleLayout && (
                <StandardButton
                  title="UNLOCK"
                  onPress={this.validateFormData}
                  buttonStyle={Styles.fullWidthButton}
                  containerStyle={Styles.standardWidthCenterBlock}
                />
              )}
              <View style={Styles.flexCenterRowBlock}>
                <Text style={Styles.linkText} onPress={this._handleAddUser}>
                  {" "}
                  Add a profile
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accounts: state.authentication.accounts,
    activeCoinList: state.coins.activeCoinList,
    coinSettings: state.settings.coinSettings,
    defaultAccount: state.settings.generalWalletSettings.defaultAccount,
    selectDefaultAccount: state.authentication.selectDefaultAccount
  }
};

export default connect(mapStateToProps)(Login);