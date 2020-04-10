import React from 'react';
import { SafeAreaView, Text } from 'react-native';
import styles from './styles';

const PersonalInformation = () => {
    return (
        <SafeAreaView style={styles.root}>
            <Text style={styles.text}>Personal information</Text>
        </SafeAreaView>
    );
}
export default PersonalInformation;