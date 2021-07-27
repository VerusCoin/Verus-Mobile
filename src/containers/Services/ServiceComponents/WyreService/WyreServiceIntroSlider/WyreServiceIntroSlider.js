import React from "react";
import { Component } from "react"
import { connect } from 'react-redux'
import AppIntroSlider from 'react-native-app-intro-slider';
import {
  View,
  KeyboardAvoidingView,
  Linking
} from "react-native";
import { Text, Button, Portal } from 'react-native-paper'
import { createAlert } from "../../../../../actions/actions/alert/dispatchers/alert";
import ServiceLogos from '../../../../../images/servicelogo/index'
import { CommonActions } from '@react-navigation/native';
import { requestSeeds } from "../../../../../utils/auth/authBox";
import { ELECTRUM, WYRE_SERVICE } from "../../../../../utils/constants/intervalConstants";
import { isSeedPhrase } from "../../../../../utils/keys";
import { WYRE_SERVICE_ID } from "../../../../../utils/constants/services";
import Colors from "../../../../../globals/colors";
import SetupSeedModal from "../../../../../components/SetupSeedModal/SetupSeedModal";
import PasswordCheck from "../../../../../components/PasswordCheck";
import { addEncryptedKey } from "../../../../../actions/actionCreators";
import { refreshAccountData } from "../../../../../actions/actionDispatchers";

class WyreServiceIntroSlider extends Component {
  constructor() {
    super();
    this.state = {
      currentSlide: 0,
      hasElectrum24WordSeed: false,
      setupWyreSeedModalOpen: false,
      passwordDialogOpen: false,
      passwordDialogTitle: "",
      onPasswordCorrect: () => {}
    };

    this.WYRE_SEED_PHRASE_LENGTH = 24;
    this.WYRE_PRIVACY_POLICY = "https://www.sendwyre.com/privacy-policy/"
    this.WYRE_USER_AGREEMENT = "https://www.sendwyre.com/user-agreement/"
  }

  componentDidMount() {
    this.initWyreSeedStatus();
  }

  openPasswordCheck = (onPasswordCorrect) =>
    this.setState({
      passwordDialogOpen: true,
      passwordDialogTitle: `Enter password for "${
        this.props.activeAccount.id
      }"`,
      onPasswordCorrect,
    });
  
  closePasswordDialog = (cb) => {
    this.setState(
      {
        passwordDialogOpen: false,
        onPasswordCorrect: () => {},
        passwordDialogTitle: ""
      },
      cb
    );
  };

  addWyreSeed = async (seed, channel, password) => {
    await addEncryptedKey(
      this.props.activeAccount.accountHash,
      channel,
      seed,
      password
    );

    await refreshAccountData(
      this.props.activeAccount.accountHash,
      password,
      false,
      () => {}
    );
  }

  resetToScreen = (route, title, data, fullReset) => {
    let resetAction

    if (fullReset) {
      resetAction = CommonActions.reset({
        index: 0, // <-- currect active route from actions array
        routes: [
          { name: route, params: { data: data } },
        ],
      })
    } else {
      resetAction = CommonActions.reset({
        index: 1, // <-- currect active route from actions array
        routes: [
          { name: "Home" },
          { name: route, params: { title: title, data: data } },
        ],
      })
    }

    this.props.navigation.closeDrawer();
    this.props.navigation.dispatch(resetAction)
  }

  linkWyre = (seed, channel) => {
    this.openPasswordCheck((result) => {
      if (result.valid) {
        this.closePasswordDialog(async () => {
          try {
            this.resetToScreen(
              "SecureLoading",
              null,
              {
                task: async () => {
                  await this.addWyreSeed(seed, channel, result.password)
                  createAlert(
                    "Success",
                    'Wyre linked! Access your Wyre profile through the services tab.'
                  );
                },
                message: "Linking Wyre...",
                route: "Home",
                successMsg: "Wyre linked!",
                errorMsg: "Failed to link Wyre.",
              },
              true
            );
          } catch(e) {
            createAlert("Error", e.message);
          }
        })
      } else {
        createAlert("Authentication Error", "Incorrect password");
      }
    })
  }

