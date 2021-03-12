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
import { CoinLogos } from "../../utils/CoinData/CoinData";

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
          this.props.activeAccount.seeds,
          this.state.fullCoinData,
          this.props.activeAccount.keys
        )
      );

      const addCoinAction = await addCoin(
        this.state.fullCoinData,
        this.props.activeCoinList,
        this.props.activeAccount.id,
        this.state.fullCoinData.compatible_channels
      )

      if (addCoinAction) {
        const chainId = this.state.fullCoinData.id;
        this.props.dispatch(addCoinAction);
        this.props.dispatch(
          setUserCoins(
            this.props.activeCoinList,
            this.props.activeAccount.id
          )
        );

        activateChainLifecycle(chainId);

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
    const tickerLc = this.state.fullCoinData.id.toLowerCase()
    const Logo = CoinLogos[tickerLc] ? CoinLogos[tickerLc].dark : null

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


