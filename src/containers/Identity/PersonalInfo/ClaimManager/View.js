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
      <TouchableOpacity style={[styles.button, styles.moveInto]} onPress={moveIn}>
        <Text style={styles.moveIntoText}>Move into category</Text>
      </TouchableOpacity>
      <ScrollView>
        <View style={styles.claimsContainer}>
          {claims.map((item) => (
            <View
              style={styles.claims}
              key={item.id}
            >
              <CheckBox key={item.id} checked={item.checked} onPress={() => toggleCheckbox(item.id)} />
              <View>
                <Text style={styles.text}>{item.name}</Text>
              </View>
              <TouchableOpacity style={styles.button} onPress={moveIn}>
                <Text style={styles.text}>{item.category}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button}>
                <Text style={styles.text}>Show</Text>
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
