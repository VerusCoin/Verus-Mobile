import React from 'react';
import { View, Text, Switch } from 'react-native';
import styles from './styles';
import QRCode from 'react-native-qrcode-svg';

//This is temp solution until we get real data from QR code
const awesomeLink = 'http://awesome.link.qr';
const qrCodeSize = 245;

const switchTrackColor = () => ({
    false: "#767577",
    true: Colors.linkButtonColor,
});

const AttestationDetails = (props) => {
    const { attestation, activeAttestationId, actions: { toggleAttestationPin } } = props;

    const toggleSwitch = (value) => {
        toggleAttestationPin(attestation.getIn([activeAttestationId, 'id'], ''), value)
    }

    return (
        <View style={styles.root}>
            <View style={styles.activeAttestation}>
                <Text style={styles.attestaionText}>{attestation.getIn([activeAttestationId, 'id'], '')}</Text>
            </View>
            <View style={styles.qrCode}>
                <QRCode
                    value={awesomeLink}
                    size={qrCodeSize}
                />
            </View>
            <View style={styles.switchContainer}>
                <Text style={styles.switchText}>Pin attestation</Text>
                <Switch
                    trackColor={switchTrackColor}
                    onValueChange={toggleSwitch}
                    value={attestation.getIn([activeAttestationId, 'showOnHomeScreen'])}
                />
            </View>
        </View>
    );
};

export default AttestationDetails;
