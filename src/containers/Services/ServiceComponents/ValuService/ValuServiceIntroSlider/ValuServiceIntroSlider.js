import React from "react";
import { Component } from "react"
import { connect } from 'react-redux'
import AppIntroSlider from 'react-native-app-intro-slider';
import {
  View,
  KeyboardAvoidingView,
  Linking,
  Image
} from "react-native";
import { Text, Button } from 'react-native-paper'
import Colors from '../../../../../globals/colors';
import {addEncryptedKey,  setServiceLoading } from "../../../../../actions/actionCreators";
import { requestServiceStoredData } from "../../../../../utils/auth/authBox";
import { requestSeeds } from "../../../../../utils/auth/authBox";
import { createAlert } from "../../../../../actions/actions/alert/dispatchers/alert";
import { CommonActions } from '@react-navigation/native';
import { ELECTRUM, VALU_SERVICE } from "../../../../../utils/constants/intervalConstants";
import { isSeedPhrase } from "../../../../../utils/keys";
import { ValuLogo } from "../../../../../images/customIcons";
import { VERUSID_SERVICE_ID, VALU_SERVICE_ID } from "../../../../../utils/constants/services";

import { refreshAccountData } from "../../../../../actions/actionDispatchers";
import PasswordCheck from "../../../../../components/PasswordCheck";
import { storeIdChoice } from '../../../../../actions/actions/services/dispatchers/primetrust/updates';

class ValuServiceIntroSlider extends Component {
  constructor() {
    super();
    this.state = {
      currentSlide: 0,
      hasElectrum24WordSeed: false,
      setupWyreSeedModalOpen: false,
      passwordDialogOpen: false,
      passwordDialogTitle: "",
      onPasswordCorrect: () => {},
      idRequested: false,
      idName: null,
      linkedIds: null,
      addressSelectModalOpen: false
    };
    this.VALU_PRIVACY_POLICY = "https://valu.com/privacy-policy/"
    this.VALU_USER_AGREEMENT = "https://valu.com/user-agreement/"
    this.BANKING_USER_AGREEMENT = "https://banking.com/user-agreement/"

  }
  async getLinkedIds() {

    this.props.dispatch(setServiceLoading(true, VERUSID_SERVICE_ID));

    try {
      const verusIdServiceData = await requestServiceStoredData(
        VERUSID_SERVICE_ID,
      );
      if (verusIdServiceData.linked_ids) {
        this.setState({
          linkedIds: verusIdServiceData.linked_ids,
        });
      } else {
        this.setState({
          linkedIds: {},
        });
      }
    } catch (e) {
      createAlert('Error Loading Linked VerusIDs', e.message);
    }
    this.props.dispatch(setServiceLoading(false, VERUSID_SERVICE_ID));
  }

  
  componentDidMount() {
    this.getLinkedIds();
    this.initValuSeedStatus();
  }
  
