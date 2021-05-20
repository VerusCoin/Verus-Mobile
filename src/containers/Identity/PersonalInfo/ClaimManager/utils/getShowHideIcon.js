import React from 'react';
//import Icon from 'react-native-vector-icons/Ionicons';
import { Platform } from 'react-native';

const getShowHideIcon = (show, size) => {
  if (!show) return (<Icon name={Platform.OS === 'ios' ? 'ios-eye' : 'md-eye'} size={size} />);

  //return (<Icon name={Platform.OS === 'ios' ? 'ios-eye-off' : 'md-eye-off'} size={size} />);
  return null
};

export default getShowHideIcon;
