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

import Nr1 from '../../../../images/customIcons/nr1.svg';
import Nr2 from '../../../../images/customIcons/nr2.svg';
import Nr3 from '../../../../images/customIcons/nr3.svg';
import Nr4 from '../../../../images/customIcons/nr4.svg';


import { NavigationActions } from '@react-navigation/compat'

class KYCInfoScreen extends Component {
constructor(props) {
  super(props)
}


  componentDidMount() {

  }

  componentWillUnmount() {

  }

onClick = () => {   this.props.navigation.navigate("KYCIdentityInfo") }


  render() {

    const scaleFactorY = 2;
    const scalefatorX = 2;

    return (
      <View style={Styles.root}>
        <View style={Styles.progressBarContainer}>
          <Badge

            badgeStyle={ Styles.progessBadgeDone }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge

            badgeStyle={ Styles.progessBadgeTodo }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ Styles.progessBadgeTodo }
            containerStyle={Styles.horizontalPaddingBox10}
          />
          <Badge
            status="primary"
            badgeStyle={ Styles.progessBadgeTodo }
            containerStyle={Styles.horizontalPaddingBox10}
          />
        </View>
        <View>
          <View style={Styles.padding}>
            <Text style={Styles.boldKYCText}>To use our fiat gateway, primetrust has to verify your identity</Text>
          </View>

          <View >
            <Text style={{ ...Styles.normalKYCText, ...Styles.padding, textAlign: 'left' }}>all documents are handled securely and with care. PrimeTrust Privacy Policy, Terms of Service</Text>
          </View>
        </View>
        <View>
          <View style={Styles.alignItemsRight}>
            <View style={{ height: '15%'}}>
            <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
              <Nr1 height={'110%'} width={'15%'} />
                  <Text style={{...Styles.normalKYCText, width: '60%'}}>Create your account</Text>
                  <Text style={Styles.boldKYCText}>Completed</Text>
             </View>
             </View>
             </View>
             <View style={{ height: '15%'}}>
           <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
              <Nr2 height={'100%'} width={'15%'} />
              <View style={{...Styles.alignItemsRight, width: '60%'}}>
                <Text style={Styles.normalKYCText}>My personal information</Text>
                  <Text style={Styles.smallKYCText}>name, date of birth, address</Text>
              </View>
             <Text style={Styles.boldKYCText}>1 min</Text>
            </View>
            </View>
            <View style={{ height: '15%'}}>
            <View style={{...Styles.startRow,...Styles.containerVerticalPadding, width: '100%'}}>
                <Nr3 height={'100%'} width={'15%'} />
                <View style={{...Styles.alignItemsRight, width: '60%'}}>
                  <Text style={Styles.normalKYCText} >Verify Photo ID</Text>
                   <Text style={Styles.smallKYCText}>Scan or upload document</Text>
                </View>
                <Text style={Styles.boldKYCText}>2 min</Text>
             </View>
             </View>
             <View style={{ height: '15%'}}>
             <View style={{...Styles.startRow,...Styles.containerVerticalPadding, width: '100%'}}>
                <Nr4 height={'100%'} width={'15%'} />
                 <View style={{...Styles.alignItemsRight, width: '60%'}}>
                   <Text style={Styles.normalKYCText}>Proof of Address</Text>
                   <Text style={Styles.smallKYCText}>Scan or upload document</Text>
                 </View>
                 <Text style={{ ...Styles.boldKYCText  }}>2 min</Text>
              </View>
            </View>
            </View>
            <View style={{ height: '5%'}}>
            <View style={{...Styles.buttonKYC, width: '100%'}}>
                 <Button
                 title="START"
                 titleStyle={Styles.whiteText}
                 buttonStyle={Styles.fullWidthButtonKYC}
                 onPress={ this.onClick }
                 />
             </View>
           </View>
      </View>
    );
  }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetAccountIsFetching(state),
  account: selectWyreAccount(state),
});


export default connect(mapStateToProps)(KYCInfoScreen);
