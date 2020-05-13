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
import Colors from '../../../globals/colors';
import Styles from '../../../styles';
import useClaimCategories from './utils/useClaimCategories';
import getfilteredData from './utils/searchByCategoriesAndClaims';

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
    emptyCategoryCount,
    navigation,
    claims,
    claimsCountByCategory,
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
      setDialogVisible(false);
      DelayedAlert('Successfully added');
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

  const handleBadge = (categoryId) => (
    {
      value: claimsCountByCategory.filter((claim) => categoryId === claim.categoryId).first().count,
      textStyle: { color: Colors.secondaryColor },
      badgeStyle: { backgroundColor:Colors.quinaryColor },
      containerStyle: Styles.alignItemsCenter,
    }
  );

  return (
    <View style={Styles.root}>
      <Text style={Styles.textHeader}>Claim categories</Text>
      <View style={Styles.alignItemsCenter}>
        <CheckBox
          checked={!showEmptyClaimCategories}
          onPress={() => setShowEmptyClaimCategories(!showEmptyClaimCategories)}
          containerStyle={Styles.defaultMargin}
        />

        <Text style={Styles.paddingRight}>Hide empty claim categories</Text>
        <View style={Styles.circleBadge}>
          <Text style={Styles.smallTextWithWhiteColor}>
            {emptyCategoryCount}
          </Text>
        </View>
      </View>
      <SearchBar
        containerStyle={Styles.backgroundColorWhite}
        platform={Platform.OS === 'ios' ? 'ios' : 'android'}
        placeholder="Quick Search"
        onChangeText={updateSearch}
        value={searchTerm}
        inputContainerStyle={Styles.defaultMargin}
        cancelButtonTitle=""
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
              badge={handleBadge(categories.getIn([item, 'id']))}
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