  initWyreSeedStatus() {
    this.props.setLoading(true, async () => {
      try {
        const accountSeeds = await requestSeeds();
        let hasElectrum24WordSeed = false;

        if (
          accountSeeds[ELECTRUM] != null &&
          isSeedPhrase(accountSeeds[ELECTRUM], this.WYRE_SEED_PHRASE_LENGTH)
        )
          hasElectrum24WordSeed = true;

        this.setState(
          {
            hasElectrum24WordSeed,
          },
          () => this.props.setLoading(false)
        );
      } catch (e) {
        console.warn(e);
        createAlert("Error", "Error fetching wyre account information");
      }
    });
  }

  async linkCurrentSeed() {
    const accountSeeds = await requestSeeds();

    return this.linkWyre(accountSeeds[ELECTRUM], WYRE_SERVICE)
  }

  renderSlideOne = (key) => {
    const WyreLogo = ServiceLogos[WYRE_SERVICE_ID].light;

    return (
      <View
        style={{
          backgroundColor: "rgb(41, 45, 51)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
        key={key}
      >
        <WyreLogo width={148} />
        <Text style={{ textAlign: "center", width: "75%", color: "white" }}>
          {
            "Linking your wallet with Wyre allows you to connect your bank accounts and seamlessly move between crypto and fiat."
          }
        </Text>
      </View>
    );
  };

  renderActionSlide = (key) => {
    return (
      <View
        style={{
          backgroundColor: "rgb(41, 45, 51)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
        key={key}
      >
        {/* <MaterialCommunityIcons
          name={"account-key"}
          color={"white"}
          size={104}
          style={{
            marginBottom: 24,
          }}
        /> */}
        <Text style={{ textAlign: "center", width: "75%", color: "white" }}>
          {this.state.hasElectrum24WordSeed
            ? "Your Wyre account will be created from a 24 word seed phrase. You can create/import a new one, or you can use your current wallet seed to create an account."
            : "Your Wyre account will be created from a 24 word seed phrase. You can either create a new one, or import an existing one."}
        </Text>
        {this.state.hasElectrum24WordSeed && (
          <Button
            style={{ marginTop: 16 }}
            mode="contained"
            onPress={() => this.linkCurrentSeed()}
          >
            {"Link current seed"}
          </Button>
        )}
        <Button
          style={{ marginTop: 16 }}
          mode="contained"
          onPress={() => this.setState({ setupWyreSeedModalOpen: true })}
        >
          {this.state.hasElectrum24WordSeed ? "Create & link new seed" : "Create & link seed"}
        </Button>
        <Text
          style={{
            textAlign: "center",
            width: "75%",
            color: "white",
            marginTop: 16,
          }}
        >
          {"By linking your wallet with Wyre, you agree to Wyre's"}
          <Text
            style={{ color: Colors.primaryColor, fontWeight: "800" }}
            onPress={() => {
              Linking.openURL(this.WYRE_USER_AGREEMENT);
            }}
          >
            {" user agreement "}
          </Text>
          {"and"}
          <Text
            style={{ color: Colors.primaryColor, fontWeight: "800" }}
            onPress={() => {
              Linking.openURL(this.WYRE_PRIVACY_POLICY);
            }}
          >
            {" privacy policy."}
          </Text>
        </Text>
      </View>
    );
  };

  render() {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={"height"}>
        <PasswordCheck
          cancel={() => this.closePasswordDialog()}
          submit={(result) => this.state.onPasswordCorrect(result)}
          visible={this.state.passwordDialogOpen}
          title={this.state.passwordDialogTitle}
          userName={this.props.activeAccount.id}
        />
        <Portal>
          <SetupSeedModal
            animationType="slide"
            transparent={false}
            visible={this.state.setupWyreSeedModalOpen}
            cancel={() => {
              this.setState({ setupWyreSeedModalOpen: false });
            }}
            setSeed={(seed, channel) => this.linkWyre(seed, channel)}
            channel={WYRE_SERVICE}
          />
        </Portal>
        <AppIntroSlider
          showSkipButton={true}
          renderItem={({ item, index }) => item.component(index)}
          data={[
            {
              key: 0,
              component: this.renderSlideOne,
            },
            {
              key: 1,
              component: this.renderActionSlide,
            },
          ]}
          renderDoneButton={() => null}
          renderSkipButton={() => null}
        />
      </KeyboardAvoidingView>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    accounts: state.authentication.accounts
  }
};

export default connect(mapStateToProps)(WyreServiceIntroSlider);