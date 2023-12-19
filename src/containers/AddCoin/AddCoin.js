/*
  This component is for displaying a list of all the default coins
  that the user can add to their wallet. These coins should come
  available with the wallet download and do not need to be added by
  qr.
*/

import React, {useState, useEffect} from 'react';
import {FlatList, TouchableOpacity, TouchableWithoutFeedback, View} from 'react-native';
import {List, Portal, Searchbar} from 'react-native-paper';
import {useSelector} from 'react-redux';
import Styles from '../../styles/index';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import CoinDetailsModal from '../../components/CoinDetailsModal/CoinDetailsModal';
import {WYRE_SERVICE} from '../../utils/constants/intervalConstants';
import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import Colors from '../../globals/colors';

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
  const darkMode = useSelector(state => state.settings.darkModeState);

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

    return displayedCoinList
      .map(x => {
        return {
          added: activeCoinIds.includes(x),
          coinObj: CoinDirectory.findCoinObj(x),
        };
      })
      .filter(item => {
        const {coinObj} = item;
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
        const {coinObj: currencyA} = a;
        const {coinObj: currencyB} = b;

        if (
          currencyB.id === 'VRSC' ||
          currencyB.id === 'BTC' ||
          currencyB.id === 'VRSCTEST' ||
          currencyB.id === "iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM" ||
          currencyB.id === "iCkKJuJScy4Z6NSDK7Mt42ZAB2NEnAE1o4" ||
          currencyB.id === "i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X" ||
          currencyB.id === "i3f7tSctFkiPpiedY8QR5Tep9p4qDVebDx" ||
          currencyB.id === '0xBc2738BA63882891094C99E59a02141Ca1A1C36a' ||
          currencyB.id === '0xE6052Dcc60573561ECef2D9A4C0FEA6d3aC5B9A2' ||
          currencyB.id === 'MKR' ||
          currencyB.id === 'DAI'
        ) {
          return 1;
        } else if (
          currencyA.id === 'VRSC' ||
          currencyA.id === 'BTC' ||
          currencyA.id === 'VRSCTEST' ||
          currencyA.id === "iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM" ||
          currencyA.id === "iCkKJuJScy4Z6NSDK7Mt42ZAB2NEnAE1o4" ||
          currencyA.id === "i9nwxtKuVYX4MSbeULLiK2ttVi6rUEhh4X" ||
          currencyA.id === "i3f7tSctFkiPpiedY8QR5Tep9p4qDVebDx" ||
          currencyA.id === '0xBc2738BA63882891094C99E59a02141Ca1A1C36a' ||
          currencyA.id === '0xE6052Dcc60573561ECef2D9A4C0FEA6d3aC5B9A2' ||
          currencyA.id === 'MKR' ||
          currencyA.id === 'DAI'
        ) {
          return -1;
        } else {
          return currencyA.display_ticker <= currencyB.display_ticker ? -1 : 1;
        }
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
            iconColor={darkMode ? Colors.secondaryColor : Colors.verusDarkGray}
            placeholder="Search"
            placeholderTextColor={darkMode ? Colors.secondaryColor : Colors.verusDarkGray}
            onChangeText={text => setQuery(text)}
            value={query}
            autoCorrect={false}
            style={{backgroundColor:darkMode ? Colors.darkModeColor : Colors.secondaryColor}}
          />
        }
        style={{...Styles.fullWidth, backgroundColor:darkMode?Colors.darkModeColor:'white'}}
        data={coinList}
        onEndReached={onEndReached}
        onEndReachedThreshold={50}
        renderItem={({item}) => {
          const {added, coinObj} = item;
          const {display_name, display_ticker} = coinObj;

          return (
            <TouchableOpacity 
            onPress={() => setFullCoinDetails(item.coinObj)}>
              <List.Item
                titleStyle={{color:darkMode ? Colors.secondaryColor : 'black'}}
                title={`${display_name} (${display_ticker})`}
                left={props => RenderSquareCoinLogo(coinObj.id)}
                right={props => {
                  return added ? (
                    <List.Icon 
                    {...props}
                    color={darkMode ? Colors.secondaryColor : 'black'} 
                    icon={'check'} 
                    size={20} />
                  ) : null;
                }}
                style={{
                  backgroundColor:darkMode ? Colors.darkModeColor : Colors.secondaryColor
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
