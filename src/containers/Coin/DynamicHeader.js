/*
  This component works as the active header for Coin Menu screens. Interacting
  with it by swiping or pressing will allow you to change your active sub-wallet.
*/

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Animated, TouchableOpacity } from 'react-native';
import { DEVICE_WINDOW_WIDTH } from '../../utils/constants/constants';
import { setCoinSubWallet } from '../../actions/actionCreators';
import {
  API_GET_BALANCES,
  API_GET_FIATPRICE,
  API_GET_INFO,
  ERC20,
} from '../../utils/constants/intervalConstants';
import Colors from '../../globals/colors';
import { Card, Paragraph, Text, IconButton, Button } from 'react-native-paper';
import BigNumber from 'bignumber.js';
import {
  extractErrorData,
  extractLedgerData,
} from '../../utils/ledger/extractLedgerData';
import { CONNECTION_ERROR } from '../../utils/api/errors/errorMessages';
import { truncateDecimal } from '../../utils/math';
import { USD } from '../../utils/constants/currencies';
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';
import {
  VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT,
  VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT,
} from '../../utils/constants/web3Constants';
import {
  createAlert,
  resolveAlert,
} from '../../actions/actions/alert/dispatchers/alert';
import { openUrl } from '../../utils/linking';
import { formatCurrency } from 'react-native-format-currency';
import { GestureDetector, Gesture, Directions } from 'react-native-gesture-handler';
import { useSelector, useDispatch } from 'react-redux';
import Styles from '../../styles';
import { useObjectSelector } from '../../hooks/useObjectSelector';
import { coinsList } from '../../utils/CoinData/CoinsList';

