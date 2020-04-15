import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SearchBar } from 'react-native-elements';
import styles from './styles';
import { ScrollView } from 'react-native-gesture-handler';
import attestationData from './attestationData';
import claimsData from '../claimsData';
import { ListItem } from 'react-native-elements'

const ClaimDetails = ({ navigation, actions }) => {
    const claimId = useMemo(() => navigation.getParam('id'), []);
    const [attestations, setAttestation] = useState([]);
    const [claims, setClaims] = useState([]);
    const [isParent, setIsParent] = useState();
    const [value, setValue] = useState(false);

    useEffect(() => {
        //Note: This logic need to add to saga
        setAttestation(attestationData.filter(item => item.claimId === claimId));
        const claim = claimsData.filter(item => item.id === claimId);
        let result = null;
        if (claim[0].parentClaims.length > 0) {
            setIsParent(true);
            result = claimsData.filter(item => claim[0].parentClaims.includes(item.id));
        }
        else {
            result = claimsData.filter(item => claim[0].childClaims.includes(item.id));
        }
        setClaims(result);
    }, []);

    const updateSearch = (value) => {
        const newData = attestationData.filter(function (item) {
            const itemData = item.contentRootKey ? item.contentRootKey.toUpperCase() : ''.toUpperCase();
            const textData = value.toUpperCase();
            return itemData.indexOf(textData) > -1;
        });
        setAttestation(newData);
        setValue(value);
    }

    return (
        <View style={styles.root}>
            <SearchBar
                containerStyle={styles.searchBarContainer}
                platform={Platform.OS === 'ios' ? 'ios' : 'android'}
                placeholder='Quick Search'
                onChangeText={updateSearch}
                value={value}
            />
            <ScrollView>
                <View style={{ paddingHorizontal: 16, backgroundColor: 'white' }}>
                    <Text style={{ color: '#b5b5b5', fontSize: 12 }}>ATTESTED TO BY</Text>
                    {attestations.map(item =>
                        <ListItem
                            key={item.id}
                            title={item.contentRootKey}
                            //  onPress={goToClaimDetails}
                            bottomDivider
                            chevron
                        />
                    )
                    }
                </View>
                <View style={{ paddingVertical: 50 }}>
                    {isParent ? <Text style={{ paddingHorizontal: 16 }}>Child Claims</Text> : <Text>Parent Claims</Text>}
                    {claims.map(item =>
                        <ListItem
                            key={item.id}
                            contentContainerStyle={styles.claims}
                            title={item.name}
                            titleStyle={{ fontSize: 15 }}

                        />
                    )
                    }
                </View>
            </ScrollView>
        </View>
    );
};

export default ClaimDetails;
