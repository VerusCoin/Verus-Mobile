/*
  The purpose of this component is to be the first screen a user is 
  met with after login. This screen should have all necesarry or 
  essential wallet components available at the press of one button.
  This includes VerusPay, adding coins, and coin menus. Keeping this 
  screen clean is also essential, as users will spend alot of time with 
  it in their faces. It updates the balances and the rates upon loading 
  if they are flagged to be updated in the redux store.
*/

import React, { Component } from "react";
import { ListItem } from "react-native-elements";
import { 
  View, 
  StyleSheet, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  TouchableOpacity,
  ScrollView
} from "react-native";
import { 
  updateCoinBalances, 
  setCoinRates, 
  setActiveCoin, 
  setActiveApp,
  setActiveSection
} from '../actions/actionCreators';
import { connect } from 'react-redux';
import { satsToCoins, truncateDecimal } from '../utils/math';
import { NavigationActions } from 'react-navigation';

const CONNECTION_ERROR = "Connection Error"

class Home extends Component {
  constructor(props) {
    super(props)
    this.state = {
      totalFiatBalance: 0,
      coinRates: {},
      loading: false
    };
    this.calculateTotalBalance = this.calculateTotalBalance.bind(this);
    this.updateProps = this.updateProps.bind(this);
  }

  componentDidMount() {
    this.refresh();
  }

  refresh = () => {
    const _activeCoinsForUser = this.props.activeCoinsForUser
    const _balances = this.props.balances
    const _activeAccount = this.props.activeAccount
    let promiseArray = []

    if (this.props.activeCoinsForUser.length > 0) {
      if(this.props.needsUpdate.rates) {
        console.log("Rates need update, pushing update to transaction array")
        if (!this.state.loading) {
          this.setState({ loading: true });  
        }  
        promiseArray.push(setCoinRates(_activeCoinsForUser))
      }
      
      if(this.props.needsUpdate.balances) {
        console.log("Balances need update, pushing update to transaction array")
        if (!this.state.loading) {
          this.setState({ loading: true });  
        }  
        promiseArray.push(updateCoinBalances(_balances, _activeCoinsForUser, _activeAccount))
      } 
      
      this.calculateTotalBalance()
      this.updateProps(promiseArray)
    }
  }

  resetToScreen = (route, title, data) => {
    const resetAction = NavigationActions.reset({
      index: 1, // <-- currect active route from actions array
      actions: [
        NavigationActions.navigate({ routeName: "Home" }),
        NavigationActions.navigate({ routeName: route, params: {title: title, data: data} }),
      ],
    })

    this.props.navigation.dispatch(resetAction)
  }

  updateProps = (promiseArray) => {
    return new Promise((resolve, reject) => {
      Promise.all(promiseArray)
        .then((updatesArray) => {
          if (updatesArray.length > 0) {
            for (let i = 0; i < updatesArray.length; i++) {
              if(updatesArray[i]) {
                this.props.dispatch(updatesArray[i])
              }
            }
            if (this.state.loading) {
              this.setState({ loading: false });  
            }
            return true
          }
          else {
            return false
          }
        })
        .then((res) => {
          if (res) {
            this.calculateTotalBalance()
            resolve(true)
          }
          else {
            resolve(false)
          }
        })
    }) 
  }

  calculateTotalBalance = () => {
    let _totalFiatBalance = 0
    let coinBalance = 0
    const balances = this.props.balances
    
    for (let key in this.props.rates) {
      if (typeof this.props.rates[key] === "number") {
        coinBalance = balances.hasOwnProperty(key) ? 
        truncateDecimal(satsToCoins(balances[key].result.confirmed), 4) : 0

        _totalFiatBalance += coinBalance*this.props.rates[key]
      }
    }

    this.setState({ totalFiatBalance: _totalFiatBalance.toFixed(2) });  
  }

  _onPress = () => {
    let coinObj = this.props.activeCoinsForUser[0]
    this.props.dispatch(setActiveCoin(coinObj))
  }

  _verusPay = () => {
    let navigation = this.props.navigation  

    navigation.navigate("VerusPay", { refresh: this.refresh });
  }

