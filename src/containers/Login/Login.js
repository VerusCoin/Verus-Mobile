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
  Keyboard, 
  TouchableWithoutFeedback,
  Alert
} from "react-native";
import { Button, Portal, TextInput, Checkbox } from "react-native-paper";
import { connect } from 'react-redux';
import { 
  validateLogin, 
  setUserCoins, 
  fetchActiveCoins,
  signIntoAuthenticatedAccount,
  COIN_MANAGER_MAP, 
  saveGeneralSettings,
  initSettings
 } from '../../actions/actionCreators';
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { clearActiveAccountLifecycles, clearAllCoinIntervals, initializeAccountData, initPersonalDataForUser, initServiceStoredDataForUser } from "../../actions/actionDispatchers";
import { activateChainLifecycle } from "../../actions/actions/intervals/dispatchers/lifecycleManager";
import PasswordInput from '../../components/PasswordInput'
import { DISABLED_CHANNELS } from '../../../env/index'

import { removeIdentityData } from '../../utils/asyncStore/identityStorage';
import { getBiometricPassword, getSupportedBiometryType } from "../../utils/keychain/keychain";
import { VerusLogo } from "../../images/customIcons";
import ListSelectionModal from "../../components/ListSelectionModal/ListSelectionModal";
import { TouchableOpacity } from "react-native";
import { clearAllPersonalData } from "../../utils/asyncStore/personalDataStorage";
import { LOADING_ACCOUNT, VALIDATING_ACCOUNT } from "../../utils/constants/constants";

const NO_ACCOUNT = "NO_ACCOUNT"

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
      errors: {selectedAccount: null, password: null},
      accountSelectModalOpen: false
    };

    this.passwordInput = React.createRef();
  }

  componentDidMount() {
    if (this.props.defaultAccount != null && this.props.selectDefaultAccount) {
      const defaultAccountObj = this.props.accounts.find(
        (account) => account.accountHash === this.props.defaultAccount
      );

      if (defaultAccountObj) {
        this.selectAccount(defaultAccountObj)
      }
    }
  }

  setLoadingStep = (loadingStep) => {
    switch (loadingStep) {
      case VALIDATING_ACCOUNT:
        this.setState({
          validating: true,
          loading: false
        })
        break;
      case LOADING_ACCOUNT:
        this.setState({
          validating: false,
          loading: true
        })
        break;
      default:
        break;
    }
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    const account = this.state.selectedAccount;

    this.setState({ validating: true }, async () => {
      try {
        await initializeAccountData(
          account,
          this.state.password,
          this.state.makeDefaultAccount,
          (step) => this.setLoadingStep(step)
        );
      } catch(e) {
        console.warn(e)
        this.setState({
          validating: false,
          loading: false,
          simpleLayout: false
        })
      }
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
    this.setState({
      selectedAccount: account,
      makeDefaultAccount: this.props.defaultAccount === account.accountHash,
    });
  }

  clearIdentityStorage = () => {
    removeIdentityData();
  }

  selectAccount = (account) => {
    Keyboard.dismiss()
  
    this.setState(
      {
        selectedAccount: account,
        makeDefaultAccount:
          this.props.defaultAccount === account.accountHash,
      },
      async () => {
        if (
          account.biometry &&
          (await getSupportedBiometryType()).biometry
        ) {
          try {
            const password = await getBiometricPassword(
              account.accountHash,
              "Authenticate to unlock profile"
            );

            this.setState({ password }, this._handleSubmit);
          } catch (e) {
            console.warn(e);
            this.setState({
              simpleLayout: false,
              validating: false,
            });
          }
        } else {
          this.setState({
            simpleLayout: false,
          });
        }
      }
    );
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
          <Portal>
            {this.state.accountSelectModalOpen && (
              <ListSelectionModal
                title="Select a Profile"
                flexHeight={1}
                selectedKey={
                  this.state.selectedAccount.accountHash == null
                    ? NO_ACCOUNT
                    : this.state.selectedAccount.accountHash
                }
                visible={this.state.accountSelectModalOpen}
                onSelect={(item) => this.selectAccount(item.account)}
                data={this.props.accounts.map((item) => {
                    return {
                      key: item.accountHash,
                      title: item.id,
                      account: item,
                    };
                  })}
                cancel={() =>
                  this.setState({ accountSelectModalOpen: false })
                }
              />
            )}
          </Portal>
          <VerusLogo
            width={"60%"}
            height={"15%"}
          />
          <TouchableOpacity
            onPress={() => this.setState({ accountSelectModalOpen: true })}
            style={{...Styles.wideBlock, ...Styles.threeQuarterWidthBlock}}
          >
            <TextInput
              label="Select a Profile"
              dense
              value={
                this.state.selectedAccount.id
              }
              editable={false}
              pointerEvents="none"
              style={{
                backgroundColor: Colors.secondaryColor,
              }}
            />
          </TouchableOpacity>
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
          <View style={{...Styles.wideBlock, ...Styles.threeQuarterWidthBlock}}>
            <Checkbox.Item
              color={Colors.primaryColor}
              label={"Make default"}
              status={
                this.state.makeDefaultAccount
                  ? "checked"
                  : "unchecked"
              }
              onPress={() => this.setState({ makeDefaultAccount: !this.state.makeDefaultAccount })}
              mode="android"
            />
          </View>
          <View style={Styles.fullWidthFlexCenterBlock}>
            {(!this.state.simpleLayout ||
              this.state.validating ||
              this.state.loading) && (
              <View style={Styles.standardWidthCenterBlock}>
                <Button
                  onPress={this.validateFormData}
                  color={Colors.primaryColor}
                  disabled={this.state.validating || this.state.loading}
                  loading={this.state.validating || this.state.loading}
                >
                  {this.state.loading
                    ? "Unlocking Wallet"
                    : this.state.validating
                    ? "Validating User"
                    : "Unlock"}
                </Button>
              </View>
            )}
            {!(this.state.validating || this.state.loading) && (
              <View style={Styles.flexCenterRowBlock}>
                <Button
                  onPress={this._handleAddUser}
                  color={Colors.primaryColor}
                >
                  {"Add a profile"}
                </Button>
              </View>
            )}
          </View>
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