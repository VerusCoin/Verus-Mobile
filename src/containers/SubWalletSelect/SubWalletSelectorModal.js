import React, { Component } from "react"
import { connect } from 'react-redux';
import {
  ScrollView,
  View,
  SafeAreaView,
} from "react-native"
import { List, Card, Text } from "react-native-paper"
import Modal from '../../components/Modal'
import Styles from '../../styles/index'
import { API_GET_BALANCES, API_GET_FIATPRICE, GENERAL } from "../../utils/constants/intervalConstants";
import { truncateDecimal } from "../../utils/math";
import { setCoinSubWallet } from "../../actions/actionCreators";
import { USD } from "../../utils/constants/currencies";
import BigNumber from "bignumber.js";
import Colors from "../../globals/colors";
import { CoinDirectory } from "../../utils/CoinData/CoinDirectory";

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
    const {
      allBalances,
      rates,
      chainTicker,
      displayCurrency,
      subWallets
    } = this.props;
    const walletColorMap = {}
    let pieSections = []
    let totalBalance = BigNumber(0)

    subWallets.map(wallet => {
      if (
        allBalances[wallet.api_channels[API_GET_BALANCES]] &&
        allBalances[wallet.api_channels[API_GET_BALANCES]][chainTicker]
      ) {
        cryptoBalances[wallet.id] = BigNumber(
          allBalances[wallet.api_channels[API_GET_BALANCES]][chainTicker]
            .total
        );
        totalBalance = totalBalance.plus(cryptoBalances[wallet.id]);
        walletColorMap[wallet.id] = wallet.color;
      }

      if (
        cryptoBalances[wallet.id] &&
        rates[wallet.api_channels[API_GET_FIATPRICE]] &&
        rates[wallet.api_channels[API_GET_FIATPRICE]][chainTicker]
      ) {
        fiatBalances[wallet.id] = BigNumber(
          rates[wallet.api_channels[API_GET_FIATPRICE]][chainTicker][displayCurrency]
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
    this.props.dispatch(setCoinSubWallet(this.props.chainTicker, subWallet))
  }

  getNetworkName(wallet) {
    try {
      return wallet.network ? CoinDirectory.getBasicCoinObj(wallet.network).display_ticker : null;
    } catch(e) {
      return null
    }
  }

  render() {
    const { props, state, cancelHandler } = this
    const {
      animationType,
      visible,
      displayTicker,
      displayCurrency,
      subWallets,
      onSelect
    } = props;
    const {
      cryptoBalances,
      fiatBalances,
    } = state;

    return (
      <Modal
        animationType={animationType}
        transparent={false}
        visible={visible}
        onRequestClose={cancelHandler}>
        <SafeAreaView style={{...Styles.flexBackground}}>
          <Text style={{...Styles.centralHeader, marginTop: 16}}>{'Select a Card'}</Text>
          <ScrollView>
            {subWallets.map((wallet, index) => (
              <View style={{margin: 8}} key={index}>
                <Card
                  onPress={
                    onSelect == null
                      ? () => this.setSubWallet(wallet)
                      : () => onSelect(wallet)
                  }
                  key={index}
                  style={{backgroundColor: wallet.color}}>
                  <List.Item
                    title={wallet.name}
                    titleStyle={{
                      color: Colors.secondaryColor,
                      fontWeight: '500',
                    }}
                    description={wallet.network ? `${this.getNetworkName(wallet)} Network` : `${
                      fiatBalances[wallet.id] != null
                        ? fiatBalances[wallet.id].toFixed(2)
                        : '-'
                    } ${displayCurrency}`}
                    left={() => (
                      <List.Icon color={Colors.secondaryColor} icon="wallet" />
                    )}
                    descriptionStyle={{color: Colors.secondaryColor}}
                    right={() => (
                      <Text
                        style={{
                          alignSelf: 'center',
                          color: Colors.secondaryColor,
                          fontWeight: '500',
                          fontSize: 16,
                          marginRight: 8,
                        }}>{`${
                        cryptoBalances[wallet.id] != null
                          ? truncateDecimal(cryptoBalances[wallet.id], 4)
                          : '-'
                      } ${displayTicker}`}</Text>
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
    allBalances: state.ledger.balances,
    rates: state.ledger.rates,
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD,
  }
};

export default connect(mapStateToProps)(SubWalletSelectorModal);
