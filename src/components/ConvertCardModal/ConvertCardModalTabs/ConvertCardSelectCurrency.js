import React, { useMemo, useState } from 'react';
import { View, TextInput, FlatList } from 'react-native';
import { List, Text } from 'react-native-paper';
import { RenderCircleCoinLogo } from '../../../utils/CoinData/Graphics';
import Colors from '../../../globals/colors';

const ConvertCardSelectCurrency = (props) => {
  const [searchQuery, setSearchQuery] = useState('');
  const currencies = props.currencies ? props.currencies : [];

  // Filter the data based on the search query
  const filteredData = useMemo(() => {
    return currencies.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  // Render each item in the FlatList
  const renderItem = ({ item }) => (
    <List.Item
      title={item.title}
      description={item.description}
      onPress={() => props.onSelect(item.key)}
      left={() => (
        <View
          style={{
            paddingLeft: 8,
            paddingRight: 8,
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
            flexDirection: "row"
          }}>
          {item.rightTitle && <Text>
            {item.rightTitle}
          </Text>}
          {item.rightDescription && <Text>
            {item.rightDescription}
          </Text>}
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
          borderRadius: 20,
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

export default ConvertCardSelectCurrency;