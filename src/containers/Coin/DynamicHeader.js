/*
  This component works as the active header for Coin Menu screens. Interacting
  with it by swiping or pressing will allow you to change your active sub-wallet.
*/

import React, {Component} from 'react';
import {connect} from 'react-redux';
import {View, Animated, TouchableOpacity} from 'react-native';
import {DEVICE_WINDOW_WIDTH} from '../../utils/constants/constants';
import {setCoinSubWallet} from '../../actions/actionCreators';
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
  ERC20,
} from '../../utils/constants/intervalConstants';
import Colors from '../../globals/colors';
import {Card, Paragraph, Text, IconButton, Button} from 'react-native-paper';
import BigNumber from 'bignumber.js';
import {
  extractErrorData,
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import {CONNECTION_ERROR} from '../../utils/api/errors/errorMessages';
import {truncateDecimal} from '../../utils/math';
import {USD} from '../../utils/constants/currencies';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {
  VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT,
  VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT,
} from '../../utils/constants/web3Constants';
import {
  createAlert,
  resolveAlert,
} from '../../actions/actions/alert/dispatchers/alert';
import {openUrl} from '../../utils/linking';
import { formatCurrency } from 'react-native-format-currency';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';

class DynamicHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      carouselItems: [],
      loadingCarouselItems: true,
      mappedCoinObj: null
    };
    this.fadeAnimation = new Animated.Value(0);
    this.carousel = null;
  }

  componentDidMount() {
    this.fadeIn();
    let mappedCoinObj;

    if (this.props.activeCoin.mapped_to != null) {
      try {
        mappedCoinObj = CoinDirectory.getBasicCoinObj(
          this.props.activeCoin.mapped_to,
        );
      } catch (e) {
        console.warn(e);
      }
    }

    this.setState(
      {
        loadingCarouselItems: true,
        mappedCoinObj,
      },
      () => {
        this.setState(
          {
            carouselItems: this.prepareCarouselItems(
              this.props.allSubWallets,
              this.props.selectedSubWallet,
            ),
          },
          () => {
            this.setState({
              loadingCarouselItems: false,
            });
          },
        );
      },
    );
  }

  openTokenAddressExplorer = (address, testnet) => {
    const baseUrl = testnet
      ? 'https://goerli.etherscan.io/token/'
      : 'https://etherscan.io/token/';

    return createAlert(
      'Go to explorer?',
      `Would you like to go to ${baseUrl} to see more information about ${address}?`,
      [
        {
          text: 'No',
          onPress: async () => {
            resolveAlert(false);
          },
        },
        {
          text: 'Yes',
          onPress: () => {
            openUrl(baseUrl + '/' + address);
            resolveAlert(false);
          },
        },
      ],
    );
  };

  openReceiveTab = () => {
    this.props.switchTab(2);
  }

  fadeIn = () => {
    Animated.timing(this.fadeAnimation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      if (this.carousel != null) {
        this.carousel.triggerRenderingHack(0);
      }
    });
  };

  prepareCarouselItems(allSubWallets, selectedSubWallet) {
    let wallets = [];

    if (selectedSubWallet == null) {
      wallets = allSubWallets;
    } else {
      let newSubWallets = [...allSubWallets];

      while (newSubWallets[0].id !== selectedSubWallet.id) {
        newSubWallets.push(newSubWallets.shift());
      }

      wallets = newSubWallets;
    }

    if (wallets.length === 1) {
      return [{...wallets[0], index: 0}];
    } else {
      return wallets.map((x, index) => {
        return {...x, index};
      });
    }
  }

  setSubWallet = wallet => {
    this.props.dispatch(setCoinSubWallet(this.props.chainTicker, wallet));

    this.setState({
      carouselItems: this.prepareCarouselItems(
        this.props.allSubWallets,
        wallet,
      ),
    });
  };

  calculateSyncProgress = subWallet => {
    const syncInfo = this.props.info;

    if (syncInfo == null || syncInfo[subWallet.id] == null) {
      return 100;
    } else {
      return syncInfo[subWallet.id].percent;
    }
  };

  _handleItemPress = (index) => {
    if (this.props.selectedSubWallet != null && index !== 0) {
      this.setSubWallet(this.state.carouselItems[index]);
    }
  };

  handleLeftSwipe = () => {
    if (this.props.selectedSubWallet != null && this.state.carouselItems.length > 1) {
      const currentIndex = this.state.carouselItems.findIndex(x => x.id === this.props.selectedSubWallet.id);
      const index = currentIndex === this.state.carouselItems.length - 1 ? 0 : currentIndex + 1;

      this.setSubWallet(this.state.carouselItems[index]);
    }
  }

  handleRightSwipe = () => {
    if (this.props.selectedSubWallet != null && this.state.carouselItems.length > 1) {
      const currentIndex = this.state.carouselItems.findIndex(x => x.id === this.props.selectedSubWallet.id);
      const index = currentIndex === 0 ? this.state.carouselItems.length - 1 : currentIndex - 1;

      this.setSubWallet(this.state.carouselItems[index]);
    }
  }

  getNetworkName(item) {
    try {
      return item.network
        ? CoinDirectory.getBasicCoinObj(item.network).display_ticker
        : null;
    } catch (e) {
      return null;
    }
  }

  _renderCarouselItem({item, index, alone}) {
    const displayBalance =
      this.props.balances[item.id] != null
        ? this.props.balances[item.id].confirmed
        : null;

    const pendingBalance =
      this.props.balances[item.id] != null
        ? this.props.balances[item.id].pending
        : null;

    let fiatBalance = null;
    const rates =
      this.props.rates[item.api_channels[API_GET_FIATPRICE]] != null
        ? this.props.rates[item.api_channels[API_GET_FIATPRICE]][
            this.props.chainTicker
          ]
        : null;

    if (
      displayBalance != null &&
      rates != null &&
      rates[this.props.displayCurrency] != null
    ) {
      const price = BigNumber(rates[this.props.displayCurrency]);

      fiatBalance = BigNumber(displayBalance).multipliedBy(price).toFixed(2);
    }

    const syncProgress = this.calculateSyncProgress(item);

    return (
      <Animated.View
        style={{
          opacity: this.fadeAnimation,
          width: index == 0 ? (3 * DEVICE_WINDOW_WIDTH) / 4 : DEVICE_WINDOW_WIDTH / 4,
          overflow: "hidden",
          marginRight: index == 0 && !alone ? 16 : 0,
          flexDirection: "column",
          alignItems: "flex-start",
        }}>
        {index == 0 && !alone && (
          <Button
            icon="format-list-bulleted"
            mode="text"
            onPress={() => this.setSubWallet(null)}
            uppercase={false}
          >
            List all cards
          </Button>)
        }
        <Card
          style={{
            height: 156,
            borderRadius: 10,
            minWidth: (3 * DEVICE_WINDOW_WIDTH) / 4,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: item.color,
            opacity: index == 0 ? 1 : 0.3
          }}
          onPress={() => this._handleItemPress(index)}
        >
          <Card.Content style={{
            display: "flex",
            height: '100%',
            justifyContent: "space-between",
          }}>
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center" }} disabled={index != 0} onPress={this.openReceiveTab}>
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: Colors.secondaryColor,
                  padding: 8,
                  height: 36,
                  borderRadius: 8,
                  flex: 1
                }}>
                <Text
                  numberOfLines={1}
                  style={{ fontSize: 16, fontWeight: 'bold', color: Colors.quaternaryColor }}>
                  {item.name}
                </Text>
              </View>
              <IconButton
                icon="arrow-down"
                iconColor={Colors.secondaryColor}
                style={{
                  marginRight: 0
                }}
              />
            </TouchableOpacity>
            {!this.props.showBalance ? (
              <Paragraph
                style={{ fontSize: 18, marginBottom: 24, color: Colors.secondaryColor }}
                numberOfLines={2}>
                *********
              </Paragraph>
            ) : (
              <View>
                <View style={{ flexDirection: "row" }}>
                  <Paragraph style={{ fontSize: 16, color: Colors.secondaryColor, fontWeight: this.props.balanceErrors[item.id] ? "normal" : "bold" }} numberOfLines={1}>
                    {this.props.balanceErrors[item.id]
                      ? CONNECTION_ERROR
                      : `${displayBalance == null
                        ? '-'
                        : truncateDecimal(displayBalance, 8)
                      }${pendingBalance != null &&
                        !BigNumber(pendingBalance).isEqualTo(0)
                        ? ` (${BigNumber(pendingBalance).isGreaterThan(0)
                          ? '+'
                          : ''
                        }${truncateDecimal(pendingBalance, 4)})`
                        : ''
                      }`}
                  </Paragraph>
                  <Paragraph style={{ fontSize: 16, color: Colors.secondaryColor, alignSelf: "center" }} numberOfLines={1}>
                    {this.props.balanceErrors[item.id]
                      ? ""
                      : ` ${this.props.displayTicker}`}
                  </Paragraph>
                </View>
                <Paragraph
                  style={{
                    ...Styles.listItemSubtitleDefault,
                    fontSize: 12,
                    opacity: fiatBalance == null ? 0 : undefined,
                    color: Colors.secondaryColor,
                    marginTop: 0
                  }}>
                  {syncProgress != 100 && syncProgress != -1
                    ? `Syncing - ${syncProgress.toFixed(2)}%`
                    : `${fiatBalance == null ? '-' : formatCurrency({
                      amount: fiatBalance,
                      code: this.props.displayCurrency,
                    })[0]}`}
                </Paragraph>
              </View>
            )}
            {item.network && (
              <View
                style={{
                  flexDirection: "row",
                  paddingTop: 4,
                }}>
                <View style={{
                  borderRadius: 36,
                  borderColor: Colors.secondaryColor,
                  borderWidth: 1,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  flexDirection: "row",
                  justifyContent: "center",
                }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: 'white',
                      fontSize: 12,
                      fontWeight: "bold",
                    }}>{`${this.getNetworkName(item)}`}</Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: 'white',
                      fontSize: 12,
                      alignSelf: "center"
                    }}>{` Network`}</Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
      </Animated.View>
    );
  }

  render() {
    const mappedToEth =
      this.props.activeCoin.mapped_to != null &&
      this.state.mappedCoinObj != null &&
      (this.state.mappedCoinObj.currency_id.toLowerCase() ===
        VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT.toLowerCase() ||
        this.state.mappedCoinObj.currency_id.toLowerCase() ===
          VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT.toLowerCase());

    return (
      <GestureDetector gesture={Gesture.Fling().direction(Directions.LEFT).onEnd(this.handleLeftSwipe)}>
        <GestureDetector gesture={Gesture.Fling().direction(Directions.RIGHT).onEnd(this.handleRightSwipe)}>
          <View
            style={{
              maxHeight: 296,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              backgroundColor: Colors.secondaryColor,
            }}>
            <View
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 16
              }}>
              {this.props.showBalance ? (
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={{
                      fontSize: 18,
                    }}>{"Total: "}</Text>
                  <Text
                    style={{
                      fontWeight: '500',
                      fontSize: 18,
                    }}>{`${truncateDecimal(this.props.confirmedBalance, 8)} ${this.props.displayTicker
                      }`}</Text>
                </View>
              ) : (
                <Text
                  style={{
                    fontWeight: '500',
                    fontSize: 18,
                  }}>
                  ******
                </Text>
              )}
              {!this.props.pendingBalance.isEqualTo(0) && (
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '300',
                    color: Colors.quaternaryColor,
                    paddingTop: 4,
                  }}>
                  <Text style={{ color: Colors.quaternaryColor }}>
                    {this.props.pendingBalance.isGreaterThan(0) ? '+' : ''}
                  </Text>
                  <Text style={{ fontWeight: '500', color: Colors.quaternaryColor }}>
                    {truncateDecimal(this.props.pendingBalance, 8)}
                  </Text>
                  <Text style={{ color: Colors.quaternaryColor }}>
                    {' change pending'}
                  </Text>
                </Text>
              )}
              {this.props.pendingBalance.isEqualTo(0) &&
                this.props.activeCoin.mapped_to != null &&
                this.state.mappedCoinObj != null && (
                  <TouchableOpacity
                    disabled={this.state.mappedCoinObj.proto !== ERC20}
                    onPress={() =>
                      this.openTokenAddressExplorer(
                        this.state.mappedCoinObj.currency_id,
                        this.state.mappedCoinObj.testnet,
                      )
                    }>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '300',
                        color: Colors.quaternaryColor,
                        paddingTop: 4,
                      }}>
                      <Text style={{ color: Colors.quaternaryColor }}>
                        {`mapped to ${mappedToEth
                            ? 'Ethereum'
                            : this.state.mappedCoinObj.display_ticker.length > 15
                              ? this.state.mappedCoinObj.display_ticker.substring(
                                0,
                                15,
                              ) + '...'
                              : this.state.mappedCoinObj.display_ticker
                          }${!mappedToEth && this.state.mappedCoinObj.proto === ERC20
                            ? ` (ERC20 ${this.state.mappedCoinObj.currency_id.substring(
                              0,
                              5,
                            ) +
                            '...' +
                            this.state.mappedCoinObj.currency_id.substring(
                              this.state.mappedCoinObj.currency_id.length - 3,
                            )
                            })`
                            : ''
                          }`}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}
              {this.props.pendingBalance.isEqualTo(0) &&
                this.props.activeCoin.proto === ERC20 && (
                  <TouchableOpacity
                    onPress={() =>
                      this.openTokenAddressExplorer(
                        this.props.activeCoin.currency_id,
                        this.props.activeCoin.testnet,
                      )
                    }>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '300',
                        color: Colors.quaternaryColor,
                        paddingTop: 4,
                      }}>
                      <Text style={{ color: Colors.quaternaryColor }}>
                        {`${this.props.activeCoin.unlisted ? 'unlisted ' : ''
                          }ERC20 token (${this.props.activeCoin.currency_id.substring(0, 5) +
                          '...' +
                          this.props.activeCoin.currency_id.substring(
                            this.props.activeCoin.currency_id.length - 4,
                          )
                          })`}
                      </Text>
                    </Text>
                  </TouchableOpacity>
                )}
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'center',
                alignItems: 'flex-end',
                paddingBottom: 16,
                width: '100%',
                paddingLeft: this.state.carouselItems.length === 1 ? 0 : 48
              }}>
              {this.state.loadingCarouselItems ? null : this.state.carouselItems.slice(0, 2).map((x, index) => {
                return this._renderCarouselItem({
                  item: this.state.carouselItems[index],
                  index,
                  alone: this.state.carouselItems.length === 1,
                })
              })}
            </View>
          </View>
        </GestureDetector>
      </GestureDetector>
    );
  }
}

