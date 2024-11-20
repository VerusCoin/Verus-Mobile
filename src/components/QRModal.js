/*
  This component creates a modal with a displayed qr code
  based on the qrString prop it is passed. It also takes a 
  cancel function that it calls upon the back button (android hardware
  or cancel button being pressed. It inherits the animationtype
  and visible props from Modal.
*/

import React, { Component } from "react"
import {
  View,
  Alert,
  TouchableOpacity,
  ScrollView,
  Platform
} from "react-native"
import Modal from '../components/Modal'
import { CameraRoll } from "@react-native-camera-roll/camera-roll";
import QRCode from 'react-native-qrcode-svg'
import AlertAsync from "react-native-alert-async"
import { Button, IconButton, Text } from "react-native-paper"
import RNFS from "react-native-fs"
//import Share from 'react-native-share';
import Colors from '../globals/colors';
import Styles from '../styles/index'

const LOGO_DIR = require('../images/customIcons/Verus.png');
const NOT_REAL_ERROR_MSG = "User did not share"
const DEFAULT_OPACITY = 0.2

class QRModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      //These state properties exists so the share screen 
      //and photo library modal wont stack on laggy android devices
      sharePressed: false,
      libraryPressed: false
    }
    
    this.QRCodeRef = null
    this.requestSaveQR = this.requestSaveQR.bind(this)
    this.requestShareQR = this.requestShareQR.bind(this)
    this.saveQRToDisk = this.saveQRToDisk.bind(this)
  }

  cancelHandler = () => {
    if (this.props.cancel) {
      this.props.cancel()
    }
  }

  saveQRToDisk = () => {
    const fileName = this.props.showingAddress ? (this.props.qrString ? this.props.qrString : "UnknownQRString") : ("VerusPayQR" + Date.now().toString());

    this.QRCodeRef.toDataURL((data) => {
      RNFS.writeFile(RNFS.CachesDirectoryPath+`/${fileName}.png`, data, 'base64')
        .then((success) => {
          return CameraRoll.save(RNFS.CachesDirectoryPath+`/${fileName}.png`, { type: 'photo' })
        })
        .then(() => {
          return RNFS.unlink(RNFS.CachesDirectoryPath+`/${fileName}.png`)
        })
        .then(() => {
          Alert.alert("Success", "QR Code saved to camera roll")
        })
        .catch(e => {
          Alert.alert("Error", e.message)
        })
    })
  }

  canSaveQR = () => {
    return AlertAsync(
      'Save to Camera Roll?',
      'Would you like to save this code to your camera roll?',
      [
        {
          text: 'No',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  requestShareQR = () => {
    const fileName = this.props.showingAddress ? (this.props.qrString ? this.props.qrString : "UnknownQRString") : ("VerusPayQR" + Date.now().toString());

    // this.setState({ sharePressed: true },
    // () => {
    //   this.QRCodeRef.toDataURL((data) => {
    //     RNFS.writeFile(RNFS.CachesDirectoryPath+`/${fileName}.png`, data, 'base64')
    //       .then((success) => {
    //         return Share.open({ url: RNFS.CachesDirectoryPath+`/${fileName}.png` })
    //       })
    //       .then(() => {
    //         this.setState({ sharePressed: false })
    //         return RNFS.unlink(RNFS.CachesDirectoryPath+`/${fileName}.png`)
    //       })
    //       .catch(e => {
    //         this.setState({ sharePressed: false })
    //         e.message !== NOT_REAL_ERROR_MSG ? Alert.alert("Error", e.message) : null
    //       })
    //   })
    // })
  }

  requestSaveQR = () => {
    this.setState({
      libraryPressed: true
    }, () => {
      this.canSaveQR()
      .then(ans => {
        this.setState({ libraryPressed: false })
        if (ans) {
          this.saveQRToDisk()
        }
      })
    })
  }

  render() {
    return (
      <Modal
        animationType={this.props.animationType}
        transparent={false}
        visible={this.props.visible}
        onRequestClose={this.cancelHandler}
      >
        <ScrollView
          style={Styles.flexBackground}
          contentContainerStyle={Styles.centerContainer}
        >
          <View style={Styles.headerContainer}>
            <Text style={Styles.centralHeader}>{this.props.showingAddress ? "Address QR" : "VerusPay Invoice"}</Text>
          </View>
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            <Text
              style={{
                ...Styles.defaultDescriptiveText,
                ...Styles.fullWidthSpaceBetweenCenterBlock,
              }}
            >
              {this.props.showingAddress ? (this.props.qrString ? this.props.qrString : "-") : "Scan this QR code with VerusPay"}
            </Text>
            <View style={Styles.fullWidthAlignCenter}>
              <QRCode
                value={this.props.qrString ? this.props.qrString : "-"}
                size={232}
                logo={this.props.showVerusIconInQr ? LOGO_DIR : undefined}
                logoSize={this.props.showVerusIconInQr ? 50 : undefined}
                logoBackgroundColor={this.props.showVerusIconInQr ? 'white' : undefined}
                logoBorderRadius={this.props.showVerusIconInQr ? 100 : undefined}
                getRef={(qr) => (this.QRCodeRef = qr)}
              />
            </View>
          </View>
          <View style={Styles.footerContainer}>
            <View style={Styles.standardWidthSpaceBetweenBlock}>
              <TouchableOpacity
                onPress={
                  this.state.libraryPressed
                    ? () => {
                        return 0;
                      }
                    : this.requestSaveQR
                }
                activeOpacity={
                  this.state.libraryPressed ? 1 : DEFAULT_OPACITY
                }
              >
                <IconButton
                  icon="content-save"
                  iconColor={Colors.quinaryColor}
                />
              </TouchableOpacity>
              <Button
                textColor={Colors.warningButtonColor}
                onPress={this.cancelHandler}
                style={{ alignSelf: "center" }}
              >
                {"Close"}
              </Button>
              <TouchableOpacity
                disabled={true}
                style={{
                  opacity: 0
                }}
                onPress={
                  this.state.sharePressed
                    ? () => {
                        return 0;
                      }
                    : this.requestShareQR
                }
                activeOpacity={
                  this.state.sharePressed ? 1 : DEFAULT_OPACITY
                }
              >
                <IconButton icon="share" iconColor={Colors.quinaryColor} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Modal>
    );
  }
}

export default QRModal;
