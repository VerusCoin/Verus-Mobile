import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { Card, Title, Text, Divider, List } from 'react-native-paper';
import styles from '../../../styles';
import Colors from '../../../globals/colors';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';

export default function CurrencyValueMapModal(props) {
  const { data } = props;

  const displayCoinId = (key) => {
    try {
      return CoinDirectory.findSimpleCoinObj(key).display_ticker;
    } catch(e) {
      return key;
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.secondaryColor }}>
      <View style={{ ...styles.centerContainer, padding: 16 }}>
        <Card style={{ flex: 1, width: '100%', backgroundColor: 'white' }} elevation={3}>
          <Card.Content style={{ height: '100%' }}>
            <Title style={{ marginBottom: 12 }}>Currency Map</Title>
            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={true}>
              {Object.entries(data).map(([key, value], index) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <List.Item
                    title={value}
                    description={displayCoinId(key)}
                  />
                  {index < Object.entries(data).length - 1 && <Divider style={{ marginTop: 8 }} />}
                </View>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}