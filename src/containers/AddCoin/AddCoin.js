/*
  This component is for displaying a list of all the default coins
  that the user can add to their wallet. These coins should come
  available with the wallet download and do not need to be added by
  qr.
*/

import React, {Component} from 'react';
import {SearchBar} from 'react-native-elements';
import {FlatList, TouchableOpacity, View} from 'react-native';
import {List} from 'react-native-paper';
import {Searchbar, Portal} from 'react-native-paper';
import {connect} from 'react-redux';
import Styles from '../../styles/index';
import {findCoinObj, supportedCoinList, enabledNameList} from '../../utils/CoinData/CoinData';
import {RenderSquareCoinLogo} from '../../utils/CoinData/Graphics';
import CoinDetailsModal from '../../components/CoinDetailsModal/CoinDetailsModal';
import {createAlert} from '../../actions/actions/alert/dispatchers/alert';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {WYRE_SERVICE} from '../../utils/constants/intervalConstants';

class AddCoin extends Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      error: null,
      query: '',
      coinList: [],
      fullCoinDetails: null,
    };
  }

  componentDidMount() {
    this.setState({coinList: this.getCoinList()});
  }

  componentDidUpdate(lastProps, lastState) {
    if (lastState.query !== this.state.query) {
      this.setState({coinList: this.getCoinList()});
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
    let coinData = null;

    try {
      coinData = findCoinObj(item, this.props.activeAccount.id);

      this.setState({fullCoinDetails: coinData});
    } catch (e) {
      createAlert('Error', e.message || 'Unknown error');
    }
  };

  getCoinList = () => {
    const {query} = this.state;
    const displayedCoinList = this.props.activeAccount.disabledServices[WYRE_SERVICE]
      ? enabledNameList
      : supportedCoinList;


    return displayedCoinList
      .filter(coinId => {
        const queryLc = query.toLowerCase();
        const coinIdLc = coinId.toLowerCase();

        return (
          query.length == 0 ||
          queryLc.includes(coinIdLc) ||
          coinIdLc.includes(queryLc)
        );
      })
      .sort((a, b) => {
        if (b === 'VRSC' || b === 'BTC') {
          return 1;
        } else if (a === 'VRSC' || a === 'BTC') {
          return -1;
        } else {
          return a <= b ? -1 : 1;
        }
      });
  };

  onEndReached = () => {
    this.setState({loading: false});
  };

  render() {
    const activeCoinIds = this.props.activeCoinsForUser.map(
      coinObj => coinObj.id,
    );

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
            const added = activeCoinIds.includes(item);
            const coinInfo = coinsList[item.toLowerCase()];
            const {display_name, display_ticker} = coinInfo;

            return (
              <TouchableOpacity onPress={() => this._openDetails(item)}>
                <List.Item
                  title={`${display_name} (${display_ticker})`}
                  left={props => RenderSquareCoinLogo(item)}
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
          keyExtractor={item => item}
        />
      </View>
    );
  }
}

const mapStateToProps = state => {
  return {
    activeAccount: state.authentication.activeAccount,
    activeCoinsForUser: state.coins.activeCoinsForUser,
    activeCoinList: state.coins.activeCoinList,
  };
};

export default connect(mapStateToProps)(AddCoin);
