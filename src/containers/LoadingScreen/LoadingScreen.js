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
  Text
} from "react-native";
import ProgressBar from 'react-native-progress/Bar';
import styles from './LoadingScreen.styles';
import Colors from '../../globals/colors';

export default class LoadingScreen extends Component {
  constructor(props) {
    super(props)
  }

  render() {
    return (
      <View style={styles.loadingRoot}>
        <ProgressBar width={200} height={2} indeterminate={true} color={Colors.primaryColor}/>
        <Text style={styles.loadingLabel}>{"Initializing Verus Mobile..."}</Text>
      </View>
    );
  }
}
