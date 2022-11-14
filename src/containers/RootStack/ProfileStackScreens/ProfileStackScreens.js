import React from 'react';
import { createStackNavigator } from "@react-navigation/stack";
import { defaultHeaderOptions } from '../../../utils/navigation/header';
import Personal from '../../Personal/Personal';
import PersonalAttributes from '../../Personal/PersonalAttributes/PersonalAttributes';
import PersonalAttributesEditName from '../../Personal/PersonalAttributes/PersonalAttributesEditName/PersonalAttributesEditName';
import PersonalContact from '../../Personal/PersonalContact/PersonalContact';
import PersonalImages from '../../Personal/PersonalImages/PersonalImages';
import PersonalImagesEditImage from '../../Personal/PersonalImages/PersonalLocationsEditImage/PersonalImagesEditImage';
import PersonalLocations from '../../Personal/PersonalLocations/PersonalLocations';
import PersonalLocationsEditAddress from '../../Personal/PersonalLocations/PersonalLocationsEditAddress/PersonalLocationsEditAddress';
import PersonalLocationsEditTaxCountry from '../../Personal/PersonalLocations/PersonalLocationsEditTaxCountry/PersonalLocationsEditTaxCountry';
import PersonalPaymentMethods from '../../Personal/PersonalPaymentMethods/PersonalPaymentMethods';
import PersonalPaymentMethodsEditBankAccount from '../../Personal/PersonalPaymentMethods/PersonalPaymentMethodsEditBankAccount/PersonalPaymentMethodsEditBankAccount';
import PersonalPaymentMethodsEditBankAccountAddress from '../../Personal/PersonalPaymentMethods/PersonalPaymentMethodsEditBankAccountAddress/PersonalPaymentMethodsEditBankAccountAddress';

const ProfileStack = createStackNavigator();

const ProfileStackScreens = props => {
  return (
    <ProfileStack.Navigator
      screenOptions={defaultHeaderOptions}
    >
      <ProfileStack.Screen
        name="PersonalProfile"
        component={Personal}
        options={{
          title: "Personal Profile",
        }}
      />
      <ProfileStack.Screen
        name="PersonalAttributes"
        component={PersonalAttributes}
        options={{
          title: "Details",
        }}
      />
      <ProfileStack.Screen
        name="PersonalAttributesEditName"
        component={PersonalAttributesEditName}
        options={{
          title: "Name"
        }}
      />
      <ProfileStack.Screen
        name="PersonalContact"
        component={PersonalContact}
        options={{
          title: "Contact",
        }}
      />
      <ProfileStack.Screen
        name="PersonalImages"
        component={PersonalImages}
        options={{
          title: "Images",
        }}
      />
      <ProfileStack.Screen
        name="PersonalImagesEditImage"
        component={PersonalImagesEditImage}
        options={{
          title: "Image"
        }}
      />
      <ProfileStack.Screen
        name="PersonalLocations"
        component={PersonalLocations}
        options={{
          title: "Personal Locations"
        }}
      />
      <ProfileStack.Screen
        name="PersonalLocationsEditAddress"
        component={PersonalLocationsEditAddress}
        options={{
          title: "Address"
        }}
      />
      <ProfileStack.Screen
        name="PersonalLocationsEditTaxCountry"
        component={PersonalLocationsEditTaxCountry}
        options={{
          title: "Tax Country"
        }}
      />
      <ProfileStack.Screen
        name="PersonalPaymentMethods"
        component={PersonalPaymentMethods}
        options={{
          title: "Banking Info"
        }}
      />
      <ProfileStack.Screen
        name="PersonalPaymentMethodsEditBankAccount"
        component={PersonalPaymentMethodsEditBankAccount}
        options={{
          title: "Bank Account"
        }}
      />
      <ProfileStack.Screen
        name="PersonalPaymentMethodsEditBankAccountAddress"
        component={PersonalPaymentMethodsEditBankAccountAddress}
        options={{
          title: "Account Address"
        }}
      />
    </ProfileStack.Navigator>
  );
};

export default ProfileStackScreens