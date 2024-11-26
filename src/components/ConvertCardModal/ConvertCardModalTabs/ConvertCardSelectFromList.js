import React, { useMemo, useState } from 'react';
import { View, TextInput, FlatList } from 'react-native';
import { List, Text } from 'react-native-paper';
import { RenderCircleCoinLogo } from '../../../utils/CoinData/Graphics';
import Colors from '../../../globals/colors';
import { useNavigation } from '@react-navigation/native';

const ConvertCardSelectFromList = (props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const items = props.items ? props.items : [];

  const navigation = useNavigation();

  // Filter the data based on the search query
  const filteredData = useMemo(() => {
    return items.filter(item =>
      (
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, items]);

  const handleSelect = (key) => {
    if (props.onSelect) props.onSelect(key);
    if (props.nextScreen) navigation.navigate(props.nextScreen)
  }

  // Render each item in the FlatList
  const renderItem = ({ item }) => (
    <List.Item
      title={item.title}
      titleStyle={{
        fontWeight: "600"
      }}
      description={item.description}
      descriptionStyle={{
        color: Colors.lightGrey
      }}
      onPress={() => handleSelect(item.key)}
      left={() => (
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {RenderCircleCoinLogo(item.logo)}
        </View>
      )}
      right={props =>
        <View
          {...props}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            justifyContent: "center"
          }}>
          {item.rightTitle && (
            <Text style={{ fontWeight: "600" }}>
              {item.rightTitle}
            </Text>
          )}
          {item.rightDescription && (
            <Text style={{ color: Colors.lightGrey }}>
              {item.rightDescription}
            </Text>
        )}
        </View>
      }
    />
  );

  return (
    <View style={{
      flex: 1,
      backgroundColor: Colors.secondaryColor,
      paddingHorizontal: 10,
    }}>
      <TextInput
        style={{
          height: 40,
          marginVertical: 10,
          paddingHorizontal: 15,
          marginHorizontal: 8,
          borderRadius: 8,
          backgroundColor: '#f0f0f0',
          color: '#000',
        }}
        placeholder="Search..."
        placeholderTextColor="#888"
        value={searchQuery}
        onChangeText={text => setSearchQuery(text)}
      />
      <FlatList
        data={filteredData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={
          <View style={{
            marginTop: 50,
            alignItems: 'center',
          }}>
            <Text style={{
              fontSize: 18
            }}>No items found</Text>
          </View>
        }
      />
    </View>
  );
};

export default ConvertCardSelectFromList;