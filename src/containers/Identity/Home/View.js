import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/AntDesign';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ScrollView } from 'react-native-gesture-handler';

import { selectActiveIdentity, selectPinnedAttestations } from '../../../selectors/identity';
import { setActiveAttestationId } from '../../../actions/actionCreators';
import Styles from '../../../styles';
import Colors from '../../../globals/colors';

const iconAccountSwitchSize = 28;
const iconCheckSize = 23;

const Home = (props) => {
  const {
    navigation, activeIdentity, pinnedAttestations, actions: { setActiveAttestationId },
  } = props;

  const handleScanToVerify = () => {
    navigation.navigate('ScanBadge');
  };

  const goToAttestationDetails = (activeAttestationId, attestedClaimName) => {
    setActiveAttestationId(activeAttestationId);
    navigation.navigate('AttestationDetails', {
      id: attestedClaimName,
    });
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
      <TouchableOpacity onPress={handleScanToVerify} style={Styles.linkButtonWithMarginRight}>
        <Icon name="check" color={Colors.ultraLightGrey} size={iconCheckSize} />
        <Text style={Styles.textButton}>Scan to Verify</Text>
      </TouchableOpacity>
      <Text style={Styles.textWithTopMargin}>Pinned attestations</Text>
      <ScrollView>
        <View>
          {pinnedAttestations.keySeq().map((attestationKey) => (
            <TouchableOpacity
              key={pinnedAttestations.getIn([attestationKey, 'id'], '')}
              onPress={() => goToAttestationDetails(pinnedAttestations.getIn([attestationKey, 'id'], ''), pinnedAttestations.getIn([attestationKey, 'claimName'], ''))}
              style={Styles.greyButtonWithShadow}
            >
              <View>
                <Text style={Styles.textWithLeftPadding}>{pinnedAttestations.getIn([attestationKey, 'identityAttested'], '')}</Text>
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
