import React from 'react';
import {Badge} from 'react-native-elements';
import {View, StyleSheet} from 'react-native';
import Styles from '../../../../../../styles/index';
import Colors from '../../../../../../globals/colors';

const styles = StyleSheet.create({
  rectangle: {
    height: 5,
    width: 45,
    backgroundColor: Colors.tertiaryColor,
    borderRadius: 4,
    marginLeft: 15,
    marginRight: 15,
    marginTop: 7
  },

});

export const topProgress = (number) => {

  const arrayOfBadges = [0,1,2,3,4]
    
  return ( 
    <View style={Styles.centralRow}>
      {arrayOfBadges.map((num) => { 
      const backgroundColor = num < number ? Colors.primaryColor : Colors.tertiaryColor;
      return (<View style={{...styles.rectangle, backgroundColor}} key={num}></View>)})
      }
    </View>
  )
}