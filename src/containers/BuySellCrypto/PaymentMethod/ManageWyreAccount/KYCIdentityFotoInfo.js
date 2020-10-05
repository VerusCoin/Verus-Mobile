import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
  Alert,
  Image,
  ScrollView,
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

import Nr1 from '../../../../images/customIcons/nr1.svg';
import Nr2 from '../../../../images/customIcons/nr2.svg';

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



  onClick = () => {  this.props.navigation.navigate("KYCDocumentType") }

    render() {
      return (
        <View style={Styles.root}>
          <View style={Styles.progressBarContainer}>
            <Badge
              status="success"
              badgeStyle={Styles.progessBadgeDone}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="success"
              badgeStyle={Styles.progessBadgeDone}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="primary"
              badgeStyle={Styles.progessBadgeTodo}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="primary"
              badgeStyle={Styles.progessBadgeTodo}
              containerStyle={Styles.horizontalPaddingBox10}
            />
          </View>
          <ScrollView>
          <View style={Styles.svgHeader}>
            <VerifyIdentity height={'100%'} width={'100%'}/>
          </View>
          <View>
            <View style={Styles.padding}>
              <Text style={Styles.boldKYCText}>Verify your photo ID</Text>
            </View>
            <View style={Styles.padding}>
              <Text style={{ ...Styles.normalKYCText}}>In order to comply with federal regulations, PrimeTrust requires to verify your photo ID </Text>
            </View>
          </View>
          <View style={Styles.padding}>
            <View style={Styles.alignItemsRight}>
              <View style={Styles.infoKYCContainer}>
                <Badge
                  status="primary"
                  badgeStyle={Styles.smallBlackDot}
                  containerStyle={Styles.smallBlackDotContainer}
                />
                <View style={Styles.wide}>
                  <Text style={{...Styles.normalKYCText}}>Chose from: passport, driverslisence, or identity card</Text>
                </View>
              </View>
              <View style={Styles.infoKYCContainer}>
                <Badge
                   status="primary"
                   badgeStyle={Styles.smallBlackDot}
                   containerStyle={Styles.smallBlackDotContainer}
                />
                <View style={Styles.wide}>
                  <Text style={{...Styles.normalKYCText}}>Identity number form the chosen document</Text>
                </View>
              </View>
            </View>
          </View>
          </ScrollView>

          <View style={Styles.footerContainerKYC}>
           <Button
            title="CONTINUE"
            titleStyle={Styles.whiteText}
            buttonStyle={Styles.fullWidthButtonKYC}
            onPress={ this.onClick }
           />
         </View>
  
       </View>
      );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetAccountIsFetching(state),
  account: selectWyreAccount(state),
});


export default connect(mapStateToProps)(KYCIdentityFotoInfo);
