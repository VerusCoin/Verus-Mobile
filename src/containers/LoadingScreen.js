/*
  This screen is shown briefly before the login or sign 
  up screen is shown, as the app is loading coin data from 
  asyncStorage. It will be shown a little longer the more coins
  are added to the wallet, and should feature some animation 
  or interesting splash image that goes well with the static 
  splash image at the beginning.
*/

import React, { Component } from "react";
import { 
  View, 
  StyleSheet, 
  Text
} from "react-native";
import ProgressBar from 'react-native-progress/Bar';

export default class LoadingScreen extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <View style={styles.loadingRoot}>
        <ProgressBar width={200} indeterminate={true} color='#2E86AB'/>
        <Text style={styles.loadingLabel}>{"Initializing Verus Mobile..."}</Text>
      </View>
    );
  }
}
const styles = StyleSheet.create({
  loadingRoot: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingLabel: {
    backgroundColor: "transparent",
    marginTop: 15,
    fontSize: 15,
    textAlign: "center",
    color: "#E9F1F7",
    width: "70%"
  },
});
