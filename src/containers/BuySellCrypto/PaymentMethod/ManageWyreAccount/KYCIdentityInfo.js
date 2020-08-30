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
  Badge,
  Button
} from 'react-native-elements';

import Styles from '../../../../styles/index';

import Colors from '../../../../globals/colors';

import { NavigationActions } from '@react-navigation/compat'

class KYCIdentityInfo extends Component {
constructor(props) {
  super(props)
}


  componentDidMount() {

  }

  componentWillUnmount() {

  }



onClick = () => {  this.props.navigation.navigate("KYCIdentityInput") }


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
            <Text style={Styles.centralHeader} >verify your Identity</Text>
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
        <Button
        title="next"
        titleStyle={Styles.whiteText}
        buttonStyle={Styles.defaultButtonClearWhite}
        onPress={ this.onClick }
        />
      </ View>
    );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetAccountIsFetching(state),
  account: selectWyreAccount(state),
});


export default connect(mapStateToProps)(KYCIdentityInfo);
