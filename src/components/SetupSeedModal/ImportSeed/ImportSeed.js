/*
  This component lets the user import a new seed
*/

import React, { Component } from "react"
import {
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  View,
  Keyboard,
  Alert,
  TextInput as NativeTextInput,
  Platform
} from "react-native"
import Styles from '../../../styles/index'
import StandardButton from "../../StandardButton";
import { Input } from 'react-native-elements'
import { Button, TextInput, Text } from 'react-native-paper'
import Colors from "../../../globals/colors";
import ScanSeed from "../../ScanSeed";
import { DLIGHT_PRIVATE, WYRE_SERVICE } from "../../../utils/constants/intervalConstants";
import { isSeedPhrase, parseDlightSeed } from "../../../utils/keys";
import { createAlert } from "../../../actions/actions/alert/dispatchers/alert";

class ImportSeed extends Component {
  constructor(props) {
    super(props);

    this.state = props.initState;
    this.WYRE_SERVICE_SEED_LENGTH = 24
  }

  componentDidUpdate(lastProps, lastState) {
    if (lastState !== this.state) this.props.saveState(this.state);
  }

  handleScan = (seed) => {
    this.setState({ seed, scanning: false });
  };

  verifySeed = async () => {
    const submission = this.props.beginSeedSubmission();
    if (submission == null) return;
    const { seed } = this.state;

    if (!seed || seed.length < 1) {
      if (this.props.failSeedSubmission(submission)) {
        Alert.alert("Error", "Please enter a seed, WIF key or spending key.");
      }
      return;
    }

    if (this.props.channel === DLIGHT_PRIVATE) {
      try {
        await parseDlightSeed(seed);
      } catch (e) {
        if (this.props.failSeedSubmission(submission)) {
          Alert.alert(
            "Invalid Seed",
            "Please enter a valid 24 word seed phrase, or an extended spending key belonging to a Z address."
          );
        }
        return;
      }
    } else if (
      this.props.channel === WYRE_SERVICE &&
      !isSeedPhrase(seed, this.WYRE_SERVICE_SEED_LENGTH)
    ) {
      if (this.props.failSeedSubmission(submission)) {
        Alert.alert("Invalid Seed", "Please enter a valid 24 word seed phrase.");
      }
      return;
    }

    this.props.completeSeedSubmission(submission, seed);
  };

  render() {
    return (
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        {!this.state.scanning ? (
          <ScrollView
            style={Styles.flexBackground}
            contentContainerStyle={Styles.centerContainer}
          >
            <View style={Styles.headerContainer}>
              <Text style={Styles.centralHeader}>
                {"Import Existing WIF/Seed"}
              </Text>
            </View>
            <View style={Styles.fullWidthFlexGrowCenterBlock}>
              <View style={Styles.wideCenterBlock}>
                <Text style={[Styles.textWithGreyColor, Styles.centeredText]}>
                  {this.props.channel === WYRE_SERVICE
                    ? "Enter or scan a 24 word seed phrase."
                    : this.props.channel === DLIGHT_PRIVATE
                    ? "Enter or scan a 24 word seed phrase, or Z spending key."
                    : "Enter or scan an existing spending key, WIF key, or seed phrase."}
                </Text>
              </View>
              <View style={Styles.wideCenterBlock}>
                <TextInput
                  onChangeText={(text) => this.setState({ seed: text })}
                  label={"Seed"}
                  underlineColor={Colors.primaryColor}
                  selectionColor={Colors.primaryColor}
                  value={this.state.seed}
                  multiline={
                    !this.state.showSeed || Platform.OS === "ios" ? false : true
                  }
                  render={(props) => (
                    <NativeTextInput
                      secureTextEntry={!this.state.showSeed}
                      autoCapitalize={"none"}
                      autoCorrect={false}
                      autoComplete="off"
                      {...props}
                    />
                  )}
                />
              </View>
              <View style={Styles.fullWidthFlexCenterBlock}>
                <Button
                  textColor={Colors.primaryColor}
                  onPress={() => this.setState({ scanning: true })}
                >
                  {"Scan QR"}
                </Button>
              </View>
              <View style={Styles.fullWidthFlexCenterBlock}>
                <Button
                  textColor={Colors.primaryColor}
                  onPress={() =>
                    this.setState({ showSeed: !this.state.showSeed })
                  }
                >{`${this.state.showSeed ? "Hide" : "Show"} Seed`}</Button>
              </View>
            </View>
            <View style={Styles.footerContainer}>
              <View style={Styles.standardWidthSpaceBetweenBlock}>
                <Button
                  onPress={this.props.onBack}
                  textColor={Colors.warningButtonColor}
                >
                  {this.props.backLabel ? this.props.backLabel : "Back"}
                </Button>
                <Button
                  onPress={() => this.verifySeed()}
                  buttonColor={Colors.primaryColor}
                  textColor={Colors.secondaryColor}
                  disabled={
                    !this.state.seed ||
                    this.state.seed.length < 1 ||
                    this.props.submittingSeed
                  }
                >
                  {"Import"}
                </Button>
              </View>
            </View>
          </ScrollView>
        ) : (
          <ScanSeed
            cancel={() => this.setState({ scanning: false })}
            onScan={this.handleScan}
          />
        )}
      </TouchableWithoutFeedback>
    );
  }
}

export default ImportSeed;
