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
  View
} from "react-native";
import styles from './LoadingScreen.styles';
import { setDarkModeState } from "../../actions/actionCreators";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { connect } from "react-redux";



class LoadingScreen extends Component {
  constructor(props) {
    super(props)
  }
  componentDidMount() {
    this.initializeDarkModeState();
  }

  initializeDarkModeState = async () => {
    try {
      const darkModeValue = await AsyncStorage.getItem('darkModeKey');
      if (darkModeValue !== null) {
        this.props.dispatch(setDarkModeState(JSON.parse(darkModeValue)));
      } else {
        this.props.dispatch(setDarkModeState(null));
      }
    } catch (error) {
      console.error('Error retrieving Dark Mode state: ', error);
    }
  }

  render() {
    return (
      <View style={styles.loadingRoot} />
    )
  }
}

export default connect()(LoadingScreen);
