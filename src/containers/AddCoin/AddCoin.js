/*
  This component is for displaying a list of all the default coins
  that the user can add to their wallet. These coins should come
  available with the wallet download and do not need to be added by
  qr.
*/

import React, {Component} from 'react';
import {SearchBar} from 'react-native-elements';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {List, FAB} from 'react-native-paper';
import {Searchbar, Portal} from 'react-native-paper';
import {connect} from 'react-redux';
import Styles from '../../styles/index';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import CoinDetailsModal from '../../components/CoinDetailsModal/CoinDetailsModal';
import {WYRE_SERVICE} from '../../utils/constants/intervalConstants';
import { CoinDirectory } from '../../utils/CoinData/CoinDirectory';

class AddCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      query: '',
      coinList: [],
      fullCoinDetails: null,
      activeCoinIds: []
    };
  }

  componentDidMount() {
    this.setState({coinList: this.getCoinList()});
  }

  componentDidUpdate(lastProps, lastState) {
    if (lastState.query !== this.state.query || this.props.activeCoinsForUser !== lastProps.activeCoinsForUser) {
      this.setState({coinList: this.getCoinList(), activeCoinIds: this.props.activeCoinsForUser.map(
        coinObj => coinObj.id,
      )});
    }
  }

  componentWillUnmount() {
    if (this.props.route.params && this.props.route.params.refresh) {
      this.props.route.params.refresh();
    }
  }

  renderHeader = () => {
    return (
      <SearchBar
        placeholder="Type Here..."
        onChangeText={text => this.searchFilterFunction(text)}
        autoCorrect={false}
      />
    );
  };

  _openDetails = item => {
    this.setState({fullCoinDetails: item.coinObj});
  };

  getCoinList = () => {
    const {query} = this.state;
    const displayedCoinList = this.props.testAccount
      ? CoinDirectory.testCoinList
      : this.props.activeAccount.disabledServices[WYRE_SERVICE]
      ? CoinDirectory.enabledNameList
      : CoinDirectory.supportedCoinList;
    const activeCoinIds = this.props.activeCoinsForUser.map(
      coinObj => coinObj.id,
    );

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
        const {coinObj: currencyA} = a;
        const {coinObj: currencyB} = b;

        if (
          currencyB.id === 'VRSC' ||
          currencyB.id === 'BTC' ||
          currencyB.id === 'VRSCTEST'
        ) {
          return 1;
        } else if (
          currencyA.id === 'VRSC' ||
          currencyA.id === 'BTC' ||
          currencyA.id === 'VRSCTEST'
        ) {
          return -1;
        } else {
          return currencyA.display_ticker <= currencyB.display_ticker ? -1 : 1;
        }
      });
  };

  onEndReached = () => {
    this.setState({loading: false});
  };

  render() {
    const activeCoinIds = this.state.activeCoinIds

    return (
      <View styles={Styles.root}>
        <Portal>
          <CoinDetailsModal
            navigation={this.props.navigation}
            data={this.state.fullCoinDetails || {}}
            added={
              this.state.fullCoinDetails != null &&
              activeCoinIds.includes(this.state.fullCoinDetails.id)
            }
            activeAccount={this.props.activeAccount}
            activeCoinList={this.props.activeCoinList}
            cancel={() =>
              this.setState({
                fullCoinDetails: null,
              })
            }
            visible={this.state.fullCoinDetails != null}
            animationType="slide"
          />
        </Portal>
        <FlatList
          ListHeaderComponent={
            <Searchbar
              placeholder="Search"
              onChangeText={query => this.setState({query})}
              value={this.state.query}
              autoCorrect={false}
            />
          }
          style={{...Styles.fullWidth, ...Styles.backgroundColorWhite}}
          data={this.state.coinList}
          onEndReached={this.onEndReached}
          onEndReachedThreshold={50}
          renderItem={({item}) => {
            const { added, coinObj } = item
            const {display_name, display_ticker} = coinObj;

            return (
              <TouchableOpacity onPress={() => this._openDetails(item)}>
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
  }
}

const mapStateToProps = state => {
  return {
    testAccount: Object.keys(state.authentication.activeAccount.testnetOverrides).length > 0,
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
  };
};

export default connect(mapStateToProps)(AddCoin);
