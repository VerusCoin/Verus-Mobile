import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Styles from "../../styles";
import { Button } from "react-native-paper";
import Colors from "../../globals/colors";
import ConvertCard from "./ConvertCard/ConvertCard";
import { useSelector } from "react-redux";
import { extractLedgerData } from "../../utils/ledger/extractLedgerData";
import { API_GET_BALANCES, GENERAL, IS_CONVERTABLE_WITH_VRSC_ETH_BRIDGE, VRPC } from "../../utils/constants/intervalConstants";
import { USD } from "../../utils/constants/currencies";
import BigNumber from 'bignumber.js';
import ConvertCardModal from "../../components/ConvertCardModal/ConvertCardModal";
import { CONVERT_CARD_MODAL_MODES } from "../../utils/constants/convert";
import { normalizeNum } from "../../utils/normalizeNum";
import { formatCurrency } from "react-native-format-currency";
import { useObjectSelector } from "../../hooks/useObjectSelector";
import { CoinDirectory } from "../../utils/CoinData/CoinDirectory";

const Convert = (props) => {
  const displayCurrency = useSelector(state => state.settings.generalWalletSettings.displayCurrency || USD);

  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const rates = useObjectSelector(state => state.ledger.rates);
  const balances = useObjectSelector(state => extractLedgerData(state, 'balances', API_GET_BALANCES));

  const [totalBalances, setTotalBalances] = useState({});

  const [convertCardModalMode, setConvertCardModalMode] = useState(CONVERT_CARD_MODAL_MODES.SEND);
  const [convertCardModalVisible, setConvertCardModalVisible] = useState(false);

  // These key value maps that contain the data that the form needs to execute on a user's selection
  const [sourceCurrencyMap, setSourceCurrencyMap] = useState({});
  const [destCurrencyMap, setDestCurrencyMap] = useState({});

  // These are in display format, with props: title, description, rightTitle, rightDescription, logo, and key
  const [sourceCurrencyOptionsList, setSourceCurrencyOptionsList] = useState([]);
  const [destCurrencyOptionsList, setDestCurrencyOptionsList] = useState([]);

  const [sourceNetworkOptionsList, setSourceNetworkOptionsList] = useState([]);
  const [destNetworkOptionsList, setDestNetworkOptionsList] = useState([]);

  const [selectedSourceCurrency, setSelectedSourceCurrency] = useState(null);
  const [selectedSourceNetwork, setSelectedSourceNetwork] = useState(null);

  const [selectedDestCurrency, setSelectedDestCurrency] = useState(null);
  const [selectedDestNetwork, setSelectedDestNetwork] = useState(null);

  const getTotalBalances = () => {
    let coinBalances = {};

    activeCoinsForUser.map(coinObj => {
      coinBalances[coinObj.id] = {
        crypto: BigNumber('0'),
        rate: null
      };

      allSubWallets[coinObj.id].map(wallet => {
        if (
          balances[coinObj.id] != null &&
          balances[coinObj.id][wallet.id] != null
        ) {
          const cryptoBalance = coinBalances[coinObj.id].crypto.plus(
            balances[coinObj.id] &&
              balances[coinObj.id][wallet.id] &&
              balances[coinObj.id][wallet.id].total != null
              ? BigNumber(balances[coinObj.id][wallet.id].total)
              : null,
          );

          const uniRate = rates[GENERAL] && rates[GENERAL][coinObj.id] ? rates[GENERAL][coinObj.id][displayCurrency] : null

          coinBalances[coinObj.id] = {
            crypto: cryptoBalance,
            rate: uniRate != null ? BigNumber(uniRate) : null
          }
        }
      });
    });

    return coinBalances;
  };

  const getSourceCurrencyMap = () => {
    const currencyMap = {};
    const usedCoins = [];

    for (const coinObj of activeCoinsForUser.sort(x => (x.mapped_to ? -1 : 1))) {
      if (!usedCoins.includes(coinObj.id) && (coinObj.proto === 'vrsc' || coinObj.tags.includes(IS_CONVERTABLE_WITH_VRSC_ETH_BRIDGE))) {
        currencyMap[coinObj.currency_id] = [coinObj];

        if (coinObj.mapped_to != null && coinObj.tags.includes(IS_CONVERTABLE_WITH_VRSC_ETH_BRIDGE)) {
          const mappedCoinObj = activeCoinsForUser.find(x => x.id === coinObj.mapped_to);

          if (mappedCoinObj != null) {
            usedCoins.push(mappedCoinObj.id)
            currencyMap[coinObj.currency_id].push(mappedCoinObj);
          }
        }
      }
    }

    return currencyMap;
  };

  const getSourceCurrencyOptionsList = () => {
    const currencies = [];

    for (const coinObjs of Object.values(sourceCurrencyMap)) {
      const rootCoinObj = coinObjs[0];
      const mappedCoinObj = coinObjs.length > 1 ? coinObjs[1] : null;

      const titleCoinObj = mappedCoinObj && mappedCoinObj.display_name.length < rootCoinObj.display_name.length ? 
                            mappedCoinObj
                            : 
                            rootCoinObj;

      const title = titleCoinObj.display_name;
      const description = coinObjs.map(x => x.display_ticker).join(' / ');

      let rightTitle = '-';
      let rightDescription = '-';

      let totalCryptoBalance = BigNumber(0);
      let fiatRate;

      if (totalBalances[rootCoinObj.id]) {
        if (totalBalances[rootCoinObj.id].crypto) {
          totalCryptoBalance = totalCryptoBalance.plus(totalBalances[rootCoinObj.id].crypto);
        }

        if (totalBalances[rootCoinObj.id].rate) fiatRate = totalBalances[rootCoinObj.id].rate;
      }

      if (mappedCoinObj && totalBalances[mappedCoinObj.id]) {
        if (totalBalances[mappedCoinObj.id].crypto) {
          totalCryptoBalance = totalCryptoBalance.plus(totalBalances[mappedCoinObj.id].crypto);
        }

        if (!fiatRate && totalBalances[mappedCoinObj.id].rate) fiatRate = totalBalances[mappedCoinObj.id].rate;
      }

      const totalFiatBalance = fiatRate != null ? totalCryptoBalance.multipliedBy(fiatRate) : null;

      if (totalFiatBalance != null) {
        const rawFiatDisplayValue = normalizeNum(
          Number(totalFiatBalance.toString()),
          2,
        )[3];
  
        const [valueFormattedWithSymbol, valueFormattedWithoutSymbol, symbol] = 
          formatCurrency({amount: rawFiatDisplayValue, code: displayCurrency});
        
        rightTitle = valueFormattedWithSymbol;
      }

      rightDescription = `${Number(totalCryptoBalance.toString())}`;

      currencies.push({
        title,
        description,
        rightDescription,
        rightTitle,
        key: rootCoinObj.currency_id,
        logo: rootCoinObj.id
      });
    }

    return currencies;
  };

  const getSourceNetworkOptionsList = () => {
    const networks = [];

    function getRightText (coinId, walletIds) {
      let title = '-';
      let description = '-';

      if (balances[coinId] != null) {
        const uniRate = rates[GENERAL] && rates[GENERAL][coinId] ? BigNumber(rates[GENERAL][coinId][displayCurrency]) : null;

        let totalCryptoBalance = BigNumber(0);

        for (const walletId of walletIds) {
          const cryptoBalance = balances[coinId][walletId];

          if (cryptoBalance != null) {
            totalCryptoBalance = totalCryptoBalance.plus(BigNumber(cryptoBalance.confirmed));
          }
        }

        description = `${Number(totalCryptoBalance.toString())}`;
        
        if (uniRate != null) {
          const rawFiatDisplayValue = normalizeNum(
            Number((totalCryptoBalance.multipliedBy(uniRate)).toString()),
            2,
          )[3];
    
          const [valueFormattedWithSymbol] = formatCurrency({amount: rawFiatDisplayValue, code: displayCurrency});
          
          title = valueFormattedWithSymbol;
        }
      }

      return { title, description };
    }

    if (selectedSourceCurrency) {
      for (const alias of selectedSourceCurrency) {
        if (alias.proto === 'vrsc') {
          if (allSubWallets[alias.id]) {
            const networkWallets = {};

            for (const subWallet of allSubWallets[alias.id]) {
              const [channelName, addr, network] = subWallet.channel.split('.');

              if (channelName === VRPC) {
                if (!networkWallets[network]) networkWallets[network] = [subWallet.id];
                else networkWallets[network].push(subWallet.id);
              }
            }

            for (const network in networkWallets) {
              try {
                const networkObj = CoinDirectory.getBasicCoinObj(network);

                if (networkObj) {
                  const rightText = getRightText(alias.id, networkWallets[network]);

                  networks.push({
                    title: `From ${networkObj.display_name} network`,
                    description: `as ${alias.display_ticker}`,
                    logo: networkObj.id,
                    key: networkObj.id,
                    rightTitle: rightText.title,
                    rightDescription: rightText.description
                  });
                }
              } catch(e) {
                console.warn(e)
              }
            }
          }
        } else if (alias.proto === 'eth' || alias.proto === 'erc20') {
          const rightText = getRightText(alias.id, ['MAIN_WALLET']);

          networks.push({
            title: 'From Ethereum network',
            description: `as ${alias.display_ticker}`,
            logo: alias.testnet ? 'GETH' : 'ETH',
            key: alias.testnet ? 'GETH' : 'ETH',
            rightTitle: rightText.title,
            rightDescription: rightText.description
          });
        }
      }
    }

    return networks;
  };

  const handleCurrencySelection = (key) => {
    if (convertCardModalMode === CONVERT_CARD_MODAL_MODES.SEND) {
      setSelectedSourceCurrency(sourceCurrencyMap[key]);
    } else {
      setSelectedDestCurrency(destCurrencyMap[key]);
    }
  }

  useEffect(() => {
    setTotalBalances(getTotalBalances());
  }, [allSubWallets, activeCoinsForUser, balances, displayCurrency, rates]);

  useEffect(() => {
    setSourceCurrencyMap(getSourceCurrencyMap());
  }, [activeCoinsForUser]);

  useEffect(() => {
    setSourceCurrencyOptionsList(getSourceCurrencyOptionsList());
  }, [sourceCurrencyMap, totalBalances]);

  useEffect(() => {
    setSourceNetworkOptionsList(getSourceNetworkOptionsList());
  }, [selectedSourceCurrency, totalBalances]);

  return (
    <ScrollView
      style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
      contentContainerStyle={{
        ...Styles.focalCenter,
        justifyContent: 'space-between'
      }}
    >
      <ConvertCardModal 
        visible={convertCardModalVisible}
        onClose={() => setConvertCardModalVisible(false)}
        mode={convertCardModalMode}
        totalBalances={totalBalances}
        currencies={convertCardModalMode === CONVERT_CARD_MODAL_MODES.SEND ? sourceCurrencyOptionsList : destCurrencyOptionsList}
        networks={convertCardModalMode === CONVERT_CARD_MODAL_MODES.SEND ? sourceNetworkOptionsList : destNetworkOptionsList}
        onSelectCurrency={(currencyId) => handleCurrencySelection(currencyId)}
        setVisible={setConvertCardModalVisible}
      />
      <View
        style={{
          width: '90%',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
        }}>
        <ConvertCard
          onSelectPressed={() => {
            setSelectedSourceCurrency(null);
            setConvertCardModalMode(CONVERT_CARD_MODAL_MODES.SEND);
            setConvertCardModalVisible(true);
          }}
        />
      </View>
      <View
        style={{
          width: '90%',
          flexDirection: 'row',
          justifyContent: 'space-evenly',
        }}>
        <Button
          buttonColor={Colors.verusGreenColor}
          textColor={Colors.secondaryColor}
          style={{width: 280}}>
          Choose amount to convert
        </Button>
      </View>
    </ScrollView>
  );
}

export default Convert;