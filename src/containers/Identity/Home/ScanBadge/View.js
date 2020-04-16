import React, { Component } from "react";
import {
  View,
  Alert,
  TouchableOpacity,
  Text,
} from "react-native";
import QRCodeScanner from 'react-native-qrcode-scanner';
import styles from './styles';
import Styles from '../../../../styles/index';

const ScanBadge = ({ navigation }) => {
  const onSuccess = (e) => {
    navigation.navigate('ScannedInformation');
  }
  const errorHandler = (error) => {
    Alert.alert("Error", error);
    cancelHandler()
  }

  const nextHandler = () => {
    //navigation.goBack();
    navigation.navigate('ScannedInformation');
  }
  return (
    <View style={Styles.blackRoot}>
      <QRCodeScanner
        onRead={onSuccess}
        showMarker={true}
        captureAudio={false}
        cameraStyle={Styles.fullHeight}
      />
      <TouchableOpacity style={{ ...Styles.footerContainer, ...Styles.blackRoot }}
        onPress={nextHandler}>
        <Text style={styles.cancelBtn}>Next</Text>
      </TouchableOpacity>
    </View>
  );
}

export default ScanBadge;
