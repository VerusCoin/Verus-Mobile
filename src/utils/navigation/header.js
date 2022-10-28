import { DrawerActions } from '@react-navigation/compat';
import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-elements';
import Colors from '../../globals/colors';
import styles from '../../styles';

export const defaultHeaderOptions = ({navigation, params, route}) => ({
  headerShown: true,
  headerStyle: {
    backgroundColor: Colors.primaryColor,
  },
  headerTitleStyle: {
    fontFamily: 'Avenir-Black',
    fontWeight: 'normal',
    fontSize: 22,
    color: Colors.secondaryColor,
  },
  headerRight: () => (
    <TouchableOpacity
      onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}
      style={styles.menuButton}>
      <Icon name="menu" size={35} color={Colors.secondaryColor} />
    </TouchableOpacity>
  ),
  headerTintColor: Colors.secondaryColor,
});
