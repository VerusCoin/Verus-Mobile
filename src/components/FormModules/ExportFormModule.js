import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { IconButton, Divider, Text, TextInput } from 'react-native-paper';
import Colors from '../../globals/colors';
import Styles from '../../styles';
import { VETH } from '../../utils/constants/web3Constants';

const ExportFormModule = ({
  isExport,
  isConversion,
  exportToField,
  handleNetworkFieldFocus,
  handleMappingFieldFocus,
  onSystemChange,
  onMappingChange,
  localNetworkDefinition,
  advancedForm,
  showMappingField,
  mappingField,
  exporttoDisabled,
  mappingDisabled
}) => {
  return (
    <React.Fragment>
      <View style={{...Styles.wideBlockDense}}>
        <Divider />
      </View>
      <View style={{...Styles.wideBlockDense, paddingTop: advancedForm ? 2 : 8}}>
        {
          advancedForm ? (
            <TextInput
              returnKeyType="done"
              label={exporttoDisabled ? "System to send to" : "System to send to (optional)"}
              value={exportToField}
              mode="outlined"
              onChangeText={text => onSystemChange(text)}
              autoCapitalize={'none'}
              autoCorrect={false}
              style={{ flex: 1 }}
              disabled={exporttoDisabled}
            />
          ) : (
            <TouchableOpacity
              onPress={() => exporttoDisabled ? {} : handleNetworkFieldFocus()}
              disabled={exporttoDisabled}
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
                {
                  isExport
                    ? exportToField.toLowerCase() === VETH.toLowerCase()
                      ? 'To Ethereum network'
                      : `To network: ${exportToField}`
                    : isConversion
                    ? `On ${
                        localNetworkDefinition
                          ? localNetworkDefinition.fullyqualifiedname
                          : 'current'
                      } network`
                    : 'Select network to send to'
                }
              </Text>
              <IconButton icon="magnify" size={16} iconColor={Colors.verusDarkGray} />
            </TouchableOpacity>
          )
        }
      </View>
      {
        showMappingField && !isConversion && (
          <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
            {advancedForm ? (
              <TextInput
                returnKeyType="done"
                label={exportToField != null && exportToField.length > 0 ? "Currency to receive as (required)" : "Currency to receive as (optional)"}
                value={mappingField}
                mode="outlined"
                onChangeText={text => onMappingChange(text)}
                autoCapitalize={'none'}
                autoCorrect={false}
                style={{flex: 1}}
                disabled={mappingDisabled}
              />
            ) : (
              <TouchableOpacity
                onPress={() => mappingDisabled ? {} : handleMappingFieldFocus()}
                disabled={mappingDisabled}
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
                <IconButton icon="magnify" size={16} iconColor={Colors.verusDarkGray} />
              </TouchableOpacity>
            )}
          </View>
        )
      }
    </React.Fragment>
  );
};

export default ExportFormModule;