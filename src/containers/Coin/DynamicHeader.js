/*
  This component works as the active header for Coin Menu screens. Interacting
  with it by swiping or pressing will allow you to change your active sub-wallet.
*/

import React, { Component } from "react"
import { connect } from 'react-redux';
import {
  View,
  Text
} from "react-native"
import Styles from '../../styles/index'
import Colors from '../../globals/colors'
import { SUBWALLET_NAMES } from "../../utils/constants/constants";
import { setCoinSubWallet } from "../../actions/actionCreators";
import { TouchableOpacity } from "react-native";
import { IconButton } from "react-native-paper";
import { ScrollView } from "react-native";

class DynamicHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      setting: false,
      carouselContentWidth: 0,
      carouselContentOffsetX: 0,
      startingOffset: {}
    };

    this.carousel = null;
  }

  updateWidth(carouselContentWidth) {
    this.setState(
      {
        carouselContentWidth,
      },
      this.setStartingOffsetToSelectedWallet
    );
  }

  setStartingOffsetToSelectedWallet() {
    this.setState({
      startingOffset: {
        x:
          this.findSubWalletIndexById(this.props.selectedSubWallet.id) *
          (this.state.carouselContentWidth / this.props.allSubWallets.length),
      },
    });
  }

  setSubWallet = (wallet) => {
    this.props.dispatch(setCoinSubWallet(this.props.chainTicker, wallet));
  };

  setWidth = (width, cb) => {
    this.setState(
      {
        width,
      },
      cb
    );
  };

  getSubWalletIndex = (offset, width) => {
    const len = this.props.allSubWallets.length;
    for (let i = 1; i <= len; i++) {
      if (offset < (width / len) * i) {
        return i - 1;
      }
      if (i == len) {
        return i - 1;
      }
    }
  };

  findSubWalletIndexById = (id) => this.props.allSubWallets.findIndex((value) => value.id == id)

  conditionallyUpdateWalletByIndex(walletIndex) {
    const wallet = this.props.allSubWallets[walletIndex];

    if (
      wallet != null &&
      (this.props.selectedSubWallet == null ||
        (this.props.selectedSubWallet != null &&
          wallet.id !== this.props.selectedSubWallet.id))
    )
      this.setSubWallet(wallet);
  }

  scrollUpdateWallet(data) {
    this.setState(
      {
        carouselContentOffsetX: data.nativeEvent.contentOffset.x,
      },
      () => {
        this.conditionallyUpdateWalletByIndex(
          this.getSubWalletIndex(
            this.state.carouselContentOffsetX,
            this.state.carouselContentWidth
          )
        );
      }
    );
  }

  shiftSubWalletIndex = (offset) => {
    const { allSubWallets, selectedSubWallet } = this.props;
    const len = allSubWallets.length;
    const index =
      (((this.findSubWalletIndexById(selectedSubWallet.id) + offset) % len) + len) % len;

    this.carousel.scrollTo({
      x: index * (this.state.carouselContentWidth / len),
    });
  };

  render() {
    const { allSubWallets, chainTicker } = this.props;
    const subWalletSelectable = allSubWallets.length > 1;

    return (
      <View
        style={{
          ...Styles.fullWidth,
          ...Styles.greyStripeContainer,
          justifyContent: subWalletSelectable ? "space-between" : "center",
        }}
      >
        {subWalletSelectable && (
          <IconButton
            icon="menu-left"
            color={Colors.linkButtonColor}
            size={30}
            onPress={() => this.shiftSubWalletIndex(-1)}
          />
        )}
        <ScrollView
          horizontal={true}
          ref={(scrollView) => (this.carousel = scrollView)}
          contentContainerStyle={{
            width: `${100 * allSubWallets.length}%`,
          }}
          showsHorizontalScrollIndicator={false}
          onContentSizeChange={(w, h) => this.updateWidth(w)}
          scrollEventThrottle={200}
          decelerationRate="fast"
          pagingEnabled
          onScroll={(data) => this.scrollUpdateWallet(data)}
          contentOffset={this.state.startingOffset}
        >
          {allSubWallets.map((wallet) => {
            return (
              <TouchableOpacity
                onPress={() => this.setSubWallet(null)}
                disabled={!subWalletSelectable}
                style={Styles.flex}
              >
                <Text
                  style={{
                    ...Styles.greyStripeHeader,
                    ...(subWalletSelectable ? Styles.linkText : {}),
                  }}
                  numberOfLines={1}
                >
                  {`${
                    SUBWALLET_NAMES[wallet.id] != null
                      ? SUBWALLET_NAMES[wallet.id]
                      : wallet.id
                  } ${chainTicker.toUpperCase()} Wallet`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {subWalletSelectable && (
          <IconButton
            icon="menu-right"
            color={Colors.linkButtonColor}
            size={30}
            onPress={() => this.shiftSubWalletIndex(1)}
          />
        )}
      </View>
    );
  }
}

const mapStateToProps = (state) => {
  const chainTicker = state.coins.activeCoin.id
  return {
    chainTicker,
    selectedSubWallet: state.coinMenus.activeSubWallets[chainTicker],
    allSubWallets: state.coinMenus.allSubWallets[chainTicker]
  }
};

export default connect(mapStateToProps)(DynamicHeader);
