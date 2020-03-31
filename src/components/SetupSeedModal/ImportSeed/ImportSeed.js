/*
  This component lets the user import a new seed
*/

import React, { Component } from "react"
import {
  Modal,
  Text,
  ScrollView,
  TouchableWithoutFeedback,
  View,
  Keyboard,
  Alert
} from "react-native"
import Styles from '../../../styles/index'
import StandardButton from "../../StandardButton";
import { Input } from 'react-native-elements'
import Colors from "../../../globals/colors";
import ScanSeed from "../../ScanSeed";

class ImportSeed extends Component {
  constructor(props) {
    super(props);

    this.state = {
      seed: '',
      scanning: false,
      showSeed: false
    }
  }

  handleScan = seed => {
    this.setState({ seed, scanning: false });
  };

  verifySeed = () => {
    const { seed } = this.state 
    let _errors = false

    if (!seed || seed.length < 1) {
      Alert.alert("Error", "Please enter a seed or WIF key.");
      _errors = true;
    } 

    if (!_errors) {
      this.props.setSeed(this.state.seed, this.props.channel)
      this.props.cancel()
    }
  }

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
            <View style={Styles.wideBlock}>
            <Input
              label={"Wallet passphrase/WIF key:"}
              labelStyle={Styles.formCenterLabel}
              underlineColorAndroid={Colors.quinaryColor}
              onChangeText={text => this.setState({ seed: text })}
              value={this.state.seed}
              autoCapitalize={"none"}
              autoCorrect={false}
              secureTextEntry={!this.state.showSeed}
              inputStyle={Styles.seedText}
              multiline={Platform.OS === "ios" && !this.state.showSeed ? false : true}
            />
            </View>
            <StandardButton
              buttonStyle={Styles.fullWidthButton}
              containerStyle={Styles.standardWidthCenterBlock}
              title="SCAN SEED FROM QR"
              onPress={() => this.setState({ scanning: true })}
            />
            <StandardButton
              buttonStyle={Styles.fullWidthButton}
              containerStyle={Styles.standardWidthCenterBlock}
              title={`${this.state.showSeed ? "HIDE" : "SHOW"} SEED`}
              onPress={() => this.setState({ showSeed: !this.state.showSeed })}
            />
            <View style={Styles.footerContainer}>
              <View style={Styles.standardWidthSpaceBetweenBlock}>
                <StandardButton
                  title={"BACK"}
                  onPress={this.props.createSeed}
                  color={Colors.warningButtonColor}
                />
                <StandardButton title="IMPORT" onPress={this.verifySeed} />
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