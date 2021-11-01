/*
  This component is responsible for managing fiat withdrawals/deposits
  or any other "manage" functions that may be implemented in the future
*/

import React, { Component } from "react"
import { useWindowDimensions } from 'react-native'
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import Colors from "../../../globals/colors";
import WithdrawCoin from "./WithdrawCoin/WithdrawCoin";
import DepositCoin from "./DepositCoin/DepositCoin";

export default function ManageCoin(props) {
  const layout = useWindowDimensions();

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