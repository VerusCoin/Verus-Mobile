import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import Services from '../../Services/Services'
import Service from '../../Services/Service/Service'
import WyreServiceAccountData from '../../Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAccountData/WyreServiceAccountData';
import WyreServiceAddPaymentMethod from '../../Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAddPaymentMethod/WyreServiceAddPaymentMethod';
import WyreServiceEditPaymentMethod from '../../Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceEditPaymentMethod/WyreServiceEditPaymentMethod';
import { useSelector } from 'react-redux';

const ServicesStack = createStackNavigator();

const ServicesStackScreens = props => {
  const darkMode = useSelector(state=>state.settings.darkModeState)
  return (
    <ServicesStack.Navigator
        screenOptions={defaultHeaderOptions({darkMode})}
    >
      <ServicesStack.Screen
        name="Services"
        component={Services}
        options={{
          title: "Services",
        }}
      />
      <ServicesStack.Screen
        name="Service"
        component={Service}
      />
      <ServicesStack.Screen
        name="WyreServiceAccountData"
        component={WyreServiceAccountData}
      />
      <ServicesStack.Screen
        name="WyreServiceAddPaymentMethod"
        component={WyreServiceAddPaymentMethod}
        options={{
          title: "Connect",
        }}
      />
      <ServicesStack.Screen
        name="WyreServiceEditPaymentMethod"
        component={WyreServiceEditPaymentMethod}
        options={{
          title: "Edit Account",
        }}
      />
    </ServicesStack.Navigator>
  );
};

export default ServicesStackScreens