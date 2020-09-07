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
          <View style={Styles.padding}>
            <Text style={Styles.boldKYCText}>To use our fiat gateway, primetrust has to verify your identity</Text>
          </View>

          <View >
            <Text style={{ ...Styles.normalKYCText, ...Styles.padding, textAlign: 'left' }}>all documents are handled securely and with care. PrimeTrust Privacy Policy, Terms of Service</Text>
          </View>

        </View>
        <View>
          <View style={Styles.alignItemsRight}>
          <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
            <Badge status="primary" containerStyle={Styles.horizontalPaddingBox5} />
              <Text style={{...Styles.leftLightText, width: '60%'}}>Create your account</Text>
              <Text style={Styles.infoText}>Completed</Text>
           </View>
           <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
             <Badge status="primary" containerStyle={Styles.horizontalPaddingBox5} />
              <View style={{...Styles.alignItemsRight, width: '60%'}}>
                <Text style={Styles.leftLightText}>My personal information</Text>
                  <Text>name, date of birth, address</Text>
              </View>
             <Text style={Styles.infoText}>1 min</Text>
            </View>
            <View style={{...Styles.startRow,...Styles.containerVerticalPadding, width: '100%'}}>
              <Badge status="primary" containerStyle={Styles.horizontalPaddingBox5} />
                <View style={{...Styles.alignItemsRight, width: '60%'}}>
                  <Text style={Styles.leftLightText} >Verify Photo ID</Text>
                   <Text >Scan or upload document</Text>
                </View>
                <Text style={Styles.infoText}>2 min</Text>
             </View>
             <View style={{...Styles.startRow,...Styles.containerVerticalPadding, width: '100%'}}>
               <Badge status="primary" containerStyle={Styles.horizontalPaddingBox5} />
                 <View style={{...Styles.alignItemsRight, width: '60%'}}>
                   <Text style={Styles.leftLightText}>Proof of Address</Text>
                   <Text>Scan or upload document</Text>
                 </View>
                 <Text style={{ ...Styles.infoText  }}>2 min</Text>
              </View>
                <View style={Styles.alignItemsRight}>

                </View>
            </View>
      </View>
        <View style={Styles.padding}>
          <Button
          title="START"
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


export default connect(mapStateToProps)(KYCInfoScreen);
