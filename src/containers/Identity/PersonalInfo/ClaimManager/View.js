import React, { useCallback } from 'react';
import { Map as IMap } from 'immutable';
import { View, Text } from 'react-native';
import { ScrollView, TouchableOpacity } from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { CheckBox } from 'react-native-elements';
import { truncateString } from './utils/truncateString';
import getShowHideIcon from './utils/getShowHideIcon';
import Styles from '../../../../styles';

const getCategotyName = (name) => {
  if (name.length > 10) return `${truncateString(name, 10)}...`;
  return name;
};

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
    setClaimVisibility(selectedClaim.get('id', ''));
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

  const checkIfClaimIsSelected = useCallback((claim) => selectedClaims.includes(claim), [selectedClaims]);

  return (
    <View style={Styles.root}>
      <TouchableOpacity style={Styles.linkleftButton} onPress={moveSelectedCategories}>
        <Text style={Styles.whiteTextWithCustomFontSize}>Move into category</Text>
      </TouchableOpacity>
      <View style={Styles.blockWithBorderBottom}>
        <Text style={Styles.textWithLeftMargin}>CLAIM</Text>
        <Text style={Styles.labelUltraLightGrey}>CATEGORY</Text>
        <Text style={Styles.labelUltraLightGrey}>SHOW/HIDE</Text>
      </View>
      <ScrollView>
        <View style={Styles.containerVerticalPadding}>
          {claims.keySeq().map((claim) => (
            <View style={Styles.blockWithBorderBottom} key={claims.getIn([claim, 'id'])}>
              <CheckBox
                key={claims.getIn([claim, 'id'])}
                checked={checkIfClaimIsSelected(claims.get(claim))}
                onPress={() => selectClaim(claims.get(claim, IMap()))}
                title={claims.getIn([claim, 'name'])}
                containerStyle={Styles.backgroundColorWhite}
              />
              <TouchableOpacity onPress={() => moveSingleClaim(claims.get(claim))}>
                <View style={Styles.alignItemsCenter}>
                  <Text style={Styles.defaultFontSize}>{getCategotyName(claimCategories.getIn([claims.getIn([claim, 'categoryId'], ''), 'name'], ''))}</Text>
                  <MaterialIcons name="arrow-drop-down" size={24} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => toggleClaimVisibility(claims.get(claim))}>
                {getShowHideIcon(claims.getIn([claim, 'hidden']), 24)}
              </TouchableOpacity>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ClaimManager;
