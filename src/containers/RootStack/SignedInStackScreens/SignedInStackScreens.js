import React, { useEffect, useState } from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import SideMenu from '../../SideMenu/SideMenu';
import MainStackScreens from '../MainStackScreens/MainStackScreens';
import { useDispatch, useSelector } from 'react-redux';
import { setDeeplinkUrl } from '../../../actions/actionCreators';

const MainDrawer = createDrawerNavigator()

const SignedInStackScreens = props => {
  const deeplinkId = useSelector((state) => state.deeplink.id)
  const deeplinkUrl = useSelector((state) => state.deeplink.url)
  const dispatch = useDispatch()

  useEffect(() => {
    if (deeplinkId != null && deeplinkUrl != null) {    
      dispatch(setDeeplinkUrl(null))  
      props.navigation.navigate('DeepLink');
    }
  }, [deeplinkId, deeplinkUrl]);

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