const mapStateToProps = state => {
  const chainTicker = state.coins.activeCoin.id;
  const showBalance = state.coins.showBalance;
  const balances = extractLedgerData(
    state,
    'balances',
    API_GET_BALANCES,
    chainTicker,
  );

  return {
    chainTicker,
    showBalance,
    displayTicker: state.coins.activeCoin.display_ticker,
    activeCoin: state.coins.activeCoin,
    selectedSubWallet: state.coinMenus.activeSubWallets[chainTicker],
    allSubWallets: state.coinMenus.allSubWallets[chainTicker],
    balances: extractLedgerData(
      state,
      'balances',
      API_GET_BALANCES,
      chainTicker,
    ),
    info: extractLedgerData(state, 'info', API_GET_INFO, chainTicker),
    balanceErrors: extractErrorData(state, API_GET_BALANCES, chainTicker),
    pendingBalance: Object.values(balances).reduce((a, b) => {
      if (a == null) {
        return b == null ? 0 : b;
      }
      if (b == null) {
        return a == null ? 0 : a;
      }

      const aPending = BigNumber.isBigNumber(a) ? a : BigNumber(a.pending);
      const bPending = BigNumber.isBigNumber(b) ? b : BigNumber(b.pending);

      return aPending.plus(bPending);
    }, BigNumber(0)),
    confirmedBalance: Object.values(balances).reduce((a, b) => {
      if (a == null) {
        return b == null ? 0 : b;
      }
      if (b == null) {
        return a == null ? 0 : a;
      }

      const aConfirmed = BigNumber.isBigNumber(a) ? a : BigNumber(a.confirmed);
      const bConfirmed = BigNumber.isBigNumber(b) ? b : BigNumber(b.confirmed);

      return aConfirmed.plus(bConfirmed);
    }, BigNumber(0)),
    displayCurrency:
      state.settings.generalWalletSettings.displayCurrency || USD,
    rates: state.ledger.rates,
  };
};

export default connect(mapStateToProps)(DynamicHeader);
