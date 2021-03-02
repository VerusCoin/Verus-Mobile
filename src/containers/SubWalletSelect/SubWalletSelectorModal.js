import React, { Component } from "react"
import { connect } from 'react-redux';
import {
  ScrollView,
  View,
  Text,
  SafeAreaView,
} from "react-native"
import { List, Card } from "react-native-paper"
import Modal from '../../components/Modal'
import Styles from '../../styles/index'
import { GENERAL } from "../../utils/constants/intervalConstants";
import { SUBWALLET_NAMES } from "../../utils/constants/constants";
import { truncateDecimal } from "../../utils/math";
import { setCoinSubWallet } from "../../actions/actionCreators";
import { USD } from "../../utils/constants/currencies";
import BigNumber from "bignumber.js";
import Colors from "../../globals/colors";

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
        <SafeAreaView style={{ ...Styles.flexBackground }}>
          <Text style={Styles.centralHeader}>{"Select a Card"}</Text>
          <ScrollView>
            {subWallets.map((wallet, index) => (
              <View style={{ margin: 8 }}>
                <Card
                  onPress={() => this.setSubWallet(wallet)}
                  key={index}
                  style={{ backgroundColor: wallet.color }}
                >
                  <List.Item
                    title={
                      SUBWALLET_NAMES[wallet.id]
                        ? SUBWALLET_NAMES[wallet.id]
                        : wallet.id
                    }
                    titleStyle={{
                      color: Colors.secondaryColor,
                      fontWeight: "500",
                    }}
                    description={`${
                      fiatBalances[wallet.id] != null
                        ? fiatBalances[wallet.id].toFixed(2)
                        : "-"
                    } ${displayCurrency}`}
                    left={() => <List.Icon color={Colors.secondaryColor} icon="wallet" />}
                    descriptionStyle={{ color: Colors.secondaryColor }}
                    right={() => (
                      <Text
                        style={{
                          alignSelf: "center",
                          color: Colors.secondaryColor,
                          fontWeight: "500",
                          fontSize: 16,
                          marginRight: 8
                        }}
                      >{`${
                        cryptoBalances[wallet.id] != null
                          ? truncateDecimal(cryptoBalances[wallet.id], 4)
                          : "-"
                      } ${activeCoin.id}`}</Text>
                    )}
                  />
                </Card>
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
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
