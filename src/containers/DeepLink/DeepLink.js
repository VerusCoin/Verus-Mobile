import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import AnimatedActivityIndicatorBox from '../../components/AnimatedActivityIndicatorBox';
import Styles from '../../styles/index';

const DeepLink = (props) => {  

  
  return (
    <View style={Styles.flexBackground}>
      <AnimatedActivityIndicatorBox />
    </View>
  );
};

export default DeepLink;
