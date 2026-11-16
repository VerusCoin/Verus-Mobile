import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import Services from '../../Services/Services'
import Service from '../../Services/Service/Service'
import WyreServiceAccountData from '../../Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAccountData/WyreServiceAccountData';
import WyreServiceAddPaymentMethod from '../../Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceAddPaymentMethod/WyreServiceAddPaymentMethod';
import WyreServiceEditPaymentMethod from '../../Services/ServiceComponents/WyreService/WyreServiceAccount/WyreServiceEditPaymentMethod/WyreServiceEditPaymentMethod';
import GiftCardCreate from '../../Services/ServiceComponents/GiftCardService/GiftCardCreate/GiftCardCreate';
import GiftCardFund from '../../Services/ServiceComponents/GiftCardService/GiftCardFund/GiftCardFund';
import GiftCardQrScreen from '../../Services/ServiceComponents/GiftCardService/GiftCardQrScreen';
import {createRedesignedHeaderOptions} from '../../../utils/navigation/header';
import {useAppTheme} from '../../../theme/app';
import AddressBook from '../../Services/AddressBook/AddressBook';
import SignedInVerusIdDetails from '../../Services/ServiceComponents/VerusIdService/SignedInVerusIdDetails';
import {
  GIFT_CARD_SERVICE_ID,
  VERUSID_SERVICE_ID,
} from '../../../utils/constants/services';

const ServicesStack = createStackNavigator();

const ServicesStackScreens = () => {
  const theme = useAppTheme();

  return (
    <ServicesStack.Navigator
      screenOptions={createRedesignedHeaderOptions(theme)}
    >
      <ServicesStack.Screen
        name="Services"
        component={Services}
        options={{
          title: "Services",
          headerShown: false,
        }}
      />
      <ServicesStack.Screen
        name="AddressBook"
        component={AddressBook}
        options={{
          headerShown: false,
        }}
      />
      <ServicesStack.Screen
        name="Service"
        component={Service}
        options={({route}) => ({
          title: '',
          headerShown:
            route.params?.service === GIFT_CARD_SERVICE_ID
              ? false
              : route.params?.service !== VERUSID_SERVICE_ID,
        })}
      />
      <ServicesStack.Screen
        name="VerusIdDetails"
        component={SignedInVerusIdDetails}
        options={{title: ''}}
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
      <ServicesStack.Screen
        name="GiftCardCreate"
        component={GiftCardCreate}
        options={{
          headerShown: false,
        }}
      />
      <ServicesStack.Screen
        name="GiftCardFund"
        component={GiftCardFund}
        options={{
          headerShown: false,
        }}
      />
      <ServicesStack.Screen
        name="GiftCardQr"
        component={GiftCardQrScreen}
        options={{
          headerShown: false,
        }}
      />
    </ServicesStack.Navigator>
  );
};

export default ServicesStackScreens
