import React, { useState } from 'react';
import { View, Text, Switch } from 'react-native';
import styles from './styles';
import QRCode from 'react-native-qrcode-svg';
import Colors from '../../../../globals/colors'

const awesomeLink = 'http://awesome.link.qr';

const AttestationDetails = ({ navigation, actions }) => {
    const [isEnabled, setIsEnabled] = useState(false);
    const setEnable = () => {
        if (isEnabled)
            setIsEnabled(false);
        else
            setIsEnabled(true);
    }
    return (
        <View style={styles.root}>
            <View style={{ alignItems: 'center'}}>
                <View style={{ backgroundColor: Colors.successButtonColor, paddingHorizontal: '14%', borderRadius: 5, paddingVertical: 16 }}>
                    <Text style={{ color: 'white', fontSize: 15 }}>COVID-19 Recovered</Text>
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
                        onValueChange={setEnable}
                        value={isEnabled}
                    />
                </View>
            </View>

        </View>
    ); Í
};

export default AttestationDetails;
