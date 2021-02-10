/*
  This component works as the active header for Coin Menu screens. Interacting
  with it by swiping or pressing will allow you to change your active sub-wallet.
*/

import React, { Component } from "react"
import { connect } from 'react-redux';
import {
  View,
  Text,
  Animated
} from "react-native"
import { DEVICE_WINDOW_WIDTH, SUBWALLET_NAMES } from "../../utils/constants/constants";
import { setCoinSubWallet } from "../../actions/actionCreators";
import SnapCarousel from "../../components/SnapCarousel";
import { API_GET_BALANCES, GENERAL } from "../../utils/constants/intervalConstants";
import Colors from "../../globals/colors";
import { Card, Avatar, Paragraph, Title } from "react-native-paper";
import BigNumber from "bignumber.js";
import { extractErrorData, extractLedgerData } from "../../utils/ledger/extractLedgerData";
import { CONNECTION_ERROR } from "../../utils/api/errors/errorMessages";

class DynamicHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      carouselItems: this.prepareCarouselItems(
        props.allSubWallets,
        props.selectedSubWallet
      ),
      currentIndex: 0
    };

    this.fadeAnimation = new Animated.Value(0)
    this.carousel = null;
  }
  
  componentDidMount() {
    this.fadeIn()
  }

  fadeIn = () => {
    Animated.timing(this.fadeAnimation, {
      toValue: 1,
      duration: 1000
    }).start(() => this.carousel.triggerRenderingHack(0));
  };

  prepareCarouselItems(allSubWallets, selectedSubWallet) {
    let wallets = []

    if (selectedSubWallet == null) wallets = allSubWallets;
    else {
      let newSubWallets = [...allSubWallets];
      let i = 0;

      while (
        i < allSubWallets.length &&
        newSubWallets[0].id !== selectedSubWallet.id
      ) {
        newSubWallets.push(newSubWallets.shift());
      }

      wallets = newSubWallets;
    }

    if (wallets.length === 1) {
      return [{...wallets[0], index: 0}, {...wallets[0], index: 1}]
    } else return wallets.map((x, index) => {return {...x, index}})
  }

  setSubWallet = (wallet) => {
    this.setState({
      currentIndex: wallet == null ? 0 : wallet.index
    }, () => {
      this.props.dispatch(setCoinSubWallet(this.props.chainTicker, wallet));
    })
  };

  _handleItemPress = (item, index) => {
    if (this.props.selectedSubWallet != null) {
      if (item.index !== this.state.currentIndex) this.carousel.snapToNext()
      else if (this.props.allSubWallets.length > 1) this.setSubWallet(null)
    }
  }

  _renderCarouselItem({ item, index }) {
    const displayBalance = this.props.balances[item.id] != null
        ? this.props.balances[item.id].total
        : null;
    let fiatBalance = null

    if (displayBalance != null && this.props.rates != null && this.props.rates[this.props.displayCurrency] != null) {
      const price = BigNumber(this.props.rates[this.props.displayCurrency])

      fiatBalance = BigNumber(displayBalance).multipliedBy(price).toFixed(2)
    }

    return (
      <Animated.View
        style={{
          opacity: this.fadeAnimation,
        }}
      >
        <Card
          style={{
            margin: "2%",
            width: "46%",
            height: 120,
            minWidth: 250,
            borderRadius: 10,
            marginLeft: 30,
          }}
          onPress={() => this._handleItemPress(item, index)}
        >
          <Card.Content>
            <View
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
              }}
            >
              <Avatar.Icon
                icon="wallet"
                color={item.color}
                style={{ backgroundColor: "white" }}
                size={30}
              />
              <Text style={{ fontSize: 16, marginLeft: 8 }}>
                {SUBWALLET_NAMES[item.id]}
              </Text>
            </View>
            <Paragraph style={{ fontSize: 16, paddingTop: 8 }}>
              {this.props.balanceErrors[item.id]
                ? CONNECTION_ERROR
                : `${displayBalance == null ? "-" : displayBalance} ${
                    this.props.chainTicker
                  }`}
            </Paragraph>
            <Paragraph
              style={{ ...Styles.listItemSubtitleDefault, fontSize: 12 }}
            >
              {`${fiatBalance == null ? "-" : fiatBalance} ${
                this.props.displayCurrency
              }`}
            </Paragraph>
          </Card.Content>
        </Card>
      </Animated.View>
    );
  }

  render() {
    return (
      <View
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          alignItems: "center",
          backgroundColor: Colors.primaryColor,
        }}
      >
        <View
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingBottom: 16,
          }}
        >
          <Title
            style={{
              fontSize: 16,
              fontWeight: "300",
              color: Colors.secondaryColor,
            }}
          >
            {"Total Balance"}
          </Title>
          <Title style={{ color: Colors.secondaryColor }}>{`${
            this.props.totalBalance
          } ${this.props.chainTicker}`}</Title>
        </View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            alignItems: "flex-end",
            paddingBottom: 16,
            backgroundColor: Colors.primaryColor,
          }}
        >
          <SnapCarousel
            itemWidth={256}
            sliderWidth={DEVICE_WINDOW_WIDTH / 2}
            items={this.state.carouselItems}
            renderItem={(props) => this._renderCarouselItem(props)}
            onSnapToItem={(index) =>
              this.setSubWallet(this.state.carouselItems[index])
            }
            carouselProps={{
              loop: true,
              ref: (ref) => (this.carousel = ref),
            }}
          />
        </View>
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id
  const balances = extractLedgerData(state, 'balances', API_GET_BALANCES, chainTicker)
  
  return {
    chainTicker,
    selectedSubWallet: state.coinMenus.activeSubWallets[chainTicker],
    allSubWallets: state.coinMenus.allSubWallets[chainTicker],
    balances: extractLedgerData(state, 'balances', API_GET_BALANCES, chainTicker),
    balanceErrors: extractErrorData(state, API_GET_BALANCES, chainTicker),
    totalBalance: Object.values(balances).reduce((a, b) => {
      if (a == null) return b == null ? 0 : b 
      if (b == null) return a == null ? 0 : a

      const aTotal = BigNumber.isBigNumber(a) ? a : BigNumber(a.total)
      const bTotal = BigNumber.isBigNumber(b) ? b : BigNumber(b.total)

      return aTotal.plus(bTotal)
    }, BigNumber(0)),
    displayCurrency: state.settings.generalWalletSettings.displayCurrency || USD,
    rates: state.ledger.rates[GENERAL][chainTicker],
  }
};

export default connect(mapStateToProps)(DynamicHeader);
