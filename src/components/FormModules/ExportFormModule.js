import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { IconButton, Divider, Text, TextInput } from 'react-native-paper';
import Colors from '../../globals/colors';
import Styles from '../../styles';

const ExportFormModule = ({
  isExport,
  isConversion,
  isPreconvert,
  exportToField,
  handleNetworkFieldFocus,
  handleMappingFieldFocus,
  onSystemChange,
  onMappingChange,
  localNetworkDefinition,
  advancedForm,
  showMappingField,
  mappingField
}) => {
  return (
    <React.Fragment>
      <View style={{...Styles.wideBlockDense}}>
        <Divider />
      </View>
      <View style={{...Styles.wideBlockDense}}>
        {
          (isPreconvert || advancedForm) ? (
            <TextInput
              returnKeyType="done"
              label="System to send to (optional)"
              value={exportToField}
              mode="outlined"
              multiline={true}
              onChangeText={text => onSystemChange(text)}
              autoCapitalize={'none'}
              autoCorrect={false}
              style={{ flex: 1 }}
            />
          ) : (
            <TouchableOpacity
              onPress={() => handleNetworkFieldFocus()}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 10,
                borderWidth: 1,
                borderColor: Colors.verusDarkGray,
                borderRadius: 4,
              }}>
              <Text
                style={{
                  fontSize: 16,
                  color:
                    isExport || isConversion
                      ? Colors.quaternaryColor
                      : Colors.verusDarkGray,
                }}>
                {isExport
                  ? `To network: ${exportToField}`
                  : isConversion
                  ? `On ${
                      localNetworkDefinition
                        ? localNetworkDefinition.fullyqualifiedname
                        : 'current'
                    } network`
                  : 'Select network to send to'}
              </Text>
              <IconButton icon="magnify" size={16} color={Colors.verusDarkGray} />
            </TouchableOpacity>
          )
        }
      </View>
      {
        showMappingField && (
          <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
            {isPreconvert || advancedForm ? (
              <TextInput
                returnKeyType="done"
                label="System to send to (optional)"
                value={mappingField}
                mode="outlined"
                multiline={true}
                onChangeText={text => onMappingChange(text)}
                autoCapitalize={'none'}
                autoCorrect={false}
                style={{flex: 1}}
              />
            ) : (
              <TouchableOpacity
                onPress={() => handleMappingFieldFocus()}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingHorizontal: 16,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: Colors.verusDarkGray,
                  borderRadius: 4,
                }}>
                <Text
                  style={{
                    fontSize: 16,
                    color: mappingField != null && mappingField.length > 0
                        ? Colors.quaternaryColor
                        : Colors.verusDarkGray,
                  }}>
                  {mappingField != null && mappingField.length > 0
                    ? `Receive as: ${mappingField}`
                    : 'Select currency to receive as'}
                </Text>
                <IconButton icon="magnify" size={16} color={Colors.verusDarkGray} />
              </TouchableOpacity>
            )}
          </View>
        )
      }
    </React.Fragment>
  );
};

export default ExportFormModule;