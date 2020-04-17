import React, { useState, useEffect } from "react";
import { View, Text, Platform } from "react-native";
import { SearchBar } from "react-native-elements";
import { Map as IMap } from "immutable";
import { ScrollView } from "react-native-gesture-handler";
import { ListItem } from "react-native-elements";

import styles from "./styles";

const claimsData = [
  {
    id: "firstName",
    name: "COVID-19",
    claimCategoryId: "healthCare",
    parentClaims: [1, 2],
    childClaims: [],
  },
  {
    id: "lastName",
    name: "Blood Type",
    claimCategoryId: "healthCare",
    parentClaims: [],
    childClaims: [3, 4, 5],
  },
];

const ClaimDetails = (props) => {
  const {
    navigation,
    actions: { setActiveAttestationId },
    attestationsData,
  } = props;

  const [attestations, setAttestation] = useState(attestationsData);
  const [claims, setClaims] = useState([]);
  const [isParent, setIsParent] = useState(false);
  const [value, setValue] = useState("");

  const updateSearch = (value) => {
    const newData = attestationsData.filter((item) => {
      const itemData = item.get("id", "").toUpperCase();
      const textData = value.toUpperCase();
      return itemData.indexOf(textData) > -1;
    });
    setAttestation(newData);
    setValue(value);
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
          {isParent ? (
            <Text style={{ paddingHorizontal: 16 }}>Child Claims</Text>
          ) : (
            <Text style={{ paddingHorizontal: 16 }}>Parent Claims</Text>
          )}
          {claimsData.map((item) => (
            <ListItem
              key={item.id}
              contentContainerStyle={styles.claims}
              title={item.name}
              titleStyle={{ fontSize: 15 }}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ClaimDetails;
