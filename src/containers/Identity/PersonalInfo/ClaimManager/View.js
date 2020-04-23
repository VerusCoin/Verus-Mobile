import React from 'react';
import { View, Text, Platform } from 'react-native';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';

import { CheckBox } from 'react-native-elements';
import styles from './styles';

const ClaimManager = (props) => {
  const { claims, claimCategories, actions: { setClaimVisibility } } = props;

  const toggleClaimVisibility = (selectedClaim) => {
    if (selectedClaim.get('hidden')) {
      setClaimVisibility(selectedClaim.get('id', ''), false);
    } else {
      setClaimVisibility(selectedClaim.get('id', ''), true);
    }
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
          {claims.keySeq().map((claim) => (
            <View style={styles.claims} key={claims.getIn([claim, 'id'])}>
              <CheckBox key={claims.getIn([claim, 'id'])} checked={false} />
              <View>
                <Text style={{ fontSize: 16, paddingHorizontal:4 }}>{claims.getIn([claim, 'name'])}</Text>
              </View>
              <TouchableOpacity style={styles.button} onPress={moveIn}>
                <Text style={styles.text}>{claimCategories.getIn([claims.getIn([claim, 'categoryId'], ''), 'name'], '')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.button} onPress={() => toggleClaimVisibility(claims.get(claim))}>
                <Text style={styles.text}>{claims.getIn([claim, 'hidden']) ? 'Show' : 'Hide'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ClaimManager;
