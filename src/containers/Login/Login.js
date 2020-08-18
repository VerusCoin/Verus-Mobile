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
  Text, 
  Keyboard, 
  TouchableWithoutFeedback, 
  ActivityIndicator, 
  Image,
  Alert,
} from "react-native";
import { connect } from 'react-redux';
import { 
  validateLogin, 
  setUserCoins, 
  //everythingNeedsUpdate, 
  fetchActiveCoins,
  signIntoAuthenticatedAccount,
  addCoin,
  //setUpdateIntervalID
 } from '../../actions/actionCreators';
import { Dropdown } from 'react-native-material-dropdown';
import { Verus } from '../../images/customIcons/index';
import Styles from '../../styles/index'
import Colors from '../../globals/colors';
import { clearAllCoinIntervals } from "../../actions/actionDispatchers";
import { activateChainLifecycle } from "../../actions/actions/intervals/dispatchers/lifecycleManager";
import StandardButton from "../../components/StandardButton";
import PasswordInput from '../../components/PasswordInput'
import { DLIGHT } from "../../utils/constants/intervalConstants";
import { initDlightWallet } from "../../actions/actions/dlight/dispatchers/LightWalletReduxManager";

import { removeIdentityData } from '../../utils/asyncStore/identityStorage';
import { TouchableHighlight } from "react-native-gesture-handler";

class Login extends Component {
  constructor(props) {
    super(props);
    this.state = {
      password: null,
      selectedAccount: {id: null},
      loading: false,
      validating: false,
      errors: {selectedAccount: null, password: null}
    };

    this.passwordInput = React.createRef();
  }

  componentDidMount() {
    this.props.activeCoinList.map(coinObj => {
      clearAllCoinIntervals(coinObj.id)
    })
  }

  _handleSubmit = () => {
    Keyboard.dismiss();
    const account = this.state.selectedAccount;
    this.setState({validating: true})

    validateLogin(account, this.state.password)
      .then(response => {
        if(response !== false) {
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
          if (global.ENABLE_DLIGHT && this.props.coinSettings[activeCoinsForUser[i].id].channels.includes(DLIGHT)) {
            await initDlightWallet(activeCoinsForUser[i])
          }
  
          activateChainLifecycle(activeCoinsForUser[i].id);
        }

        this.props.dispatch(signIntoAuthenticatedAccount())
      })
      .catch(err => {
        console.warn(err)
        Alert.alert("Error", err.message)
      });
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
        Alert.alert("No Account Selected", "Please select an account.")
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

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={Styles.focalCenter}>
          <Image
            source={Verus}
            style={{
              height: "20%",
              marginBottom: "5%"
            }}
            resizeMode="contain"
          />
          {/* {<TouchableHighlight onPress={this.clearIdentityStorage}><Text>Clear identity storage</Text></TouchableHighlight>} */}
          <Text style={Styles.centralHeader}>Select an Account</Text>
          <Dropdown
            containerStyle={Styles.standardWidthBlock}
            labelExtractor={(item, index) => {
              return item.id;
            }}
            valueExtractor={(item, index) => {
              return item;
            }}
            data={this.props.accounts}
            onChangeText={(value, index, data) => {
              this.setState({ selectedAccount: value });
            }}
            textColor={Colors.quinaryColor}
            selectedItemColor={Colors.quinaryColor}
            baseColor={Colors.quinaryColor}
            label="Select Account..."
            labelTextStyle={Styles.defaultText}
            pickerStyle={{ backgroundColor: Colors.tertiaryColor }}
            itemTextStyle={Styles.defaultText}
          />
          <PasswordInput 
            onChangeText={text => this.setState({ password: text })}
            errorMessage={
              this.state.errors.password ? this.state.errors.password : null
            }
          />
          {this.state.loading ? (
            <View style={Styles.fullWidthFlexCenterBlock}>
              <Text style={Styles.centralHeader}>Unlocking Wallet</Text>
              <ActivityIndicator animating={this.state.loading} size="large" />
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
              <StandardButton
                title="UNLOCK"
                onPress={this.validateFormData}
                buttonStyle={Styles.fullWidthButton}
                containerStyle={Styles.standardWidthCenterBlock}
              />
              <View style={Styles.flexCenterRowBlock}>
                <Text style={Styles.linkText} onPress={this._handleAddUser}>
                  {" "}
                  Add an account
                </Text>
              </View>
            </View>
          )}
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    accounts: state.authentication.accounts,
    activeCoinList: state.coins.activeCoinList,
    coinSettings: state.settings.coinSettings
    //updateIntervalID: state.ledger.updateIntervalID
  }
};

export default connect(mapStateToProps)(Login);