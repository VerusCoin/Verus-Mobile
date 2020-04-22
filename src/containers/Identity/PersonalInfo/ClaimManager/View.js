import React, { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';

import { CheckBox } from 'react-native-elements';
import data from './mockData';
import styles from './styles';

const ClaimManager = ({ navigation }) => {
  const [claims, setClaims] = useState(data);

  const toggleCheckbox = (id) => {
    // const checkedClaim = claims.find((claim) => claim.id === id);
    // checkedClaim.checked = !checkedClaim.checked;

    // setClaims([...claims, checkedClaim]);
  };


  const moveIn = () => {
    navigation.navigate('MoveIntoCategory');
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity style={[styles.button, { marginLeft:'44%', alignItems:'center' }]} onPress={moveIn}>
        <Text style={{ fontSize: 16 }}>Move into category</Text>
      </TouchableOpacity>
      <ScrollView>
        <View style={{paddingVertical:30}}>
          {claims.map((item) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent:'space-between' }} key={item.id}>
              <CheckBox key={item.id} checked={item.checked} onPress={() => toggleCheckbox(item.id)} />
              <View>
                <Text style={{ fontSize: 16, paddingHorizontal:4 }}>{item.name}</Text>
              </View>
              <TouchableOpacity style={styles.button} onPress={moveIn}>
                <Text style={{ fontSize: 16, paddingHorizontal:4 }}>{item.category}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button}>
                <Text style={{ fontSize: 16, paddingHorizontal:4 }}>Show</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity style={{ padding: 10 }}>
                <Text style={{ fontSize: 16, backgroundColor:'#b5b5b5', padding:10 }}>Hide</Text>
              </TouchableOpacity> */}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ClaimManager;
