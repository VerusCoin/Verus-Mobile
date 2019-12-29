/*
  This component simply allows a user to scan a qr code 
  to fill out their wallet seed field
*/

import React, { Component } from "react";
import {
  View,
  StyleSheet,
  Alert
} from "react-native";
import QRCodeScanner from 'react-native-qrcode-scanner';
import Button1 from "../symbols/button1";
import QRCode from 'react-native-qrcode-svg';

const FORMAT_UNKNOWN = "QR Data format unrecognized."

class ScanSeed extends Component {
  constructor(props) {
    super(props)
  }

  onSuccess(e) {
    let result = e.data

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
      <View style={styles.root}>
        <QRCodeScanner
          onRead={this.onSuccess.bind(this)}
          showMarker={true}
          captureAudio={false}
        />
        <View style={styles.singleButtonContainer}>
          <Button1 
            style={styles.cancelBtn} 
            buttonContent="CANCEL" 
            onPress={this.cancelHandler}
          />
        </View>
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