  async initValuSeedStatus() {
    this.props.dispatch(setServiceLoading(true, VERUSID_SERVICE_ID))

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
        () => this.props.dispatch(setServiceLoading(false, VERUSID_SERVICE_ID))
      );
    } catch (e) {
      console.warn(e);
      createAlert("Error", "Error fetching valu account information");
    }
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

  addValuSeed = async (seed, channel, password) => {
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

  validateFormData = (key) => {
    console.log("selected ID:" + key)

    this.setState({addressSelectModalOpen: false, idRequested: false, idName: key}, 
                  async () => {this.linkCurrentSeed()})
  }

  linkValu = (seed, channel) => {
    this.openPasswordCheck((result) => {
      console.log("out off password", result)
      if (result.valid) {
        this.closePasswordDialog(async () => {
          try {
            this.resetToScreen(
              "SecureLoading",
              null,
              {
                task: async () => {
                  await this.addValuSeed(seed, channel, result.password);
                  await storeIdChoice({idName: this.state.idName, idRequested: this.state.idRequested})
                  createAlert(
                    "Success",
                    'The Valu service has been linked! Login to continue the signup process'
                  );
                },
                message: "Linking Valu...",
                route: "Home",
                screen: "ServicesHome",
                successData: {
                  service: VALU_SERVICE_ID
                },
                successMsg: "Valu linked!",
                errorMsg: "Failed to link Valu.",
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

  async linkCurrentSeed() {
    const accountSeeds = await requestSeeds();
    this.linkValu(accountSeeds[ELECTRUM], VALU_SERVICE)
  }

  renderSlideOne = (key) => {

    return (
      <View
        style={{
          backgroundColor: "rgb(255,255,255)",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
        key={key}
      >
       <Image source={ValuLogo} style={Styles.valuSplashLogo} />
        <Text style={{ textAlign: "center", width: "75%", color: Colors.primaryColor}}>
          {
            "Registering with Valu allows you to connect your bank accounts and move from fiat to crypto. Also you can get a KYC Attestation and a valuable VerusID"
          }
        </Text>
        <Text
          style={{
            textAlign: "center",
            width: "75%",
            color: Colors.primaryColor,
            marginTop: 16,
          }}
        >
          {"By linking your wallet with VALU, you agree to our"}
          <Text
            style={{ color: Colors.primaryColor, fontWeight: "800" }}
            onPress={() => {
              Linking.openURL(this.VALU_USER_AGREEMENT);
            }}
          >
            {" user agreement"}
          </Text>
          {", "}
          <Text
            style={{ color: Colors.primaryColor, fontWeight: "800" }}
            onPress={() => {
              Linking.openURL(this.VALU_PRIVACY_POLICY);
            }}
          >
            {" privacy policy"}
          </Text>
          {" and "}
        </Text>
        <Text
            style={{ color: Colors.primaryColor, fontWeight: "800" }}
            onPress={() => {
              createAlert("VALU OnRamp's EULA", "TBC");
             // Linking.openURL(this.BANKING_USER_AGREEMENT);
            }}
          >
            {" VALU OnRamp's EULA."}
          </Text>
        <Text
          style={{
            textAlign: "center",
            width: "75%",
            color: Colors.primaryColor,
            marginTop: 16,
          }}
        >
          {
            "You also acknowledge the risks of using Verus Mobile's VALU integration, and assume all responsibility for doing so."
          }
        </Text>
        <Text
          style={{
            textAlign: "center",
            width: "75%",
            color: Colors.primaryColor,
            marginTop: 16,
            fontSize: 13
          }}
        >
           <Text
            style={{ color: Colors.primaryColor, fontWeight: "800" }}
          >{ `US Patriot Act:`}</Text>
          {
            `${"\n\n"}To help the government fight the funding of terrorism and money laundering activities, federal law requires all financial institutions to obtain, verify, and record information that identifies each person who opens an account. What this means for you: When you open an account, we will ask for your name, address, date of birth, and other information that will allow us to identify you. We may also ask to see your driver's license or other identifying documents`
          }
        </Text>
      </View>
    );
  };

  renderActionSlide = (key) => {
   const { addressSelectModalOpen} = this.state;
    return (
      <View
        style={{
          backgroundColor: "#3165d4",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
        key={key}
      >
        <Text style={{ textAlign: "center", width: "75%", color: "white" }}>
          {"To link to the VALU service, press the button and connect your profile to VALU"}
        </Text>
        <Button
          style={{ marginTop: 16 }}
          mode="contained"
          color={Colors.secondaryColor}
          onPress={() => this.linkCurrentSeed()}
        >
          {"Connect"}
        </Button>
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
          account={this.props.activeAccount}
          allowBiometry={true}
        />
        <AppIntroSlider
          showSkipButton={true}
          renderItem={({ item, index }) => item.component(index)}
          data={[
            {
              key: 0,
              component: this.renderSlideOne,
              backgroundColor: '#59b2ab',
            },
            {
              key: 1,
              component: this.renderActionSlide,
            },
          ]}
          renderNextButton={() => (
            <Text
              style={{
                color: Colors.primaryColor,
                fontSize: 18,
                marginTop: 12,
                marginRight: 6
              }}
            >
              {"Agree"}
            </Text>
          )}
          renderSkipButton={() => null}
          renderDoneButton={() => null}
        />
      </KeyboardAvoidingView>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeAccount: state.authentication.activeAccount,
    accounts: state.authentication.accounts,
    encryptedIds: state.services.stored[VERUSID_SERVICE_ID]
  }
};

export default connect(mapStateToProps)(ValuServiceIntroSlider);