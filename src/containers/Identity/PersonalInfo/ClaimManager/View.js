import React, {
  useCallback, useEffect, useState,
} from 'react';
import { Map as IMap } from 'immutable';
import { View, Text, Platform } from 'react-native';
import { ScrollView, TouchableWithoutFeedback, TouchableOpacity } from 'react-native-gesture-handler';
import MaterialIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { CheckBox, SearchBar } from 'react-native-elements';
import { truncateString } from './utils/truncateString';
import getShowHideIcon from './utils/getShowHideIcon';
import Styles from '../../../../styles';

const ClaimManager = (props) => {
  const {
    claimsData,
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
  const [value, setValue] = useState('');
  const [claims, setClaims] = useState(claimsData);
  useEffect(() => {
    if (selectedClaims.size > 0) setDisable(false);
    else setDisable(true);
  }, [selectedClaims]);

  useEffect(() => {
    setClaims(claimsData);
  }, [claimsData]);

  const updateSearch = (value) => {
    const newData = claimsData.filter((item) => {
      const itemData = item.get('name', '').toUpperCase();
      const textData = value.toUpperCase();
      return itemData.includes(textData);
    });
    setClaims(newData);
    setValue(value);
  };

  const toggleClaimVisibility = (selectedClaim) => {
    setClaimVisibility(selectedClaim.get('uid', ''));
  };

  const moveSingleClaim = (selectedClaim) => {
    clearSelectedClaims();
    updateSelectedClaims(selectedClaim);
    navigation.navigate('MoveIntoCategory', { clearClaims: clearSelectedClaims });
  };

  const moveSelectedCategories = () => {
    if (!disabled) navigation.navigate('MoveIntoCategory', { clearClaims: clearSelectedClaims });
  };

  const selectClaim = (selectedClaim) => {
    updateSelectedClaims(selectedClaim);
  };

  const hideClaims = () => {
    hideSelectedClaims();
  };

  const checkIfClaimIsSelected = useCallback((claim) => selectedClaims.includes(claim), [selectedClaims]);

  const getCategoryName = useCallback((categories, claim) => {
    const categoryForClaim = categories.filter((category) => category.get('id', '') === claim.get('categoryId', ''));
    const name = categoryForClaim.keySeq().map((claimCategory) => categoryForClaim.getIn([claimCategory, 'name'], '')).first();
    if (name.length > 30) return `${truncateString(name, 30)}...`;
    return name;
  }, [claimCategories, claims]);

  return (
    <View style={Styles.root}>
      <View style={[disabled ? Styles.opacityBlur : Styles.opacity]}>
        <TouchableWithoutFeedback style={Styles.linkButton} onPress={moveSelectedCategories}>
          <Text style={Styles.textButton}>MOVE INTO CATEGORY</Text>
        </TouchableWithoutFeedback>
      </View>
      <View style={[disabled ? Styles.opacityBlur : Styles.opacity]}>
        <TouchableWithoutFeedback style={Styles.linkButton} onPress={hideClaims}>
          <Text style={Styles.textButton}>HIDE SELECTED</Text>
        </TouchableWithoutFeedback>
      </View>
      <SearchBar
        containerStyle={Styles.backgroundColorWhite}
        platform={Platform.OS === 'ios' ? 'ios' : 'android'}
        placeholder="Quick Search"
        onChangeText={updateSearch}
        value={value}
        inputContainerStyle={Styles.defaultMargin}
        cancelButtonTitle=""
      />
      <ScrollView style={Styles.fullHeight}>
        {claims.keySeq().map((claim) => (
          <View style={Styles.blockWithBorder} key={claims.getIn([claim, 'uid'])}>
            <View style={Styles.flexRow}>
              <CheckBox
                key={claims.getIn([claim, 'uid'])}
                checked={checkIfClaimIsSelected(claims.get(claim))}
                onPress={() => selectClaim(claims.get(claim, IMap()))}
                containerStyle={Styles.defaultMargin}
              />
              <View style={Styles.flexColumn}>
                <Text style={[Styles.boldText, Styles.paddingBottom]}>{claims.getIn([claim, 'id'])}</Text>

                <View style={Styles.alignItemsCenter}>
                  <Text style={Styles.defaultFontSize}>
                    {getCategoryName(claimCategories, claims.get(claim))}
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
      </ScrollView>
    </View>

  );
};

export default ClaimManager;
