import React from 'react';
import { Map as IMap } from 'immutable';
import { View, Text } from 'react-native';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';

import { CheckBox } from 'react-native-elements';
import styles from './styles';

const ClaimManager = (props) => {
  const {
    claims,
    selectedClaims,
    navigation,
    claimCategories,
    actions: {
      setClaimVisibility,
      updateSelectedClaims,
      clearSelectedClaims,
    },
  } = props;

  const toggleClaimVisibility = (selectedClaim) => {
    if (selectedClaim.get('hidden')) {
      setClaimVisibility(selectedClaim.get('id', ''), false);
    } else {
      setClaimVisibility(selectedClaim.get('id', ''), true);
    }
  };

  const moveSingleClaim = (selectedClaim) => {
    clearSelectedClaims();
    updateSelectedClaims(selectedClaim);
    navigation.navigate('MoveIntoCategory');
  };

  const moveSelectedCategories = () => {
    navigation.navigate('MoveIntoCategory');
  };

  const selectClaim = (selectedClaim) => {
    updateSelectedClaims(selectedClaim);
  };

  const checkIfClaimIsSelected = (claim) => selectedClaims.indexOf(claim) > -1;

  return (
    <View style={styles.root}>
      <TouchableOpacity style={[styles.button, styles.moveInto]} onPress={moveSelectedCategories}>
        <Text style={styles.moveIntoText}>Move into category</Text>
      </TouchableOpacity>
      <ScrollView>
        <View style={styles.claimsContainer}>
          {claims.keySeq().map((claim) => (
            <View style={styles.claims} key={claims.getIn([claim, 'id'])}>
              <CheckBox
                key={claims.getIn([claim, 'id'])}
                checked={checkIfClaimIsSelected(claims.get(claim))}
                onPress={() => selectClaim(claims.get(claim, IMap()))}
              />
              <View>
                <Text style={styles.text}>{claims.getIn([claim, 'name'])}</Text>
              </View>
              <TouchableOpacity style={styles.button} onPress={() => moveSingleClaim(claims.get(claim))}>
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
