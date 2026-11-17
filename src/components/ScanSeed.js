/*
  This component simply allows a user to scan a qr code
  to fill out their wallet seed field
*/

import React, { Component } from "react";
import { createAlert } from "../actions/actions/alert/dispatchers/alert";
import ScannerScreen from "./BarcodeReader/ScannerScreen";

class ScanSeed extends Component {
  constructor(props) {
    super(props)
  }

  onSuccess(codes) {
    let result = codes[0] ? codes[0].value : null;

    if (result != null && typeof result === "string" && result.length <= 5000 && this.props.onScan) {
      this.props.onScan(result)
    } else {
      this.errorHandler()
    }
  }

  // The same wording as the Scan tab.
  errorHandler = () => {
    createAlert("Can’t use this QR code", "It is not a recovery secret.");
    this.cancelHandler()
  }

  cancelHandler = () => {
    if (this.props.cancel) {
      this.props.cancel()
    }
  }

  render() {
    return (
      <ScannerScreen
        onBack={this.cancelHandler}
        onScan={(codes) => this.onSuccess(codes)}
        title="Scan QR code"
      />
    );
  }
}

export default ScanSeed;
