import React from 'react';
import { Map as IMap } from 'immutable';
import { View, Text } from 'react-native';
import { ListItem } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import DelayedAlert from '../../../../../utils/delayedAlert';
import Styles from '../../../../../styles';

const MoveIntoCategory = (props) => {
  const {
    navigation,
    categories,
    actions: { moveClaimsToCategory },
  } = props;

  const moveIntoCategory = (category) => {
    moveClaimsToCategory(category);
    navigation.goBack();
    DelayedAlert('Moved succesfully');
  };

  return (
    <View style={Styles.root}>
      <Text style={Styles.labelUltraLightGrey}>SELECT CATEGORY</Text>
      <ScrollView>
        {categories.keySeq().map((category) => (
          <ListItem
            key={categories.getIn([category, 'id'], '')}
            title={categories.getIn([category, 'displayName'], '')}
            onPress={() => moveIntoCategory(categories.get(category, IMap()))}
            bottomDivider
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default MoveIntoCategory;
