import React from "react";
import { Component } from "react"
import { connect } from 'react-redux'
import {
  View,
  Linking,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard,
  Image
} from "react-native";
import { Text, TextInput, Portal, Button, HelperText } from 'react-native-paper'
import WyreProvider from "../../../../../../utils/services/WyreProvider";
import Colors from "../../../../../../globals/colors";
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import ListSelectionModal from "../../../../../../components/ListSelectionModal/ListSelectionModal";
import { expireServiceData, setServiceLoading, setValuAccount } from "../../../../../../actions/actionCreators";
import { CommonActions } from "@react-navigation/native";
import { WYRE_INDIVIDUAL_EMAIL, WYRE_SERVICE_ID } from "../../../../../../utils/constants/services";
import { VERUSID_SERVICE_ID, VALU_SERVICE_ID } from "../../../../../../utils/constants/services";
import { API_GET_SERVICE_ACCOUNT } from "../../../../../../utils/constants/intervalConstants";
import { conditionallyUpdateService, modifyPersonalDataForUser } from "../../../../../../actions/actionDispatchers";
import store from "../../../../../../store";
import { requestPersonalData } from "../../../../../../utils/auth/authBox";
import { PERSONAL_CONTACT, PERSONAL_EMAILS } from "../../../../../../utils/constants/personal";
import ValuProvider from '../../../../../../utils/services/ValuProvider';
import { VerusLogo, ValuLogo, ValuSeperator } from "../../../../../../images/customIcons";
import {
  CALLBACK_HOST,
  INCOMPATIBLE_APP,
  ONLY_ADDRESS,
  SUPPORTED_DLS,
} from '../../../../../../utils/constants/constants'
import { primitives } from 'verusid-ts-client'
import base64url from 'base64url';
import { SET_DEEPLINK_DATA } from "../../../../../../utils/constants/storeType";
import { URL } from 'react-native-url-polyfill';
import Spinner from 'react-native-loading-spinner-overlay';

class ValuAccountCreator extends Component {
  constructor(props) {
    super(props);
    this.state = {
      email: "",
      userName: "",
      loginReply: props.route?.params ? props.route?.params : null,
      loading: false,
      errors: {
        email: null,
        userName: null
      },
    };
  }

  componentDidMount() {
    console.log("this.state.loginReply: ", this.state.loginReply)
  }

  async accountSubmission() {
    try {
      const { data } = this.state.loginReply.data;

      console.log("accountSubmission: ", this.state.userName, this.state.email, data);
      const accountId = await ValuProvider.createAccount(this.state.userName, this.state.email, data);
      console.log("accountId: ", accountId);
      return accountId;

    } catch (e) {
      console.warn(e);
      await createAlert("Error", `Failed to create VALU OnRamp account. ${e.message}.`, [
        { text: "Ok", onPress: () => resolveAlert(false) },
      ]);
      throw new Error("True")
    }
  }

  async createAccount(accountId) {
    try {
      console.log("createAccount(accountId)", accountId)
      this.props.dispatch(setValuAccount({ accountId: accountId, KYCState: 1 }));
      this.props.dispatch(expireServiceData(API_GET_SERVICE_ACCOUNT))
      await conditionallyUpdateService(store.getState(), store.dispatch, API_GET_SERVICE_ACCOUNT)

      try {
        const contact = await requestPersonalData(PERSONAL_CONTACT)

        if (!contact.emails || contact.emails.find(x => x.address === this.state.email) == null) {
          const emails = contact.emails
            ? [...contact.emails, { address: this.state.email }]
            : [{ address: this.state.email }];

          await modifyPersonalDataForUser(
            { ...contact, [PERSONAL_EMAILS]: emails },
            PERSONAL_CONTACT,
            this.props.activeAccount.accountHash
          );
        }
      } catch (e) {
        console.warn(e)
      }

      await createAlert(
        "Success",
        "VALU OnRamp account created! Please continue to fill in your KYC Information to enjoy the benefits VALU has to offer",
        [
          {
            text: "OK",
            onPress: () => resolveAlert(false),
            style: "cancel",
          }
        ]
      );

      return;
    } catch (e) {

      throw e
    }
  }

