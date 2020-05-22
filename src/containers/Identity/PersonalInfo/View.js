import React, { useEffect, useCallback } from 'react';

import { Map as IMap } from 'immutable';
import {
  View, Text, Platform, TouchableOpacity,
} from 'react-native';
import {
  SearchBar, CheckBox, ListItem, Button, Badge,
} from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import FontAwesomeIcon from 'react-native-vector-icons/FontAwesome5';

import AddCategoryDialog from './CategoryDialogs/AddCategory';
import DeleteCategoryDialog from './CategoryDialogs/DeleteCategory';
import AlphabeticalSort from './AlphaSort/AlphabeticalSort';

import DelayedAlert from '../../../utils/delayedAlert';
import Colors from '../../../globals/colors';
import Styles from '../../../styles';
import useClaimCategories from './utils/useClaimCategories';
import getfilteredData from './utils/searchByCategoriesAndClaims';


const PersonalInfo = (props) => {
  const {
    claimCategories,
    showEmptyClaimCategories,
    emptyCategoryCount,
    navigation,
    claims,
    claimsCountByCategory,
    activeCategory,
    sortCategoriesBy,
    actions: {
      setActiveClaimCategory,
      setShowEmptyClaimCategories,
      addNewCategory,
      deleteCategory,
      setCategorySortDirection,
      toggleShowHiddenClaims,
    },
  } = props;
  const [state, actions] = useClaimCategories(claimCategories);

  const {
    categories,
    searchTerm,
    addCategoryDialogVisible,
    deleteCategoryDialogVisible,
    categoryName,
  } = state;

  const {
    setSearchTerm,
    setCategories,
    setAddDialogVisible,
    setCategoryName,
    setDeleteDialogVisible,
  } = actions;

  const goToClaims = (selectedCategory) => {
    navigation.navigate('ClaimCategory', {
      claimCategoryName: selectedCategory.get('displayName', ''),
    });
    setActiveClaimCategory(selectedCategory.get('name', ''));
    toggleShowHiddenClaims(false);
  };

  useEffect(() => {
    setCategories(claimCategories);
  }, [claimCategories]);

  // Search by categories and claims
  const updateSearch = (searchValue) => {
    const filteredData = getfilteredData(claimCategories, claims, searchValue);
    setCategories(filteredData);
    setSearchTerm(searchValue);
  };

  const handleOnChangeText = (text) => {
    setCategoryName(text);
  };

  const handleSaveCategory = () => {
    if (categoryName) {
      addNewCategory(categoryName);
      setAddDialogVisible(false);
      DelayedAlert('Successfully added');
    } else {
      DelayedAlert('Please enter a name for the category');
    }
  };

  const closeDialog = () => {
    setAddDialogVisible(false);
  };

  const closeDeleteDialog = () => {
    setDeleteDialogVisible(false);
  };

  const handleDeleteCategory = (selectedCategory) => {
    deleteCategory(selectedCategory);
    closeDeleteDialog();
    DelayedAlert(`Successfully deleted ${selectedCategory.get('displayName')}`);
  };

  const claimCount = useCallback((selectedCategory) => {
    const claim = claimsCountByCategory.find((claim) => selectedCategory === claim.categoryId);
    return claim ? claim.count : 0;
  },
  [claimsCountByCategory]);

  const handleClaimCountBadge = (selectedCategory) => (
    <Badge
      value={claimCount(selectedCategory)}
      textStyle={{ color: Colors.secondaryColor }}
      badgeStyle={{ backgroundColor:Colors.quinaryColor }}
      containerStyle={Styles.alignItemsCenter}
    />
  );

  const openDeleteCategoryDialog = (selectedCategory) => {
    setActiveClaimCategory(selectedCategory);
    setDeleteDialogVisible(true);
  };

  const handleDeleteCategoryIcon = (selectedCategory) => {
    if (claimCount(selectedCategory)) {
      return null;
    }
    return (
      <FontAwesomeIcon
        name="trash-alt"
        textStyle={{ color: Colors.secondaryColor }}
        size={15}
        onPress={() => openDeleteCategoryDialog(selectedCategory)}
      />
    );
  };

  return (
    <View style={Styles.root}>
      <Text style={Styles.textHeader}>Claim categories</Text>
      <View style={Styles.alignItemsCenter}>
        <CheckBox
          checked={!showEmptyClaimCategories}
          onPress={() => setShowEmptyClaimCategories(!showEmptyClaimCategories)}
          containerStyle={[Styles.defaultMargin, Styles.defaultLeftPadding]}
        />
        <Text style={Styles.paddingRight}>Hide empty claim categories</Text>
        <View style={Styles.circleBadge}>
          <Text style={Styles.smallTextWithWhiteColor}>
            {emptyCategoryCount}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => navigation.navigate('ClaimManager')}
          style={Styles.marginLeftAuto}
        >
          <FontAwesomeIcon name="cogs" size={20} />
        </TouchableOpacity>
      </View>
      <View style={Styles.fullWidthSpaceBetween}>
        <SearchBar
          containerStyle={[Styles.backgroundColorWhite, Styles.passwordInputContainer]}
          platform={Platform.OS === 'ios' ? 'ios' : 'android'}
          placeholder="Quick Search"
          onChangeText={updateSearch}
          value={searchTerm}
          inputContainerStyle={Styles.defaultMargin}
          cancelButtonTitle=""
        />
        <AlphabeticalSort
          sortBy={sortCategoriesBy}
          setSortDirection={setCategorySortDirection}
        />
      </View>
      <AddCategoryDialog
        addCategoryDialogShown={addCategoryDialogVisible}
        handleOnChangeText={handleOnChangeText}
        closeAddCategoryDialog={closeDialog}
        handleSaveCategory={handleSaveCategory}
      />
      <DeleteCategoryDialog
        deleteCategoryDialogShown={deleteCategoryDialogVisible}
        closeDeleteCategoryDialog={closeDeleteDialog}
        handleDeleteCategory={handleDeleteCategory}
        selectedCategory={activeCategory}
      />
      <Button
        style={Styles.paddingBottom}
        title="Add category"
        onPress={() => setAddDialogVisible(true)}
      />
      <ScrollView>
        <View>
          {categories.keySeq().map((item) => (
            <ListItem
              key={categories.getIn([item, 'id'], '')}
              title={categories.getIn([item, 'displayName'], '')}
              onPress={() => goToClaims(categories.get(item, IMap()))}
              rightElement={handleClaimCountBadge(categories.getIn([item, 'name'], ''))}
              rightIcon={handleDeleteCategoryIcon(categories.getIn([item, 'name'], ''))}
              bottomDivider
              chevron
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};


export default PersonalInfo;
