import React, { Component } from "react";
import Button1 from "../symbols/button1";
import {
  View,
  StyleSheet,
  Image,
  Text,
  Dimensions,
  FlatList,
  ActivityIndicator
} from "react-native";
import { ListItem } from "react-native-elements";
import { connect } from 'react-redux';
import { satsToCoins, truncateDecimal } from '../utils/math';
import { fetchTransactionsForCoin, updateCoinBalances } from '../actions/actionCreators';

const SELF = require('../images/customIcons/selfArrow.png')
const OUT = require('../images/customIcons/outgoingArrow.png')
const IN = require('../images/customIcons/incomingArrow.png')
const UNKNOWN = require('../images/customIcons/unknownLogo.png')
const INTEREST = require('../images/customIcons/interestPlus.png')

class Overview extends Component {
  constructor(props) {
    super(props)
    this.state = {
      parsedTxList: [],
      coinRates: {},
      loading: false
    };
    this.updateProps = this.updateProps.bind(this);
  }


  componentDidMount() {
    const _coinObj = this.props.activeCoin
    const _oldTransactions = this.props.transactions
    const _activeAccount = this.props.activeAccount
    const _needsUpdateObj = this.props.needsUpdate.transactions
    const _balances = this.props.balances
    const _activeCoinsForUser = this.props.activeCoinsForUser

    let promiseArray = []

    if (_needsUpdateObj[_coinObj.id]){
      console.log("Transactions need update, pushing update to transaction array")
      if (!this.state.loading) {
        this.setState({ loading: true });  
      }
      promiseArray.push(fetchTransactionsForCoin(_oldTransactions, _coinObj, _activeAccount, _needsUpdateObj))
    }

    if(this.props.needsUpdate.balances) {
      console.log("Balances need update, pushing update to balance array")
      if (!this.state.loading) {
        this.setState({ loading: true });  
      }
      promiseArray.push(updateCoinBalances(_balances, _activeCoinsForUser, _activeAccount))
    }
  
    this.updateProps(promiseArray)
  }

  _openDetails = (item) => {  
    let navigation = this.props.navigation  
    navigation.navigate("TxDetails", {
      data: item
    });
  };

