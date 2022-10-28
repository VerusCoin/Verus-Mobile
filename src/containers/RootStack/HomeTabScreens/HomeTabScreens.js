import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import Colors from '../../../globals/colors';
import WalletStackScreens from '../WalletStackScreens/WalletStackScreens';
import ProfileStackScreens from '../ProfileStackScreens/ProfileStackScreens';
import ServicesStackScreens from '../ServicesStackScreens/ServicesStackScreens';

const HomeTabs = createMaterialBottomTabNavigator()

const HomeTabScreens = props => {
  return (
    <HomeTabs.Navigator
      headerMode="screen"
      barStyle={{ backgroundColor: Colors.primaryColor }}
    >
      <HomeTabs.Screen
        name="WalletHome"
        component={WalletStackScreens}
        options={{
          title: "Wallets",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="wallet" color={color} size={26} />
          ),
        }}
      />
      <HomeTabs.Screen
        name="PersonalHome"
        component={ProfileStackScreens}
        options={{
          title: "Personal Profile",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="fingerprint"
              color={color}
              size={26}
            />
          ),
        }}
      />
      <HomeTabs.Screen
        name="ServicesHome"
        component={ServicesStackScreens}
        options={{
          title: "Services",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="room-service"
              color={color}
              size={26}
            />
          ),
        }}
      />
    </HomeTabs.Navigator>
  );
};

export default HomeTabScreens