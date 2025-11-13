import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import styles from '../../../styles';
import { Text, Card, Title } from 'react-native-paper';
import Colors from '../../../globals/colors';

export default function DataStringKeyModal(props) {
  const { data } = props;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.secondaryColor }}>
      <View style={{ ...styles.centerContainer, padding: 16 }}>
        <Card style={{ flex: 1, width: '100%', backgroundColor: 'white' }} elevation={3}>
          <Card.Content style={{ height: '100%' }}>
            <Title style={{ marginBottom: 12 }}>{"Raw Text Data"}</Title>
            <ScrollView style={{ maxHeight: '80%' }} showsVerticalScrollIndicator={true}>
              <Text variant="bodyMedium" style={{ lineHeight: 22 }}>
                {data}
              </Text>
            </ScrollView>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}