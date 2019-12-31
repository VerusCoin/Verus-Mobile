/*
  This component's purpose is to display a list of transactions for the 
  activeCoin, as set by the store. If transactions or balances are flagged
  as needing an update, it updates them upon mounting.
*/

import React, { Component } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity
} from "react-native";
import { ListItem } from "react-native-elements";
import { connect } from 'react-redux';
import { satsToCoins, truncateDecimal } from '../../../utils/math';
import { 
  fetchTransactionsForCoin, 
  updateCoinBalances,
  everythingNeedsUpdate
} from '../../../actions/actionCreators';
import styles from './Overview.styles';

const SELF = require('../../../images/customIcons/selfArrow.png')
const OUT = require('../../../images/customIcons/outgoingArrow.png')
const IN = require('../../../images/customIcons/incomingArrow.png')
const UNKNOWN = require('../../../images/customIcons/unknownLogo.png')
const INTEREST = require('../../../images/customIcons/interestPlus.png')
const CONNECTION_ERROR = "Connection Error"

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
    this.refresh()
  }

  refresh = () => {
    const _coinObj = this.props.activeCoin
    const _oldTransactions = this.props.transactions
    const _activeAccount = this.props.activeAccount
    const _needsUpdateObj = this.props.needsUpdate.transactions
    const _balances = this.props.balances
    const _activeCoinsForUser = this.props.activeCoinsForUser

    let promiseArray = []

    if (_needsUpdateObj[_coinObj.id]){
      console.log("Transactions need update, pushing update to promise array")
      if (!this.state.loading) {
        this.setState({ loading: true });  
      }

      promiseArray.push(fetchTransactionsForCoin(_oldTransactions, _coinObj, _activeAccount, _needsUpdateObj, Number(this.props.generalWalletSettings.maxTxCount)))
    }

    if(this.props.needsUpdate.balances) {
      console.log("Balances need update, pushing update to promise array")
      if (!this.state.loading) {
        this.setState({ loading: true });  
      }
      promiseArray.push(updateCoinBalances(_balances, _activeCoinsForUser, _activeAccount))
    }
  
    this.updateProps(promiseArray)
  }

  forceUpdate = () => {
    //TODO: Figure out why screen doesnt always update if everything is called seperately

    /*this.props.dispatch(transactionsNeedUpdate(this.props.activeCoin.id, this.props.needsUpdate.transanctions))
    this.props.dispatch(needsUpdate("balances"))
    this.props.dispatch(needsUpdate("rates"))*/
    this.props.dispatch(everythingNeedsUpdate())

    this.refresh()
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
      <TouchableOpacity onPress={() => this._openDetails({amount: amount, tx: item, coinID: this.props.activeCoin.id})}>
        <ListItem              
          roundAvatar          
          title={<Text style={styles.transactionItemLabel}>
                {amount < 0.0001 ? '< ' + truncateDecimal(amount, 4) : truncateDecimal(amount, 4)}
                </Text>}   
          subtitle={subtitle}                  
          avatar={avatarImg}   
          containerStyle={{ borderBottomWidth: 0 }} 
          rightTitle={'info'}
        /> 
      </TouchableOpacity>    
    )
  }

  renderTransactionList = () => {
    return (
      <FlatList 
      style={styles.transactionList}         
      data={this.props.transactions[this.props.activeCoin.id]}
      scrollEnabled={true}
      refreshing={this.state.loading}
      onRefresh={this.forceUpdate}
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

  renderBalanceLabel = () => {
    if (this.props.balances.hasOwnProperty(this.props.activeCoin.id) && (this.props.balances[this.props.activeCoin.id].error || isNaN(this.props.balances[this.props.activeCoin.id].result.confirmed))) {
      return (
        <Text style={styles.connectionErrorLabel}>
          {CONNECTION_ERROR}  
        </Text>
      )
    } else if (this.props.balances.hasOwnProperty(this.props.activeCoin.id)) {
      return (
      <Text style={styles.coinBalanceLabel}>
          {truncateDecimal(satsToCoins(this.props.balances[this.props.activeCoin.id].result.confirmed), 4) + ' ' + this.props.activeCoin.id }
      </Text>
      )
    } else {
      return null;
    }
  }

  render() {
    return (
      <View style={styles.root}>
      <View style={styles.headerContainer}>
        {this.renderBalanceLabel()}
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
    generalWalletSettings: state.settings.generalWalletSettings,
  }
};

export default connect(mapStateToProps)(Overview);