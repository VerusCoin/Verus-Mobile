import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
  Alert,
} from 'react-native';
import {
  selectWyreAccount,
  selectWyreGetAccountIsFetching,
} from '../../../../selectors/paymentMethods';

import {
  Badge
} from 'react-native-elements';

import Styles from '../../../../styles/index';

import Colors from '../../../../globals/colors';

import { NavigationActions } from '@react-navigation/compat'

class KYCInfoScreen extends Component {
constructor(props) {
  super(props)
  this.state = {
    userName: "",
    userEmail: "",
    userPassword: "",
    checked: false
  };
}


  componentDidMount() {

  }

  componentWillUnmount() {

  }

onChangeName = (input) => { this.setState({ userName: input }) }
onChangeEmail = (input) => { this.setState({ userEmail: input }) }
onChangePassword = (input) => { this.setState({ userPassword: input }) }

_checkDetails = () => {
  /*  WHEN ACCESS TO API FIX THIS FUNCTION */

  const chris = true;

  if(chris === true){
    return true;
  }else{
    return false;
  }
}

onCancel = () => {
    console.log(`${this.state.userName}, ${this.state.userEmail}, ${this.state.userPassword}`)

    this.props.navigation.dispatch(NavigationActions.back());

  }

onSignup = () => {
  console.log(`${this.state.userName}, ${this.state.userEmail}, ${this.state.userPassword}`)

  if(this._checkDetails() === true){
    this.props.navigation.navigate("SelectPaymentMethod", {
      onSelect: "stonks"
    })
  }else{
    Alert.alert("signin failed", "the username and or password is not correct");
  }
}


onFlip = () => { this.state.checked === true ? this.setState({ checked: false }) : this.setState({ checked: true }) }

  render() {

    const scaleFactorY = 2;
    const scalefatorX = 2;

    return (
      <View style={Styles.root}>
        <View style={Styles.centralRow}>
          <Badge
            status="success"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ {scaleX: scalefatorX, scaleY: scaleFactorY } }
            containerStyle={Styles.horizontalPaddingBox10}
          />
        </View>
        <View>
          <View>
            <Text>title</Text>
          </View>
          <View>
            <Text>bla bla bla</Text>
          </View>
        </View>
        <View>
          <View></View>
          <View></View>
          <View></View>
          <View></View>
        </View>
        <View></View>
      </ View>
    );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetAccountIsFetching(state),
  account: selectWyreAccount(state),
});


export default connect(mapStateToProps)(KYCInfoScreen);
