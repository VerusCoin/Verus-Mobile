import React, { useState, useMemo, useEffect } from 'react';
import { View } from 'react-native';
import styles from './styles';
import data from './mockData';
import { ScrollView } from 'react-native-gesture-handler';
import { ListItem } from 'react-native-elements'

const Claim = ({ navigation, actions }) => {
    const [claims, setClaims] = useState(data);
    const categoryId = useMemo(() => navigation.getParam('id'), []);

    useEffect(() => {
        //TODO actions.getClaimsByCategoryId(categoryId);
        setClaims(claims.filter(item => item.claimCategoryId === categoryId));
    }, []);

    const goToClaimDetails = () => {
        //TODO
    };

    return (
        <View style={styles.root}>
            <ScrollView>
                {claims.map(item =>
                    <ListItem
                        key={item.id}
                        title={item.name}
                        onPress={goToClaimDetails}
                        bottomDivider
                        chevron
                    />
                )
                }
            </ScrollView>
        </View>
    );
};

export default Claim;
