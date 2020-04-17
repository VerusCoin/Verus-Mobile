import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';

import { Text, TouchableOpacity, View } from 'react-native';
import styles from './styles';

import Icon from 'react-native-vector-icons/AntDesign';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { selectActiveIdentity, selectPinnedAttestations } from '../../../selectors/identity';
import { setActiveAttestationId } from '../../../actions/actionCreators';
import { ScrollView } from 'react-native-gesture-handler';

const Home = (props) => {
    const { navigation, activeIdentity, pinnedAttestations, actions: { setActiveAttestationId } } = props;

    const handleScanToVerify = () => {
        navigation.navigate('ScanBadge');
    }

    const goToAttestationDetails = (activeAttestationId) => {
        setActiveAttestationId(activeAttestationId);
        navigation.navigate("AttestationDetails", {
            id: activeAttestationId,
        });
    };

    const goToAddIdentity = () => {
        navigation.navigate('AddIdentity');
    }

    return (
        <View style={styles.root}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', }}>
                <Text style={styles.textHeader}>{activeIdentity.get('name', '')}</Text>
                <TouchableOpacity onPress={goToAddIdentity}>
                    <MaterialCommunityIcons name='account-switch' size={28} style={{color:'grey', paddingTop:3}} />
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleScanToVerify} style={styles.scanToVerifyBtn}>
                <Icon name="check" color={styles.icon.color} size={23} />
                <Text style={styles.text}>Scan to Verify</Text>
            </TouchableOpacity>
            <Text style={styles.textBadge}>Pinned attestations</Text>
            <ScrollView>
                <View>
                    {pinnedAttestations.keySeq().map(attestationKey => (
                        <TouchableOpacity
                            key={pinnedAttestations.getIn([attestationKey, 'id'], '')}
                            onPress={() => goToAttestationDetails(pinnedAttestations.getIn([attestationKey, 'id'], ''))}
                            >
                            <View>
                                <Text>{pinnedAttestations.getIn([attestationKey, 'identity_attested'], '')}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </View>
    );
}

const mapStateToProps = (state) => ({
    activeIdentity: selectActiveIdentity(state),
    pinnedAttestations: selectPinnedAttestations(state),
})

const mapDispatchToProps = dispatch => ({
    actions: bindActionCreators(
      {
        setActiveAttestationId
      },
      dispatch
    ),
  });

export default connect(mapStateToProps, mapDispatchToProps)(Home);