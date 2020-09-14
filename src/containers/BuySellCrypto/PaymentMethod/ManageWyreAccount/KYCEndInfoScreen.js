import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
  Alert,
  TouchableOpacity,
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

import Nr1 from '../../../../images/customIcons/nr1.svg';
import Nr2 from '../../../../images/customIcons/nr2.svg';
import Nr3 from '../../../../images/customIcons/nr3.svg';
import Nr4 from '../../../../images/customIcons/nr4.svg';

class KYCEndInfoScreen extends Component {
  constructor(props) {
    super(props)
  }


    componentDidMount() {

    }

    componentWillUnmount() {

    }

  onClick = () => {   this.props.navigation.navigate("Home") }


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
              status="success"
              badgeStyle={Styles.progessBadgeDone}
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
              <View style={Styles.height15}>
            <View style={Styles.infoKYCContainer}>
                <Nr1 height={'110%'} width={'15%'} />
                <Text style={{...Styles.normalKYCText,  ...Styles.narrow}}>Create your account</Text>
                <Text style={Styles.boldKYCText}>Completed</Text>
             </View>
             </View>
             <View style={Styles.height15}>
             <View style={Styles.infoKYCContainer}>
                <Nr2 height={'110%'} width={'15%'} />
                <View style={{...Styles.alignItemsRight,  ...Styles.narrow}}>
                  <Text style={Styles.normalKYCText}>My personal information</Text>
                    <Text style={Styles.smallKYCText}>name, date of birth, address</Text>
                </View>
               <Text style={Styles.boldKYCText}>Completed</Text>
              </View>
              </View>
              <View style={Styles.height15}>
              <View style={Styles.infoKYCContainer}>
                  <Nr3 height={'110%'} width={'15%'} />
                  <View style={{...Styles.alignItemsRight,  ...Styles.narrow}}>
                    <Text style={Styles.normalKYCText} >Verify Photo ID</Text>
                     <Text style={Styles.smallKYCText} >Scan or upload document</Text>
                  </View>
                  <Text style={Styles.boldKYCText}>Under review</Text>
               </View>
               </View>
               <View style={Styles.height15}>
               <View style={Styles.infoKYCContainer}>
                   <Nr4 height={'110%'} width={'15%'} />
                   <View style={{...Styles.alignItemsRight, ...Styles.narrow}}>
                     <Text style={Styles.normalKYCText}>Proof of Address</Text>
                     <Text style={Styles.smallKYCText}>Scan or upload document</Text>
                   </View>
                   <Text style={{ ...Styles.boldKYCText  }}>Under review</Text>
                </View>
                </View>
                <View style={Styles.padding}>
                  <TouchableOpacity
                  style={Styles.paddedBorderedBox}
                  onPress={ this.onClick }
                  >
                  <Text style={Styles.smallKYCText}>it will take a maximum of fice days to get your uploaded documents reviewed and verified. We thank you for your patience.</Text>
                </TouchableOpacity>
                </View>
              </View>
        </View>

        </ View>
      );
    }
}

const mapStateToProps = (state) => ({
  isFetching: selectWyreGetAccountIsFetching(state),
  account: selectWyreAccount(state),
});


export default connect(mapStateToProps)(KYCEndInfoScreen);
