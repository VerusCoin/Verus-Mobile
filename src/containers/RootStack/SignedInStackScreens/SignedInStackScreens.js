import React, { useEffect, useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import SideMenu from '../../SideMenu/SideMenu';
import MainStackScreens from '../MainStackScreens/MainStackScreens';
import { useSelector } from 'react-redux';

const MainDrawer = createDrawerNavigator()

const SignedInStackScreens = props => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const [prevDeeplinkId, setPrevDeeplinkId] = useState(deeplinkId)

  useEffect(() => {
    if (deeplinkId != null && deeplinkId !== prevDeeplinkId) {
      setPrevDeeplinkId(deeplinkId)
      
      props.navigation.navigate('DeepLink');
    }
  }, [deeplinkId]);

  return (
    <MainDrawer.Navigator
      drawerWidth={250}
      drawerPosition="right"
      drawerContent={props => <SideMenu {...props} />}
      screenOptions={{
        swipeEnabled: false,
      }}>
      <MainDrawer.Screen name="MainStack" component={MainStackScreens} />
    </MainDrawer.Navigator>
  );
};

export default SignedInStackScreens;
