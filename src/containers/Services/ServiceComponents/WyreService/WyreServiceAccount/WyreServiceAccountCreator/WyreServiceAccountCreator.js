import React from "react";
import { Component } from "react"
import { connect } from 'react-redux'
import {
  View,
  Linking,
  TouchableOpacity
} from "react-native";
import { Text, TextInput, Portal } from 'react-native-paper'
import WyreProvider from "../../../../../../utils/services/WyreProvider";
import Colors from "../../../../../../globals/colors";
import { createAlert, resolveAlert } from "../../../../../../actions/actions/alert/dispatchers/alert";
import { ISO_3166_COUNTRIES } from "../../../../../../utils/constants/iso3166";
import ListSelectionModal from "../../../../../../components/ListSelectionModal/ListSelectionModal";
import { setServiceLoading, setWyreAccountId } from "../../../../../../actions/actionCreators";
import { CommonActions } from "@react-navigation/native";

class WyreServiceAccountCreator extends Component {
  constructor() {
    super();
    this.state = {
      supportedCountries: [],
      countryModalOpen: false,
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

  async createAccount(code) {
    try {
      const account = await WyreProvider.createAccount({
        account: {
          type: "INDIVIDUAL",
          country: code,
          subaccount: false,
          profileFields: [],
        },
      });

      this.props.dispatch(setWyreAccountId(account.id));
      await createAlert("Success", 'Wyre account created! Access your Wyre details through the Service tab.');

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

  resetAndCreateAccount(code) {
    this.resetToScreen(
      "SecureLoading",
      null,
      {
        task: async () => {
          await this.createAccount(code)
        },
        message: "Creating Wyre account...",
        route: "Home",
        screen: "ServicesHome",
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

  async tryCreateAccount(code) {
    if (await this.canSetCountry(code)) {
      this.resetAndCreateAccount(code)
    }
  }

  initSupportedCountries = async () => {
    this.props.dispatch(setServiceLoading(true))

    try {
      this.getSupportedCountries(() => {
        this.props.dispatch(setServiceLoading(false))
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
              onSelect={(item) => this.tryCreateAccount(item.key)}
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
        <Text
          style={{
            fontSize: 32,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {"Wyre Country"}
        </Text>
        <Text style={{ textAlign: "center", width: "75%", marginTop: 20 }}>
          {`Select a country to create your Wyre account with. This cannot be changed later.\n\nCountries not shown are currently not supported.`}
          <Text
            style={{ color: Colors.primaryColor, fontWeight: "800" }}
            onPress={() => {
              Linking.openURL(this.WYRE_SUPPORTED_COUNTRIES_INFO);
            }}
          >
            {" Press here to learn more about Wyre's geographic restrictions."}
          </Text>
        </Text>
        <View
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            height: 168,
            width: "75%",
            marginVertical: 40,
          }}
        >
          <TouchableOpacity
            onPress={() => this.setState({ countryModalOpen: true })}
          >
            <TextInput
              label="Select country"
              value={""}
              mode={"outlined"}
              placeholder="Select country"
              dense={true}
              editable={false}
              pointerEvents="none"
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
  }
};

export default connect(mapStateToProps)(WyreServiceAccountCreator);