/*
  This component is responsible for managing fiat withdrawals/deposits
  or any other "manage" functions that may be implemented in the future
*/

import React, { useEffect } from "react"
import { useWindowDimensions } from 'react-native'
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import Colors from "../../../globals/colors";
import WithdrawCoin from "./WithdrawCoin/WithdrawCoin";
import DepositCoin from "./DepositCoin/DepositCoin";
import { conditionallyUpdateWallet } from "../../../actions/actionDispatchers";
import {
  API_GET_DEPOSIT_SOURCES,
  API_GET_WITHDRAW_DESTINATIONS,
} from '../../../utils/constants/intervalConstants';
import store from "../../../store";
import { useSelector } from "react-redux";
import { expireCoinData } from "../../../actions/actionCreators";
import { useObjectSelector } from "../../../hooks/useObjectSelector";

export default function ManageCoin(props) {
  const layout = useWindowDimensions();
  const chainTicker = useSelector(state => state.coins.activeCoin.id)

  const updateIntervals = useObjectSelector(
    state => state.updates.coinUpdateTracker[chainTicker],
  );

  function loadManagedData() {
    if (updateIntervals != null) {
      store.dispatch(expireCoinData(chainTicker, API_GET_WITHDRAW_DESTINATIONS))
      store.dispatch(expireCoinData(chainTicker, API_GET_DEPOSIT_SOURCES))
      
      conditionallyUpdateWallet(
        store.getState(),
        store.dispatch,
        chainTicker,
        API_GET_WITHDRAW_DESTINATIONS
      );
  
      conditionallyUpdateWallet(
        store.getState(),
        store.dispatch,
        chainTicker,
        API_GET_DEPOSIT_SOURCES
      );
    }
  }

  // Temporary stopgap until proper solution for long wait times 
  // on managecoin screen are resolved
  useEffect(() => {
    loadManagedData()
  }, []);

  const [index, setIndex] = React.useState(0);
  const [routes] = React.useState([
    { key: 'deposit', title: 'Deposit' },
    { key: 'withdraw', title: 'Withdraw' },
  ]);
  
  const renderScene = SceneMap({
    deposit: DepositCoin,
    withdraw: WithdrawCoin
  });
  
  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
      style={{ backgroundColor: Colors.primaryColor }}
      renderTabBar={(props) => (
        <TabBar
          {...props}
          indicatorStyle={{ backgroundColor: "white" }}
          style={{ backgroundColor: Colors.primaryColor }}
        />
      )}
    />
  );
}