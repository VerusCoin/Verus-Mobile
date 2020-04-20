import React from "react";
import { Map as IMap } from "immutable";
import { View } from "react-native";
import { ListItem } from "react-native-elements";
import { ScrollView } from "react-native-gesture-handler";

import styles from "./styles";

const ClaimCategoryDetails = (props) => {
  const {
    claims,
    navigation,
    actions: { setActiveClaim },
  } = props;

  const goToClaimDetails = (claim, claimName) => {
    setActiveClaim(claim);
    navigation.navigate("ClaimDetails", { id: claim.get('id', ''), claimName });
  };

  return (
    <View style={styles.root}>
      <ScrollView>
        {claims.keySeq().map((claim) => (
          <ListItem
            key={claims.getIn([claim, "id"], "")}
            title={claims.getIn([claim, "name"], "")}
            onPress={() => goToClaimDetails(claims.get(claim, IMap()), claims.getIn([claim, "name"], ""))}
            bottomDivider
            chevron
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default ClaimCategoryDetails;
