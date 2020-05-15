import React, { useState, useEffect } from 'react';
import {
  View, Text, Platform, TouchableOpacity,
} from 'react-native';
import { SearchBar, ListItem } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import Styles from '../../../../styles';
import AttestationDetails from '../../Home/AttestationDetails';
import { truncateString } from '../ClaimManager/utils/truncateString';

const getClaimData = (name) => {
  if (name.length > 20) return `${truncateString(name, 20)}...`;
  return name;
};

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
  const [identityAttested, setIdentityAttested] = useState('');
  const claimParams = navigation.state.params;

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
  const getClaimsDetails = (claim) => {
    setActiveClaim(claim);
    navigation.navigate('ClaimDetails', {
      id: claim.get('id', ''),
      claimName: claim.get('name', ''),
      claimData: claim.get('claimData', ''),
    });
  };

  const goToAttestationDetails = (activeAttestationId, identityAttested) => {
    setActiveAttestationId(activeAttestationId);
    setIdentityAttested(identityAttested);
    setAttestationModalVisibility(true);
  };

  const claimList = (claims, item, type) => (
    <TouchableOpacity
      key={claims.getIn([item, 'id'])}
      style={Styles.greyButtonWithShadow}
      onPress={() => getClaimsDetails(claims.get(item), type)}
    >
      <View>
        <Text style={Styles.textWithLeftPadding}>{claims.getIn([item, 'name'])}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={Styles.root}>
      <View style={Styles.alignItemsCenter}>
        <Text style={Styles.boldText}>
          {claimParams.claimName}
          :
        </Text>
        <Text style={Styles.boldText}>
          {' '}
          {getClaimData(claimParams.claimData)}
        </Text>
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
        <View>
          <Text style={[Styles.labelUltraLightGrey, Styles.paddingTop]}>ATTESTED TO BY</Text>
          {attestations.keySeq().map((attestation) => (
            <ListItem
              key={attestations.getIn([attestation, 'id'], '')}
              title={attestations.getIn([attestation, 'identityAttested'], '')}
              onPress={() => goToAttestationDetails(attestations.getIn([attestation, 'id'], ''),
                attestations.getIn([attestation, 'identityAttested'], ''))}
              bottomDivider
              chevron
            />
          ))}
        </View>
        <View>
          {childClaims.size > 0
            ? <Text style={[Styles.textWithTopMargin, Styles.boldText]}>Child Claims</Text> : null}
          {childClaims.keySeq().map((item) => (
            claimList(childClaims, item)
          ))}
          {parentClaims.size > 0
            ? <Text style={[Styles.textWithTopMargin, Styles.boldText]}>Parent Claims</Text> : null}
          {parentClaims.keySeq().map((item) => (
            claimList(parentClaims, item)
          ))}
        </View>
      </ScrollView>
      <AttestationDetails
        visible={attestationModalVisibility}
        claimData={claimParams.claimData}
        identityAttested={identityAttested}
      />

    </View>
  );
};

export default ClaimDetails;
