/*
  This component's purpose is to display a list of transactions for the 
  activeCoin, as set by the store. If transactions or balances are flagged
  as needing an update, it updates them upon mounting.
*/

import React, { Component } from "react";
import {
  View,
  FlatList,
  TouchableOpacity
} from "react-native";
import { connect } from 'react-redux';
import { expireCoinData, expireServiceData, setActiveOverviewFilter } from '../../../actions/actionCreators';
import Styles from '../../../styles/index'
import { conditionallyUpdateService, conditionallyUpdateWallet } from "../../../actions/actionDispatchers";
import store from "../../../store";
import TxDetailsModal from '../../../components/TxDetailsModal/TxDetailsModal'
import {
  API_GET_FIATPRICE,
  API_GET_BALANCES,
  API_GET_INFO,
  API_GET_TRANSACTIONS,
  ETH,
  API_GET_SERVICE_ACCOUNT,
  API_GET_SERVICE_PAYMENT_METHODS,
  API_GET_SERVICE_TRANSFERS,
  API_GET_SERVICE_RATES,
  API_GET_SERVICE_NOTIFICATIONS,
  IS_PBAAS_ROOT,
  IS_PBAAS,
  ERC20
} from "../../../utils/constants/intervalConstants";
import { selectTransactions } from '../../../selectors/transactions';
import { DEFAULT_DECIMALS, ETHERS, VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT, VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT } from "../../../utils/constants/web3Constants";
import { Portal, List, Text, Badge } from "react-native-paper";
import BigNumber from "bignumber.js";
import { TransactionLogos } from '../../../images/customIcons/index'
import Colors from "../../../globals/colors";
import { CoinDirectory } from "../../../utils/CoinData/CoinDirectory";

