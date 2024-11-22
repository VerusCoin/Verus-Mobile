import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Styles from "../../styles";
import { Button } from "react-native-paper";
import Colors from "../../globals/colors";
import ConvertCard from "./ConvertCard/ConvertCard";
import { useSelector } from "react-redux";
import { extractLedgerData } from "../../utils/ledger/extractLedgerData";
import { API_GET_BALANCES, GENERAL, IS_CONVERTABLE_WITH_VRSC_ETH_BRIDGE } from "../../utils/constants/intervalConstants";
import { USD } from "../../utils/constants/currencies";
import BigNumber from 'bignumber.js';
import ConvertCardModal from "../../components/ConvertCardModal/ConvertCardModal";
import { CONVERT_CARD_MODAL_MODES } from "../../utils/constants/convert";
import { normalizeNum } from "../../utils/normalizeNum";
import { formatCurrency } from "react-native-format-currency";
import { useObjectSelector } from "../../hooks/useObjectSelector";

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

  const [selectedSourceCurrency, setSelectedSourceCurrency] = useState(null);

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

    for (const coinObj of activeCoinsForUser) {
      if (coinObj.proto === 'vrsc') {
        currencyMap[coinObj.currency_id] = [coinObj];

        if (coinObj.mapped_to != null && coinObj.tags.includes(IS_CONVERTABLE_WITH_VRSC_ETH_BRIDGE)) {
          const mappedCoinObj = activeCoinsForUser.find(x => x.id === coinObj.mapped_to);

          if (mappedCoinObj != null) {
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

      const titleCoinObj = mappedCoinObj && mappedCoinObj.display_name.length > rootCoinObj.display_name.length ? 
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

      rightDescription = `${Number(totalCryptoBalance.toString())} ${titleCoinObj.display_ticker}`;

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

  useEffect(() => {
    setTotalBalances(getTotalBalances());
  }, [allSubWallets, activeCoinsForUser, balances, displayCurrency, rates]);

  useEffect(() => {
    setSourceCurrencyMap(getSourceCurrencyMap());
  }, [activeCoinsForUser]);

  useEffect(() => {
    setSourceCurrencyOptionsList(getSourceCurrencyOptionsList());
  }, [sourceCurrencyMap, totalBalances]);

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
        onSelectCurrency={(currencyId) => setSelectedSourceCurrency(currencyId)}
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
            setConvertCardModalMode(CONVERT_CARD_MODAL_MODES.SEND);
            setConvertCardModalVisible(true)
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