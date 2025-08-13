/*
  This component is for displaying a list of all the default coins
  that the user can add to their wallet. These coins should come
  available with the wallet download and do not need to be added by
  qr.
*/

import React, {useState, useEffect} from 'react';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {List, Searchbar} from 'react-native-paper';
import Styles from '../../../../../styles/index';
import { blocksToTime } from '../../../../../utils/math';
import { getCoinLogo } from '../../../../../utils/CoinData/CoinData';

const PbaasPreconvertServiceOverview = props => {
  const { navigation, currenciesInPreconvert, refreshCurrenciesInPreconvert } = props;
  
  const [query, setQuery] = useState('');
  const [currencyList, setCurrencyList] = useState([]);

  useEffect(() => {
    setCurrencyList(getCurrencyList());
  }, [query, currenciesInPreconvert]);

  const getCurrencyList = () => {
    return currenciesInPreconvert
      .map(x => {
        return {
          ...x,
          // Needs to be adjusted to include launch system blocktime
          // to calculate time left, when PbaasPreconvertService is implemented
          time_left_string: blocksToTime(x.blocks_left)
        }
      })
      .filter(item => {
        const {currencydefinition} = item;
        const {fullyqualifiedname, currencyid} = currencydefinition;

        const queryLc = query.toLowerCase();
        const fqnLc = fullyqualifiedname.toLowerCase();
        const currencyIdLc = currencyid.toLowerCase();

        return (
          query.length == 0 ||
          fqnLc.includes(queryLc) ||
          currencyIdLc.includes(queryLc)
        );
      })
      .sort((a, b) => {
        if (a.blocks_left <= b.blocks_left) return 1;
        else return -1;
      });
  };

  return (
    <View style={{...Styles.root, padding: 0}}>
      <FlatList
        ListHeaderComponent={
          <Searchbar
            placeholder="Search"
            onChangeText={text => setQuery(text)}
            value={query}
            autoCorrect={false}
          />
        }
        style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
        data={currencyList}
        onEndReachedThreshold={50}
        refreshing={false}
        onRefresh={refreshCurrenciesInPreconvert}
        renderItem={({item}) => {
          const { currencydefinition, time_left_string } = item;
          const { fullyqualifiedname, currencyid } = currencydefinition;
          const Logo = getCoinLogo(currencyid, 'vrsc');

          return (
            <TouchableOpacity onPress={() => setFullCoinDetails(item.coinObj)}>
              <List.Item
                title={`${fullyqualifiedname} (${
                  currencyid.substring(0, 5) +
                  '...' +
                  currencyid.substring(currencyid.length - 5)
                })`}
                left={props => (
                  <View style={{justifyContent: 'center', paddingLeft: 8}}>
                    <Logo
                      width={30}
                      height={30}
                      style={{
                        alignSelf: 'center',
                      }}
                    />
                  </View>
                )}
                description={`${time_left_string} left`}
                descriptionNumberOfLines={1}
                titleNumberOfLines={1}
                right={props => {
                  return <List.Icon {...props} icon={'chevron-right'} size={20} />;
                }}
                style={{
                  backgroundColor: 'white',
                  display: 'flex',
                }}
              />
            </TouchableOpacity>
          );
        }}
        keyExtractor={item => item.currencydefinition.currencyid}
      />
    </View>
  );
};

export default PbaasPreconvertServiceOverview;
