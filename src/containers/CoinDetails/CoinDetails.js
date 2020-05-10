/*
  This screen is passed a coinID, which it finds more data for in the
  activeCoinsForUser section of the store upon being mounted. It's purpose
  is to educate the user about the coin they chose and give them the option
  to open a wallet for that coin.
*/

import React, { Component } from "react";
import StandardButton from "../../components/StandardButton";
import { View, Text, ScrollView, Image, ActivityIndicator } from "react-native";
import { connect } from 'react-redux';
import {
  addExistingCoin,
  setUserCoins,
  addKeypairs,
 } from '../../actions/actionCreators';
import { NavigationActions } from 'react-navigation'
import Styles from '../../styles/index'
import { activateChainLifecycle } from "../../actions/actions/intervals/dispatchers/lifecycleManager";
import Colors from "../../globals/colors";
import VerusLightClient from 'react-native-verus-light-client';

class CoinDetails extends Component {
  constructor(props) {
    super(props)
    this.state = {
      isActive: false,
      fullCoinData: {logo: null, id: ""},
      loading: false,
      unmounted: false
    };
    this.isActiveCoin = this.isActiveCoin.bind(this);
  }

  componentDidMount() {
    this.isActiveCoin();
  }

  componentWillUnmount() {
    this.setState({ unmounted: true });
  }

  isActiveCoin = () => {
    let selectedCoin = this.props.navigation.state.params.data
    let activeCoinIndex = this.props.activeCoinsForUser.findIndex(coin => {
      return coin.id === selectedCoin.id
    })

    this.setState({ isActive: activeCoinIndex > -1 ? true : false, fullCoinData: selectedCoin });
  }

  goBack = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }
  _handleAddCoin = () => {
    this.setState({ loading: true });

<<<<<<< HEAD
        this.setState({ isActive: true, loading: false });
      }
      else {
        throw new Error("Error adding coin")
      }
    })
    .then(() => {
      if (!this.state.unmounted) {
        this.goBack();
      }
    })
    if (this.state.fullCoinData.name === "Verus Coin") {
      //VerusLightClient.addWallet("VRSC", "vrsc", "light.virtualsoundnw.com", "9077","ZIPPIE","1")//
      VerusLightClient.createWallet('VRSC', 'vrsc', '8ccb033c0e48b27ff91e1ab948367e3bbc6921487c97624ed7ad064025e3dc99', "lightwalletd.testnet.z.cash", 9067, 2, "a seed that is at least 32 bytes long so that it will work with the ZIP 32 protocol.", 0)
    .then(res => {
      console.log("ADD WALLET RES")
      console.log(res)



      return VerusLightClient.openWallet('VRSC', 'vrsc', '8ccb033c0e48b27ff91e1ab948367e3bbc6921487c97624ed7ad064025e3dc99')
    })
    .then(res => {
      console.log("ADD WALLET RES")
      console.log(res)

      return startSync('VRSC', 'vrsc', '8ccb033c0e48b27ff91e1ab948367e3bbc6921487c97624ed7ad064025e3dc99')
    })
    .catch(err => {
      console.log("ADD WALLET OR REQ REJ")
      console.log(err)
    })
    }
    //if ( ) {

    //}
=======
    addCoin(
      this.state.fullCoinData,
      this.props.activeCoinList,
      this.props.activeAccount.id,
      this.props.coinSettings[this.state.fullCoinData.id]
        ? this.props.coinSettings[this.state.fullCoinData.id].channels
        : this.state.fullCoinData.compatible_channels
    )
      .then((response) => {
        if (response) {
          const chainId = this.state.fullCoinData.id;
          this.props.dispatch(response);
          this.props.dispatch(
            setUserCoins(
              this.props.activeCoinList,
              this.props.activeAccount.id
            )
          );
          this.props.dispatch(
            addKeypairs(
              this.props.activeAccount.seeds,
              chainId,
              this.props.activeAccount.keys
            )
          );

          activateChainLifecycle(chainId);

          this.setState({ isActive: true, loading: false });
        } else {
          throw new Error("Error adding coin");
        }
      })
      .then(() => {
        if (!this.state.unmounted) {
          this.goBack();
        }
      })
      .catch((err) => {
        Alert.alert("Error Adding Coin", err.message);
        this.setState({ loading: false });
      });
>>>>>>> 2a966b524d031907a2c214ff09e78bba2aaa27a5
  }

  render() {
    return (
      <View style={Styles.defaultRoot}>
        <View style={Styles.centralRow}>
          <View style={Styles.fullWidthFlexCenterBlock}>
            <Image
              style={{
                width: 75,
                height: 75,
                resizeMode: "contain",
              }}
              source={this.state.fullCoinData.logo}
            />
          </View>
        </View>
        <Text style={Styles.greyStripeHeader}>{this.state.fullCoinData.name}</Text>
        <ScrollView
          style={Styles.fullWidth}
          contentContainerStyle={Styles.horizontalCenterContainer}
        >
          <View style={Styles.wideCenterBlock}>
            <Text style={Styles.defaultDescriptiveText}>
              {this.state.fullCoinData.description}
            </Text>
          </View>
          <View>
            {this.state.loading ? (
              <ActivityIndicator animating={this.state.loading} size="large" />
            ) : this.state.isActive ? (
              <Text style={Styles.centralSuccessHeader}>COIN ADDED</Text>
            ) : (
              <StandardButton
                color={Colors.linkButtonColor}
                title="ADD COIN"
                onPress={() => this._handleAddCoin()}
              />
            )}
          </View>
        </ScrollView>
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
    activeAccount: state.authentication.activeAccount,
    coinSettings: state.settings.coinSettings
    //needsUpdate: state.ledger.needsUpdate
  }
};

export default connect(mapStateToProps)(CoinDetails);
