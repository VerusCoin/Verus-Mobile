import React from 'react';
import {createStackNavigator} from '@react-navigation/stack';
import VerusIdService from '../../Services/ServiceComponents/VerusIdService/VerusIdService';
import SignedInVerusIdDetails from '../../Services/ServiceComponents/VerusIdService/SignedInVerusIdDetails';
import {createRedesignedHeaderOptions} from '../../../utils/navigation/header';
import {useOnboardingTheme} from '../../../theme/onboarding';

import IdentityRegistrationNavigator from '../../Services/ServiceComponents/VerusIdService/IdentityRegistration/IdentityRegistrationNavigator';
import IdentityManagementNavigator from '../../Services/ServiceComponents/VerusIdService/IdentityManagement/IdentityManagementNavigator';
import LinkIdentities from '../../Services/ServiceComponents/VerusIdService/IdentityLinking/LinkIdentities';

const IdentityStack = createStackNavigator();

const IdentityStackScreens = () => {
  const theme = useOnboardingTheme();

  return (
    <IdentityStack.Navigator
      screenOptions={createRedesignedHeaderOptions(theme)}>
      <IdentityStack.Screen
        name="Identity"
        component={VerusIdService}
        options={{headerShown: false}}
      />
      <IdentityStack.Screen
        name="VerusIdDetails"
        component={SignedInVerusIdDetails}
        options={{title: ''}}
      />
      <IdentityStack.Screen name="IdentityRegistration" component={IdentityRegistrationNavigator} options={{headerShown: false}} />
      <IdentityStack.Screen name="IdentityManagement" component={IdentityManagementNavigator} options={{headerShown: false}} />
      <IdentityStack.Screen name="LinkIdentities" component={LinkIdentities} options={{title: 'Link VerusID'}} />
    </IdentityStack.Navigator>
  );
};

export default IdentityStackScreens;
