import React from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';
import styles from './styles';
import Icon from 'react-native-vector-icons/AntDesign';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const Home = ({ navigation }) => {
    const handleScanToVerify = () => {
        navigation.navigate('ScanBadge');
    }
    const goToAddIdentity = () => {
        navigation.navigate('AddIdentity');
    }

    return (
        <View style={styles.root}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', }}>
                <Text style={styles.textHeader}>nazif@</Text>
                <TouchableOpacity onPress={goToAddIdentity}>
                    <MaterialCommunityIcons name='account-switch' size={28} style={{color:'grey', paddingTop:3}} />
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={handleScanToVerify} style={styles.scanToVerifyBtn}>
                <Icon name="check" color={styles.icon.color} size={23} />
                <Text style={styles.text}> Scan to Verify</Text>
            </TouchableOpacity>
            <Text style={styles.textBadge}>Your Badges</Text>
        </View>
    );
}
export default Home;