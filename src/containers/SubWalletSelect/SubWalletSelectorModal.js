import React, { Component } from "react"
import { connect } from 'react-redux';
import {
  Modal,
  ScrollView,
  View,
  Text
} from "react-native"
import Styles from '../../styles/index'
import StandardPieChart from "../../components/StandardPieChart";
import SubWalletCard from "../../components/SubWalletCard";
import { GENERAL } from "../../utils/constants/intervalConstants";
import { SUBWALLET_NAMES } from "../../utils/constants/constants";
import { truncateDecimal } from "../../utils/math";
import { setCoinSubWallet } from "../../actions/actionCreators";
import { USD } from "../../utils/constants/currencies";
import BigNumber from "bignumber.js";

class SubWalletSelectorModal extends Component {
  constructor(props) {
    super(props)
    this.state = {
      cryptoBalances: {},
      fiatBalances: {},
      pieSections: [],
      totalBalance: BigNumber(0)
    };
  }

  componentDidMount() {
    this.updateBalances()
  }

  updateBalances = () => {
    const { cryptoBalances, fiatBalances } = this.state
    const { allBalances, activeCoin, rates, displayCurrency, subWallets } = this.props
    const walletColorMap = {}
    const chainTicker = activeCoin.id
    let pieSections = []
    let totalBalance = BigNumber(0)

    subWallets.map(wallet => {
      if (
        allBalances[wallet.channel] &&
        allBalances[wallet.channel][chainTicker]
      ) {
        cryptoBalances[wallet.id] = BigNumber(allBalances[wallet.channel][chainTicker].total);
        totalBalance = totalBalance.plus(cryptoBalances[wallet.id]);
        walletColorMap[wallet.id] = wallet.color
      }

      if (cryptoBalances[wallet.id] && rates[chainTicker]) {
        fiatBalances[wallet.id] = BigNumber(
          rates[chainTicker][displayCurrency]
        ).multipliedBy(cryptoBalances[wallet.id]);
      }
    })

    for (const walletId in cryptoBalances) {
      if (cryptoBalances[walletId] != null) {
        pieSections.push({
          percentage: totalBalance.isEqualTo(0)
            ? 100
            : Number(truncateDecimal(
                cryptoBalances[walletId]
                  .dividedBy(totalBalance)
                  .multipliedBy(BigNumber(100)),
                0
              )),
          color: walletColorMap[walletId],
        });
      }
    }

    this.setState({
      cryptoBalances,
      fiatBalances,
      pieSections,
      totalBalance
    })
  }

  cancelHandler = () => {
    if (this.props.cancel) {
      this.props.cancel();
    }
  };

  setSubWallet = (subWallet) => {
    this.props.dispatch(setCoinSubWallet(this.props.activeCoin.id, subWallet))
  }

  render() {
    const { props, state, cancelHandler } = this
    const { animationType, visible, activeCoin, displayCurrency, subWallets } = props
    const {
      totalBalance,
      pieSections,
      cryptoBalances,
      fiatBalances,
    } = state;

    return (
      <Modal
        animationType={animationType}
        transparent={false}
        visible={visible}
        onRequestClose={cancelHandler}
      >
        <View
          style={{ ...Styles.centerContainer, ...Styles.flexBackground }}
        >
          <View style={{position: 'absolute', top: 30}}>
            <Text style={Styles.centralHeader}>
              {"Select a Card"}
            </Text>
          </View>
          <ScrollView
            contentContainerStyle={{
              display: "flex",
              alignItems: "center",
              width: '100%',
              paddingTop: 80
            }}
          >
            <StandardPieChart
              radius={90}
              sections={pieSections}
              innerText={`${truncateDecimal(totalBalance, 2)} ${activeCoin.id}`}
              containerStyle={{
                justifyContent: "center",
                height: 200,
              }}
            />
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                padding: "2%",
                flex: 1,
              }}
            >
              {subWallets.map((wallet, index) => (
                <SubWalletCard
                  key={index}
                  nameTitle={
                    SUBWALLET_NAMES[wallet.id]
                      ? SUBWALLET_NAMES[wallet.id]
                      : wallet.id
                  }
                  balanceTitle={`${
                    cryptoBalances[wallet.id] != null
                      ? truncateDecimal(cryptoBalances[wallet.id], 4)
                      : "-"
                  } ${activeCoin.id}`}
                  balanceSubtitle={`${
                    fiatBalances[wallet.id] != null
                      ? fiatBalances[wallet.id].toFixed(2)
                      : "-"
                  } ${displayCurrency}`}
                  onPress={() => this.setSubWallet(wallet)}
                  color={wallet.color}
                />
              ))}
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }
}

const mapStateToProps = (state) => {
  return {
    activeCoin: state.coins.activeCoin,
    allBalances: state.ledger.balances,
    rates: state.ledger.rates[GENERAL],
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD,
  }
};

export default connect(mapStateToProps)(SubWalletSelectorModal);
