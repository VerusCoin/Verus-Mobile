import React from "react";
import { Component } from "react"
import { connect } from 'react-redux'
import {
  View,
  Linking,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Keyboard
} from "react-native";
import { Text, TextInput, Portal, Button } from 'react-native-paper'
import WyreProvider from "../../../../../../utils/services/WyreProvider";
import Colors from "../../../../../../globals/colors";
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import { ISO_3166_COUNTRIES } from "../../../../../../utils/constants/iso3166";
import ListSelectionModal from "../../../../../../components/ListSelectionModal/ListSelectionModal";
import { expireServiceData, setServiceLoading, setWyreAccountId } from "../../../../../../actions/actionCreators";
import { CommonActions } from "@react-navigation/native";
import { WYRE_INDIVIDUAL_EMAIL, WYRE_SERVICE_ID } from "../../../../../../utils/constants/services";
import { API_GET_SERVICE_ACCOUNT } from "../../../../../../utils/constants/intervalConstants";
import { conditionallyUpdateService, modifyPersonalDataForUser } from "../../../../../../actions/actionDispatchers";
import store from "../../../../../../store";
import { requestPersonalData } from "../../../../../../utils/auth/authBox";
import { PERSONAL_CONTACT, PERSONAL_EMAILS } from "../../../../../../utils/constants/personal";

class WyreServiceAccountCreator extends Component {
  constructor() {
    super();
    this.state = {
      supportedCountries: [],
      countryModalOpen: false,
      email: "",
      country: {
        key: "",
        title: ""
      }
    };

    this.WYRE_SUPPORTED_COUNTRIES_INFO =
      "https://support.sendwyre.com/hc/en-us/articles/360055233754-Geographic-Restrictions-";
  }

  componentDidMount() {
    this.initSupportedCountries();
  }

  canSetCountry(code) {
    const country = ISO_3166_COUNTRIES[code];
    const title = country != null ? country.name : "???";

    return createAlert(
      "Confirm",
      `Are you sure you would like to create your Wyre account with country "${title}"? This cannot be undone.`,
      [
        {
          text: "No",
          onPress: () => {
            resolveAlert(false);
          },
        },
        { text: "Yes", onPress: () => resolveAlert(true) },
      ]
    );
  }

  async createAccount(code, email) {
    try {
      const account = await WyreProvider.createAccount({
        account: {
          type: "INDIVIDUAL",
          country: code,
          subaccount: false,
          profileFields: [],
        },
      });
      
      let emailFail = null;
      
      try {
        await WyreProvider.updateAccount({
          updateObj: {
            profileFields: [{ fieldId: WYRE_INDIVIDUAL_EMAIL, value: email }],
          },
        });
      } catch(e) {
        emailFail = e.message
      }

      this.props.dispatch(setWyreAccountId(account.id));
      this.props.dispatch(expireServiceData(API_GET_SERVICE_ACCOUNT))
      await conditionallyUpdateService(store.getState(), store.dispatch, API_GET_SERVICE_ACCOUNT)
      
      if (emailFail == null) {
        try {
          const contact = await requestPersonalData(PERSONAL_CONTACT)

          if (!contact.emails || contact.emails.find(x => x.address === email) == null) {
            const emails = contact.emails
              ? [...contact.emails, { address: email }]
              : [{ address: email }];

            await modifyPersonalDataForUser(
              {...contact, [PERSONAL_EMAILS]: emails},
              PERSONAL_CONTACT,
              this.props.activeAccount.accountHash
            );
          }
        } catch(e) {
          console.warn(e)
        }

        await createAlert(
          "Success",
          "Wyre account created! Verify your Wyre account by creating an account password and logging in at https://dash.sendwyre.com/reset-password.",
          [
            {
              text: "Later",
              onPress: () => resolveAlert(false),
              style: "cancel",
            },
            {
              text: "Take me there",
              onPress: () => {
                Linking.openURL("https://dash.sendwyre.com/reset-password");

                resolveAlert(true);
              },
            },
          ]
        );
      } else {
        await createAlert(
          "Success",
          `Wyre account created, but email submission failed (${emailFail}). Try to resubmit your email through the service tab.`
        );
      }
      
      return;
    } catch (e) {
      console.warn(e);
      const tryAgain = await createAlert("Error", `Failed to create Wyre account. ${e.message}.`, [
        {
          text: "Try again",
          onPress: async () => {
            resolveAlert(true);
          },
        },
        { text: "Ok", onPress: () => resolveAlert(false) },
      ]);

      if (tryAgain) {
        return await this.createAccount(code)
      } else throw e
    }
  }

