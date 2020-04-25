import React, { useEffect } from 'react';
import {
  View, Text, Platform,
} from 'react-native';
import { SearchBar, CheckBox, ListItem } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import { FloatingAction } from 'react-native-floating-action';
import Icon from 'react-native-vector-icons/Ionicons';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome5';
import Dialog from 'react-native-dialog';

import DelayedAlert from '../../../utils/delayedAlert';
import styles from './styles';
import Colors from '../../../globals/colors';

import useClaimCategories from './utils/useClaimCategories';

const floatingActions = [
  {
    text: 'Add category',
    name: 'category',
    icon:  <Icon name={Platform.OS === 'ios' ? 'ios-add' : 'md-add'} size={24} color={Colors.secondaryColor} />,
    color: Colors.primaryColor,
  },
  {
    text: 'Manage claims',
    name: 'claims',
    icon:  <FontAwesomeIcon name="cogs" size={15} color={Colors.secondaryColor} />,
    color: Colors.primaryColor,
  },
];

const PersonalInfo = (props) => {
  const {
    claimCategories,
    showEmptyClaimCategories,
    navigation,
    claims,
    actions: {
      setActiveClaimCategory,
      setShowEmptyClaimCategories,
      addNewCategory,
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
      const search = searchValue.toUpperCase();
      const categoryIds = claims
        .filter((item) => item.get('name').toUpperCase().includes(search))
        .keySeq()
        .map((item) => claims.get(item));

      const itemDataId = claimCategory.get('id', '');
      const itemDataName = claimCategory.get('name', '').toUpperCase();

      if (itemDataName.includes(search)) {
        return itemDataName.includes(search);
      }

      if (categoryIds.size === 0) {
        return false;
      }

      return itemDataId.includes(categoryIds.first().get('categoryId', ''));
    });

    setCategories(newData);
    setSearchTerm(searchValue);
  };

  const handleOnChangeText = (text) => {
    setCategoryName(text);
  };

  const handleSaveCategory = () => {
    if (categoryName) {
      addNewCategory(categoryName);
      setDialogVisible(false);
    } else {
      DelayedAlert('Please enter a name for the category');
    }
  };

  const handleSelectAction = (name) => {
    if (name === 'claims') navigation.navigate('ClaimManager');
    else setDialogVisible(true);
  };

  const closeDialog = () => {
    setDialogVisible(false);
  };

  const renderDialog = () => (
    <Dialog.Container visible={dialogVisible}>
      <Dialog.Title>Add category</Dialog.Title>
      <Dialog.Description>
        Please enter the name of Claim Category that you want add.
      </Dialog.Description>
      <Dialog.Input onChangeText={(text) => handleOnChangeText(text)} />
      <Dialog.Button label="Cancel" onPress={closeDialog} />
      <Dialog.Button label="Save" onPress={handleSaveCategory} />
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
      <SearchBar
        containerStyle={styles.searchBarContainer}
        platform={Platform.OS === 'ios' ? 'ios' : 'android'}
        placeholder="Quick Search"
        onChangeText={updateSearch}
        value={searchTerm}
      />
      {renderDialog()}
      <ScrollView>
        <View>
          {categories.keySeq().map((item) => (
            <ListItem
              key={categories.getIn([item, 'id'], '')}
              title={categories.getIn([item, 'name'], '')}
              bottomDivider
              onPress={() => goToClaims(categories.getIn([item, 'id'], ''), categories.getIn([item, 'name'], ''))}
              chevron
            />
          ))}
        </View>
      </ScrollView>
      <FloatingAction
        actions={floatingActions}
        onPressItem={(name) => handleSelectAction(name)}
        color={Colors.primaryColor}
      />

    </View>
  );
};

export default PersonalInfo;