const TX_LOGOS = {
  self: TransactionLogos.SelfArrow,
  out: TransactionLogos.OutArrow,
  in: TransactionLogos.InArrow,
  pending: TransactionLogos.PendingClock,
  unknown: TransactionLogos.Unknown,
  interest: TransactionLogos.InterestPlus,
}

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
        parsedAmount: "0",
        txData: {},
        activeCoinID: null,
        activeCoinExplorerId: null,
        activeCoinDisplayTicker: null,
        TxLogo: TX_LOGOS.unknown
      }
    };
    //this.updateProps = this.updateProps.bind(this);
    this.refresh = this.refresh.bind(this);
  }

  componentDidMount() {
    this.refresh();
    this._unsubscribeFocus = this.props.navigation.addListener('focus', () => {
      this.refresh();
    });
  }

  componentWillUnmount() {
    this._unsubscribeFocus()
  }

  refresh = () => {
    if (!this.state.loading) {
      this.setState({ loading: true }, async () => {
        const serviceUpdates = [
          API_GET_SERVICE_ACCOUNT,
          API_GET_SERVICE_PAYMENT_METHODS,
          API_GET_SERVICE_TRANSFERS,
          API_GET_SERVICE_RATES,
          API_GET_SERVICE_NOTIFICATIONS
        ]

        const coinUpdates = [
          API_GET_FIATPRICE,
          API_GET_BALANCES,
          API_GET_INFO,
          API_GET_TRANSACTIONS
        ];

        const updates = [{
          keys: serviceUpdates,
          update: conditionallyUpdateService,
          params: [this.props.dispatch],
        }, {
          keys: coinUpdates,
          update: conditionallyUpdateWallet,
          params: [this.props.dispatch, this.props.activeCoin.id],
        }]

        for (const update of updates) {
          for (const key of update.keys) {
            try {
              await update.update(store.getState(), ...update.params, key)
            } catch(e) {
              console.warn("Error forcing update to " + key)
              console.warn(e)
            }
          }
        }

        this.setState({ loading: false });
      });
    }
  };

  forceUpdate = () => {
    const coinObj = this.props.activeCoin;
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_FIATPRICE));
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_BALANCES));
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_INFO));
    this.props.dispatch(expireCoinData(coinObj.id, API_GET_TRANSACTIONS));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_ACCOUNT));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_PAYMENT_METHODS));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_TRANSFERS));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_RATES));
    this.props.dispatch(expireServiceData(API_GET_SERVICE_NOTIFICATIONS));
    
    this.refresh();
  };

  _openDetails = item => {
    let navigation = this.props.navigation;
    navigation.navigate("TxDetails", {
      data: item
    });
  };

  renderTransactionItem = ({ item, index }) => {
    const decimals =
      this.props.activeCoin.decimals != null
        ? this.props.activeCoin.decimals
        : DEFAULT_DECIMALS;
    let amount = BigNumber(0)
    let AvatarImg;
    let subtitle = "";
    const gasFees = item.feeCurr === ETH.toUpperCase()

    if (Array.isArray(item)) {
      const txArray = item
      let toAddresses = [];
      const confirmed = txArray[0].confirmed
      
      amount = BigNumber(txArray[0].amount).minus(txArray[1].amount)

      if (txArray[1].interest) {
        let interest = txArray[1].interest * -1;

        amount = amount.plus(interest)
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

      AvatarImg = !confirmed || txArray[0].status === "pending" ? TX_LOGOS.pending : TX_LOGOS.out;

      item = {
        address: toAddresses.join(' & '),
        amount,
        confirmed,
        fee: txArray[0].fee,
        from: txArray[0].from,
        timestamp: txArray[0].timestamp,
        to: toAddresses,
        txid: txArray[0].txid,
        type: "sent"
      }
    } else {
      amount = item.amount != null ? BigNumber(item.amount) : BigNumber(0);

      if (item.type === "received") {
        AvatarImg = TX_LOGOS.in;
        subtitle = "me";
      } else if (item.type === "sent") {
        AvatarImg = TX_LOGOS.out;
        subtitle = item.address == null ? "??" : item.address;

        if (
          this.props.activeCoin.proto === ETH ||
          this.props.activeCoin.proto === ERC20
        ) {
          if (
            (!!(this.props.activeCoin.testnet) &&
              VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT != null &&
              subtitle.toLowerCase() === VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT.toLowerCase()) ||
            (!this.props.activeCoin.testnet &&
              VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT != null &&
              subtitle.toLowerCase() === VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT.toLowerCase())
          ) {
            subtitle = 'Verus-Ethereum Bridge Contract';
          }
        }
      } else if (item.type === "self") {
        if (item.amount !== "??" && amount.isLessThan(0)) {
          subtitle = "me";
          AvatarImg = TX_LOGOS.interest;
          amount = amount.multipliedBy(-1);
        } else {
          AvatarImg = TX_LOGOS.self;
          subtitle = gasFees ? "gas" : "fees";
        }
      } else {
        AvatarImg = TX_LOGOS.unknown;
        subtitle = "??";
      }
    }

    if (!item.confirmed || item.status === "pending")
      AvatarImg = TX_LOGOS.pending;

    subtitle = "to: " + subtitle;

    let displayAmount = null

    // Handle possible int overflows
    try { 
      if (!gasFees && item.fee) {
        displayAmount = amount.minus(item.fee)
      } else displayAmount = amount
    }
    catch(e) { console.error(e) }

    let explorerId;

    try {
      explorerId = this.props.activeCoin.system_id && this.props.activeCoin.tags.includes(IS_PBAAS) && 
      !this.props.activeCoin.tags.includes(IS_PBAAS_ROOT)
        ? CoinDirectory.findSystemCoinObj(this.props.activeCoin.id).id
        : this.props.activeCoin.id;
    } catch(e) { console.warn(e) }
    
    return (
      <TouchableOpacity
        onPress={() =>
          this.setState({
            txDetailProps: {
              displayAmount: displayAmount,
              txData: item,
              activeCoinID: this.props.activeCoin.id,
              activeCoinDisplayTicker: this.props.activeCoin.display_ticker,
              activeCoinExplorerId: explorerId,
              TxLogo: AvatarImg,
              decimals: decimals,
            },
            txDetailsModalOpen: true,
          })
        }
      >
        <List.Item
          title={`${
            displayAmount != null
              ? displayAmount.isLessThan(BigNumber(0.0001)) &&
                !displayAmount.isEqualTo(BigNumber(0))
                ? displayAmount.toExponential()
                : displayAmount.toString()
              : "??"
          } ${
            item.feeCurr != null && item.type === "self"
              ? item.feeCurr
              : this.props.activeCoin.display_ticker
          }`}
          description={subtitle}
          descriptionNumberOfLines={1}
          left={() => (
            <AvatarImg
              width={24}
              height={24}
              style={{
                alignSelf: "center",
                marginLeft: 16,
                marginRight: 16,
              }}
            />
          )}
          right={(props) => (
            <React.Fragment>
              {item.memo != null && <List.Icon {...props} icon={"email"} size={20} />}
              <List.Icon {...props} icon={"chevron-right"} size={20} />
            </React.Fragment>
          )}
        />
      </TouchableOpacity>
    );
  };

  parseTransactionLists = () => {
    const { transactions } = this.props
    let txs =
      transactions != null && transactions.results != null
        ? transactions.results
        : [];

    return txs.sort((a, b) => {
      a = Array.isArray(a) ? a[0] : a
      b = Array.isArray(b) ? b[0] : b
      
      if (a.timestamp == null) return -1
      else if (b.timestamp == null) return 1
      else if (b.timestamp == a.timestamp) return 0
      else if (b.timestamp < a.timestamp) return -1
      else return 1
    })
  }

  renderTransactionList = () => {
    return (
      <FlatList
        style={Styles.fullWidth}
        contentContainerStyle={{ flexGrow: 1 }}
        data={this.parseTransactionLists()}
        scrollEnabled={true}
        ListEmptyComponent={
          <View
            style={Styles.focalCenter}
          >
            <Text style={{...Styles.centeredText, fontSize: 16, color: Colors.verusDarkGray}}>
              {"No transactions found..."}
            </Text>
          </View>
        }
        keyExtractor={(item, index) => index}
        refreshing={this.state.loading}
        onRefresh={this.forceUpdate}
        renderItem={this.renderTransactionItem}
        //extraData={this.props.balances}
      />
    );
  };

  setOverviewFilter = (filter) => {
    this.props.dispatch(setActiveOverviewFilter(this.props.activeCoin.id, filter))
  }

  render() {
    return (
      <View style={Styles.defaultRoot}>
        {this.state.txDetailsModalOpen && (
          <Portal>
            <TxDetailsModal
              {...this.state.txDetailProps}
              cancel={() =>
                this.setState({
                  txDetailsModalOpen: false,
                  txDetailProps: {
                    parsedAmount: "0",
                    txData: {},
                    activeCoinID: null,
                    activeCoinDisplayTicker: null,
                    activeCoinExplorerId: null,
                    TxLogo: TX_LOGOS.unknown,
                    decimals:
                      this.props.activeCoin.decimals != null
                        ? this.props.activeCoin.decimals
                        : ETHERS,
                  },
                })
              }
              jumpTo={this.props.jumpTo}
              visible={this.state.txDetailsModalOpen}
              animationType="slide"
            />
          </Portal>
        )}
        {this.renderTransactionList()}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoin: state.coins.activeCoin,
    transactions: selectTransactions(state),
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    generalWalletSettings: state.settings.generalWalletSettings,
  }
};

export default connect(mapStateToProps)(Overview);