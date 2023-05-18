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
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Text } from "react-native-paper"
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
import { CoinLogos, getCoinLogo } from "../../utils/CoinData/CoinData";

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

  _handleAddCoin = async () => {
    this.setState({ loading: true });

    try {
      this.props.dispatch(
        await addKeypairs(
          this.state.fullCoinData,
          this.props.activeAccount.keys,
          this.props.activeAccount.keyDerivationVersion == null
            ? 0
            : this.props.activeAccount.keyDerivationVersion
        )
      );

      const addCoinAction = await addCoin(
        this.state.fullCoinData,
        this.props.activeCoinList,
        this.props.activeAccount.id,
        this.state.fullCoinData.compatible_channels
      )

      if (addCoinAction) {
        this.props.dispatch(addCoinAction);

        const setUserCoinsAction = setUserCoins(
          this.props.activeCoinList,
          this.props.activeAccount.id
        )
        this.props.dispatch(setUserCoinsAction);

        activateChainLifecycle(setUserCoinsAction.payload.activeCoinsForUser);

        this.setState({ isActive: true, loading: false });
      } else {
        throw new Error("Error adding coin");
      }

      if (!this.state.unmounted) {
        this.goBack();
      }
    } catch(e) {
      Alert.alert("Error Adding Coin", `There was a problem adding ${this.state.fullCoinData.id}.`);
      console.error(e)
      this.setState({ loading: false });
    }
  }
  
  render() {
    const Logo = getCoinLogo(this.state.fullCoinData.id, 'dark')

    return (
      <View style={Styles.defaultRoot}>
        <View style={Styles.centralRow}>
          <View style={Styles.fullWidthFlexCenterBlock}>
            {Logo != null && (
              <Logo height={75} width={75} />
            )}
          </View>
        </View>
        <Text style={Styles.greyStripeHeader}>
          {this.state.fullCoinData.display_name}
        </Text>
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
              <ActivityIndicator
                animating={this.state.loading}
                size="large"
              />
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


