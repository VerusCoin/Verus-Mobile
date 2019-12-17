/*
  This screen is passed a coinID, which it finds more data for in the 
  activeCoinsForUser section of the store upon being mounted. It's purpose
  is to educate the user about the coin they chose and give them the option
  to open a wallet for that coin.
*/

import React, { Component } from "react";
import Button1 from "../../symbols/button1";
import { View, Text, ScrollView, Image, ActivityIndicator } from "react-native";
import { Icon } from "react-native-elements";
import { connect } from 'react-redux';
import { 
  addExistingCoin, 
  setUserCoins, 
  needsUpdate, 
  addKeypair,
  transactionsNeedUpdate
 } from '../../actions/actionCreators';
import { NavigationActions } from 'react-navigation'
import styles from './CoinDetails.styles'

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
    addExistingCoin(this.state.fullCoinData, this.props.activeCoinList, this.props.activeAccount.id)
    .then(response => {
      if (response) {
        this.props.dispatch(response)
        this.props.dispatch(setUserCoins(this.props.activeCoinList, this.props.activeAccount.id))
        this.props.dispatch(addKeypair(this.props.activeAccount.wifKey, this.state.fullCoinData.id, this.props.activeAccount.keys))
        this.props.dispatch(transactionsNeedUpdate(this.state.fullCoinData.id, this.props.needsUpdate.transanctions))

        this.props.dispatch(needsUpdate("balances"))
        this.props.dispatch(needsUpdate("rates"))
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
  }
  
  render() {
    return (
      <View style={styles.root}>
        <Image
          style={{width: 100,height: 100, resizeMode: 'contain', marginTop: '10%'}}
          source={this.state.fullCoinData.logo}
        />
        <Text style={styles.homeLabel}>{this.state.fullCoinData.id} Details</Text>
        <Text style={styles.titleLabel}>
            Full Name:
        </Text>
        <Text style={styles.fullName}>
            {this.state.fullCoinData.name}
        </Text>
        <Text style={styles.titleLabel}>
            Description:
        </Text>
        <ScrollView>
            <Text style={styles.description}>
                {this.state.fullCoinData.description}
            </Text>
        </ScrollView>
        <View style={styles.addCoinBtn}>
        {
          this.state.loading ? 
            <ActivityIndicator animating={this.state.loading} size="large"/>
          :
            this.state.isActive ?
              <View style={styles.coinAddedBox}>
              <Text style={styles.coinAddedLabel}>COIN ADDED</Text>
              <Icon name="check" color="#50C3A5" size={30}/>
              </View>
            :
              <Button1 style={styles.receiveBtn} buttonContent="ADD COIN" onPress={() => this._handleAddCoin()}/>
        }
        </View>
        
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
    activeAccount: state.authentication.activeAccount,
    balances: state.ledger.balances,
    needsUpdate: state.ledger.needsUpdate
  }
};

export default connect(mapStateToProps)(CoinDetails);


