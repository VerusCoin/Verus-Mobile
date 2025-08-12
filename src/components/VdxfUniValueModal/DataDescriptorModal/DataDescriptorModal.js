import React from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';
import { Card, Title, Text, Divider, List } from 'react-native-paper';
import styles from '../../../styles';
import Colors from '../../../globals/colors';

export default function DataDescriptorModal(props) {
  const { data } = props;

  if (!data || typeof data !== 'object') {
    return (
      <View style={styles.centerContainer}>
        <Text>No valid descriptor data provided.</Text>
      </View>
    );
  }

  const renderField = (label, value) => {
    if (value === undefined || value === null) return null;

    return (
      <List.Item
        title={typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
        description={label}
        titleNumberOfLines={5}
        descriptionNumberOfLines={1}
      />
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.secondaryColor }}>
      <View style={{ ...styles.centerContainer, padding: 16 }}>
        <Card style={{ flex: 1, width: '100%', backgroundColor: 'white' }} elevation={3}>
          <Card.Content style={{ height: '100%' }}>
            <Title style={{ marginBottom: 12 }}>Data Descriptor</Title>

            <ScrollView style={{ maxHeight: '90%' }} showsVerticalScrollIndicator={true}>
              {renderField('Version', data.version)}
              {renderField('Flags', data.flags)}
              {renderField('Label', data.label)}
              {renderField('MIME Type', data.mimetype)}
              {renderField('Salt', data.salt)}
              {renderField('EPK', data.epk)}
              {renderField('IVK', data.ivk)}
              {renderField('SSK', data.ssk)}
              {renderField('Object Data', data.objectdata)}

              {/* Optional spacing */}
              <View style={{ height: 20 }} />
            </ScrollView>
          </Card.Content>
        </Card>
      </View>
    </SafeAreaView>
  );
}