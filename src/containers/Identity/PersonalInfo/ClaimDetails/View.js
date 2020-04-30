import React, { useState, useEffect } from 'react';
import { View, Text, Platform } from 'react-native';
import { SearchBar, ListItem } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import Styles from '../../../../styles';
import AttestationDetails from '../../Home/AttestationDetails';

const ClaimDetails = (props) => {
  const {
    navigation,
    actions: { setActiveAttestationId, setActiveClaim, setAttestationModalVisibility },
    attestationsData,
    childClaims,
    parentClaims,
    attestationModalVisibility,
  } = props;

  const [attestations, setAttestation] = useState(attestationsData);
  const [value, setValue] = useState('');
  const [attestedClaimName, setAttestedClaimName] = useState('');

  useEffect(() => {
    setAttestation(attestationsData);
  }, [attestationsData]);

  const updateSearch = (value) => {
    const newData = attestationsData.filter((item) => {
      const itemData = item.get('id', '').toUpperCase();
      const textData = value.toUpperCase();
      return itemData.includes(textData);
    });
    setAttestation(newData);
    setValue(value);
  };
  const getClaimsDetails = (claim, type) => {
    if (type === 'child') {
      setActiveClaim(claim);
    }
  };

  const goToAttestationDetails = (activeAttestationId, attestedClaimName) => {
    setActiveAttestationId(activeAttestationId);
    setAttestedClaimName(attestedClaimName);
    setAttestationModalVisibility(true);
  };

  const claimList = (claims, item, type) => (
    <ListItem
      key={claims.getIn([item, 'id'])}
      contentContainerStyle={Styles.greyButtonWithShadow}
      title={claims.getIn([item, 'name'])}
      titleStyle={Styles.textWithLeftPadding}
      onPress={() => getClaimsDetails(claims.get(item), type)}
    />
  );

  return (
    <View style={Styles.root}>
      <SearchBar
        containerStyle={Styles.backgroundColorWhite}
        platform={Platform.OS === 'ios' ? 'ios' : 'android'}
        placeholder="Quick Search"
        onChangeText={updateSearch}
        value={value}
      />
      <ScrollView>
        <View>
          <Text style={Styles.labelUltraLightGrey}>ATTESTED TO BY</Text>
          {attestations.keySeq().map((attestation) => (
            <ListItem
              key={attestations.getIn([attestation, 'id'], '')}
              title={attestations.getIn([attestation, 'identityAttested'], '')}
              onPress={() => goToAttestationDetails(attestations.getIn([attestation, 'id'], ''), attestations.getIn([attestation, 'claimName'], ''))}
              bottomDivider
              chevron
            />
          ))}
        </View>
        <View>
          {childClaims.size > 0
            ? <Text style={Styles.textWithTopMargin}>Child Claims</Text> : null}
          {childClaims.keySeq().map((item) => (
            claimList(childClaims, item, 'child')
          ))}
          {parentClaims.size > 0
            ? <Text style={Styles.textWithTopMargin}>Parent Claims</Text> : null}
          {parentClaims.keySeq().map((item) => (
            claimList(parentClaims, item, 'parent')
          ))}
        </View>
      </ScrollView>
      <AttestationDetails visible={attestationModalVisibility} attestedClaimName={attestedClaimName} />

    </View>
  );
};

export default ClaimDetails;
