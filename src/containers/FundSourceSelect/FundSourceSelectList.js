import React, { useEffect, useState } from "react";
import { useSelector } from 'react-redux';
import {
  ScrollView,
  View
} from "react-native";
import { List, Card, TextInput } from "react-native-paper";
import { API_GET_BALANCES, IS_PBAAS } from "../../utils/constants/intervalConstants";
import { satsToCoins, truncateDecimal } from "../../utils/math";
import BigNumber from "bignumber.js";
import Colors from "../../globals/colors";
import { CoinDirectory } from "../../utils/CoinData/CoinDirectory";
import { getCoinLogo } from "../../utils/CoinData/CoinData";
import { VerusPayInvoice } from "verus-typescript-primitives";
import { coinsList } from "../../utils/CoinData/CoinsList";
import MissingInfoRedirect from "../../components/MissingInfoRedirect/MissingInfoRedirect";
import AnimatedActivityIndicatorBox from "../../components/AnimatedActivityIndicatorBox";

const FundSourceSelectList = (props) => {
  const { coinObjs, allSubWallets, sourceOptions: rawSourceOptions, invoice } = props;

  const allBalances = useSelector(state => state.ledger.balances);

  const [cryptoBalances, setCryptoBalances] = useState({});
  const [sourceOptions, setSourceOptions] = useState({});

  const [displayedCoinObjs, setDisplayedCoinObjs] = useState({});

  const [displayedCards, setDisplayedCards] = useState([]);
  const [noValidCards, setNoValidCards] = useState(false);
  const [showLoadingInsteadOfError, setShowLoadingInsteadOfError] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');

  const inv = VerusPayInvoice.fromJson(invoice);

  useEffect(() => {
    // Times out waiting for balance updates as opposed to flashing error screen
    setTimeout(() => {
      setShowLoadingInsteadOfError(false)
    }, 10000)
  }, []);

  useEffect(() => {
    parseProps();
  }, [coinObjs, allSubWallets, rawSourceOptions, invoice, allBalances]);

  useEffect(() => {
    updateDisplayedCards();
  }, [sourceOptions, displayedCoinObjs, cryptoBalances, searchTerm]);

  const getNetworkSourceOptionKey = (currencyId, subWalletId, viaCurrencyId = '') => {
    return `${currencyId}.${viaCurrencyId == null ? '' : viaCurrencyId}.${subWalletId}`
  }

  const parseProps = () => {
    const sourceOptionsMap = new Map();
    const displayedCoinObjsMap = new Map();
    const inv = VerusPayInvoice.fromJson(invoice);

    for (const coinObj of coinObjs) {
      const chainTicker = coinObj.id;
      const subWallets = allSubWallets[chainTicker] ? allSubWallets[chainTicker] : [];

      if (coinObj.tags.includes(IS_PBAAS)) {
        displayedCoinObjsMap.set(coinObj.currency_id, coinObj);
      }
      
      for (const wallet of subWallets) {
        const network = wallet.network;
        const rootNetwork = inv.details.isTestnet() ? coinsList.VRSCTEST : coinsList.VRSC;
        const rootNetworkId = rootNetwork.currency_id

        if (network && 
            ((inv.details.acceptsNonVerusSystems() && inv.details.acceptedsystems.includes(network)) || 
              (network === rootNetworkId && !inv.details.excludesVerusBlockchain()) || 
              (!inv.details.expires() && !inv.details.acceptsConversion())
            )
        ) {
          displayedCoinObjsMap.set(network, CoinDirectory.findCoinObj(network));
          const newNetworkSourceOptionMap = new Map(sourceOptionsMap.get(network));
          
          const acceptedNonVerusSystems = inv.details.acceptsNonVerusSystems() ? inv.details.acceptedsystems : [];
          const exportTo =
            !inv.details.expires() &&
            !inv.details.acceptsConversion() &&
            wallet.network !== rootNetworkId &&
            !acceptedNonVerusSystems.includes(wallet.network)
              ? rootNetwork.id
              : null;

          if (coinObj.currency_id === inv.details.requestedcurrencyid) {
            // Accept cross-network sends if no conversion or expiry
            if (!inv.details.acceptsConversion() && !inv.details.expires()) {
              newNetworkSourceOptionMap.set(getNetworkSourceOptionKey(coinObj.currency_id, wallet.id), {
                amount: satsToCoins(BigNumber(inv.details.amount)).toNumber(),
                network: network,
                conversion: false,
                wallet,
                coinObj,
                exportTo
              });
            } else if (
              (inv.details.isTestnet() && network === coinsList.VRSCTEST.system_id) || 
              (!inv.details.isTestnet() && network === coinsList.VRSC.system_id) || 
              (inv.details.acceptsNonVerusSystems() && inv.details.acceptedsystems.includes(network))
            ) {
              newNetworkSourceOptionMap.set(getNetworkSourceOptionKey(coinObj.currency_id, wallet.id), {
                amount: satsToCoins(BigNumber(inv.details.amount)).toNumber(),
                network: network,
                conversion: false,
                wallet,
                coinObj,
                exportTo
              });
            }
          } else if (rawSourceOptions[network]) {
            for (const sourceOption of rawSourceOptions[network]) {
              if (sourceOption.sourceamounts[coinObj.currency_id]) {
                const viaCurrencyId = sourceOption.lastnotarization.currencyid;
                const isDirect = viaCurrencyId === coinObj.currency_id;

                if (sourceOption[viaCurrencyId].systemid === wallet.network) {
                  newNetworkSourceOptionMap.set(getNetworkSourceOptionKey(coinObj.currency_id, wallet.id, viaCurrencyId), {
                    amount: sourceOption.sourceamounts[coinObj.currency_id],
                    via: isDirect ? null : sourceOption.fullyqualifiedname,
                    viaCurrencyId: isDirect ? null : viaCurrencyId,
                    network: network,
                    conversion: true,
                    wallet,
                    coinObj,
                    exportTo
                  });
                }
              }
            }
          } 

          sourceOptionsMap.set(network, newNetworkSourceOptionMap);

          if (
            allBalances[wallet.api_channels[API_GET_BALANCES]] &&
            allBalances[wallet.api_channels[API_GET_BALANCES]][chainTicker]
          ) {
            setCryptoBalances((prevCryptoBalances) => ({
              ...prevCryptoBalances,
              [chainTicker]: prevCryptoBalances[chainTicker] ? {
                ...prevCryptoBalances[chainTicker],
                [wallet.id]: BigNumber(
                  allBalances[wallet.api_channels[API_GET_BALANCES]][chainTicker].total
                )
              } : {
                [wallet.id]: BigNumber(
                  allBalances[wallet.api_channels[API_GET_BALANCES]][chainTicker].total
                )
              }
            }));
          }
        }
      }
    }

    for (const [key, value] of sourceOptionsMap) {
      sourceOptionsMap.set(key, Object.fromEntries(value.entries()))
    }

    setSourceOptions(Object.fromEntries(sourceOptionsMap.entries()));
    setDisplayedCoinObjs(Object.fromEntries(displayedCoinObjsMap.entries()))
  };

  const updateDisplayedCards = () => {
    const cards = [];

    for (const networkId in sourceOptions) {
      for (const optionId in sourceOptions[networkId]) {
        const currencyId = optionId.split('.')[0];

        const coinObj = displayedCoinObjs[currencyId];
        const {
          amount,
          via,
          network,
          wallet
        } = sourceOptions[networkId][optionId];

        const balanceLoaded = cryptoBalances[coinObj.id] && cryptoBalances[coinObj.id][wallet.id];
        const balance = balanceLoaded ? cryptoBalances[coinObj.id][wallet.id] : BigNumber(0);
        const balanceDisplay = balanceLoaded ? truncateDecimal(cryptoBalances[coinObj.id][wallet.id], 4) : '-';

        const requiredAmount = inv.details.acceptsAnyAmount() ? BigNumber(0) : BigNumber(amount);

        if (coinObj && balance.isGreaterThan(requiredAmount)) {
          cards.push({
            title: `Pay with ${inv.details.acceptsAnyAmount() ? "any amount" : `${amount} ${coinObj.display_ticker}`} from ${wallet.name}${
              via != null ? ` via ${via}` : ''
            }`,
            subtitle: `Network: ${
              displayedCoinObjs[network]
                ? displayedCoinObjs[network].display_ticker
                : network
            }\nBalance: ${balanceDisplay} ${coinObj.display_ticker}`,
            icon: getCoinLogo(coinObj.id, coinObj.proto, 'dark'),
            color: coinObj.theme_color,
            option: sourceOptions[networkId][optionId],
            searchTerms: [
              inv.details.acceptsAnyAmount() ? '' : amount.toString(),
              coinObj.display_ticker,
              wallet.name,
              via != null ? via : ''
            ],
          });
        }
      }
    }

    if (cards.length == 0) {
      setNoValidCards(true);
    } else setNoValidCards(false);

    setDisplayedCards(cards.filter(card => {
      const searchTermLc = searchTerm ? searchTerm.toLowerCase() : '';

      if (searchTermLc.length === 0) return true;
      else {
        return card.searchTerms.some(term => {
          const findTermLc = term.toLowerCase();

          return findTermLc.includes(searchTermLc);
        })
      }
    }))
  }

  return noValidCards ? 
    showLoadingInsteadOfError ? (
      <AnimatedActivityIndicatorBox />
    ) : (
      <View style={{flex: 1, width: '100%'}}>
        <MissingInfoRedirect
          icon={'alert-circle-outline'}
          label={'No valid sources to pay this invoice from in your wallet.'}
        />
      </View>
    )
    :
    <ScrollView>
      <TextInput
        label={`Search ${displayedCards.length} payment ${displayedCards.length === 1 ? 'option' : 'options'}`}
        value={searchTerm}
        onChangeText={text => setSearchTerm(text)}
        mode="outlined"
        style={{marginHorizontal: 8, marginTop: 2}}
      />
      {displayedCards.map((card, index) => (
        <View style={{ margin: 8, marginTop: index === 0 ? 8 : 0 }} key={index}>
          <Card
            onPress={() => props.onSelect(card)}
            key={index}
            style={{ backgroundColor: card.color }}
          >
          <List.Item
            title={card.title}
            titleNumberOfLines={100}
            titleStyle={{
              color: Colors.secondaryColor,
              fontWeight: '500',
            }}
            description={card.subtitle}
            descriptionNumberOfLines={100}
            left={() => (
              <View style={{justifyContent: 'center', paddingLeft: 8}}>
                <card.icon style={{alignSelf: 'center'}} width={30} height={30}/>
              </View>
            )}
            descriptionStyle={{color: Colors.secondaryColor}}
          />
          </Card>
        </View>
      ))}
    </ScrollView>;
};

export default FundSourceSelectList;
