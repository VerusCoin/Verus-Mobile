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
import { expireData } from '../../../actions/actionCreators';
import Styles from '../../../styles/index'
import withNavigationFocus from "react-navigation/src/views/withNavigationFocus";
import { conditionallyUpdateWallet } from "../../../actions/actionDispatchers";
import store from "../../../store";
import TxDetailsModal from '../../../components/TxDetailsModal/TxDetailsModal'
import { API_GET_FIATPRICE, API_GET_BALANCES, API_GET_INFO, API_GET_TRANSACTIONS, ELECTRUM, DLIGHT } from "../../../utils/constants/intervalConstants";

const SELF = require('../../../images/customIcons/selfArrow.png')
const OUT = require('../../../images/customIcons/outgoingArrow.png')
const IN = require('../../../images/customIcons/incomingArrow.png')
const UNKNOWN = require('../../../images/customIcons/unknownLogo.png')
const INTEREST = require('../../../images/customIcons/interestPlus.png')
const CONNECTION_ERROR = "Connection Error"

class Overview extends Component {
  constructor(props) {
    super(props);

    this.state = {
      parsedTxList: [],
      coinRates: {},
      loading: false,
      txDetailsModalOpen: false,
      txDetailProps: {
        parsedAmount: 0,
        txData: {},
        activeCoinID: null,
        txLogo: UNKNOWN
      }
    };
    //this.updateProps = this.updateProps.bind(this);
    this.refresh = this.refresh.bind(this);

    this.refresh();
  }

  componentDidUpdate(lastProps) {
    if (lastProps.isFocused !== this.props.isFocused && this.props.isFocused) {
      this.refresh();
    }
  }

  refresh = () => {
    this.setState({ loading: true }, () => {
      const updates = [
        API_GET_FIATPRICE,
        API_GET_BALANCES,
        API_GET_INFO,
        API_GET_TRANSACTIONS
      ];
      Promise.all(
        updates.map(async update => {
          await conditionallyUpdateWallet(
            store.getState(),
            this.props.dispatch,
            this.props.activeCoin.id,
            update
          );
        })
      )
        .then(res => {
          this.setState({ loading: false });
        })
        .catch(error => {
          this.setState({ loading: false });
          console.error(error);
        });
    });
  };

  forceUpdate = () => {
    const coinObj = this.props.activeCoin;
    this.props.dispatch(expireData(coinObj.id, API_GET_FIATPRICE));
    this.props.dispatch(expireData(coinObj.id, API_GET_BALANCES));
    this.props.dispatch(expireData(coinObj.id, API_GET_INFO));
    this.props.dispatch(expireData(coinObj.id, API_GET_TRANSACTIONS));

    this.refresh();
  };

  _openDetails = item => {
    let navigation = this.props.navigation;
    navigation.navigate("TxDetails", {
      data: item
    });
  };

