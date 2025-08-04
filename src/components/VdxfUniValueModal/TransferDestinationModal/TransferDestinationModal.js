import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { Card, Title, Text, Divider, List } from 'react-native-paper';
import styles from '../../../styles';
import Colors from '../../../globals/colors';

export default function TransferDestinationModal(props) {
  const { data } = props;

  if (!data || typeof data !== 'object') {
    return (
      <View style={styles.centerContainer}>
        <Text>No valid transfer destination data provided.</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.secondaryColor }}>
      <View style={{ ...styles.centerContainer, padding: 16 }}>
        <Card style={{ flex: 1, width: '100%', backgroundColor: 'white' }} elevation={3}>
          <Card.Content style={{ height: '100%' }}>
            <Title style={{ marginBottom: 12 }}>Transfer Destination</Title>

            <List.Item
              title={data.address}
              description="Main Address"
              titleNumberOfLines={2}
              descriptionNumberOfLines={1}
            />

            <List.Item
              title={data.type}
              description="Destination Type"
              titleNumberOfLines={1}
              descriptionNumberOfLines={1}
            />

            {Array.isArray(data.auxdests) && data.auxdests.length > 0 && (
              <>
                <Divider style={{ marginVertical: 12 }} />
                <Title style={{ fontSize: 18, marginBottom: 8 }}>Auxiliary Destinations</Title>

                <ScrollView style={{ maxHeight: '50%' }} showsVerticalScrollIndicator={true}>
                  {data.auxdests.map((aux, index) => (
                    <View key={`${aux.address}-${index}`} style={{ marginBottom: 12 }}>
                      <List.Item
                        title={aux.address}
                        description={`Type ${aux.type}`}
                        titleNumberOfLines={2}
                        descriptionNumberOfLines={1}
                      />
                      {index < data.auxdests.length - 1 && (
                        <Divider style={{ marginTop: 8 }} />
                      )}
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}