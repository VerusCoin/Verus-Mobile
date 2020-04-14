import React, {useState} from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { SearchBar } from 'react-native-elements';
import styles from './styles';
import data from './mockData';
import { ScrollView } from 'react-native-gesture-handler';

const PersonalInformation = ({ navigation, actions }) => {
    const [categories,setCategories ] = useState(data);
    const [value,setValue] = useState('');

    const goToClaims = () => {
    //TODO
    };

    const updateSearch = (value) => {
        const newData = data.filter(function(item) {
            const itemData = item.name ? item.name.toUpperCase() : ''.toUpperCase();
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
                    {categories.map(item =>
                        <TouchableOpacity
                            key={item.id}
                            style={styles.category}
                            onPress={goToClaims}>
                            <View>
                                <Text style={styles.name}>{item.name}</Text>
                            </View>
                        </TouchableOpacity>
                    )
                    }
                </View>
            </ScrollView>
        </View>
    );
};

export default PersonalInformation;
