import React, { useState, useEffect } from 'react';
import {
  View, Text, Platform, TouchableOpacity, ScrollView
} from 'react-native';
import { SearchBar, ListItem, Button } from 'react-native-elements';
import { Map as IMap } from 'immutable';
import Styles from '../../../../styles';
import Colors from '../../../../globals/colors';
import AttestationDetails from '../../Home/AttestationDetails';
import RequestAttestation from '../RequestAttestation';
import { truncateString } from '../ClaimManager/utils/truncateString';

const getClaimData = (name) => {
  if (name.length > 20) return `${truncateString(name, 20)}...`;
  return name;
};

const ClaimDetails = (props) => {
  const {
    navigation,
    route,
    actions: { setActiveAttestationId, setActiveClaim, setAttestationModalVisibility },
    attestationsData,
    childClaims,
    parentClaims,
    attestationModalVisibility,
    claims
  } = props;

  const [attestations, setAttestation] = useState(attestationsData);
  const [value, setValue] = useState('');
  const [identityAttested, setIdentityAttested] = useState('');
  const [requestAttestationModalShown, setRequestAttestationModalShown] = useState(false);
  const [displayChildClaims] = useState(childClaims)
  const [displayParentClaims] = useState(parentClaims)
  const claimUid = route.params.claimUid;

  useEffect(() => {
    setAttestation(attestationsData);
  }, [attestationsData]);

  const updateSearch = (value) => {
    const newData = attestationsData.filter((item) => {
      const itemData = item.get('identityAttested', '').toUpperCase();
      const textData = value.toUpperCase();
      return itemData.includes(textData);
    });
    setAttestation(newData);
    setValue(value);
  };

  const getClaimsDetails = (claim) => {
    setActiveClaim(claim)
    navigation.push('ClaimDetails', {
      claimUid: claim.get('uid', '')
    });
  };

  const goToAttestationDetails = (attestation) => {
    setActiveAttestationId(attestation.get('uid', ''));
    setIdentityAttested(attestation.get('identityAttested', ''));
    setAttestationModalVisibility(true);
  };

  const claimList = (_claims, item, type) => (
    <TouchableOpacity
      key={_claims.getIn([item, "uid"])}
      style={Styles.greyButtonWithShadow}
      onPress={() => getClaimsDetails(_claims.get(item), type)}
    >
      <View>
        <Text style={Styles.textWithLeftPadding}>
          {_claims.getIn([item, "displayName"])}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={Styles.root}>
      <View style={Styles.alignItemsCenter}>
        <Text style={Styles.boldText}>
          {claims.getIn([claimUid, 'displayName'])}
          :
        </Text>
        <Text style={Styles.boldText}>
          {' '}
          {getClaimData(claims.getIn([claimUid, 'data']))}
        </Text>
      </View>
      <SearchBar
        containerStyle={Styles.backgroundColorWhite}
        platform={Platform.OS === 'ios' ? 'ios' : 'android'}
        placeholder="Search Attestaions"
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
              key={attestations.getIn([attestation, 'uid'], '')}
              title={attestations.getIn([attestation, 'identityAttested'], '')}
              onPress={() => goToAttestationDetails(attestations.get(attestation, IMap()))}
              bottomDivider
              chevron
            />
          ))}
        </View>
        <Button
          title="Request attestation"
          color={Colors.primaryColor}
          style={Styles.paddingTop}
          onPress={() => setRequestAttestationModalShown(true)}
        />
        <View>
          {displayChildClaims.size > 0
            ? <Text style={[Styles.textWithTopMargin, Styles.boldText]}>Child Claims</Text> : null}
          {displayChildClaims.keySeq().map((item) => (
            claimList(displayChildClaims, item)
          ))}
          {displayParentClaims.size > 0
            ? <Text style={[Styles.textWithTopMargin, Styles.boldText]}>Parent Claims</Text> : null}
          {displayParentClaims.keySeq().map((item) => (
            claimList(displayParentClaims, item)
          ))}
        </View>
      </ScrollView>
      <AttestationDetails
        visible={attestationModalVisibility}
        claimData={claims.get(claimUid)}
        identityAttested={identityAttested}
      />
      <RequestAttestation
        visible={requestAttestationModalShown}
        setRequestAttestationModalShown={setRequestAttestationModalShown}
      />
    </View>
  );
};

export default /*withNavigationFocus(ClaimDetails)*/ClaimDetails;
