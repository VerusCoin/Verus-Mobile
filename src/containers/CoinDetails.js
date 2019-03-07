/*
  This screen is passed a coinID, which it finds more data for in the 
  activeCoinsForUser section of the store upon being mounted. It's purpose
  is to educate the user about the coin they chose and give them the option
  to open a wallet for that coin.
*/

import React, { Component } from "react";
import Button1 from "../symbols/button1";
import { View, StyleSheet, Text, ScrollView, Image, ActivityIndicator } from "react-native";
import { Icon } from "react-native-elements";
import { findCoinObj } from "../utils/CoinData"
import { connect } from 'react-redux';
import { 
  addExistingCoin, 
  setUserCoins, 
  needsUpdate, 
  addKeypair,
  transactionsNeedUpdate
 } from '../actions/actionCreators';
import { NavigationActions } from 'react-navigation'

class CoinDetails extends Component {
  constructor(props) {
    super(props)
    this.state = {
        isActive: false,
        coinData: {logo: null, id: ""},
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
    let selectedCoin = this.props.activeCoinsForUser.find((o) => {
        if (o.id === this.props.navigation.state.params.data) {
          return o
        }
    })

    if (selectedCoin) {
      this.setState({ isActive: true, coinData: selectedCoin });
    }
    else {
      selectedCoin = findCoinObj(this.props.navigation.state.params.data, null)

      this.setState({ isActive: false, coinData: selectedCoin });
    }
  }

  goBack = () => {
    this.props.navigation.dispatch(NavigationActions.back())
  }

  _handleAddCoin = (coinID) => {
    this.setState({ loading: true });
    addExistingCoin(coinID, this.props.activeCoinList, this.props.activeAccount.id)
    .then(response => {
      if (response) {
        this.props.dispatch(response)
        this.props.dispatch(setUserCoins(this.props.activeCoinList, this.props.activeAccount.id))
        this.props.dispatch(addKeypair(this.props.activeAccount.wifKey, coinID, this.props.activeAccount.keys))
        this.props.dispatch(transactionsNeedUpdate(coinID, this.props.needsUpdate.transanctions))

        this.props.dispatch(needsUpdate("balances"))
        this.props.dispatch(needsUpdate("rates"))
        this.setState({ isActive: true, loading: false });
      }
      else {
        throw "Error adding coin"
      }
    })
    .then(() => {
      if (!this.state.unmounted) {
        this.goBack();
      }
    })
  }
  
  render() {
    const {state} = this.props.navigation;
    return (
      <View style={styles.root}>
        <Image
          style={{width: 50, height: 50, marginTop: 5}}
          source={this.state.coinData.logo}
        />
        <Text style={styles.homeLabel}>{this.state.coinData.id} Details</Text>
        <View style={styles.rect} />
        <Text style={styles.titleLabel}>
            Full Name:
        </Text>
        <Text style={styles.fullName}>
            {this.state.coinData.name}
        </Text>
        <Text style={styles.titleLabel}>
            Description:
        </Text>
        <ScrollView>
            <Text style={styles.description}>
                {this.state.coinData.description}
            </Text>
        </ScrollView>
        <View style={styles.addCoinBtn}>
        {
          this.state.loading ? 
            <ActivityIndicator animating={this.state.loading} size="large"/>
          :
            this.state.isActive ?
              <View style={styles.coinAddedBox}>
              <Text style={styles.coinAddedLabel}>Coin Added</Text>
              <Icon name="check" color="#50C3A5" size={30}/>
              </View>
            :
              <Button1 style={styles.receiveBtn} buttonContent="Add Coin" onPress={() => this._handleAddCoin(this.state.coinData.id)}/>
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

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },
  coinAddedBox: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: "center"
  },
  titleLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 5,
    marginBottom: 3,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7",
    width: 245,
  },

  fullName: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 10,
    paddingBottom: 0,
    fontSize: 20,
    textAlign: "center",
    color: "#E9F1F7",
    width: 245,
  },

  description: {
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7",
    width: 300,
  },

  coinAddedLabel: {
    backgroundColor: "transparent",
    opacity: 0.86,
    fontSize: 22,
    marginRight: 5,
    color: "#50C3A5",
  },
  rect: {
    height: 1,
    width: "100%",
    backgroundColor: "rgb(230,230,230)"
  },
  addCoinBtn: {
    height: 54,
    width: "100%",
    backgroundColor: "transparent",
    flexDirection: "row",
    justifyContent: "space-around",
    paddingBottom: 0,
    paddingTop: 5,
    marginBottom: 8,
    marginTop: 8,
    left: "0%"
  },
  receiveBtn: {
    width: 222.32,
    height: 45,
    backgroundColor: "rgba(29,145,95,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  homeLabel: {
    width: 244,
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 5,
    marginBottom: 15,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  }
});
