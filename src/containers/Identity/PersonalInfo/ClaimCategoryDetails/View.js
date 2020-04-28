import React from 'react';
import { Map as IMap } from 'immutable';
import { View } from 'react-native';
import { ListItem, CheckBox } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import Styles from '../../../../styles';

const ClaimCategoryDetails = (props) => {
  const {
    claims,
    navigation,
    showHiddenClaims,
    actions: { setActiveClaim, toggleShowHiddenClaims },
  } = props;

  const goToClaimDetails = (claim) => {
    setActiveClaim(claim);
    navigation.navigate('ClaimDetails', { id: claim.get('id', ''), claimName: claim.get('name', '') });
  };


  return (
    <View style={Styles.root}>
      <CheckBox
        checked={showHiddenClaims}
        title="Show hidden claims"
        onPress={() => toggleShowHiddenClaims()}
      />
      <ScrollView>
        {claims.keySeq().map((claim) => (
          <ListItem
            key={claims.getIn([claim, 'id'], '')}
            title={claims.getIn([claim, 'name'], '')}
            onPress={() => goToClaimDetails(claims.get(claim, IMap()))}
            bottomDivider
            chevron
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default ClaimCategoryDetails;
