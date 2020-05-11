import React from 'react';
import { Map as IMap } from 'immutable';
import { View } from 'react-native';
import { ListItem, CheckBox } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import Styles from '../../../../styles';
import Colors from '../../../../globals/colors';

const ClaimCategoryDetails = (props) => {
  const {
    claims,
    navigation,
    showHiddenClaims,
    attestationsCountByClaim,
    actions: { setActiveClaim, toggleShowHiddenClaims },
  } = props;

  const goToClaimDetails = (claim) => {
    setActiveClaim(claim);
    navigation.navigate('ClaimDetails', { id: claim.get('id', ''), claimName: claim.get('name', '') });
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
      <CheckBox
        checked={showHiddenClaims}
        title="Show hidden claims"
        onPress={() => toggleShowHiddenClaims()}
        containerStyle={Styles.defaultMargin}
      />
      <ScrollView>
        {claims.keySeq().map((claim) => (
          <ListItem
            key={claims.getIn([claim, 'id'], '')}
            title={claims.getIn([claim, 'name'], '')}
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
