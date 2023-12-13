/*
  This component works as the active header for Coin Menu screens. Interacting
  with it by swiping or pressing will allow you to change your active sub-wallet.
*/

import React, {Component} from 'react';
import {connect} from 'react-redux';
import {View, Animated, TouchableOpacity} from 'react-native';
import {DEVICE_WINDOW_WIDTH} from '../../utils/constants/constants';
import {setCoinSubWallet} from '../../actions/actionCreators';
import SnapCarousel from '../../components/SnapCarousel';
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
  ERC20,
} from '../../utils/constants/intervalConstants';
import Colors from '../../globals/colors';
import {Card, Avatar, Paragraph, Text, Button} from 'react-native-paper';
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

class DynamicHeader extends Component {
  constructor(props) {
    super(props);
    this.state = {
      carouselItems: [],
      currentIndex: 0,
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
    const index =
      wallet == null
        ? 0
        : wallet.index != null
        ? wallet.index
        : this.props.allSubWallets.findIndex(x => x.id === wallet.id);

    this.setState(
      {
        currentIndex: index < 0 ? 0 : index,
      },
      () => {
        this.props.dispatch(setCoinSubWallet(this.props.chainTicker, wallet));
      },
    );
  };

  calculateSyncProgress = subWallet => {
    const syncInfo = this.props.info;

    if (syncInfo == null || syncInfo[subWallet.id] == null) {
      return 100;
    } else {
      return syncInfo[subWallet.id].percent;
    }
  };

  _handleItemPress = (item, index) => {
    if (this.props.selectedSubWallet != null) {
      if (item.index !== this.state.currentIndex) {
        this.carousel.snapToNext();
      } else if (this.props.allSubWallets.length > 1) {
        this.setSubWallet(null);
      }
    }
  };

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
        }}>
        <Card
          style={{
            height: 120,
            minWidth: alone ? 236 : 150,
            borderRadius: 10,
            marginLeft: alone ? 0 : 30,
            position: 'relative',
            overflow: 'hidden',
          }}
          onPress={() => this._handleItemPress(item, index)}>
          <Card.Content>
            <View
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                paddingRight: 16,
              }}>
              <Text
                numberOfLines={1}
                style={{fontSize: 16, fontWeight: 'bold'}}>
                {item.name}
              </Text>
            </View>
            {!this.props.showBalance ? (
              <Paragraph
                style={{fontSize: 18, marginBottom: 34}}
                numberOfLines={2}>
                *********
              </Paragraph>
            ) : (
              <>
                <Paragraph style={{fontSize: 16}} numberOfLines={1}>
                  {this.props.balanceErrors[item.id]
                    ? CONNECTION_ERROR
                    : `${
                        displayBalance == null
                          ? '-'
                          : truncateDecimal(displayBalance, 8)
                      }${
                        pendingBalance != null &&
                        !BigNumber(pendingBalance).isEqualTo(0)
                          ? ` (${
                              BigNumber(pendingBalance).isGreaterThan(0)
                                ? '+'
                                : ''
                            }${truncateDecimal(pendingBalance, 4)})`
                          : ''
                      } ${this.props.displayTicker}`}
                </Paragraph>
                <Paragraph
                  style={{
                    ...Styles.listItemSubtitleDefault,
                    fontSize: 12,
                    marginBottom: 10,
                    opacity: fiatBalance == null ? 0 : undefined,
                  }}>
                  {syncProgress != 100 && syncProgress != -1
                    ? `Syncing - ${syncProgress.toFixed(2)}%`
                    : `${fiatBalance == null ? '-' : fiatBalance} ${
                        this.props.displayCurrency
                      }`}
                </Paragraph>
              </>
            )}
            {item.network && (
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: 'green',
                  borderRadius: 10,
                  padding: 5,
                  paddingLeft: 8,
                  paddingRight: 16,
                  paddingBottom: 11,
                  marginBottom: -20,
                  marginRight: -10,
                }}>
                <Paragraph
                  numberOfLines={1}
                  style={{
                    color: 'white',
                    fontSize: 14,
                  }}>{`${this.getNetworkName(item)} Network`}</Paragraph>
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
      <View
        style={{
          height: 232,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          alignItems: 'center',
          backgroundColor: Colors.primaryColor,
        }}>
        <View
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
          }}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '300',
              color: Colors.secondaryColor,
            }}>
            {'Confirmed Balance'}
          </Text>
          {this.props.showBalance ? (
            <Text
              style={{
                color: Colors.secondaryColor,
                fontWeight: '500',
                fontSize: 18,
              }}>{`${truncateDecimal(this.props.confirmedBalance, 8)} ${
              this.props.displayTicker
            }`}</Text>
          ) : (
            <Text
              style={{
                color: Colors.secondaryColor,
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
                color: Colors.secondaryColor,
                paddingTop: 4,
              }}>
              <Text style={{color: Colors.secondaryColor}}>
                {this.props.pendingBalance.isGreaterThan(0) ? '+' : ''}
              </Text>
              <Text style={{fontWeight: '500', color: Colors.secondaryColor}}>
                {truncateDecimal(this.props.pendingBalance, 8)}
              </Text>
              <Text style={{color: Colors.secondaryColor}}>
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
                    color: Colors.secondaryColor,
                    paddingTop: 4,
                  }}>
                  <Text style={{color: Colors.secondaryColor}}>
                    {`mapped to ${
                      mappedToEth
                        ? 'Ethereum'
                        : this.state.mappedCoinObj.display_ticker.length > 15
                        ? this.state.mappedCoinObj.display_ticker.substring(
                            0,
                            15,
                          ) + '...'
                        : this.state.mappedCoinObj.display_ticker
                    }${
                      !mappedToEth && this.state.mappedCoinObj.proto === ERC20
                        ? ` (ERC20 ${
                            this.state.mappedCoinObj.currency_id.substring(
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
                    color: Colors.secondaryColor,
                    paddingTop: 4,
                  }}>
                  <Text style={{color: Colors.secondaryColor}}>
                    {`${
                      this.props.activeCoin.unlisted ? 'unlisted ' : ''
                    }ERC20 token (${
                      this.props.activeCoin.currency_id.substring(0, 5) +
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
            backgroundColor: Colors.primaryColor,
          }}>
          {this.state.loadingCarouselItems ? null : this.state.carouselItems
              .length == 1 ? (
            this._renderCarouselItem({
              item: this.state.carouselItems[0],
              index: 0,
              alone: true,
            })
          ) : (
            <SnapCarousel
              itemWidth={256}
              sliderWidth={DEVICE_WINDOW_WIDTH / 2}
              items={this.state.carouselItems}
              renderItem={props => this._renderCarouselItem(props)}
              onSnapToItem={index => {
                return this.setSubWallet(this.state.carouselItems[index]);
              }}
              carouselProps={{
                loop: true,
                ref: ref => (this.carousel = ref),
              }}
            />
          )}
        </View>
      </View>
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
