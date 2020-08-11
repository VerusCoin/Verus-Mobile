import React, { useState, useEffect } from 'react';
import { Map as IMap } from 'immutable';
import { View, Platform, Text } from 'react-native';
import { ListItem, CheckBox, SearchBar } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import AlphabeticalSort from '../AlphaSort/AlphabeticalSort';
import Styles from '../../../../styles';
import Colors from '../../../../globals/colors';

const ClaimCategoryDetails = (props) => {
  const {
    claimsData,
    navigation,
    showHiddenClaims,
    attestationsCountByClaim,
    hiddenClaimsCount,
    sortClaimsBy,
    actions: {
      setActiveClaim,
      toggleShowHiddenClaims,
      setClaimsSortDirection,
    },
  } = props;
  const [claims, setClaims] = useState(claimsData);
  const [value, setValue] = useState('');

  useEffect(() => {
    setClaims(claimsData);
  }, [claimsData]);

  const goToClaimDetails = (claim) => {
    setActiveClaim(claim)
    navigation.navigate('ClaimDetails', {
      claimUid: claim.get('uid', '')
    });
  };

  const updateSearch = (value) => {
    const newData = claimsData.filter((item) => {
      const itemData = item.get('displayName', '').toUpperCase();
      const textData = value.toUpperCase();
      return itemData.includes(textData);
    });
    setClaims(newData);
    setValue(value);
  };

  const handleBadge = (claimId) => (
    {
      value: attestationsCountByClaim.filter((item) => claimId === item.claimId).first().count,
      textStyle: { color: Colors.secondaryColor },
      badgeStyle: { backgroundColor:Colors.quinaryColor },
      containerStyle: Styles.alignItemsCenter,
    }
  );
  return (
    <View style={Styles.root}>
      <View style={Styles.alignItemsCenter}>
        <CheckBox
          checked={showHiddenClaims}
          onPress={() => toggleShowHiddenClaims()}
          containerStyle={[Styles.defaultMargin, Styles.defaultLeftPadding]}
        />

        <Text style={Styles.paddingRight}>Show hidden claims</Text>
        <View style={Styles.circleBadge}>
          <Text style={Styles.smallTextWithWhiteColor}>
            {hiddenClaimsCount}
          </Text>
        </View>
      </View>
      <View style={Styles.fullWidthSpaceBetween}>
        <SearchBar
          containerStyle={[Styles.backgroundColorWhite, Styles.passwordInputContainer]}
          platform={Platform.OS === 'ios' ? 'ios' : 'android'}
          placeholder="Quick Search"
          onChangeText={updateSearch}
          value={value}
          inputContainerStyle={Styles.defaultMargin}
          cancelButtonTitle=""
        />
        <AlphabeticalSort
          sortBy={sortClaimsBy}
          setSortDirection={setClaimsSortDirection}
        />
      </View>
      <ScrollView>
        {claims.keySeq().map((claim) => (
          <ListItem
            key={claims.getIn([claim, 'uid'], '')}
            title={claims.getIn([claim, 'displayName'], '')}
            onPress={() => goToClaimDetails(claims.get(claim, IMap()))}
            badge={handleBadge(claims.getIn([claim, 'id']))}
            bottomDivider
            chevron
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default ClaimCategoryDetails;
