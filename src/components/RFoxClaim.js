/*
  This component creates a modal to claim RFox 
  migrated funds
*/

import { ethers } from "ethers";
import React, { Component } from "react"
import {
  View,
  Text,
  ScrollView,
  Alert,
} from "react-native"
import Modal from '../components/Modal'
import AlertAsync from "react-native-alert-async";
import StandardButton from "../components/StandardButton"
import Colors from '../globals/colors';
import Styles from '../styles/index'
import { claimRFoxAccountBalances, estimateGasClaimRFoxAccountBalances } from "../utils/api/channels/erc20/requests/specific/rfox/claimAccountBalance";
import { ETHERS } from "../utils/constants/web3Constants";
import { requestPrivKey } from "../utils/auth/authBox";
import { ETH } from "../utils/constants/intervalConstants";

class RFoxClaim extends Component {
  constructor(props) {
    super(props)
    this.state = {
      loading: false,
      rewards: ethers.utils.formatUnits(props.rewards)
    }
  }

  cancelHandler = () => {
    if (this.props.cancel) {
      this.props.cancel()
    }
  }

  canClaim = (feeString) => {
    return AlertAsync(
      'Claim RFOX?',
      `Would you like to claim ${this.state.rewards} RFOX? This action will cost you an estimated ${feeString} ETH in fees.`,
      [
        {
          text: 'No',
          onPress: () => Promise.resolve(false),
          style: 'cancel',
        },
        {text: 'Yes', onPress: () => Promise.resolve(true)},
      ],
      {
        cancelable: false,
      },
    )
  }

  claim = () => {
    this.setState({ loading: true }, async () => {
      try {
        const gasFee = ethers.utils.formatUnits(
          await estimateGasClaimRFoxAccountBalances(
            this.props.pubKey,
            this.props.fromAddress
          ),
          ETHERS
        );

        if (await this.canClaim(gasFee.toString())) {
          try {
            const privKey = await requestPrivKey('RFOX', ETH)
            await claimRFoxAccountBalances(privKey, this.props.pubKey)            
    
            this.props.onSuccess()
          } catch(e) {
            console.error(e)
            Alert.alert("Error", "Error claiming RFOX funds, try adding ETH to your wallet to cover fees, and claim again.")
            this.setState({
              loading: false
            })
          }
        }
      } catch(e) {
        console.error(e)
        Alert.alert("Error", "Error estimating gas for claim tx.")
      }

      this.setState({ loading: false })
    }) 
  }

  render() {
    return (
      <Modal
      animationType={this.props.animationType}
      transparent={false}
      visible={this.props.visible}
      onRequestClose={this.cancelHandler}>
        <ScrollView 
          style={Styles.flexBackground}
          contentContainerStyle={Styles.centerContainer}>
          <View style={Styles.headerContainer}>
            <Text style={Styles.centralHeader}>
              {"Claim RFox Funds"}
            </Text>
          </View>
          <View style={Styles.standardWidthFlexGrowCenterBlock}>
            <Text style={Styles.centralInfoTextPadded}>
              {'You have the following funds available to claim.'}
            </Text>
            <Text style={Styles.seedWord}>{this.state.rewards + " RFOX"}</Text>
            <Text style={Styles.centralLightTextPadded}>
              {"Press the claim button to add them to your wallet!"}
            </Text>
          </View>
          <View style={Styles.footerContainer}>
            <View style={Styles.standardWidthSpaceBetweenBlock}>
              <StandardButton 
                buttonColor={Colors.warningButtonColor}
                disabled={this.state.loading}
                title="CLOSE" 
                onPress={this.cancelHandler}
              />
              <StandardButton 
                buttonColor={Colors.verusGreenColor}
                disabled={this.state.loading}
                title="CLAIM" 
                onPress={this.claim}
              />
            </View>
          </View>
        </ScrollView>
      </Modal>
    );
  }
}

export default RFoxClaim;
