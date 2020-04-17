import React, { useState, useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { SearchBar } from "react-native-elements";
import { Map as IMap } from "immutable";
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
  const getClaimsDetails = (claim) => {
    setActiveClaim(claim);
  };

  const goToAttestationDetails = (activeAttestationId) => {
    setActiveAttestationId(activeAttestationId);
    navigation.navigate("AttestationDetails", {
      id: activeAttestationId,
    });
  };

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
        <View style={{ paddingHorizontal: 16, backgroundColor: "white" }}>
          <Text style={{ color: "#b5b5b5", fontSize: 12 }}>ATTESTED TO BY</Text>
          {attestations.keySeq().map((attestation) => (
            <ListItem
              key={attestations.getIn([attestation, "id"], "")}
              title={attestations.getIn([attestation, "id"], "")}
              onPress={() =>
                goToAttestationDetails(attestations.getIn([attestation, "id"], ""))
              }
              bottomDivider
              chevron
            />
          ))}
        </View>
        <View style={{ paddingVertical: 50 }}>
          {childClaims.size > 0 ?
            <Text style={{ paddingHorizontal: 16 }}>Child Claims</Text> : null}
          {childClaims.keySeq().map((item) => (
            <ListItem
              key={childClaims.getIn([item, 'id'])}
              contentContainerStyle={styles.claims}
              title={childClaims.getIn([item, 'name'])}
              titleStyle={{ fontSize: 15 }}
              onPress={() => getClaimsDetails(childClaims.get(item))}
            />
          ))
          }
          {parentClaims.size > 0 ?
            <Text style={{ paddingHorizontal: 16 }}>Parent Claims</Text> : null}
          {parentClaims.keySeq().map((item) => (
            <ListItem
              key={parentClaims.getIn([item, 'id'])}
              contentContainerStyle={styles.claims}
              title={parentClaims.getIn([item, 'name'])}
              titleStyle={{ fontSize: 15 }}
            />
          ))}
        </View>
      </ScrollView>
    </View >
  );
};

export default ClaimDetails;
