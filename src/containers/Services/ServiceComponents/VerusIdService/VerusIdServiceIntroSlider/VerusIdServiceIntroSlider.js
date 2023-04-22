import React from "react";
import { Component } from "react"
import { connect } from 'react-redux'
import AppIntroSlider from 'react-native-app-intro-slider';
import {
  View,
  KeyboardAvoidingView
} from "react-native";
import { Text, Button } from 'react-native-paper'
import { openLinkIdentityModal } from "../../../../../actions/actions/sendModal/dispatchers/sendModal";
import ServiceLogos from '../../../../../images/servicelogo/index'
import { VERUSID_SERVICE_ID } from "../../../../../utils/constants/services";
import Colors from "../../../../../globals/colors";
import { findCoinObj } from "../../../../../utils/CoinData/CoinData";
import { openUrl } from "../../../../../utils/linking";

const VERUS_ID_URL = "https://docs.verus.io/verusid/"

class VerusIdServiceIntroSlider extends Component {
  constructor() {
    super();
    this.state = {};
  }

  renderSlideOne = (key) => {
    const VerusIDLogo = ServiceLogos[VERUSID_SERVICE_ID].light;

    return (
      <View
        style={{
          backgroundColor: "#3165D4",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
        key={key}
      >
        <VerusIDLogo width={148} />
        <Text style={{ textAlign: "center", width: "75%", color: "white" }}>
          {
            "Linking your wallet with VerusID allows you to use your VerusID to sign into services and hold funds."
          }
        </Text>
        <Button
          style={{ marginTop: 16 }}
          mode="text"
          color={Colors.secondaryColor}
          onPress={() => openUrl(VERUS_ID_URL)}
        >
          {"Learn More"}
        </Button>
      </View>
    );
  };

  renderActionSlide = (key) => {
    return (
      <View
        style={{
          backgroundColor: "#3165D4",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
        key={key}
      >
        <Text style={{ textAlign: "center", width: "75%", color: "white" }}>
          {"To link a VerusID, press the button below and enter the name of a VerusID controlled by the wallet address for this profile."}
        </Text>
        <Button
          style={{ marginTop: 16 }}
          mode="contained"
          color={Colors.secondaryColor}
          onPress={() => openLinkIdentityModal(findCoinObj("VRSC"))}
        >
          {"Link VerusID"}
        </Button>
      </View>
    );
  };

  render() {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={"height"}>
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
  return {}
};

export default connect(mapStateToProps)(VerusIdServiceIntroSlider);