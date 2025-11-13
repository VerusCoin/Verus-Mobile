import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { Card, Title, Text, Divider, List } from 'react-native-paper';
import styles from '../../../styles';
import Colors from '../../../globals/colors';
import { CoinDirectory } from '../../../utils/CoinData/CoinDirectory';

export default function RatingModal(props) {
  const { data } = props;

  const displayCoinId = (key) => {
    try {
      return CoinDirectory.findSimpleCoinObj(key).display_ticker;
    } catch (e) {
      return key;
    }
  };

  if (!data || typeof data !== 'object' || !data.ratingsmap) {
    return (
      <View style={styles.centerContainer}>
        <Text>No valid rating data provided.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.secondaryColor }}>
      <View style={{ ...styles.centerContainer, padding: 16 }}>
        <Card style={{ flex: 1, width: '100%', backgroundColor: 'white' }} elevation={3}>
          <Card.Content style={{ height: '100%' }}>
            <Title style={{ marginBottom: 12 }}>Rating</Title>
            <List.Item
              title={data.version}
              description={"Version"}
              titleNumberOfLines={1}
              descriptionNumberOfLines={1}
            />
            <List.Item
              title={data.trustlevel}
              description={"Trust Level"}
              titleNumberOfLines={1}
              descriptionNumberOfLines={1}
            />
            <Divider style={{ marginVertical: 12 }} />
            <Title style={{ fontSize: 18, marginBottom: 8 }}>Ratings Map</Title>

            <ScrollView style={{ maxHeight: '60%' }} showsVerticalScrollIndicator={true}>
              {Object.entries(data.ratingsmap).map(([key, value], index) => (
                <View key={key} style={{ marginBottom: 12 }}>
                  <List.Item
                    title={value}
                    description={displayCoinId(key)}
                    titleNumberOfLines={100}
                  />
                  {index < Object.entries(data.ratingsmap).length - 1 && (
                    <Divider style={{ marginTop: 8 }} />
                  )}
                </View>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}