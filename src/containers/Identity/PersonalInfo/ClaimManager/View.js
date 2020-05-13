import React, { useCallback, useEffect, useState } from 'react';
import { Map as IMap } from 'immutable';
import { View, Text } from 'react-native';
import { ScrollView, TouchableOpacity, TouchableWithoutFeedback } from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CheckBox } from 'react-native-elements';
import { truncateString } from './utils/truncateString';
import getShowHideIcon from './utils/getShowHideIcon';
import Styles from '../../../../styles';

const getCategotyName = (name) => {
  if (name.length > 30) return `${truncateString(name, 30)}...`;
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
      hideSelectedClaims,
    },
  } = props;

  const [disabled, setDisable] = useState(true);
  useEffect(() => {
    if (selectedClaims.size > 0) setDisable(false);
    else setDisable(true);
  }, [selectedClaims]);

  const toggleClaimVisibility = (selectedClaim) => {
    setClaimVisibility(selectedClaim.get('id', ''));
  };

  const moveSingleClaim = (selectedClaim) => {
    clearSelectedClaims();
    updateSelectedClaims(selectedClaim);
    navigation.navigate('MoveIntoCategory');
  };

  const moveSelectedCategories = () => {
    if (!disabled) navigation.navigate('MoveIntoCategory');
  };

  const selectClaim = (selectedClaim) => {
    updateSelectedClaims(selectedClaim);
  };

  const hideClaims = () => {
    hideSelectedClaims();
  };

  const checkIfClaimIsSelected = useCallback((claim) => selectedClaims.includes(claim), [selectedClaims]);

  return (
    <View style={Styles.root}>
      <TouchableOpacity style={Styles.linkButton} onPress={moveSelectedCategories} activeOpacity={disabled ? 1 : 0.1}>
        <Text style={Styles.textButton}>MOVE INTO CATEGORY</Text>
      </TouchableOpacity>
      <TouchableOpacity style={Styles.linkButton} onPress={hideClaims} activeOpacity={disabled ? 1 : 0.1}>
        <Text style={Styles.textButton}>HIDE SELECTED</Text>
      </TouchableOpacity>
      <ScrollView>
        <View style={Styles.containerVerticalPadding}>
          {claims.keySeq().map((claim) => (
            <View style={Styles.blockWithBorder} key={claims.getIn([claim, 'id'])}>
              <View style={Styles.flexRow}>
                <CheckBox
                  key={claims.getIn([claim, 'id'])}
                  checked={checkIfClaimIsSelected(claims.get(claim))}
                  onPress={() => selectClaim(claims.get(claim, IMap()))}
                  containerStyle={Styles.backgroundColorWhite}
                />
                <View style={Styles.flexColumn}>
                  <Text style={[Styles.boldText, Styles.paddingBottom]}>{claims.getIn([claim, 'name'])}</Text>

                  <View style={Styles.alignItemsCenter}>
                    <Text style={Styles.defaultFontSize}>
                      {getCategotyName(claimCategories.getIn([claims.getIn([claim, 'categoryId'], ''), 'name'], ''))}
                    </Text>
                  </View>

                </View>
              </View>
              <View style={[Styles.paddingRight, Styles.flexRow]}>
                <View>
                  <TouchableOpacity onPress={() => moveSingleClaim(claims.get(claim))} style={Styles.paddingHorizontal}>
                    <MaterialIcons name="content-save-move" size={28} st />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => toggleClaimVisibility(claims.get(claim))}>
                  {getShowHideIcon(claims.getIn([claim, 'hidden']), 28)}
                </TouchableOpacity>

              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ClaimManager;
