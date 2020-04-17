import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SearchBar } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import { setActiveClaimCategory } from '../../../actions/actionCreators';
import styles from './styles';

const PersonalInfo = (props) => {
    const { claimCategories, navigation } = props;
    const [categories, setCategories ] = useState(claimCategories);
    const [value,setValue] = useState('');

    const goToClaims = (claimCategoryId, claimCategoryName) => {
        navigation.navigate('ClaimCategory', {
            claimCategoryName,
        })
        props.dispatch(setActiveClaimCategory(claimCategoryId))
    };

    const updateSearch = (value) => {
        const newData = claimCategories.filter((claimCategory) => {
            const itemData = claimCategory.get('name', '').toUpperCase();
            const textData = value.toUpperCase();
            return itemData.indexOf(textData) > -1;
        });
        setCategories(newData);
        setValue(value);
    }

    return (
        <View style={styles.root}>
            <Text style={styles.textHeader}>Personal Information</Text>
            <SearchBar
                containerStyle={styles.searchBarContainer}
                platform={Platform.OS === 'ios' ? 'ios' : 'android'}
                placeholder='Quick Search'
                onChangeText={updateSearch}
                value={value}
            />
            <ScrollView>
                <View style={styles.categoriesContainer}>
                    {categories.keySeq().map(item =>
                        <TouchableOpacity
                            key={categories.getIn([item, 'id'], '')}
                            style={styles.category}
                            onPress={() => goToClaims(categories.getIn([item, 'id'], ''), categories.getIn([item, 'name'], ''))}>
                            <View>
                                <Text style={styles.name}>{categories.getIn([item, 'name'], '')}</Text>
                            </View>
                        </TouchableOpacity>
                    )
                    }
                </View>
            </ScrollView>
        </View>
    );
};

export default PersonalInfo;
