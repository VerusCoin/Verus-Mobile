import React, { useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Platform,
} from 'react-native';
import { SearchBar, CheckBox } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/Ionicons';
import Dialog from 'react-native-dialog';
import styles from './styles';
import useClaimCategories from './utils/useClaimCategories';

const PersonalInfo = (props) => {
  const {
    claimCategories,
    showEmptyClaimCategories,
    navigation,
    actions: {
      setActiveClaimCategory,
      setShowEmptyClaimCategories,
    },
  } = props;
  const [state, actions] = useClaimCategories(claimCategories);

  const {
    categories,
    searchTerm,
    dialogVisible,
    categoryName,
  } = state;

  const {
    setSearchTerm,
    setCategories,
    setDialogVisible,
    setCategoryName,
  } = actions;


  const goToClaims = (claimCategoryId, claimCategoryName) => {
    navigation.navigate('ClaimCategory', {
      claimCategoryName,
    });
    setActiveClaimCategory(claimCategoryId);
  };

  useEffect(() => {
    setCategories(claimCategories);
  }, [claimCategories]);

  const updateSearch = (searchValue) => {
    const newData = claimCategories.filter((claimCategory) => {
      const itemData = claimCategory.get('name', '').toUpperCase();
      const textData = searchTerm.toUpperCase().replace(/\s+/g, '');
      return itemData.includes(textData) || claimCategory.get('claims').some((claim) => claim.toUpperCase().includes(textData));
    });

    setCategories(newData);

    setSearchTerm(searchValue);
  };

  const handleAddCategory = () => {
    setDialogVisible(true);
  };

  const handleOnChangeText = (text) => {
    setCategoryName(text);
  };

  const handleSave = () => {
    // TODO: Need method that add category to redux than to Async storage
    setDialogVisible(false);
  };

  const handleCancel = () => {
    setDialogVisible(false);
  };

  const renderDialog = () => (
    <Dialog.Container visible={dialogVisible}>
      <Dialog.Title>Add category</Dialog.Title>
      <Dialog.Description>
        Please enter the name of Claim Category that you want add.
      </Dialog.Description>
      <Dialog.Input onChangeText={(text) => handleOnChangeText(text)} />
      <Dialog.Button label="Cancel" onPress={handleCancel} />
      <Dialog.Button label="Save" onPress={handleSave} />
    </Dialog.Container>
  );

  return (
    <View style={styles.root}>
      <Text style={styles.textHeader}>Personal Information</Text>
      <CheckBox
        checked={showEmptyClaimCategories}
        title="Show empty claim categories"
        onPress={() => setShowEmptyClaimCategories(!showEmptyClaimCategories)}
      />
      <View style={{
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingVertical: 5,
      }}
      >
        <SearchBar
          containerStyle={styles.searchBarContainer}
          platform={Platform.OS === 'ios' ? 'ios' : 'android'}
          placeholder="Quick Search"
          onChangeText={updateSearch}
          cancelButtonProps={{ buttonStyle: { paddingRight: 15 } }}
          value={searchTerm}
        />
        <TouchableOpacity onPress={handleAddCategory}>
          <Icon name={Platform.OS === 'ios' ? 'ios-add' : 'md-add'} size={35} style={{ paddingRight: '4%' }} />
        </TouchableOpacity>
      </View>
      {renderDialog()}
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
