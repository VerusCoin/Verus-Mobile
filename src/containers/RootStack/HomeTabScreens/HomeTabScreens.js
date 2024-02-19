import React, { useEffect } from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import Colors from '../../../globals/colors';
import WalletStackScreens from '../WalletStackScreens/WalletStackScreens';
import ProfileStackScreens from '../ProfileStackScreens/ProfileStackScreens';
import ServicesStackScreens from '../ServicesStackScreens/ServicesStackScreens';
import VerusPay from '../../VerusPay/VerusPay';
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';

const HomeTabs = createMaterialBottomTabNavigator()

const HomeTabScreens = props => {
  const darkMode = useSelector((state)=>state.settings.darkModeState)

  useEffect(()=>{
    getVla()
  },[])

  const getVla=async()=>{
  const value = await AsyncStorage.getItem('darkModeKey');
  console.log('async==',value)
  }
  return (
    <HomeTabs.Navigator
      barStyle={{ backgroundColor: darkMode?Colors.verusDarkBlue:Colors.primaryColor }}
      shifting={false}
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
          title: "Personal",
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
      <HomeTabs.Screen
        name="VerusPay"
        component={VerusPay}
        options={{
          title: "Scan",
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="camera"
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