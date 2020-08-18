/*
  This screen is passed a coinID, which it finds more data for in the 
  activeCoinsForUser section of the store upon being mounted. It's purpose
  is to educate the user about the coin they chose and give them the option
  to open a wallet for that coin.
*/

import React, { Component } from "react";
import StandardButton from "../../components/StandardButton";
import {
  View,
  Text,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { connect } from 'react-redux';
import { 
  addCoin, 
  setUserCoins, 
  addKeypairs,
 } from '../../actions/actionCreators';
import { NavigationActions } from '@react-navigation/compat'
import Styles from '../../styles/index'
import { activateChainLifecycle } from "../../actions/actions/intervals/dispatchers/lifecycleManager";
import Colors from "../../globals/colors";

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
    let selectedCoin = this.props.route.params.data
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

    addCoin(
      this.state.fullCoinData,
      this.props.activeCoinList,
      this.props.activeAccount.id,
      this.props.coinSettings[this.state.fullCoinData.id] != null
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
        Alert.alert("Error Adding Coin", `There was a problem adding ${this.state.fullCoinData.id}.`);
        console.error(err)
        this.setState({ loading: false });
      });
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


