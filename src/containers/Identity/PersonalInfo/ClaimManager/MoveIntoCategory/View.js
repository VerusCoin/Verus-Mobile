import React, { useState } from 'react';
import { Map as IMap } from 'immutable';
import { View } from 'react-native';
import { ListItem } from 'react-native-elements';
import { ScrollView } from 'react-native-gesture-handler';
import data from './mockData';
import styles from './styles';

const MoveIntoCategory = (props) => {
  const {
    navigation,
  } = props;
  const [categories, setCategories] = useState(data);
  const moveIntoCategory = (id) => {
    navigation.goBack();
  };
  return (
    <View style={styles.root}>
      <ScrollView>
        {categories.map((item) => (
          <ListItem
            key={item.id}
            title={item.name}
            onPress={() => moveIntoCategory(item.id)}
            bottomDivider
          />
        ))}
      </ScrollView>
    </View>
  );
};

export default MoveIntoCategory;
