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

import Lock from '../../../../images/customIcons/iconmonstr-lock-18.svg';

import {
  Badge,
  Button
} from 'react-native-elements';

import Styles from '../../../../styles/index';

import Colors from '../../../../globals/colors';

import VerifyIdentity from '../../../../images/customIcons/VerifyAddress.svg';

import { NavigationActions } from '@react-navigation/compat';
import Nr1 from '../../../../images/customIcons/nr1.svg';
import Nr2 from '../../../../images/customIcons/nr2.svg';
import Nr3 from '../../../../images/customIcons/nr3.svg';

const icons = require('../../../../images/customIcons');

class KYCAddressInfo extends Component {
  constructor(props) {
    super(props)
  }


    componentDidMount() {

    }

    componentWillUnmount() {

    }



  onClick = () => {  this.props.navigation.navigate("KYCAddressInput") }


    render() {

      const scaleFactorY = 2;
      const scalefatorX = 2;

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
              status="success"
              badgeStyle={Styles.progessBadgeDone}
              containerStyle={Styles.horizontalPaddingBox10}
            />
            <Badge
              status="primary"
              badgeStyle={Styles.progessBadgeTodo}
              containerStyle={Styles.horizontalPaddingBox10}
            />
          </View>
          <View style={Styles.svgHeader}>
            <VerifyIdentity height={'100%'} width={'100%'}/>
          </View>
          <View>
            <View style={Styles.padding}>
              <Text style={Styles.boldKYCText}>Verify your address</Text>
            </View>
            <View style={Styles.padding}>
              <Text style={{ ...Styles.normalKYCText, textAlign: 'left' }}>The last step in the KYC process. Let's verify your address. Make a picture or upload one of these documents:</Text>
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
                  <Text style={{...Styles.normalKYCText}}>Bank statement</Text>
                </View>
              </View>
              <View style={Styles.infoKYCContainer}>
               <Badge
                 status="primary"
                 badgeStyle={Styles.smallBlackDot}
                 containerStyle={Styles.smallBlackDotContainer}
               />
               <View style={Styles.wide}>
                 <Text style={{...Styles.normalKYCText}}>Utility bill</Text>
               </View>
             </View>
             <View style={Styles.infoKYCContainer}>
              <Badge
                status="primary"
                badgeStyle={Styles.smallBlackDot}
                containerStyle={Styles.smallBlackDotContainer}
              />
              <View style={Styles.wide}>
                <Text style={{...Styles.normalKYCText}}>Credit card statement</Text>
              </View>
            </View>
          </View>
        </View>
        <View style={Styles.alignItemsRight}>
          <View style={{ height: '15%'}}>
            <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
              <Lock style={{marginTop: 4}} height={'30%'} width={'10%'} />
              <Text style={{...Styles.smallKYCText, width: '80%'}}>PrimeTrust uses bank level encryption on all connections when receiving documents.</Text>
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
      </View>
      );
    }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetAccountIsFetching(state),
  account: selectWyreAccount(state),
});


export default connect(mapStateToProps)(KYCAddressInfo);
