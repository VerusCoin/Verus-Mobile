import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Platform,
} from 'react-native';
import { SearchBar } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import styles from './styles';

const PersonalInfo = (props) => {
  const { claimCategories, navigation, actions: { setActiveClaimCategory } } = props;
  const [categories, setCategories] = useState(claimCategories);
  const [searchValue, setSearchValue] = useState('');

  const goToClaims = (claimCategoryId, claimCategoryName) => {
    navigation.navigate('ClaimCategory', {
      claimCategoryName,
    });
    setActiveClaimCategory(claimCategoryId);
  };

  const updateSearch = (value) => {
    const newData = claimCategories.filter((claimCategory) => {
      const itemData = claimCategory.get('name', '').toUpperCase();
      const textData = value.toUpperCase().replace(/\s+/g, '');
      return itemData.includes(textData) || claimCategory.get('claims').some((claim) => claim.toUpperCase().includes(textData));
    });
    setCategories(newData);
    setSearchValue(value);
  };

  return (
    <View style={styles.root}>
      <Text style={styles.textHeader}>Personal Information</Text>
      <SearchBar
        containerStyle={styles.searchBarContainer}
        platform={Platform.OS === 'ios' ? 'ios' : 'android'}
        placeholder="Quick Search"
        onChangeText={updateSearch}
        value={searchValue}
      />
      <ScrollView>
        <View style={styles.categoriesContainer}>
          {categories.keySeq().map((item) => (
            <TouchableOpacity
              key={categories.getIn([item, 'id'], '')}
              style={styles.category}
              onPress={() => goToClaims(categories.getIn([item, 'id'], ''), categories.getIn([item, 'name'], ''))}
            >
              <View>
                <Text style={styles.name}>{categories.getIn([item, 'name'], '')}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default PersonalInfo;
