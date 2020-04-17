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
import { standardizeDlightTxObj } from "../../../utils/standardization/standardizeTxObj";

const TX_LOGOS = {
  self: {
    public: require('../../../images/customIcons/self-arrow.png'),
    private: require('../../../images/customIcons/self-arrow-private.png')
  },
  out: {
    public: require('../../../images/customIcons/out-arrow.png'),
    private: require('../../../images/customIcons/out-arrow-private.png')
  },
  in: {
    public: require('../../../images/customIcons/in-arrow.png'),
    private: require('../../../images/customIcons/in-arrow-private.png')
  },
  pending: {
    public: require('../../../images/customIcons/pending-clock.png'),
    private: require('../../../images/customIcons/pending-clock-private.png')
  },
  unknown: {
    public: require('../../../images/customIcons/unknown-logo.png'),
    private: require('../../../images/customIcons/unknown-logo.png')
  },
  interest: {
    public: require('../../../images/customIcons/interest-plus.png')
  }
}
const SELF = require('../../../images/customIcons/self-arrow.png')
const OUT = require('../../../images/customIcons/out-arrow.png')
const IN = require('../../../images/customIcons/in-arrow.png')
const PENDING = require('../../../images/customIcons/pending-clock.png')
const UNKNOWN = require('../../../images/customIcons/unknown-logo.png')
const INTEREST = require('../../../images/customIcons/interest-plus.png')
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
          console.warn(error);
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

    if (item.txArray != null) {
      const { txArray, visibility } = item
      let toAddresses = [];
      const confirmations = txArray[0].confirmations

      amount = Number(txArray[0].amount) - Number(txArray[1].amount);

      if (txArray[1].interest) {
        let interest = txArray[1].interest * -1;
        amount = Number(amount) + Number(interest);
      }

      for (let i = 0; i < txArray[0].to.length; i++) {
        if (txArray[0].to[i] !== txArray[0].from[0]) {
          toAddresses.push(txArray[0].to[i]);
        }
      }

      if (toAddresses.length > 1) {
        subtitle = toAddresses[0] + " + " + (toAddresses.length - 1) + " more";
      } else {
        subtitle = toAddresses[0];
      }

      avatarImg = confirmations === 0 || txArray[0].status === "pending" ? TX_LOGOS.pending : TX_LOGOS.out;

      item = {
        address: toAddresses.join(' & '),
        amount,
        confirmations,
        from: txArray[0].from,
        timestamp: txArray[0].timestamp,
        to: toAddresses,
        txid: txArray[0].txid,
        type: "sent",
        visibility
      }
    } else {
      amount = item.amount ? Number(item.amount) : "??";

      if (item.type === "received") {
        avatarImg = TX_LOGOS.in;
        subtitle = "me";
      } else if (item.type === "sent") {
        avatarImg = TX_LOGOS.out;
        subtitle = item.address == null ? (item.visibility === "private" ? "hidden" : "??") : item.address;
      } else if (item.type === "self") {
        if (item.amount !== "??" && amount < 0) {
          subtitle = "me";
          avatarImg = TX_LOGOS.interest;
          amount = amount * -1;
        } else {
          avatarImg = TX_LOGOS.self;
          subtitle = "fees";
        }
      } else {
        avatarImg = TX_LOGOS.unknown;
        subtitle = "??";
      }
    }

    avatarImg = avatarImg[item.visibility]

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
          subtitleProps={{ numberOfLines: 1 }}
          leftAvatar={{
            source: avatarImg,
            avatarStyle: Styles.secondaryBackground
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

  parseTransactionLists = () => {
    const { transactions } = this.props
    let privateTxs = transactions.private || []
    let publicTxs = transactions.public || []
    let txList = [
      ...privateTxs.map(object => {
        return { ...object, visibility: "private" };
      }),
      ...publicTxs.map(object => {
        return Array.isArray(object) ? { txArray: object, visibility: "public" } : { ...object, visibility: "public" };
      })
    ];

    return txList.sort((a, b) => {
      if (a.timestamp == null) return 1
      else if (b.timestamp == null) return -1
      else if (b.timestamp == a.timestamp) return 0
      else if (b.timestamp < a.timestamp) return -1
      else return 1
    })
  }

  renderTransactionList = () => {
    return (
      <FlatList
        style={Styles.fullWidth}
        data={this.parseTransactionLists()}
        scrollEnabled={true}
        keyExtractor={(item, index) => index}
        refreshing={this.state.loading}
        onRefresh={this.forceUpdate}
        renderItem={this.renderTransactionItem}
        //extraData={this.props.balances}
      />
    );
  };

  renderBalanceLabel = () => {
    const { activeCoin, balances } = this.props;

    if (balances.errors.public && balances.errors.private) {
      return (
        <Text
          style={{ ...Styles.largeCentralPaddedHeader, ...Styles.errorText }}
        >
          {CONNECTION_ERROR}
        </Text>
      );
    } else if (balances.public || balances.private) {
      return (
        <Text style={Styles.largeCentralPaddedHeader}>
          {truncateDecimal(
            balances.public != null && balances.private != null
              ? balances.public.total + balances.private.total
              : balances.public != null
              ? balances.public.total
              : balances.private.total,
            4
          ) +
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