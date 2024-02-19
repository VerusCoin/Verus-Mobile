import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { IconButton, Divider, TextInput, Text } from 'react-native-paper'; // Assuming you're using react-native-paper
import Colors from '../../globals/colors';
import Styles from '../../styles';
import { useSelector } from 'react-redux';

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
  const darkMode = useSelector((state)=>state.settings.darkModeState);
  return (
    <React.Fragment>
      <View style={{...Styles.wideBlockDense, backgroundColor:darkMode?Colors.darkModeColor:Colors.secondaryColor}}>
        <Divider />
      </View>
      {
        showConversionField ? (
          <View style={{...Styles.wideBlockDense, paddingTop: advancedForm ? 2 : 8, backgroundColor:darkMode?Colors.darkModeColor:Colors.secondaryColor}}>
            {
              advancedForm ? (
                <TextInput
                style={{ flex: 1,
                  backgroundColor:darkMode?Colors.verusDarkModeForm:Colors.ultraUltraLightGrey
                }}
                theme={{
                  colors: {
                    text:darkMode
                      ? Colors.secondaryColor
                      : 'black',
                    placeholder:darkMode
                      ? Colors.verusDarkGray
                      : Colors.verusDarkGray,
                  },
                }}
                  returnKeyType="done"
                  label={isPreconvert ? 'Currency to preconvert to' : 'Currency to convert to'}
                  value={convertToField}
                  mode="outlined"
                  multiline={true}
                  onChangeText={text => onConvertToChange(text)}
                  autoCapitalize={'none'}
                  autoCorrect={false}
                  
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
                  theme={{
                    colors: {
                      text:darkMode
                        ? Colors.secondaryColor
                        : 'black',
                      placeholder:darkMode
                        ? Colors.verusDarkGray
                        : Colors.verusDarkGray,
                    },
                  }}
                  style={{
                    flex: 1 ,
                    backgroundColor:darkMode
                                ? Colors.verusDarkModeForm
                                : Colors.ultraUltraLightGrey,
                  }}
                  value={viaField}
                  mode="outlined"
                  multiline={true}
                  onChangeText={text => onViaChange(text)}
                  autoCapitalize={'none'}
                  autoCorrect={false}
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