  resetAndCreateAccount(code, email) {
    this.resetToScreen(
      "SecureLoading",
      null,
      {
        task: async () => {
          await this.createAccount(code, email)
        },
        message: "Creating Wyre account...",
        route: "Home",
        screen: "ServicesHome",
        successData: {
          service: WYRE_SERVICE_ID
        },
        successMsg: "Account created!",
        errorMsg: "Failed to create Wyre account.",
      },
      true
    );
  }

  resetToScreen = (route, title, data, fullReset) => {
    let resetAction;

    if (fullReset) {
      resetAction = CommonActions.reset({
        index: 0, // <-- currect active route from actions array
        routes: [{ name: route, params: { data: data } }],
      });
    } else {
      resetAction = CommonActions.reset({
        index: 1, // <-- currect active route from actions array
        routes: [
          { name: "Home" },
          { name: route, params: { title: title, data: data } },
        ],
      });
    }

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction);
  };

  async tryCreateAccount() {
    const { country, email } = this.state

    if (await this.canSetCountry(country.key)) {
      this.resetAndCreateAccount(country.key, email.trim())
    }
  }

  initSupportedCountries = async () => {
    this.props.dispatch(setServiceLoading(true, WYRE_SERVICE_ID))

    try {
      this.getSupportedCountries(() => {
        this.props.dispatch(setServiceLoading(false, WYRE_SERVICE_ID))
      });
    } catch (e) {
      console.warn(e);
      createAlert("Error", "Failed to retrieve Wyre supported countries.", [
        {
          text: "Try again",
          onPress: async () => {
            await this.initSupportedCountries();
            resolveAlert();
          },
        },
        { text: "Ok", onPress: () => resolveAlert() },
      ]);
    }
  };

  async getSupportedCountries(cb = () => {}) {
    this.setState(
      {
        supportedCountries: (await WyreProvider.getSupportedCountries()).sort(),
      },
      cb
    );
  }

  render() {
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
          <Portal>
            {this.state.countryModalOpen && (
              <ListSelectionModal
                title="Select a Country"
                flexHeight={0.3}
                visible={this.state.countryModalOpen}
                onSelect={(item) => this.setState({ country: item })}
                data={this.state.supportedCountries.map((code) => {
                  const item = ISO_3166_COUNTRIES[code];

                  return {
                    key: code,
                    title: `${item.emoji} ${item.name}`,
                  };
                })}
                cancel={() => this.setState({ countryModalOpen: false })}
              />
            )}
          </Portal>
          <Text style={{ textAlign: "center", width: "75%", marginBottom: 20 }}>
            {"Enter an email and select a country to create your Wyre account with."}
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
              label="Enter email"
              value={this.state.email}
              mode={"outlined"}
              placeholder="email@example.com"
              onChangeText={(text) => this.setState({ email: text })}
              autoCapitalize={"none"}
              keyboardType={"email-address"}
            />
          </View>
          <View
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              width: "75%",
              marginTop: 8
            }}
          >
            <TouchableOpacity onPress={() => this.setState({ countryModalOpen: true })}>
              <TextInput
                label="Select country"
                value={this.state.country.title}
                mode={"outlined"}
                placeholder="Select country"
                editable={false}
                pointerEvents="none"
              />
            </TouchableOpacity>
          </View>
          <Text style={{ textAlign: "center", width: "75%", marginTop: 20, marginBottom: 20 }}>
            {`Your chosen country must be a residence country of yours. Countries not shown are currently not supported.`}
            <Text
              style={{ color: Colors.primaryColor, fontWeight: "800" }}
              onPress={() => {
                Linking.openURL(this.WYRE_SUPPORTED_COUNTRIES_INFO);
              }}
            >
              {" Press here to learn more about Wyre's geographic restrictions."}
            </Text>
          </Text>
          <Button
            disabled={this.state.email.length == 0 || this.state.country.key.length == 0}
            onPress={async () => this.tryCreateAccount()}
          >
            {"Create Account"}
          </Button>
        </View>
      </TouchableWithoutFeedback>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(WyreServiceAccountCreator);