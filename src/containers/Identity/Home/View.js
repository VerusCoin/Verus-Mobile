import React from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import styles from './styles';
import Icon from 'react-native-vector-icons/AntDesign';

const Home = ({ navigation }) => {
    const handleScanToVerify = () => {
        navigation.navigate('ScanBadge');
    }
    return (
        <SafeAreaView style={styles.root}>
            <Text style={styles.textHeader}>Home</Text>
            <TouchableOpacity onPress={handleScanToVerify} style={styles.scanToVerifyBtn}>
                <Icon name="check" color={styles.icon.color} size={23} />
                <Text style={styles.text}> Scan to Verify</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}
export default Home;