  resetAndCreateAccount() {

    this.accountSubmission()
      .then(async resultok => {
        if (resultok) {
          await this.createAccount(resultok)
          this.props.navigation.navigate("Service", { VALU_SERVICE_ID });
        }
      })
      .catch(e => { });
  }

  validateFormData = () => {
    // Handle pre validation before submission
    const _email = this.state.email;
    const _userName = this.state.userName;
    const errorsLoc = {
      email: null,
      userName: null
    }

    let _errors = null;

    if (!_email.includes('@') && !_email.includes('.')) {
      errorsLoc.email = "Invalid Email";
      _errors = true;
    }

    if (!_userName.includes(' ')) {
      errorsLoc.userName = "Invalid Name";
      _errors = true;
    }

    this.setState({ errors: errorsLoc });
    return (_errors)
  }

  async tryCreateAccount() {
    const { userName, email } = this.state
    if (!this.validateFormData())
      this.resetAndCreateAccount(userName, email.trim())
  }

  async selectID() {

    this.setState({ loading: true }, async () => {
      try {
        const loginResponse = await ValuProvider.loginSignup();
        console.log("RETRUNED FROM SERVER", loginResponse)
        this.tryProcessDeeplink(loginResponse.data);
        this.setState({ loading: false })
      } catch (e) {
        this.setState({ loading: false })
        await createAlert("Error", `Failed to login. ${e.message}.`, [
          { text: "Ok", onPress: () => resolveAlert(false) },
        ]);
      }
    })

  }

  tryProcessDeeplink(urlstring) {
    let url;
    try {
      url = new URL(urlstring);
    }
    catch (e) {
      throw new Error("Did not get login Challenge from server. Please try again.")
    }

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

    console.log("login response from VALU", req.toJson());
    this.props.dispatch({
      type: SET_DEEPLINK_DATA,
      payload: {
        id,
        data: req.toJson(),
        redirect: 'ValuServiceAccount',
      },
    });
    this.props.navigation.navigate('DeepLink');
  }

  render() {

    const { loading } = this?.state;

    if (loading) {

      return (
        <Spinner
          visible={loading}
          textContent="Loading..."
          textStyle={{ color: '#FFF' }}
        />)
    }

    if (this.state?.loginReply === null) {
      return (<TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View
          style={{
            backgroundColor: "white",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            alignItems: "center",
          }}
        >
          <Image source={ValuLogo} style={Styles.valuSplashLogo} />
          <Text style={{ textAlign: "center", width: "75%", marginBottom: 20 }}>
            {"Press below to login to the VALU service using VerusID."}
          </Text>
          <Button
            onPress={async () => this.selectID()}
          >
            {"Login to VALU"}
          </Button>
        </View>
      </TouchableWithoutFeedback>)
    }
    else {
      return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View
            style={{
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: 1,
              alignItems: "center",
            }}
          >
            <Text style={{ textAlign: "center", width: "75%", marginBottom: 20 }}>
              {"Enter your Full Legal name and email address to create your VALU OnRamp account with."}
            </Text>
            <View
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                width: "75%",
              }}
            >
              <TextInput
                returnKeyType="done"
                label="Enter Full Legal name"
                value={this.state.userName}
                mode={"outlined"}
                onChangeText={(text) => this.setState({ userName: text })}
                autoCapitalize={"none"}
                error={this.state.errors.userName}
              />
              <HelperText type="error" visible={this.state.errors.userName}>{this.state.errors.userName}</HelperText>
              <TextInput
                returnKeyType="done"
                label="Enter email"
                value={this.state.email}
                mode={"outlined"}
                placeholder="email@example.com"
                onChangeText={(text) => this.setState({ email: text })}
                autoCapitalize={"none"}
                keyboardType={"email-address"}
                error={this.state.errors.email}
              />
              <HelperText type="error" visible={this.state.errors.email}>{this.state.errors.email}</HelperText>

            </View>

            <Button
              disabled={this.state.email.length == 0 || this.state.userName.length == 0}
              onPress={async () => this.tryCreateAccount()}
            >
              {"Create Account"}
            </Button>
          </View>
        </TouchableWithoutFeedback>
      );
    }
  }
}

const mapStateToProps = (state) => {

  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(ValuAccountCreator);