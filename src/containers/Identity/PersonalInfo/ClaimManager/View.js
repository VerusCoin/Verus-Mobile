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

const getCategotyName = (name) => {
  if (name.length > 30) return `${truncateString(name, 30)}...`;
  return name;
};


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
      <ScrollView>
        {claims.keySeq().map((claim) => (
          <View style={Styles.blockWithBorder} key={claims.getIn([claim, 'id'])}>
            <View style={Styles.flexRow}>
              <CheckBox
                key={claims.getIn([claim, 'id'])}
                checked={checkIfClaimIsSelected(claims.get(claim))}
                onPress={() => selectClaim(claims.get(claim, IMap()))}
                containerStyle={Styles.defaultMargin}
              />
              <View style={Styles.flexColumn}>
                <Text style={[Styles.boldText]}>{claims.getIn([claim, 'name'])}</Text>

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
      </ScrollView>
    </View>

  );
};

export default ClaimManager;