const DynamicHeader = ({ switchTab }) => {
  const dispatch = useDispatch();

  const chainTicker = useSelector((state) => state.coins.activeCoin.id);
  const showBalance = useSelector((state) => state.coins.showBalance);
  const displayTicker = useSelector((state) => state.coins.activeCoin.display_ticker);
  const displayCurrency = useSelector(
    (state) => state.settings.generalWalletSettings.displayCurrency || USD,
  );
  
  const activeCoin = useObjectSelector((state) => state.coins.activeCoin);
  const selectedSubWallet = useObjectSelector(
    (state) => state.coinMenus.activeSubWallets[chainTicker],
  );
  const allSubWallets = useObjectSelector(
    (state) => state.coinMenus.allSubWallets[chainTicker],
  );
  const balances = useObjectSelector((state) =>
    extractLedgerData(state, 'balances', API_GET_BALANCES, chainTicker),
  );
  const info = useObjectSelector((state) =>
    extractLedgerData(state, 'info', API_GET_INFO, chainTicker),
  );
  const balanceErrors = useObjectSelector((state) =>
    extractErrorData(state, API_GET_BALANCES, chainTicker),
  );
  const rates = useObjectSelector((state) => state.ledger.rates);

  const [carouselItems, setCarouselItems] = useState([]);
  const [loadingCarouselItems, setLoadingCarouselItems] = useState(true);
  const [mappedCoinObj, setMappedCoinObj] = useState(null);
  const fadeAnimation = useRef(new Animated.Value(0)).current;

  const pendingBalance = useMemo(() => {
    return Object.values(balances).reduce((a, b) => {
      if (a == null) {
        return b == null ? 0 : b;
      }
      if (b == null) {
        return a == null ? 0 : a;
      }

      const aPending = BigNumber.isBigNumber(a) ? a : BigNumber(a.pending);
      const bPending = BigNumber.isBigNumber(b) ? b : BigNumber(b.pending);

      return aPending.plus(bPending);
    }, BigNumber(0));
  }, [balances]);

  const confirmedBalance = useMemo(() => {
    return Object.values(balances).reduce((a, b) => {
      if (a == null) {
        return b == null ? 0 : b;
      }
      if (b == null) {
        return a == null ? 0 : a;
      }

      const aConfirmed = BigNumber.isBigNumber(a) ? a : BigNumber(a.confirmed);
      const bConfirmed = BigNumber.isBigNumber(b) ? b : BigNumber(b.confirmed);

      return aConfirmed.plus(bConfirmed);
    }, BigNumber(0));
  }, [balances]);

  const fadeIn = useCallback(() => {
    Animated.timing(fadeAnimation, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, [fadeAnimation]);

  const prepareCarouselItems = useCallback(
    (allSubWallets, selectedSubWallet) => {
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
        return [{ ...wallets[0], index: 0 }];
      } else {
        return wallets.map((x, index) => {
          return { ...x, index };
        });
      }
    },
    [],
  );

  useEffect(() => {
    fadeIn();

    let mappedCoin = null;

    if (activeCoin.mapped_to != null && activeCoin.id !== coinsList.VRSC.id) {
      try {
        mappedCoin = CoinDirectory.getBasicCoinObj(activeCoin.mapped_to);
      } catch (e) {
        console.warn(e);
      }
    }

    setMappedCoinObj(mappedCoin);
  }, [activeCoin, fadeIn]);

  useEffect(() => {
    setLoadingCarouselItems(true);
    const items = prepareCarouselItems(allSubWallets, selectedSubWallet);
    setCarouselItems(items);
    setLoadingCarouselItems(false);
  }, [allSubWallets, selectedSubWallet, prepareCarouselItems]);

  const setSubWallet = (wallet) => {
    dispatch(setCoinSubWallet(chainTicker, wallet));

    const items = prepareCarouselItems(allSubWallets, wallet);
    setCarouselItems(items);
  };

  const calculateSyncProgress = (subWallet) => {
    if (info == null || info[subWallet.id] == null) {
      return 100;
    } else {
      return info[subWallet.id].percent;
    }
  };

  const handleItemPress = (index) => {
    if (selectedSubWallet != null && index !== 0) {
      setSubWallet(carouselItems[index]);
    }
  };

  const handleLeftSwipe = () => {
    if (selectedSubWallet != null && carouselItems.length > 1) {
      const currentIndex = carouselItems.findIndex(
        (x) => x.id === selectedSubWallet.id,
      );
      const index =
        currentIndex === carouselItems.length - 1 ? 0 : currentIndex + 1;

      setSubWallet(carouselItems[index]);
    }
  };

  const handleRightSwipe = () => {
    if (selectedSubWallet != null && carouselItems.length > 1) {
      const currentIndex = carouselItems.findIndex(
        (x) => x.id === selectedSubWallet.id,
      );
      const index =
        currentIndex === 0 ? carouselItems.length - 1 : currentIndex - 1;

      setSubWallet(carouselItems[index]);
    }
  };

  const getNetworkName = (item) => {
    try {
      return item.network
        ? CoinDirectory.getBasicCoinObj(item.network).display_ticker
        : null;
    } catch (e) {
      return null;
    }
  };

  const openReceiveTab = () => {
    switchTab(2);
  };

  const openTokenAddressExplorer = (address, testnet) => {
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

  const renderCarouselItem = ({ item, index, alone }) => {
    const displayBalance =
      balances[item.id] != null ? balances[item.id].confirmed : null;

    const pendingBalance =
      balances[item.id] != null ? balances[item.id].pending : null;

    let fiatBalance = null;
    const ratesForChannel =
      rates[item.api_channels[API_GET_FIATPRICE]] != null
        ? rates[item.api_channels[API_GET_FIATPRICE]][chainTicker]
        : null;

    if (
      displayBalance != null &&
      ratesForChannel != null &&
      ratesForChannel[displayCurrency] != null
    ) {
      const price = BigNumber(ratesForChannel[displayCurrency]);

      fiatBalance = BigNumber(displayBalance).multipliedBy(price).toFixed(2);
    }

    const syncProgress = calculateSyncProgress(item);

    return (
      <Animated.View
        style={{
          opacity: fadeAnimation,
          width:
            index == 0 ? (3 * DEVICE_WINDOW_WIDTH) / 4 : DEVICE_WINDOW_WIDTH / 4,
          overflow: 'hidden',
          marginRight: index == 0 && !alone ? 16 : 0,
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        {index == 0 && !alone && (
          <Button
            icon="format-list-bulleted"
            mode="text"
            onPress={() => setSubWallet(null)}
            uppercase={false}
          >
            List all cards
          </Button>
        )}
        <Card
          style={{
            height: 156,
            borderRadius: 10,
            minWidth: (3 * DEVICE_WINDOW_WIDTH) / 4,
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: item.color,
            opacity: index == 0 ? 1 : 0.3,
          }}
          onPress={() => handleItemPress(index)}
        >
          <Card.Content
            style={{
              display: 'flex',
              height: '100%',
              justifyContent: 'space-between',
            }}
          >
            <TouchableOpacity
              style={{ flexDirection: 'row', alignItems: 'center' }}
              disabled={index != 0}
              onPress={openReceiveTab}
            >
              <View
                style={{
                  display: 'flex',
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: Colors.secondaryColor,
                  padding: 8,
                  height: 36,
                  borderRadius: 8,
                  flex: 1,
                }}
              >
                <Text
                  numberOfLines={1}
                  style={{
                    fontSize: 16,
                    fontWeight: 'bold',
                    color: Colors.quaternaryColor,
                  }}
                >
                  {item.name}
                </Text>
              </View>
              <IconButton
                icon="arrow-down"
                iconColor={Colors.secondaryColor}
                style={{
                  marginRight: 0,
                }}
              />
            </TouchableOpacity>
            {!showBalance ? (
              <Paragraph
                style={{
                  fontSize: 18,
                  marginBottom: 24,
                  color: Colors.secondaryColor,
                }}
                numberOfLines={2}
              >
                *********
              </Paragraph>
            ) : (
              <View>
                <View style={{ flexDirection: 'row' }}>
                  <Paragraph
                    style={{
                      fontSize: 16,
                      color: Colors.secondaryColor,
                      fontWeight: balanceErrors[item.id] ? 'normal' : 'bold',
                    }}
                    numberOfLines={1}
                  >
                    {balanceErrors[item.id]
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
                        }`}
                  </Paragraph>
                  <Paragraph
                    style={{
                      fontSize: 16,
                      color: Colors.secondaryColor,
                      alignSelf: 'center',
                    }}
                    numberOfLines={1}
                  >
                    {balanceErrors[item.id] ? '' : ` ${displayTicker}`}
                  </Paragraph>
                </View>
                <Paragraph
                  style={{
                    ...Styles.listItemSubtitleDefault,
                    fontSize: 12,
                    opacity: fiatBalance == null ? 0 : undefined,
                    color: Colors.secondaryColor,
                    marginTop: 0,
                  }}
                >
                  {syncProgress != 100 && syncProgress != -1
                    ? `Syncing - ${syncProgress.toFixed(2)}%`
                    : `${
                        fiatBalance == null
                          ? '-'
                          : formatCurrency({
                              amount: fiatBalance,
                              code: displayCurrency,
                            })[0]
                      }`}
                </Paragraph>
              </View>
            )}
            {item.network && (
              <View
                style={{
                  flexDirection: 'row',
                  paddingTop: 4,
                }}
              >
                <View
                  style={{
                    borderRadius: 36,
                    borderColor: Colors.secondaryColor,
                    borderWidth: 1,
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                >
                  <Text
                    numberOfLines={1}
                    style={{
                      color: 'white',
                      fontSize: 12,
                      fontWeight: 'bold',
                    }}
                  >{`${getNetworkName(item)}`}</Text>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: 'white',
                      fontSize: 12,
                      alignSelf: 'center',
                    }}
                  >{` Network`}</Text>
                </View>
              </View>
            )}
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  const mappedToEth =
    activeCoin.mapped_to != null &&
    mappedCoinObj != null &&
    (mappedCoinObj.currency_id.toLowerCase() ===
      VERUS_BRIDGE_DELEGATOR_GOERLI_CONTRACT.toLowerCase() ||
      mappedCoinObj.currency_id.toLowerCase() ===
        VERUS_BRIDGE_DELEGATOR_MAINNET_CONTRACT.toLowerCase());

  return (
    <GestureDetector
      gesture={Gesture.Fling()
        .direction(Directions.LEFT)
        .onEnd(handleLeftSwipe)}
    >
      <GestureDetector
        gesture={Gesture.Fling()
          .direction(Directions.RIGHT)
          .onEnd(handleRightSwipe)}
      >
        <View
          style={{
            maxHeight: 296,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            alignItems: 'center',
            backgroundColor: Colors.secondaryColor,
          }}
        >
          <View
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16,
            }}
          >
            {showBalance ? (
              <View style={{ flexDirection: 'row' }}>
                <Text style={{ fontSize: 18 }}>{'Total: '}</Text>
                <Text style={{ fontWeight: '500', fontSize: 18 }}>{`${truncateDecimal(
                  confirmedBalance,
                  8,
                )} ${displayTicker}`}</Text>
              </View>
            ) : (
              <Text style={{ fontWeight: '500', fontSize: 18 }}>******</Text>
            )}
            {!pendingBalance.isEqualTo(0) && (
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '300',
                  color: Colors.quaternaryColor,
                  paddingTop: 4,
                }}
              >
                <Text style={{ color: Colors.quaternaryColor }}>
                  {pendingBalance.isGreaterThan(0) ? '+' : ''}
                </Text>
                <Text
                  style={{ fontWeight: '500', color: Colors.quaternaryColor }}
                >
                  {truncateDecimal(pendingBalance, 8)}
                </Text>
                <Text style={{ color: Colors.quaternaryColor }}>
                  {' change pending'}
                </Text>
              </Text>
            )}
            {pendingBalance.isEqualTo(0) &&
              activeCoin.mapped_to != null &&
              mappedCoinObj != null && (
                <TouchableOpacity
                  disabled={mappedCoinObj.proto !== ERC20}
                  onPress={() =>
                    openTokenAddressExplorer(
                      mappedCoinObj.currency_id,
                      mappedCoinObj.testnet,
                    )
                  }
                >
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: '300',
                      color: Colors.quaternaryColor,
                      paddingTop: 4,
                    }}
                  >
                    <Text style={{ color: Colors.quaternaryColor }}>
                      {`mapped to ${
                        mappedToEth
                          ? 'Ethereum'
                          : mappedCoinObj.display_ticker.length > 15
                          ? mappedCoinObj.display_ticker.substring(0, 15) + '...'
                          : mappedCoinObj.display_ticker
                      }${
                        !mappedToEth && mappedCoinObj.proto === ERC20
                          ? ` (ERC20 ${mappedCoinObj.currency_id.substring(
                              0,
                              5,
                            ) +
                              '...' +
                              mappedCoinObj.currency_id.substring(
                                mappedCoinObj.currency_id.length - 3,
                              )})`
                          : ''
                      }`}
                    </Text>
                  </Text>
                </TouchableOpacity>
              )}
            {pendingBalance.isEqualTo(0) && activeCoin.proto === ERC20 && (
              <TouchableOpacity
                onPress={() =>
                  openTokenAddressExplorer(
                    activeCoin.currency_id,
                    activeCoin.testnet,
                  )
                }
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '300',
                    color: Colors.quaternaryColor,
                    paddingTop: 4,
                  }}
                >
                  <Text style={{ color: Colors.quaternaryColor }}>
                    {`${
                      activeCoin.unlisted ? 'unlisted ' : ''
                    }ERC20 token (${activeCoin.currency_id.substring(
                      0,
                      5,
                    ) +
                      '...' +
                      activeCoin.currency_id.substring(
                        activeCoin.currency_id.length - 4,
                      )})`}
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
              paddingLeft: carouselItems.length === 1 ? 0 : 48,
            }}
          >
            {loadingCarouselItems
              ? null
              : carouselItems.slice(0, 2).map((x, index) => {
                  return renderCarouselItem({
                    item: carouselItems[index],
                    index,
                    alone: carouselItems.length === 1,
                  });
                })}
          </View>
        </View>
      </GestureDetector>
    </GestureDetector>
  );
};

export default DynamicHeader;