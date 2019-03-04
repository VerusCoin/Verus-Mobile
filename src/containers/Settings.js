import React, { Component } from "react";
import Button1 from "../symbols/button1";
import { View, StyleSheet, Text, Switch, Picker } from "react-native";
import { onSignOut } from '../utils/asyncStore'

export default class Settings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      yay: true
    };
  }

  _handleLogout = () => {
    let navigation = this.props.navigation;
      onSignOut().then(() => navigation.navigate("SignedOutNoKey"));
  }

  render() {
    return (
      <View style={styles.root}>
        <Text style={styles.wifLabel}>Auto-lock timeout:</Text>
        <Picker
          style={styles.itemPicker}
          itemStyle={{ color: "#E9F1F7", fontSize:18 }}
          enabled={true}
        >
          <Picker.Item value="5" label="5 minutes" />
          <Picker.Item value="10" label="10 minutes" />
          <Picker.Item value="20" label="20 minutes" />
        </Picker>
        <Text style={styles.confLabel}>
          Require PIN to confirm transactions
        </Text>
        <Switch style={styles.confSwitch} value={false} />
        <Button1 style={styles.signInButton} buttonContent="save" />
        <Button1
          style={styles.passphraseBtn}
          buttonContent="recover passphrase"
        />
        <Button1 style={styles.logoutBtn} buttonContent="log out" onPress={this._handleLogout}/>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  wifLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 25,
    marginBottom: 8,
    paddingBottom: 0,
    fontSize: 22,
    color: "#E9F1F7",
    width: "69.33%",
    textAlign: "center"
  },
  signInButton: {
    width: "26.595744680851062%",
    height: 46,
    backgroundColor: "rgba(68,152,206,1)",
    opacity: 1,
    marginTop: 28,
    marginBottom: 73
  },
  confSwitch: {},
  confLabel: {
    width: "65.06666666666666%",
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 65,
    marginBottom: 13,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
  itemPicker: {
    height: 45,
    width: "65.06666666666666%",
    marginTop: 25,
    color: "#E9F1F7"
  },
  passphraseBtn: {
    width: "75.84%",
    height: 45,
    backgroundColor: "rgba(182,112,63,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 23
  },
  logoutBtn: {
    width: "75.84%",
    height: 45,
    backgroundColor: "rgba(206,68,70,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 75
  }
});
