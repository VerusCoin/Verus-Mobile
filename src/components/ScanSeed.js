/*
  This component simply allows a user to scan a qr code 
  to fill out their wallet seed field
*/

import React, { Component } from "react";
import {
  View,
  StyleSheet,
  Alert,
  TouchableOpacity,
  Text
} from "react-native";
import {
  Button
} from "react-native-paper";
import Colors from "../globals/colors";
import Styles from '../styles/index'
import BarcodeReader from "./BarcodeReader/BarcodeReader";

const FORMAT_UNKNOWN = "QR Data format unrecognized."

class ScanSeed extends Component {
  constructor(props) {
    super(props)
  }

  onSuccess(codes) {
    let result = codes[0]

    if (typeof result === "string" && result.length <= 5000 && this.props.onScan) {
      this.props.onScan(result)
    } else {
      this.errorHandler(FORMAT_UNKNOWN)
    }
  }

  errorHandler = (error) => {
    Alert.alert("Error", error);
    this.cancelHandler()
  }

  cancelHandler = () => {
    if (this.props.cancel) {
      this.props.cancel()
    }
  }

  render() {
    return (
      <View style={Styles.blackRoot}>
        <BarcodeReader
          prompt="Scan a QR seed or private key"
          onScan={(codes) => this.onSuccess(codes)}
          button={() => (
            <Button
              mode="contained"
              buttonColor={Colors.warningButtonColor}
              onPress={this.cancelHandler}
              style={{
                marginBottom: 48
              }}
            >
              {"Cancel"}
            </Button>
          )}
        />
      </View>
    );
  }
}

export default ScanSeed;

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },
  singleButtonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  cancelBtn: {
    height: 46,
    backgroundColor: "rgba(206,68,70,1)",
    marginTop: 15,
    marginBottom: 40
  },
});
