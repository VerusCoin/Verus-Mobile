/*
  This component is for displaying a list of all the default coins
  that the user can add to their wallet. These coins should come
  available with the wallet download and do not need to be added by
  qr.
*/

import React, {useState, useEffect} from 'react';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {List, Portal, Searchbar} from 'react-native-paper';
import {useSelector} from 'react-redux';
import Styles from '../../styles/index';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import CoinDetailsModal from '../../components/CoinDetailsModal/CoinDetailsModal';
import {WYRE_SERVICE} from '../../utils/constants/intervalConstants';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';

const AddCoin = props => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [query, setQuery] = useState('');
  const [coinList, setCoinList] = useState([]);
  const [fullCoinDetails, setFullCoinDetails] = useState(null);

  const testAccount = useSelector(
    state =>
      Object.keys(state.authentication.activeAccount.testnetOverrides).length >
      0,
  );
  const activeAccount = useSelector(
    state => state.authentication.activeAccount,
  );
  const activeCoinsForUser = useSelector(
    state => state.coins.activeCoinsForUser,
  );
  const activeCoinList = useSelector(state => state.coins.activeCoinList);

  useEffect(() => {
    setCoinList(getCoinList());
  }, [query, activeCoinsForUser]);

  useEffect(() => {
    return () => {
      if (props.route.params && props.route.params.refresh) {
        props.route.params.refresh();
      }
    };
  }, []);

  const getCoinList = () => {
    const displayedCoinList = testAccount
      ? CoinDirectory.testCoinList
      : activeAccount.disabledServices[WYRE_SERVICE]
      ? CoinDirectory.enabledNameList
      : CoinDirectory.supportedCoinList;
    const activeCoinIds = activeCoinsForUser.map(coinObj => coinObj.id);

    // Define the order of priority for currency IDs
    const priorityOrder = [
      'VRSC', '0xBc2738BA63882891094C99E59a02141Ca1A1C36a',
      'VRSCTEST',
      'BTC', '0x18084fbA666a33d37592fA2633fD49a74DD93a88', 'iS8TfRPfVpKo5FVfSUzfHBQxo9KuzpnqLU',
      'DAI', 'iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM',
      'MKR', 'iCkKJuJScy4Z6NSDK7Mt42ZAB2NEnAE1o4',
      'ETH', 'i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X',
      'i3f7tSctFkiPpiedY8QR5Tep9p4qDVebDx', '0xE6052Dcc60573561ECef2D9A4C0FEA6d3aC5B9A2',
      'USDC', 'i61cV2uicKSi1rSMQCBNQeSYC3UAi9GVzd',
      '0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c', 'iC5TQFrFXSYLQGkiZ8FYmZHFJzaRF5CYgE',
    ];

    return displayedCoinList
      .map(x => {
        return {
          added: activeCoinIds.includes(x),
          coinObj: CoinDirectory.findCoinObj(x),
        };
      })
      .filter(item => {
        const { coinObj } = item;
        const queryLc = query.toLowerCase();
        const coinIdLc = coinObj.id.toLowerCase();
        const coinNameLc = coinObj.display_name.toLowerCase();
        const coinTickerLc = coinObj.display_ticker.toLowerCase();

        return (
          query.length == 0 ||
          coinIdLc.includes(queryLc) ||
          coinNameLc.includes(queryLc) ||
          coinTickerLc.includes(queryLc)
        );
      })
      .sort((a, b) => {
        const { coinObj: currencyA } = a;
        const { coinObj: currencyB } = b;

        // Determine the rank based on the position in the priorityOrder array
        const rankA = priorityOrder.indexOf(currencyA.id);
        const rankB = priorityOrder.indexOf(currencyB.id);

        // If both currencies are in the priority list, sort by their order in the list
        if (rankA !== -1 && rankB !== -1) {
          return rankA - rankB;
        }

        // If only currencyA is in the priority list, it should come first
        if (rankA !== -1) {
          return -1;
        }

        // If only currencyB is in the priority list, it should come first
        if (rankB !== -1) {
          return 1;
        }

        // If neither currency is in the priority list, sort by display_ticker
        return currencyA.display_ticker.localeCompare(currencyB.display_ticker);
      });
  };

  const onEndReached = () => {
    setLoading(false);
  };

  const activeCoinIds = activeCoinsForUser.map(coinObj => coinObj.id);

  return (
    <View style={{...Styles.root, padding: 0}}>
      <Portal>
        <CoinDetailsModal
          navigation={props.navigation}
          data={fullCoinDetails || {}}
          added={
            fullCoinDetails != null &&
            activeCoinIds.includes(fullCoinDetails.id)
          }
          activeAccount={activeAccount}
          activeCoinList={activeCoinList}
          cancel={() => setFullCoinDetails(null)}
          visible={fullCoinDetails != null}
          animationType="slide"
        />
      </Portal>
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
        data={coinList}
        onEndReached={onEndReached}
        onEndReachedThreshold={50}
        renderItem={({item}) => {
          const {added, coinObj} = item;
          const {display_name, display_ticker} = coinObj;

          return (
            <TouchableOpacity onPress={() => setFullCoinDetails(item.coinObj)}>
              <List.Item
                title={`${display_name} (${display_ticker})`}
                left={props => RenderSquareCoinLogo(coinObj.id)}
                right={props => {
                  return added ? (
                    <List.Icon {...props} icon={'check'} size={20} />
                  ) : null;
                }}
                style={{
                  backgroundColor: 'white',
                }}
              />
            </TouchableOpacity>
          );
        }}
        keyExtractor={item => item.coinObj.id}
      />
    </View>
  );
};

export default AddCoin;
