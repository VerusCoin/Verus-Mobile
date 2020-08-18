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
import { truncateDecimal } from '../../../utils/math';
import { expireData, setActiveOverviewFilter } from '../../../actions/actionCreators';
import Styles from '../../../styles/index'
import { conditionallyUpdateWallet } from "../../../actions/actionDispatchers";
import store from "../../../store";
import TxDetailsModal from '../../../components/TxDetailsModal/TxDetailsModal'
import {
  API_GET_FIATPRICE,
  API_GET_BALANCES,
  API_GET_INFO,
  API_GET_TRANSACTIONS,
  ELECTRUM,
  DLIGHT
} from "../../../utils/constants/intervalConstants";
import {
  PUBLIC,
  PRIVATE,
  TOTAL
} from '../../../utils/constants/constants'
import { selectTransactions } from '../../../selectors/transactions';
import { Dropdown } from 'react-native-material-dropdown'
import Colors from "../../../globals/colors";

const TX_LOGOS = {
  self: {
    [PUBLIC]: require('../../../images/customIcons/self-arrow.png'),
    [PRIVATE]: require('../../../images/customIcons/self-arrow-private.png')
  },
  out: {
    [PUBLIC]: require('../../../images/customIcons/out-arrow.png'),
    [PRIVATE]: require('../../../images/customIcons/out-arrow-private.png')
  },
  in: {
    [PUBLIC]: require('../../../images/customIcons/in-arrow.png'),
    [PRIVATE]: require('../../../images/customIcons/in-arrow-private.png')
  },
  pending: {
    [PUBLIC]: require('../../../images/customIcons/pending-clock.png'),
    [PRIVATE]: require('../../../images/customIcons/pending-clock-private.png')
  },
  unknown: {
    [PUBLIC]: require('../../../images/customIcons/unknown-logo.png'),
    [PRIVATE]: require('../../../images/customIcons/unknown-logo.png')
  },
  interest: {
    [PUBLIC]: require('../../../images/customIcons/interest-plus.png')
  }
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
        parsedAmount: 0,
        txData: {},
        activeCoinID: null,
        txLogo: TX_LOGOS.unknown[PUBLIC]
      }
    };
    //this.updateProps = this.updateProps.bind(this);
    this.refresh = this.refresh.bind(this);

    this.refresh();
  }

  componentDidMount() {
    this._unsubscribeFocus = this.props.navigation.addListener('focus', () => {
      this.refresh();
    });
  }

  componentWillUnmount() {
    this._unsubscribeFocus()
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
        subtitle = item.address == null ? (item.visibility === PRIVATE ? "hidden" : "??") : item.address;
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
        return { ...object, visibility: PRIVATE };
      }),
      ...publicTxs.map(object => {
        return Array.isArray(object) ? { txArray: object, visibility: PUBLIC } : { ...object, visibility: PUBLIC };
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

  setOverviewFilter = (filter) => {
    this.props.dispatch(setActiveOverviewFilter(this.props.activeCoin.id, filter))
  }

  renderBalanceLabel = () => {
    const { activeCoin, balances, activeOverviewFilter } = this.props;
    let displayBalance = null
    let balanceName = null

    if (activeOverviewFilter == null) {
      displayBalance =
        balances.public != null && balances.private != null
          ? balances.public.total + balances.private.total
          : balances.public != null
          ? balances.public.total
          : balances.private != null
          ? balances.private.total
          : null;
    } else {
      balanceName = activeOverviewFilter

      if (activeOverviewFilter === PRIVATE) {
        displayBalance = balances.private != null ? balances.private.total : null
      } else if (activeOverviewFilter === PUBLIC) {
        displayBalance = balances.public != null ? balances.public.total : null
      }
    }

    if (balances.errors.public && balances.errors.private) {
      return (
        <Text
          style={{ ...Styles.largeCentralPaddedHeader, ...Styles.errorText }}
        >
          {CONNECTION_ERROR}
        </Text>
      );
    } else {
      return (
        <Text style={Styles.largeCentralPaddedHeader}>
          {`${
            displayBalance != null
              ? `${truncateDecimal(displayBalance, 4)}${
                  balanceName != null ? ` ${balanceName}` : ''
                }`
              : "-"
          } ${activeCoin.id}`}
        </Text>
      );
    } 
  };

  render() {
    const { activeOverviewFilter, enabledChannels, activeCoin, dispatch } = this.props;

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
                txLogo: TX_LOGOS.unknown[PUBLIC],
              },
            })
          }
          visible={this.state.txDetailsModalOpen}
          animationType="slide"
        />
        <View style={Styles.centralRow}>{this.renderBalanceLabel()}</View>
          <View style={{...Styles.fullWidth, ...Styles.greyStripeContainer, ...Styles.horizontalPaddingBox}}>
            <Dropdown
              data={[TOTAL, PUBLIC, PRIVATE]}
              disabled={!global.ENABLE_DLIGHT || enabledChannels.length < 3}
              labelExtractor={(value) => value}
              valueExtractor={(value) => value}
              onChangeText={(value) => {
                  dispatch(setActiveOverviewFilter(activeCoin.id, value === TOTAL ? null : value))
                }
              }
              renderBase={() => (
                <Text style={{...Styles.greyStripeHeader, ...Styles.capitalizeFirstLetter}}>{`${
                  activeOverviewFilter == null ? "Total" : activeOverviewFilter
                } Overview${!global.ENABLE_DLIGHT || enabledChannels.length < 3 ? '' : ' ▾'}`}</Text>
              )}
            />
          </View>
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
    transactions: selectTransactions(state),
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    generalWalletSettings: state.settings.generalWalletSettings,
    activeOverviewFilter: state.coinOverview.activeOverviewFilter[chainTicker],
    enabledChannels: state.settings.coinSettings[chainTicker] ? state.settings.coinSettings[chainTicker].channels : []
  }
};

export default connect(mapStateToProps)(Overview);