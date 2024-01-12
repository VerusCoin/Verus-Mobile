import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from 'react-redux';
import {
  ScrollView,
  View,
  SafeAreaView,
} from "react-native";
import { List, Card, Text } from "react-native-paper";
import Modal from '../../components/Modal';
import Styles from '../../styles/index';
import { API_GET_BALANCES, API_GET_FIATPRICE, GENERAL } from "../../utils/constants/intervalConstants";
import { truncateDecimal } from "../../utils/math";
import { setCoinSubWallet } from "../../actions/actionCreators";
import { USD } from "../../utils/constants/currencies";
import BigNumber from "bignumber.js";
import Colors from "../../globals/colors";
import { CoinDirectory } from "../../utils/CoinData/CoinDirectory";

const SubWalletSelectorModal = (props) => {
  const dispatch = useDispatch();
  const allBalances = useSelector(state => state.ledger.balances);
  const rates = useSelector(state => state.ledger.rates);
  const displayCurrency = useSelector(state => state.settings.generalWalletSettings.displayCurrency || USD);

  const [cryptoBalances, setCryptoBalances] = useState({});
  const [fiatBalances, setFiatBalances] = useState({});
  const [pieSections, setPieSections] = useState([]);
  const [totalBalance, setTotalBalance] = useState(BigNumber(0));

  useEffect(() => {
    updateBalances();
  }, []);

  const updateBalances = () => {
    const { chainTicker, subWallets } = props;
    const walletColorMap = {};
    let newPieSections = [];
    let newTotalBalance = BigNumber(0);

    subWallets.forEach((wallet) => {
      if (
        allBalances[wallet.api_channels[API_GET_BALANCES]] &&
        allBalances[wallet.api_channels[API_GET_BALANCES]][chainTicker]
      ) {
        setCryptoBalances((prevCryptoBalances) => ({
          ...prevCryptoBalances,
          [wallet.id]: BigNumber(
            allBalances[wallet.api_channels[API_GET_BALANCES]][chainTicker].total
          ),
        }));
        newTotalBalance = newTotalBalance.plus(cryptoBalances[wallet.id]);
        walletColorMap[wallet.id] = wallet.color;
      }

      if (
        cryptoBalances[wallet.id] &&
        rates[wallet.api_channels[API_GET_FIATPRICE]] &&
        rates[wallet.api_channels[API_GET_FIATPRICE]][chainTicker]
      ) {
        setFiatBalances((prevFiatBalances) => ({
          ...prevFiatBalances,
          [wallet.id]: BigNumber(
            rates[wallet.api_channels[API_GET_FIATPRICE]][chainTicker][displayCurrency]
          ).multipliedBy(cryptoBalances[wallet.id]),
        }));
      }
    });

    for (const walletId in cryptoBalances) {
      if (cryptoBalances[walletId] != null) {
        newPieSections.push({
          percentage: totalBalance.isEqualTo(0)
            ? 100
            : Number(
                truncateDecimal(
                  cryptoBalances[walletId]
                    .dividedBy(totalBalance)
                    .multipliedBy(BigNumber(100)),
                  0
                )
              ),
          color: walletColorMap[walletId],
        });
      }
    }

    setPieSections(newPieSections);
    setTotalBalance(newTotalBalance);
  };

  const cancelHandler = () => {
    if (props.cancel) {
      props.cancel();
    }
  };

  const setSubWallet = (subWallet) => {
    dispatch(setCoinSubWallet(props.chainTicker, subWallet));
  };

  const getNetworkName = (wallet) => {
    try {
      return wallet.network ? CoinDirectory.getBasicCoinObj(wallet.network).display_ticker : null;
    } catch (e) {
      return null;
    }
  };

  return (
    <Modal
      animationType={props.animationType}
      transparent={false}
      visible={props.visible}
      onRequestClose={cancelHandler}
    >
      <SafeAreaView style={{ ...Styles.flexBackground }}>
        <Text style={{ ...Styles.centralHeader, marginTop: 16 }}>{'Select a Card'}</Text>
        <ScrollView>
          {props.subWallets.map((wallet, index) => (
            <View style={{ margin: 8 }} key={index}>
              <Card
                onPress={
                  props.onSelect == null
                    ? () => setSubWallet(wallet)
                    : () => props.onSelect(wallet)
                }
                key={index}
                style={{ backgroundColor: wallet.color }}
              >
                <List.Item
                  title={wallet.name}
                  titleStyle={{
                    color: Colors.secondaryColor,
                    fontWeight: '500',
                  }}
                  description={wallet.network ? `${getNetworkName(wallet)} Network` : `${
                    fiatBalances[wallet.id] != null
                      ? fiatBalances[wallet.id].toFixed(2)
                      : '-'
                  } ${props.displayCurrency}`}
                  left={() => <List.Icon color={Colors.secondaryColor} icon="wallet" />}
                  descriptionStyle={{ color: Colors.secondaryColor }}
                  right={() => (
                    <Text
                      style={{
                        alignSelf: 'center',
                        color: Colors.secondaryColor,
                        fontWeight: '500',
                        fontSize: 16,
                        marginRight: 8,
                      }}
                    >{`${
                      cryptoBalances[wallet.id] != null
                        ? truncateDecimal(cryptoBalances[wallet.id], 4)
                        : '-'
                    } ${props.displayTicker}`}</Text>
                  )}
                />
              </Card>
            </View>
          ))}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

export default SubWalletSelectorModal;