  _sendButton = () => {
    let navigation = this.props.navigation  

    data = {
      coinObj: this.props.activeCoin, 
      balances: this.props.balances,
      activeAccount: this.props.activeAccount,
      activeCoinsForUser: this.props.activeCoinsForUser
    }

    navigation.navigate("Send", {
      data: data
    });
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
            resolve(true)
          }
          else {
            resolve(false)
          }
        })
    }) 
  }

  renderTransactionItem = ({item, index}) => {
    let amount = 0
    let avatarImg
    let subtitle = ''
    
    if(Array.isArray(item)) {
      let toAddresses = []
      amount = Number(item[0].amount) - Number(item[1].amount)

      if (item[1].interest) {
        let interest = item[1].interest*-1
        amount = Number(amount) + Number(interest)
      }
          
      avatarImg = OUT
      for (let i = 0; i < item[0].to.length; i++) {
        if (item[0].to[i] !== item[0].from[0]) {
          toAddresses.push(item[0].to[i])
        }
      }

      if (toAddresses.length > 1) {
        subtitle = toAddresses[0] + ' + ' + (toAddresses.length - 1) + ' more'
      }
      else {
        subtitle = toAddresses[0]
      }
    }
    else {
      amount = item.amount ? Number(item.amount) : '???'

      if(item.type === 'received') {
        avatarImg = IN
        subtitle = 'me'
      }
      else if (item.type === 'sent') {
        avatarImg = OUT
        subtitle = item.address
      }
      else if (item.type === 'self') {
        if (item.amount !== '???' && amount < 0) {
          subtitle = 'me'
          avatarImg = INTEREST
          amount = amount*-1
        }
        else {
          avatarImg = SELF
          subtitle = 'fees'
        }
      }
      else {
        avatarImg = UNKNOWN
        subtitle = '???'
      }
    }

    subtitle = 'to: ' + subtitle

    return (
      <ListItem              
        roundAvatar          
        title={<Text style={styles.transactionItemLabel}>
              {amount < 0.0001 ? '< ' + truncateDecimal(amount, 4) : truncateDecimal(amount, 4)}
              </Text>}   
        subtitle={subtitle}                  
        avatar={avatarImg}   
        containerStyle={{ borderBottomWidth: 0 }} 
        rightTitle={'info'}
        onPress={() => this._openDetails({amount: amount, tx: item, coinID: this.props.activeCoin.id})}
      />      
    )
  }

  renderTransactionList = () => {
    return (
      <FlatList 
      style={styles.transactionList}         
      data={this.props.transactions[this.props.activeCoin.id]}
      scrollEnabled={true}
      renderItem={this.renderTransactionItem}   
      //extraData={this.props.balances}       
      keyExtractor={this.keyExtractor}                            
      /> 
    )
  }

  keyExtractor = (item, index) => {
    if (Array.isArray(item)) {
      return item[0].txid
    }
    return item.txid
  }

  render() {
    return (
      <View style={styles.root}>
      <View style={styles.headerContainer}>
        {this.state.loading ? 
        <ActivityIndicator style={styles.spinner} animating={this.state.loading} size="large"/>
        :
        <Text style={styles.coinBalanceLabel}>
          {this.props.balances.hasOwnProperty(this.props.activeCoin.id) ? 
          truncateDecimal(satsToCoins(this.props.balances[this.props.activeCoin.id].result.confirmed), 4) + ' ' + this.props.activeCoin.id :
          null}  
        </Text>}
      </View>
        <Text style={styles.transactionLabel}>Transactions</Text>
        {this.renderTransactionList()}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoin: state.coins.activeCoin,
    balances: state.ledger.balances,
    needsUpdate: state.ledger.needsUpdate,
    transactions: state.ledger.transactions,
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
  }
};

export default connect(mapStateToProps)(Overview);

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#232323",
    flex: 1,
    alignItems: "center"
  },
  image: {
    height: 48,
    width: 48,
    marginTop: 65
  },
  coinBalanceLabel: {
    backgroundColor: "transparent",
    opacity: 0.89,
    marginTop: 15,
    marginBottom: 15,
    paddingBottom: 0,
    paddingTop: 0,
    fontSize: 25,
    textAlign: "center",
    color: "#E9F1F7",
  },
  spinner: {
    marginTop: 13,
    marginBottom: 14,
  },
  walletLabel: {
    width: 245,
    height: 38,
    backgroundColor: "transparent",
    opacity: 0.86,
    marginTop: 10,
    marginBottom: 15,
    paddingBottom: 0,
    fontSize: 22,
    textAlign: "center",
    color: "#E9F1F7"
  },
  transactionLabel: {
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
  rect: {
    height: 1,
    width: "95.74468085106383%",

    backgroundColor: "rgb(230,230,230)"
  },
  buttonContainer: {
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
  headerContainer: {
    flexDirection: "row",
    justifyContent: "center",
  },
  sendBtn: {
    width: 130,
    height: 45,
    backgroundColor: "rgba(206,68,70,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  receiveBtn: {
    width: 130,
    height: 45,
    backgroundColor: "rgba(68,206,147,1)",
    opacity: 1,
    marginTop: 0,
    marginBottom: 0
  },
  txList: {
    width: 402,
    height: 1704
  },
  rect2: {
    height: 568,
    flexDirection: "column",
    alignSelf: "stretch",
    borderWidth: 0,
    borderColor: "green",
    borderStyle: "dashed",
    backgroundColor: "#E6E6E6"
  },
  transactionList: {
    width: "100%",
  },
  transactionItemLabel: {
    color: "#E9F1F7",
    marginLeft: 10,
  },
});
