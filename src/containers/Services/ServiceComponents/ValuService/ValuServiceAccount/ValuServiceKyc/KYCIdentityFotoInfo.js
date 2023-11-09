import React, { Component } from 'react';
import { connect } from 'react-redux';

import {
  View,
  Text,
} from 'react-native';

import { topProgress } from "./ValuBadgeProgress"

import {
  Badge,
  Button as ElementButton
} from 'react-native-elements';

import Styles from '../../../../../../styles/index';
import Colors from '../../../../../../globals/colors';
import VerifyIdentity from '../../../../../../images/customIcons/VerifyAddress.svg';

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
          <View style={Styles.centralRow}>
          {topProgress(2)}
          </View>
          <View style={{ width:'100%',
                        height: 150,
                        justifyContent: 'center',
                        paddingTop: 42}}>
            <VerifyIdentity height={'100%'} width={'100%'}/>
          </View>
          <View style={Styles.padding}>
            <View>
              <Text style={Styles.boldText}>Verify your photo ID</Text>
            </View>
            <View>
              <Text style={{ ...Styles.centralLightTextPadded, textAlign: 'left' }}>In order to comply with federal regulations, VALU OnRamp requires to verify your photo ID </Text>
            </View>
          </View>
          <View style={Styles.padding}>
          <View style={Styles.alignItemsRight}>
          <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
            <Badge status="primary" containerStyle={Styles.horizontalPaddingBox5} />
              <Text style={{...Styles.leftLightText, width: '90%'}}>Chose from: passport, drivers licence, or identity card</Text>
           </View>
           <View style={{...Styles.startRow, ...Styles.containerVerticalPadding, width: '100%'}}>
             <Badge status="primary" containerStyle={Styles.horizontalPaddingBox5} />
               <Text style={{...Styles.leftLightText, width: '90%'}}>Identity number from the chosen document</Text>
            </View>
          </View>
          </View>
          <View style={Styles.padding}>
          <ElementButton
                titleStyle={{...Styles.whiteText, fontWeight: 'bold'}}
                buttonStyle={{backgroundColor:Colors.primaryColor, paddingTop: 10, paddingBottom: 10, paddingRight: 15, paddingLeft: 15,  borderRadius: 20, marginTop:1} }
                title="CONTINUE"
                onPress={() => {this.onClick()}
                }
              />
        </View>
        </ View>
      );
    }
}

const mapStateToProps = (state) => ({

});


export default connect(mapStateToProps)(KYCIdentityFotoInfo);