  renderTransactionItem = ({ item, index }) => {
    let amount = 0;
    let avatarImg;
    let subtitle = "";

    if (Array.isArray(item)) {
      let toAddresses = [];
      amount = Number(item[0].amount) - Number(item[1].amount);

      if (item[1].interest) {
        let interest = item[1].interest * -1;
        amount = Number(amount) + Number(interest);
      }

      avatarImg = OUT;
      for (let i = 0; i < item[0].to.length; i++) {
        if (item[0].to[i] !== item[0].from[0]) {
          toAddresses.push(item[0].to[i]);
        }
      }

      if (toAddresses.length > 1) {
        subtitle = toAddresses[0] + " + " + (toAddresses.length - 1) + " more";
      } else {
        subtitle = toAddresses[0];
      }
    } else {
      amount = item.amount ? Number(item.amount) : "???";

      if (item.type === "received") {
        avatarImg = IN;
        subtitle = "me";
      } else if (item.type === "sent") {
        avatarImg = OUT;
        subtitle = item.address;
      } else if (item.type === "self") {
        if (item.amount !== "???" && amount < 0) {
          subtitle = "me";
          avatarImg = INTEREST;
          amount = amount * -1;
        } else {
          avatarImg = SELF;
          subtitle = "fees";
        }
      } else {
        avatarImg = UNKNOWN;
        subtitle = "???";
      }
    }

    subtitle = "to: " + subtitle;

    return (
      <TouchableOpacity
        onPress={() =>
          this.setState({
            txDetailProps: {
              parsedAmount: amount,
              txData: item,
              activeCoinID: this.props.activeCoin.id,
              txLogo: avatarImg
            },
            txDetailsModalOpen: true
          })
        }
      >
        <ListItem
          roundAvatar
          title={
            <Text style={Styles.listItemLeftTitleDefault}>
              {amount < 0.0001
                ? "< " + truncateDecimal(amount, 4)
                : truncateDecimal(amount, 4)}
            </Text>
          }
          subtitle={subtitle}
          leftAvatar={{
            source: avatarImg
          }}
          chevron
          containerStyle={Styles.bottomlessListItemContainer}
          rightTitle={
            <Text style={Styles.listItemRightTitleDefault}>{"info"}</Text>
          }
        />
      </TouchableOpacity>
    );
  };

  renderTransactionList = () => {
    return (
      <FlatList
        style={Styles.fullWidth}
        data={this.props.transactions.public}
        scrollEnabled={true}
        refreshing={this.state.loading}
        onRefresh={this.forceUpdate}
        renderItem={this.renderTransactionItem}
        //extraData={this.props.balances}
        keyExtractor={this.keyExtractor}
      />
    );
  };

  keyExtractor = (item, index) => {
    if (Array.isArray(item)) {
      return item[0].txid;
    }
    return item.txid;
  };

  renderBalanceLabel = () => {
    const { activeCoin, balances } = this.props;

    if (balances.errors.public) {
      return (
        <Text
          style={{ ...Styles.largeCentralPaddedHeader, ...Styles.errorText }}
        >
          {CONNECTION_ERROR}
        </Text>
      );
    } else if (balances.public) {
      return (
        <Text style={Styles.largeCentralPaddedHeader}>
          {truncateDecimal(satsToCoins(balances.public.confirmed), 4) +
            " " +
            activeCoin.id}
        </Text>
      );
    } else {
      return null;
    }
  };

  render() {
    return (
      <View style={Styles.defaultRoot}>
        <TxDetailsModal
          {...this.state.txDetailProps}
          cancel={() =>
            this.setState({
              txDetailsModalOpen: false,
              txDetailProps: {
                parsedAmount: 0,
                txData: {},
                activeCoinID: null,
                txLogo: UNKNOWN
              }
            })
          }
          visible={this.state.txDetailsModalOpen}
          animationType="slide"
        />
        <View style={Styles.centralRow}>{this.renderBalanceLabel()}</View>
        <Text style={Styles.greyStripeHeader}>Transactions</Text>
        {this.renderTransactionList()}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id

  return {
    activeCoin: state.coins.activeCoin,
    balances: {
      public: state.ledger.balances[ELECTRUM][chainTicker],
      private: state.ledger.balances[DLIGHT][chainTicker],
      errors: {
        public: state.errors[API_GET_BALANCES][ELECTRUM][chainTicker],
        private: state.errors[API_GET_BALANCES][DLIGHT][chainTicker],
      }
    },
    transactions: {
      public: state.ledger.transactions[ELECTRUM][chainTicker],
      private: state.ledger.transactions[DLIGHT][chainTicker],
      errors: {
        public: state.errors[API_GET_TRANSACTIONS][ELECTRUM][chainTicker],
        private: state.errors[API_GET_TRANSACTIONS][DLIGHT][chainTicker],
      }
    },
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    generalWalletSettings: state.settings.generalWalletSettings,
  }
};

export default connect(mapStateToProps)(withNavigationFocus(Overview));