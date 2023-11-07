import React, { Component } from "react";
import { connect } from 'react-redux'
import { View, StyleSheet, Text } from "react-native";

import PlaidLinkHandler from '../ValuServicePlaid/PlaidLinkHandler';
import FundValuAccount from '../ValuServicePlaid/FundValuAccount';
import WithdrawCryptoValu from '../ValuServicePlaid/WithdrawCryptoValu';

class FundValuAccount extends Component {
  constructor(props) {
    super(props);
    this.state = {
      verusID: "",
      rAddress: "",
      addresses: [null],
      infoIndexes: [],
      KYCState: null,
      errors: {
        verusID: null,
        infoIndexes: []
      },
    };
  }

  renderStage(state) {
    console.log(this.props.KYCState)
    switch (this.props.KYCState) {
      case 5: 
        return (<View >
                  <Text style={Styles.boldTextPlain}>To use our fiat gateway, Register with Plaid</Text>
                 <PlaidLinkHandler navigation={this.props.navigation} />
                 </View>
                 )
      case 6:
        return   (<View>
                  <Text style={Styles.boldTextPlain}>Fund Account</Text>
                <FundValuAccount navigation={this.props.navigation} />
                </View>
                 )
      case 7:
      return   (<View>
                <Text style={Styles.boldTextPlain}>Convert your USD to VRSC.</Text>
                <WithdrawCryptoValu navigation={this.props.navigation} />
                </View>
                )
      default:
        return <></> 
    }
    
  }

  render() {
    return (
      <View
        style={{
          backgroundColor: "white",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flex: 1,
          alignItems: "center",
        }}
      >
        
        {this.renderStage(this.state) }
      </View>
    );
  }
}

const mapStateToProps = (state) => {

  return {
    KYCState: state.channelStore_valu_service.KYCState || 0,
  }
};


export default connect(mapStateToProps)(FundValuAccount);