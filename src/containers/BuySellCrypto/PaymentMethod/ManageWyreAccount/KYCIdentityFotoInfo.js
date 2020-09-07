import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
  Alert,
  Image,
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

import VerifyIdentity from '../../../../images/customIcons/VerifyAddress.svg';

import { NavigationActions } from '@react-navigation/compat';

const icons = require('../../../../images/customIcons');

class KYCIdentityFotoInfo extends Component {
  constructor(props) {
    super(props)
  }


    componentDidMount() {

    }

    componentWillUnmount() {

    }



  onClick = () => {  this.props.navigation.navigate("KYCfoto") }


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
          </View>
          <View style={Styles.svgHeader}>
            <VerifyIdentity height={'100%'} width={'100%'}/>
          </View>
          <View style={Styles.padding}>
            <View>
              <Text style={Styles.boldText}>Verify your photo ID</Text>
            </View>
            <View>
              <Text style={{ ...Styles.centralLightTextPadded, textAlign: 'left' }}>In order to comply with federal regulations, PrimeTrust requires to verify your photo ID </Text>
            </View>
          </View>
          <View style={Styles.padding}>
          <View style={Styles.alignItemsRight}>
          <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
            <Badge status="primary" containerStyle={Styles.horizontalPaddingBox5} />
              <Text style={{...Styles.leftLightText, width: '90%'}}>Chose from: passport, driverslisence, or identity card</Text>
           </View>
           <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
             <Badge status="primary" containerStyle={Styles.horizontalPaddingBox5} />
               <Text style={{...Styles.leftLightText, width: '90%'}}>Identity number form the chosen document</Text>
            </View>
          </View>
          </View>
          <View style={Styles.padding}>
          <Button
          title="CONTINUE"
          titleStyle={Styles.whiteText}
          buttonStyle={Styles.fullWidthButtonKYC}
          onPress={ this.onClick }
          />
        </View>
        </ View>
      );
    }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetAccountIsFetching(state),
  account: selectWyreAccount(state),
});


export default connect(mapStateToProps)(KYCIdentityFotoInfo);
