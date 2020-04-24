import React from 'react';
import { Map as IMap } from 'immutable';
import { View, Text, Platform } from 'react-native';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CheckBox } from 'react-native-elements';
import styles from './styles';
import { truncateString } from './utils/truncateString';

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


  const getCategotyName = (name) => {
    if (name.length > 10) return `${truncateString(name, 10)}...`;
    return name;
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity style={[styles.button, styles.moveInto]} onPress={moveSelectedCategories}>
        <Text style={styles.moveIntoText}>Move into category</Text>
      </TouchableOpacity>
      <View style={styles.labelContainer}>
        <Text style={styles.claimText}>CLAIM</Text>
        <Text style={styles.label}>CATEGORY</Text>
        <Text style={styles.label}>SHOW/HIDE</Text>
      </View>
      <ScrollView>
        <View style={styles.claimsContainer}>
          {claims.keySeq().map((claim) => (
            <View style={styles.claims} key={claims.getIn([claim, 'id'])}>
              <CheckBox
                key={claims.getIn([claim, 'id'])}
                checked={checkIfClaimIsSelected(claims.get(claim))}
                onPress={() => selectClaim(claims.get(claim, IMap()))}
                title={claims.getIn([claim, 'name'])}
                containerStyle={{ backgroundColor:'white' }}
              />
              <TouchableOpacity onPress={() => moveSingleClaim(claims.get(claim))}>
                <View style={styles.icon}>
                  <Text style={styles.text}>{getCategotyName(claimCategories.getIn([claims.getIn([claim, 'categoryId'], ''), 'name'], ''))}</Text>
                  <MaterialIcons name="arrow-drop-down" size={24} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleClaimVisibility(claims.get(claim))}>
                {claims.getIn([claim, 'hidden']) ? <Icon name={Platform.OS === 'ios' ? 'ios-eye-off' : 'md-eye-off'} size={24} />
                  : <Icon name={Platform.OS === 'ios' ? 'ios-eye' : 'md-eye'} size={24} />
                }
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ClaimManager;
