import React from 'react';
import { Text, View } from 'react-native';
import styles from './styles';
import Icon from 'react-native-vector-icons/AntDesign';
import data from './mockData';

const ScannedInformation = ({ navigation }) => {
    return (
        <View style={styles.root}>
            <View style={styles.check}>
                <Text style={styles.textFromQR}>COVID-19</Text>
                <Icon name="checkcircle" color='green' size={23} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.text}>Status:</Text>
                <Text style={styles.status}>{data.status}</Text>
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.text}>Attested to by:</Text>
                <Text style={styles.textFromQR}>{data.attestedBy}</Text>
            </View>

            <View style={styles.personContainer}>
                <View style={styles.check}>
                    <Text style={styles.textFromQR}>Goverment ID</Text>
                    <Icon name="checkcircle" color='green' size={23} />
                </View>

                <View style={styles.textContainer}>
                    <Text style={styles.text}>ID:</Text>
                    <Text style={styles.textFromQR}>{data.person.id}</Text>
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.text}>Attested to by:</Text>
                    <Text style={styles.textFromQR}>{data.person.attestedBy}</Text>
                </View>
            </View>
        </View>
    );
}
export default ScannedInformation;