import React, { useState } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { Map as IMap } from 'immutable';
import { Text, TouchableOpacity, View } from 'react-native';
import { Button } from 'react-native-elements';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScrollView } from 'react-native-gesture-handler';

import { selectActiveIdentity, selectPinnedAttestations, selectAttestationModalVisibility } from '../../../selectors/identity';

import { setActiveAttestationId, setAttestationModalVisibility } from '../../../actions/actionCreators';
import Styles from '../../../styles';
import AttestationDetails from './AttestationDetails';

const iconAccountSwitchSize = 28;

const Home = (props) => {
  const {
    navigation,
    activeIdentity,
    pinnedAttestations,
    attestationModalVisibility,
    actions: {
      setActiveAttestationId,
      setAttestationModalVisibility,
    },
  } = props;

  const handleScanToVerify = () => {
    navigation.navigate('ScanBadge');
  };

  const [identityAttested, setIdentityAttested] = useState('');

  const goToAttestationDetails = (attestation) => {
    setActiveAttestationId(attestation.get('uid', ''));
    setIdentityAttested(attestation.get('identityAttested', ''));
    setAttestationModalVisibility(true);
  };

  const goToAddIdentity = () => {
    navigation.navigate('AddIdentity');
  };

  return (
    <View style={Styles.root}>

      <View style={Styles.alignItemsStart}>
        <Text style={Styles.textHeader}>{activeIdentity.get('name', '')}</Text>
        <TouchableOpacity onPress={goToAddIdentity}>
          <MaterialCommunityIcons name="account-switch" size={iconAccountSwitchSize} style={Styles.textWithGreyColor} />
        </TouchableOpacity>
      </View>
      <View>
        <TouchableOpacity onPress={handleScanToVerify} style={Styles.linkButton}>
          <Text style={Styles.textButton}>SCAN TO VERIFY</Text>
        </TouchableOpacity>
      </View>
      {pinnedAttestations.size > 0 ? (
        <View>
          <Text style={Styles.boldText}>Pinned attestations</Text>
          <ScrollView>
            <View>
              {pinnedAttestations?.keySeq().map((attestationKey) => (
                <TouchableOpacity
                  style={Styles.blockWithBorderBottom}
                  key={pinnedAttestations.getIn([attestationKey, 'uid'], '')}
                  onPress={() => goToAttestationDetails(pinnedAttestations.get(attestationKey, IMap()))}
                >
                  <View style={Styles.flexRow}>
                    <View style={Styles.flexColumn}>
                      <Text style={[Styles.boldText, Styles.paddingBottom]}>{pinnedAttestations.getIn([attestationKey, 'claimId'])}</Text>
                      <View style={Styles.alignItemsCenter}>
                        <Text style={Styles.defaultFontSize}>
                          {pinnedAttestations.getIn([attestationKey, 'identityAttested'])}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      ) : (
        <View style={Styles.fullWidthFlexGrowCenterBlock}>
          <Text
            style={[Styles.defaultDescriptiveText, Styles.mediumFormInputLabel]}
          >
            You don&apos;t have any pinned attestations at the moment. Go to the personal information tab and find an attestation to a claim that you want displayed here.
          </Text>
          <Button
            style={[Styles.centralHeader, Styles.paddingTop]}
            title="Go to personal information"
            onPress={() => navigation.navigate('Identity', { selectedScreen: 'Personal Information' })}
          />
        </View>
      )}
      <AttestationDetails
        visible={attestationModalVisibility}
        identityAttested={identityAttested}
      />
    </View>
  );
};

const mapStateToProps = (state) => ({
  activeIdentity: selectActiveIdentity(state),
  pinnedAttestations: selectPinnedAttestations(state),
  attestationModalVisibility: selectAttestationModalVisibility(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveAttestationId,
      setAttestationModalVisibility,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps)(Home);
