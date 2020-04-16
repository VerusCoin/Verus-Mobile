import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SearchBar } from 'react-native-elements';
import styles from './styles';
import { ScrollView } from 'react-native-gesture-handler';
import QRCode from 'react-native-qrcode-svg';
import { CheckBox } from 'react-native-elements'
import Colors from '../../../../globals/colors'
const AttestationDetails = ({ navigation, actions }) => {
    const [checked, setValue] = useState(false);
    const setCheck=()=>{
        if(checked)
        setValue(false);
        else
        setValue(true);
    }
    return (
        <View style={styles.root}>

            <View style={{ alignItems: 'center', }}>
                <View style={{backgroundColor:Colors.successButtonColor, padding:10, borderRadius:5}}>
                <Text>COVID-19 Recovered</Text>
                </View>
                <View style={{marginVertical:7}}>
                <QRCode
                    value="http://awesome.link.qr"
                    logoSize={34}
                />
                </View>
                <CheckBox
                    title='Pin attestation'
                    checked={checked}
                    onPress={setCheck}
                    iconRight
                    containerStyle={{backgroundColor:'white'}}
                />
            </View>

        </View>
    ); Í
};

export default AttestationDetails;
