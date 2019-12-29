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
  StyleSheet,
  Modal,
  Text,
  Alert,
  TouchableOpacity,
  CameraRoll,
  ScrollView,
  Platform
} from "react-native"
import QRCode from 'react-native-qrcode-svg'
import Button1 from "../symbols/button1"
import AlertAsync from "react-native-alert-async"
import { Icon } from "react-native-elements"
import RNFS from "react-native-fs"
import Share from 'react-native-share';

const LOGO_DIR = require('../images/customIcons/verusQRLogo.png');
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
    this.QRCodeRef.toDataURL((data) => {
      RNFS.writeFile(RNFS.CachesDirectoryPath+"/VerusPayQR.png", data, 'base64')
        .then((success) => {
          return CameraRoll.saveToCameraRoll(RNFS.CachesDirectoryPath+"/VerusPayQR.png", 'photo')
        })
        .then(() => {
          return RNFS.unlink(RNFS.CachesDirectoryPath+"/VerusPayQR.png")
        })
        .then(() => {
          Alert.alert("Success", "VerusPay QR Code saved to camera roll")
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
    this.setState({ sharePressed: true },
    () => {
      this.QRCodeRef.toDataURL((data) => {
        RNFS.writeFile(RNFS.CachesDirectoryPath+"/VerusPayQR.png", data, 'base64')
          .then((success) => {
            return Share.open({ url: RNFS.CachesDirectoryPath+"/VerusPayQR.png" })
          })
          .then(() => {
            this.setState({ sharePressed: false })
            return RNFS.unlink(RNFS.CachesDirectoryPath+"/VerusPayQR.png")
          })
          .catch(e => {
            this.setState({ sharePressed: false })
            e.message !== NOT_REAL_ERROR_MSG ? Alert.alert("Error", e.message) : null
          })
      })
    })
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
      onRequestClose={this.cancelHandler}>
        <ScrollView 
          style={styles.root} 
          contentContainerStyle={{flex: 1, alignItems: "center", justifyContent: "center"}}>
          <View style={{...styles.textContainer, marginTop: 25}}>
            <Text style={styles.mainLabel}>
              {"VerusPay Invoice"}
            </Text>
            <Text style={styles.mainDesc}>
              {"Scan this QR code with VerusPay on another device to automatically create" + 
                " a transaction."}
            </Text>
          </View>
          <View style={{padding: 10, backgroundColor: '#FFF'}}>
            <QRCode
              value={this.props.qrString ? this.props.qrString : "-"}
              size={250}
              //TODO: Add in differently so it doesn't impact readability
              //logo={LOGO_DIR}
              //logoSize={50}
              //logoBackgroundColor='transparent'
              getRef={(qr) => (this.QRCodeRef = qr)}
            />
          </View>
          <View style={styles.multiButtonContainer}>
            <TouchableOpacity 
              onPress={this.state.libraryPressed ? () => {return 0} : this.requestSaveQR} 
              activeOpacity={this.state.libraryPressed ? 1 : DEFAULT_OPACITY}>
              <Icon name="camera-roll" size={35} color="#E9F1F7"/>
            </TouchableOpacity>
            {Platform.OS === 'ios' && 
              <TouchableOpacity 
                onPress={this.state.sharePressed ? () => {return 0} : this.requestShareQR} 
                activeOpacity={this.state.sharePressed ? 1 : DEFAULT_OPACITY}>
                <Icon name="share" size={35} color="#E9F1F7"/>
              </TouchableOpacity>
            }
          </View>
          <View style={styles.singleButtonContainer}>
            <Button1 
              style={styles.cancelBtn} 
              buttonContent="CLOSE" 
              onPress={this.cancelHandler}
            />
          </View>
        </ScrollView>
      </Modal>
    );
  }
}

export default QRModal;

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
  },
  singleButtonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  multiButtonContainer: {
    width: "75%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 20
  },
  cancelBtn: {
    height: 46,
    backgroundColor: "rgba(206,68,70,1)",
    marginTop: 20,
    marginBottom: 40
  },
  mainLabel: {
    backgroundColor: "transparent",
    fontSize: 22,
    color: "#E9F1F7",
    textAlign: "center",
    paddingBottom: 10
  },
  mainDesc: {
    backgroundColor: "transparent",
    fontSize: 16,
    color: "#E9F1F7",
    textAlign: "center"
  },
  textContainer: {
    width: "85%",
    paddingBottom: 30
  }
});
