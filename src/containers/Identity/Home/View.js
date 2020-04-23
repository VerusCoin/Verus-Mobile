import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScrollView } from 'react-native-gesture-handler';
import styles from './styles';

import { selectActiveIdentity, selectPinnedAttestations } from '../../../selectors/identity';
import { setActiveAttestationId } from '../../../actions/actionCreators';

const iconAccountSwitchSize = 28;
const iconCheckSize = 23;

const Home = (props) => {
  const {
    navigation, activeIdentity, pinnedAttestations, actions: { setActiveAttestationId },
  } = props;

  const handleScanToVerify = () => {
    navigation.navigate('ScanBadge');
  };

  const goToAttestationDetails = (activeAttestationId) => {
    setActiveAttestationId(activeAttestationId);
    navigation.navigate('AttestationDetails', {
      id: activeAttestationId,
    });
  };

  const goToAddIdentity = () => {
    navigation.navigate('AddIdentity');
  };

  return (
    <View style={styles.root}>
      <View style={styles.identityContainer}>
        <Text style={styles.textHeader}>{activeIdentity.get('name', '')}</Text>
        <TouchableOpacity onPress={goToAddIdentity}>
          <MaterialCommunityIcons name="account-switch" size={iconAccountSwitchSize} style={styles.identityIcon} />
        </TouchableOpacity>
      </View>
      <TouchableOpacity onPress={handleScanToVerify} style={styles.scanToVerifyBtn}>
        <Icon name="check" color={styles.icon.color} size={iconCheckSize} />
        <Text style={styles.text}>Scan to Verify</Text>
      </TouchableOpacity>
      <Text style={styles.textBadge}>Pinned attestations</Text>
      <ScrollView>
        <View>
          {pinnedAttestations.keySeq().map((attestationKey) => (
            <TouchableOpacity
              key={pinnedAttestations.getIn([attestationKey, 'id'], '')}
              onPress={() => goToAttestationDetails(pinnedAttestations.getIn([attestationKey, 'id'], ''))}
              style={styles.attestation}
            >
              <View>
                <Text style={styles.attestationText}>{pinnedAttestations.getIn([attestationKey, 'identityAttested'], '')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const mapStateToProps = (state) => ({
  activeIdentity: selectActiveIdentity(state),
  pinnedAttestations: selectPinnedAttestations(state),
});

const mapDispatchToProps = (dispatch) => ({
  actions: bindActionCreators(
    {
      setActiveAttestationId,
    },
    dispatch,
  ),
});

export default connect(mapStateToProps, mapDispatchToProps)(Home);
