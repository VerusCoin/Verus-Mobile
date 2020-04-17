import React from 'react';
import { View, Text, Switch } from 'react-native';
import styles from './styles';
import QRCode from 'react-native-qrcode-svg';
import Colors from '../../../../globals/colors'

const awesomeLink = 'http://awesome.link.qr';

const AttestationDetails = (props) => {
    const { attestation, activeAttestationId, actions: { toggleAttestationPin }} = props;

    const toggleSwitch = (value) => {
        toggleAttestationPin(attestation.getIn([activeAttestationId, 'id'], ''), value)
    }

    return (
        <View style={styles.root}>
            <View style={{ alignItems: 'center'}}>
                <View style={{ backgroundColor: Colors.successButtonColor, paddingHorizontal: '14%', borderRadius: 5, paddingVertical: 16 }}>
                    <Text style={{ color: 'white', fontSize: 15 }}>{attestation.getIn([activeAttestationId, 'id'], '')}</Text>
                </View>
                <View style={{ marginVertical: '10%' }}>
                    <QRCode
                        value={awesomeLink}
                        size={245}
                    />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ paddingHorizontal: 10 }}>Pin attestation</Text>
                    <Switch
                        trackColor={{ false: "#767577", true: Colors.linkButtonColor }}
                        onValueChange={toggleSwitch}
                        value={attestation.getIn([activeAttestationId, 'showOnHomeScreen'])}
                    />
                </View>
            </View>
        </View>
    ); Í
};

export default AttestationDetails;
