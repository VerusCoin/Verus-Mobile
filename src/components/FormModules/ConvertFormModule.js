import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { IconButton, Divider, TextInput, Text } from 'react-native-paper'; // Assuming you're using react-native-paper
import Colors from '../../globals/colors';
import Styles from '../../styles';

const ConvertFormModule = ({
  isConversion,
  isPreconvert,
  advancedForm,
  convertToField,
  viaField,
  handleFieldFocusConvertTo,
  handleFieldFocusVia,
  onConvertToChange,
  onViaChange,
  isVia,
  showConversionField,
  showViaField
}) => {
  return (
    <React.Fragment>
      <View style={{...Styles.wideBlockDense}}>
        <Divider />
      </View>
      {
        showConversionField ? (
          <View style={{...Styles.wideBlockDense, paddingTop: advancedForm ? 2 : 8}}>
            {
              advancedForm ? (
                <TextInput
                  returnKeyType="done"
                  label={isPreconvert ? 'Currency to preconvert to' : 'Currency to convert to'}
                  value={convertToField}
                  mode="outlined"
                  multiline={true}
                  onChangeText={text => onConvertToChange(text)}
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  style={{ flex: 1 }}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => handleFieldFocusConvertTo()}
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
                        isVia || isConversion ? Colors.quaternaryColor : Colors.verusDarkGray,
                    }}>
                    {isConversion
                      ? isPreconvert ? `Preconvert to: ${convertToField}` : `Convert to: ${convertToField}`
                      : isPreconvert ? 'Select currency to preconvert to' : 'Select currency to convert to'}
                  </Text>
                  <IconButton icon="magnify" size={16} color={Colors.verusDarkGray} />
                </TouchableOpacity>
              )
            }
          </View>
        ) : null
      }
      {
        showViaField ? (
          <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
            {
              advancedForm ? (
                <TextInput
                  returnKeyType="done"
                  label="Currency to convert via (optional)"
                  value={viaField}
                  mode="outlined"
                  multiline={true}
                  onChangeText={text => onViaChange(text)}
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  style={{ flex: 1 }}
                />
              ) : (
                <TouchableOpacity
                  onPress={() => handleFieldFocusVia()}
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
                        isVia || isConversion ? Colors.quaternaryColor : Colors.verusDarkGray,
                    }}>
                    {isVia ? `Convert via: ${viaField}` : 'Select currency to convert via'}
                  </Text>
                  <IconButton icon="magnify" size={16} color={Colors.verusDarkGray} />
                </TouchableOpacity>
              )
            }
          </View>
        ) : null
      }
    </React.Fragment>
  );
};

export default ConvertFormModule;