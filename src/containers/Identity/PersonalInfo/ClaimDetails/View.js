import React, { useState, useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { SearchBar } from "react-native-elements";
import { ScrollView } from "react-native-gesture-handler";
import { ListItem } from "react-native-elements";

import styles from "./styles";

const ClaimDetails = (props) => {
  const {
    navigation,
    actions: { setActiveAttestationId, setActiveClaim },
    attestationsData,
    childClaims,
    parentClaims,
  } = props;

  const [attestations, setAttestation] = useState(attestationsData);
  const [value, setValue] = useState("");

  useEffect(() => {
    setAttestation(attestationsData);
  }, [attestationsData])

  const updateSearch = (value) => {
    const newData = attestationsData.filter((item) => {
      const itemData = item.get("id", "").toUpperCase();
      const textData = value.toUpperCase();
      return itemData.indexOf(textData) > -1;
    });
    setAttestation(newData);
    setValue(value);
  };
  const getClaimsDetails = (claim, type) => {
    if (type === 'child') {
      setActiveClaim(claim);
    }
  };

  const goToAttestationDetails = (activeAttestationId) => {
    setActiveAttestationId(activeAttestationId);
    navigation.navigate("AttestationDetails", {
      id: activeAttestationId,

    });
  };

  const claimList = (claims, item, type) => {
    return (
      <ListItem
        key={claims.getIn([item, 'id'])}
        contentContainerStyle={styles.claims}
        title={claims.getIn([item, 'name'])}
        titleStyle={styles.claimsTitle}
        onPress={() => getClaimsDetails(claims.get(item), type)}
      />
    )
  }

  return (
    <View style={styles.root}>
      <SearchBar
        containerStyle={styles.searchBarContainer}
        platform={Platform.OS === "ios" ? "ios" : "android"}
        placeholder="Quick Search"
        onChangeText={updateSearch}
        value={value}
      />
      <ScrollView>
        <View style={styles.attestationContainer}>
          <Text style={styles.attestationText}>ATTESTED TO BY</Text>
          {attestations.keySeq().map((attestation) => (
            <ListItem
              key={attestations.getIn([attestation, "id"], "")}
              title={attestations.getIn([attestation, "id"], "")}
              onPress={() =>
                goToAttestationDetails(attestations.getIn([attestation, "id"], "") )
              }
              bottomDivider
              chevron
            />
          ))}
        </View>
        <View style={styles.claimsContainer}>
          {childClaims.size > 0 ?
            <Text style={styles.claimsText}>Child Claims</Text> : null}
          {childClaims.keySeq().map((item) => (
            claimList(childClaims, item, 'child')
          ))
          }
          {parentClaims.size > 0 ?
            <Text style={styles.claimsText}>Parent Claims</Text> : null}
          {parentClaims.keySeq().map((item) => (
            claimList(parentClaims, item, 'parent')
          ))}
        </View>
      </ScrollView>
    </View >
  );
};

export default ClaimDetails;
