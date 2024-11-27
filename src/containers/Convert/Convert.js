import React, { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import Styles from "../../styles";
import { Button } from "react-native-paper";
import Colors from "../../globals/colors";
import ConvertCard from "./ConvertCard/ConvertCard";
import { useSelector } from "react-redux";
import { extractLedgerData } from "../../utils/ledger/extractLedgerData";
import { API_GET_BALANCES, API_SEND, ERC20, ETH, GENERAL, IS_CONVERTABLE_WITH_VRSC_ETH_BRIDGE, IS_PBAAS_ROOT, VRPC } from "../../utils/constants/intervalConstants";
import { IS_PBAAS_CHAIN, USD } from "../../utils/constants/currencies";
import BigNumber from 'bignumber.js';
import ConvertCardModal from "../../components/ConvertCardModal/ConvertCardModal";
import { CONVERT_CARD_MODAL_MODES } from "../../utils/constants/convert";
import { normalizeNum } from "../../utils/normalizeNum";
import { formatCurrency } from "react-native-format-currency";
import { useObjectSelector } from "../../hooks/useObjectSelector";
import { CoinDirectory } from "../../utils/CoinData/CoinDirectory";
import { closeLoadingModal, openLoadingModal } from "../../actions/actionDispatchers";
import { createAlert } from "../../actions/actions/alert/dispatchers/alert";
import { getConversionPaths } from "../../utils/api/routers/getConversionPaths";
import { VETH } from "../../utils/constants/web3Constants";

const Convert = (props) => {
  const displayCurrency = useSelector(state => state.settings.generalWalletSettings.displayCurrency || USD);

  const allSubWallets = useObjectSelector(state => state.coinMenus.allSubWallets);
  const activeCoinsForUser = useObjectSelector(state => state.coins.activeCoinsForUser);
  const rates = useObjectSelector(state => state.ledger.rates);
  const balances = useObjectSelector(state => extractLedgerData(state, 'balances', API_GET_BALANCES));

  const [loading, setLoading] = useState(false);

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

  const [destViaOptionsList, setDestViaOptionsList] = useState([]);

  const [sourceWalletOptionsList, setSourceWalletOptionsList] = useState([]);
  const [destAddressOptionsList, setDestAddressOptionsList] = useState([]);

  const [selectedSourceCurrency, setSelectedSourceCurrency] = useState(null);
  const [selectedSourceCoinObj, setSelectedSourceCoinObj] = useState(null);
  const [selectedSourceNetwork, setSelectedSourceNetwork] = useState(null);
  const [selectedSourceWallet, setSelectedSourceWallet] = useState(null);

  const [selectedDestCurrencyId, setSelectedDestCurrencyId] = useState(null);
  const [selectedDestCoinObj, setSelectedDestCoinObj] = useState(null);
  
  const [selectedDestNetwork, setSelectedDestNetwork] = useState(null);
  const [selectedDestAddress, setSelectedDestAddress] = useState(null);

  const [sendAmount, setSendAmount] = useState(null);
  const [sourceBalance, setSourceBalance] = useState(null);

  const [conversionPaths, setConversionPaths] = useState(null);

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

  const formatFiatValue = (n) => {
    const rawFiatDisplayValue = normalizeNum(
      n,
      2,
    )[3];

    const [valueFormattedWithSymbol] = formatCurrency({amount: rawFiatDisplayValue, code: displayCurrency});
    
    return valueFormattedWithSymbol;
  }

  const getRightText = (coinId, walletIds) => {
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
        title = formatFiatValue(Number((totalCryptoBalance.multipliedBy(uniRate)).toString()));
      }
    }

    return { title, description };
  }

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
        rightTitle = formatFiatValue(Number(totalFiatBalance.toString()));
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

  const getDestCurrencyOptionsList = () => {
    const currencies = [];

    if (conversionPaths) {
      for (const destinationCurrencyId in conversionPaths) {
        let title = "-";
        let logo;
        let aliases = [];
        let rightTitle = formatFiatValue(0);
        let rightDescription = "-";

        if (conversionPaths[destinationCurrencyId].length > 0) {
          try {
            const destCurrencyObj = CoinDirectory.findSimpleCoinObj(destinationCurrencyId);
            aliases.push(destCurrencyObj.display_ticker);

            let totalCryptoBalance = BigNumber(0);
            let fiatRate;

            if (totalBalances[destCurrencyObj.id]) {
              if (totalBalances[destCurrencyObj.id].crypto) {
                totalCryptoBalance = totalCryptoBalance.plus(totalBalances[destCurrencyObj.id].crypto);
              }
      
              if (totalBalances[destCurrencyObj.id].rate) fiatRate = totalBalances[destCurrencyObj.id].rate;
            }

            if (destCurrencyObj.mapped_to && conversionPaths[destinationCurrencyId].some(x => {
              return x.ethdest || (x.exportto && x.exportto.fullyqualifiedname === VETH)
            })) {
              const mappedCoinObj = CoinDirectory.findSimpleCoinObj(destCurrencyObj.mapped_to);

              if (totalBalances[mappedCoinObj.id]) {
                if (totalBalances[mappedCoinObj.id].crypto) {
                  totalCryptoBalance = totalCryptoBalance.plus(totalBalances[mappedCoinObj.id].crypto);
                }
        
                if (!fiatRate && totalBalances[mappedCoinObj.id].rate) fiatRate = totalBalances[mappedCoinObj.id].rate;
              }

              const titleCoinObj = mappedCoinObj && mappedCoinObj.display_name.length < destCurrencyObj.display_name.length ? 
                            mappedCoinObj
                            : 
                            destCurrencyObj;

              title = titleCoinObj.display_name;

              aliases.push(mappedCoinObj.display_ticker);

              logo = titleCoinObj.id;
            } else {
              title = destCurrencyObj.display_name;
              logo = destCurrencyObj.id;
            }

            const totalFiatBalance = fiatRate != null ? totalCryptoBalance.multipliedBy(fiatRate) : null;

            if (totalFiatBalance != null) {
              rightTitle = formatFiatValue(Number(totalFiatBalance.toString()));
            }
      
            rightDescription = `${Number(totalCryptoBalance.toString())}`;

            currencies.push({
              title,
              description: aliases.join(' / '),
              rightDescription,
              rightTitle,
              key: destinationCurrencyId,
              logo
            });
          } catch(e) {
            title = conversionPaths[destinationCurrencyId][0].ethdest ? 
              conversionPaths[destinationCurrencyId][0].destination.mapto.fullyqualifiedname 
              : 
              conversionPaths[destinationCurrencyId][0].destination.fullyqualifiedname;

            currencies.push({
              title,
              description: title,
              rightDescription: "0",
              rightTitle,
              key: destinationCurrencyId,
              logo: conversionPaths[destinationCurrencyId][0].ethdest ? 
                conversionPaths[destinationCurrencyId][0].destination.mapto.currencyid 
                : 
                destinationCurrencyId
            });
          }
        }
      }
    }

    return currencies;
  };

  const getSourceNetworkOptionsList = () => {
    const networks = [];

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

  const getDestNetworkOptionsList = () => {
    const networks = []

    if (selectedSourceNetwork && selectedSourceCoinObj && selectedDestCurrencyId && conversionPaths[selectedDestCurrencyId]) {
      const conversionOptions = conversionPaths[selectedDestCurrencyId];

      const exportDests = {};
      let hasLocalConversion = false;

      for (const option of conversionOptions) { 
        let networkName;
        let coinAlias;

        let logo;
        let key;
        let rightTitle = formatFiatValue(0);
        let rightDescription = "0";

        function setRightText (networkId) {
          if (selectedDestCoinObj && allSubWallets[selectedDestCoinObj.id]) {
            const walletIds = [];

            for (const wallet of allSubWallets[selectedDestCoinObj.id]) {
              const [channelName, addr, network] = wallet.channel.split('.');
              if (network === networkId) {
                walletIds.push(wallet.id);
              }
            }

            const rightText = getRightText(selectedDestCoinObj.id, walletIds);
            rightTitle = rightText.title;
            rightDescription = rightText.description;
          }
        }

        function pushNetwork() {
          networks.push({
            title: `On ${networkName}`,
            description: `as ${coinAlias}`,
            logo,
            key,
            rightTitle,
            rightDescription
          })
        }
        
        if (option.exportto && !exportDests[option.exportto.currencyid]) {
          exportDests[option.exportto.currencyid] = option.exportto;
          let exportToEth = false;

          try {            
            const exportNetworkObj = CoinDirectory.getBasicCoinObj(option.exportto.currencyid);

            if (exportNetworkObj.mapped_to && !((exportNetworkObj.pbaas_options & IS_PBAAS_CHAIN) === IS_PBAAS_CHAIN)) {
              const mappedObj = CoinDirectory.getBasicCoinObj(exportNetworkObj.mapped_to);

              networkName = mappedObj.display_name;
              logo = mappedObj.id
              exportToEth = true;
            } else {
              networkName = exportNetworkObj.display_name;
              logo = exportNetworkObj.id
            }
          } catch(e) {
            networkName = option.exportto.fullyqualifiedname;
            logo = 'VRSC'
          }

          if (selectedDestCoinObj) {
            if (selectedDestCoinObj.mapped_to && exportToEth) {
              const mappedObj = CoinDirectory.getBasicCoinObj(selectedDestCoinObj.mapped_to);

              coinAlias = mappedObj.display_ticker;
            } else {
              coinAlias = selectedDestCoinObj.display_ticker;
            }
          } else {
            coinAlias = option.ethdest ? option.destination.name : option.destination.fullyqualifiedname;
          }

          key = option.exportto.currencyid;

          setRightText(option.exportto.currencyid ? option.exportto.currencyid : option.exportto.currencyid);
          pushNetwork();
        } else if (!hasLocalConversion) {
          hasLocalConversion = true;

          networkName = selectedSourceNetwork.display_name;

          if (option.ethdest) {
            if (selectedDestCoinObj && selectedDestCoinObj.mapped_to) {
              try {
                const mappedObj = CoinDirectory.getBasicCoinObj(selectedDestCoinObj.mapped_to);
                coinAlias = mappedObj.display_ticker;
              } catch(e) {
                coinAlias = option.destination.name;
              }
            } else {
              coinAlias = option.destination.name;
            }
          } else if (selectedDestCoinObj) {
            coinAlias = selectedDestCoinObj.display_ticker;
          } else {
            coinAlias = option.destination.fullyqualifiedname;
          }

          logo = selectedSourceNetwork.id;
          key = selectedSourceNetwork.id;

          setRightText(selectedSourceNetwork.currencyid);
          pushNetwork();
        }
      }
    }

    return networks;
  };

  const getSourceWalletOptionsList = () => {
    const wallets = [];

    if (selectedSourceCurrency && selectedSourceNetwork) {      
      if (selectedSourceCoinObj && allSubWallets[selectedSourceCoinObj.id]) {
        for (const wallet of allSubWallets[selectedSourceCoinObj.id]) {
          const [channelName, addr, network] = wallet.channel.split('.');

          if (
            channelName === ERC20 || 
            channelName === ETH || 
            (channelName === VRPC && selectedSourceNetwork.currency_id === network)
          ) {
            const rightText = getRightText(selectedSourceCoinObj.id, [wallet.id]);

            wallets.push({
              title: wallet.name,
              description: `as ${selectedSourceCoinObj.display_ticker}`,
              logo: selectedSourceNetwork.id,
              key: wallet.id,
              rightTitle: rightText.title,
              rightDescription: rightText.description
            })
          }
        }
      }
    }

    return wallets;
  };

  const getSourceBalance = () => {
    return balances[selectedSourceCoinObj.id][selectedSourceWallet.id].confirmed;
  }

  const fetchConversionPaths = async () => {
    try {
      const paths = await getConversionPaths(
        selectedSourceCoinObj,
        selectedSourceWallet.api_channels[API_SEND],
        {
          src: selectedSourceCoinObj.currency_id,
        },
      );

      const processedPaths = {};
      const bounceBacks = {};

      for (const destId in paths) {
        processedPaths[destId] = paths[destId].filter(x => {
          if (x.bounceback && x.ethdest) bounceBacks[x.destination.mapto.currencyid] = x;

          return !x.mapping && !x.bounceback;
        });
      }

      for (const destId in bounceBacks) {
        if (processedPaths[destId]) {
          processedPaths[destId].push(bounceBacks[destId])
        } else {
          processedPaths[destId] = [bounceBacks[destId]]
        }
      }

      setConversionPaths(processedPaths)
    } catch(e) {
      console.warn(e);

      createAlert("Error", "Error fetching conversion options. Try going into the wallet for the coin you want to send, and converting through the send tab.")
    }
  }

  const handleCurrencySelection = (key) => {
    if (convertCardModalMode === CONVERT_CARD_MODAL_MODES.SEND) {
      setSelectedSourceCurrency(sourceCurrencyMap[key]);
    } else {
      setSelectedDestCurrencyId(key);
    }
  }

  const handleNetworkSelection = (key) => {
    try {
      if (convertCardModalMode === CONVERT_CARD_MODAL_MODES.SEND) {
        const networkObj = CoinDirectory.getBasicCoinObj(key);

        setSelectedSourceNetwork(networkObj);
      } else {
        setSelectedDestNetwork(null);
      }
    } catch (e) {
      console.warn(e)
    }
  }

  const handleAddressSelection = (key) => {
    try {
      if (convertCardModalMode === CONVERT_CARD_MODAL_MODES.SEND) {
        if (selectedSourceCoinObj) {
          const subWallets = allSubWallets[selectedSourceCoinObj.id];

          if (subWallets) {
            const selectedWallet = subWallets.find(x => x.id === key);

            setSelectedSourceWallet(selectedWallet);
            setConvertCardModalVisible(false);
          }
        }
      } else {
        setSelectedDestAddress(null);
      }
    } catch (e) {
      console.warn(e)
    }
  }

  const handleSendSelectPressed = () => {
    setSelectedSourceCoinObj(null);
    setSelectedDestCoinObj(null);
    setSelectedSourceWallet(null);
    setSelectedSourceNetwork(null);
    setSelectedSourceCurrency(null);
    setConvertCardModalMode(CONVERT_CARD_MODAL_MODES.SEND);
    setConvertCardModalVisible(true);
  }

  const handleDestSelectPressed = async () => {
    setSelectedDestCurrencyId(null);

    setLoading(true);
    setConvertCardModalVisible(true);
    setConvertCardModalMode(CONVERT_CARD_MODAL_MODES.RECEIVE);
    await fetchConversionPaths();
    setLoading(false);
  }

  useEffect(() => {
    setTotalBalances(getTotalBalances());
  }, [allSubWallets, activeCoinsForUser, balances, displayCurrency, rates]);

  useEffect(() => {
    if (selectedSourceCoinObj &&
      selectedSourceWallet &&
      balances[selectedSourceCoinObj.id] &&
      balances[selectedSourceCoinObj.id][selectedSourceWallet.id]) {
      setSourceBalance(getSourceBalance())
    }
  }, [selectedSourceCoinObj, selectedSourceWallet, balances])

  useEffect(() => {
    setSourceCurrencyMap(getSourceCurrencyMap());
  }, [activeCoinsForUser]);

  useEffect(() => {
    setSourceCurrencyOptionsList(getSourceCurrencyOptionsList());
  }, [sourceCurrencyMap, totalBalances]);

  useEffect(() => {
    if (conversionPaths != null && totalBalances != null && selectedSourceCoinObj != null) {
      setDestCurrencyOptionsList(getDestCurrencyOptionsList());
    }
  }, [conversionPaths, totalBalances, selectedSourceCoinObj]);

  useEffect(() => {
    setSourceNetworkOptionsList(getSourceNetworkOptionsList());
  }, [selectedSourceCurrency, totalBalances]);

  useEffect(() => {
    setDestNetworkOptionsList(getDestNetworkOptionsList());
  }, [selectedDestCurrencyId, selectedSourceCoinObj, selectedDestCoinObj]);

  useEffect(() => {
    if (selectedSourceCurrency && selectedSourceNetwork) {
      const sourceCoinObj = selectedSourceCurrency.find(x => {
        const networkProtocol = x.proto === 'erc20' ? 'eth' : x.proto;
        return networkProtocol === selectedSourceNetwork.proto
      });

      setSelectedSourceCoinObj(sourceCoinObj);
    } else setSelectedSourceCoinObj(null);
  }, [selectedSourceCurrency, selectedSourceNetwork]);

  useEffect(() => {
    if (selectedDestCurrencyId) {
      try {
        setSelectedDestCoinObj(CoinDirectory.findSimpleCoinObj(selectedDestCurrencyId));
      } catch(e) {
        setSelectedDestCoinObj(null);
      }
    } else setSelectedDestCoinObj(null);
  }, [selectedDestCurrencyId]);

  useEffect(() => {
    setSourceWalletOptionsList(getSourceWalletOptionsList());
  }, [selectedSourceCoinObj, totalBalances]);

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
        addresses={convertCardModalMode === CONVERT_CARD_MODAL_MODES.SEND ? sourceWalletOptionsList : destAddressOptionsList}
        onSelectCurrency={(currencyId) => handleCurrencySelection(currencyId)}
        onSelectNetwork={(networkId) => handleNetworkSelection(networkId)}
        onSelectAddress={(addressKey) => handleAddressSelection(addressKey)}
        setVisible={setConvertCardModalVisible}
        loading={loading}
      />
      <View
        style={{
          width: '90%',
          flexDirection: 'column',
          justifyContent: 'space-evenly',
        }}>
        <ConvertCard
          onSelectPressed={handleSendSelectPressed}
          coinObj={selectedSourceCoinObj} 
          networkObj={selectedSourceNetwork}
          address={selectedSourceWallet ? selectedSourceWallet.name : null}
          amount={sendAmount}
          setAmount={setSendAmount}
          balance={sourceBalance}
          onMaxPressed={() => setSendAmount(sourceBalance ? sourceBalance.toString() : 0)}
        />
        <ConvertCard
          onSelectPressed={handleDestSelectPressed}
          selectDisabled={selectedSourceCoinObj == null || selectedSourceNetwork == null || selectedSourceWallet == null}
          //coinObj={selectedSourceCoinObj} 
          //networkObj={selectedSourceNetwork}
          //address={selectedSourceWallet ? selectedSourceWallet.name : null}
          //amount={sendAmount}
          //setAmount={setSendAmount}
          //balance={sourceBalance}
          //onMaxPressed={() => setSendAmount(sourceBalance ? sourceBalance.toString() : 0)}
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