  _openCoin = (coinObj) => {
    let navigation = this.props.navigation  
    this.props.dispatch(setActiveCoin(coinObj))
    this.props.dispatch(setActiveApp(coinObj.defaultApp))
    this.props.dispatch(setActiveSection(coinObj.apps[coinObj.defaultApp].data[0]))

    this.resetToScreen('CoinMenus', 'Overview');
  }

  _addCoin = () => {
    let navigation = this.props.navigation  

    navigation.navigate("AddCoin", { refresh: this.refresh });
  }

  renderCoinList = () => {
    return (
      <ScrollView style={styles.coinList}>
        <TouchableOpacity onPress={this._verusPay}>
          <ListItem       
            roundAvatar                
            title={<Text style={styles.coinItemLabel}>VerusPay</Text>}
            rightIcon={{name: 'photo-camera'}}
            avatar={require('../images/customIcons/verusPay.png')}
            containerStyle={{ borderBottomWidth: 0 }} 
          />
        </TouchableOpacity>
        <FlatList   
        data={this.props.activeCoinsForUser}    
        scrollEnabled={false}
        renderItem={({ item, index }) => ( 
          <TouchableOpacity onPress={() => {this._openCoin(this.props.activeCoinsForUser[index], item)}}>
            <ListItem              
              roundAvatar          
              title={<Text style={styles.coinItemLabel}>{item.name}</Text>}   
              subtitle={
                this.props.balances.hasOwnProperty(item.id) ? 
                  this.props.balances[item.id].error ? 
                    CONNECTION_ERROR
                    :
                    truncateDecimal(satsToCoins(this.props.balances[item.id].result.confirmed), 4) + ' ' + item.id 
                :
                null
              }                       
              avatar={item.logo}  
              subtitleStyle={this.props.balances.hasOwnProperty(item.id) && this.props.balances[item.id].error ? {color: "rgba(206,68,70,1)"} : null} 
              containerStyle={{ borderBottomWidth: 0 }} 
              rightTitle={
              ('$' + 
              truncateDecimal(((typeof(this.props.rates[item.id]) === 'number' ? this.props.rates[item.id] : 0)*(this.props.balances.hasOwnProperty(item.id) ? 
              satsToCoins(this.props.balances[item.id].result.confirmed) :
              0)), 2))
            }
            />
          </TouchableOpacity>   
        )}   
        extraData={this.props.balances}       
        keyExtractor={item => item.id}                            
        /> 
        <TouchableOpacity onPress={this._addCoin}>
          <ListItem    
            roundAvatar                    
            title={<Text style={styles.coinItemLabel}>Add Coin</Text>}                            
            avatar={require('../images/customIcons/addCoin.png')}
            containerStyle={{ borderBottomWidth: 0 }} 
          /> 
        </TouchableOpacity>
        <ActivityIndicator animating={this.state.loading} size="large"/>
      </ScrollView>
    )
  }

  render() {
    return (
      <View style={styles.root}>
        <Text style={styles.fiatBalanceLabel}>
        {'$' + truncateDecimal(this.state.totalFiatBalance, 2)}
        </Text>
        <Text style={styles.balanceSheetLabel}>Portfolio</Text>
        {this.renderCoinList()}
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
    needsUpdate: state.ledger.needsUpdate,
    rates: state.ledger.rates
  }
};

export default connect(mapStateToProps)(Home);

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },

  fiatBalanceLabel: {
    backgroundColor: "transparent",
    opacity: 0.89,
    marginTop: 15,
    marginBottom: 15,
    paddingBottom: 0,
    paddingTop: 0,
    fontSize: 25,
    textAlign: "center",
    color: "#E9F1F7",
    width: 359,
  },
  coinItemLabel: {
    color: "#E9F1F7",
    marginLeft: 10,
  },
  balanceSheetLabel: {
    width: "100%",
    backgroundColor: "#E9F1F7",
    opacity: 0.86,
    marginTop: 0,
    marginBottom: 0,
    paddingBottom: 15,
    paddingTop: 15,
    fontSize: 22,
    textAlign: "center",
    color: "#232323"
  },
  coinList: {
    width: "100%",
  },
});
