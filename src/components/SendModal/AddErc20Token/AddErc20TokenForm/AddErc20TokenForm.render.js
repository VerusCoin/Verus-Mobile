import React from "react";
import { ScrollView, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { TextInput, Button, Checkbox } from "react-native-paper";
import Styles from "../../../../styles";
import { SEND_MODAL_CONTRACT_ADDRESS_FIELD } from "../../../../utils/constants/sendModal";
import Colors from "../../../../globals/colors";

export const AddErc20TokenFormRender = ({
  submitData, 
  updateSendFormData, 
  formDataValue, 
  useMappedCurrency,
  setUseMappedCurrency,
  darkMode
}) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        style={{
          ...Styles.flexBackground,
          ...Styles.fullWidth,
          backgroundColor:darkMode?Colors.darkModeColor:Colors.secondaryColor
        }}
        contentContainerStyle={{
          ...Styles.centerContainer,
          justifyContent: "flex-start",
        }}
      >
        <View style={Styles.wideBlock}>
          <TextInput
            returnKeyType="done"
            label={useMappedCurrency ? "Mapped PBaaS currency" : "ERC20 contract address"}
            value={formDataValue}
            mode="outlined"
            onChangeText={(text) =>
              updateSendFormData(SEND_MODAL_CONTRACT_ADDRESS_FIELD, text)
            }
            autoCapitalize={"none"}
            autoCorrect={false}
            theme={{
              colors: {
                text: darkMode
                  ? Colors.secondaryColor
                  : 'black',
                placeholder: darkMode
                  ? Colors.primaryColor
                  : Colors.verusDarkGray,
              },
            }}
            style={{
              backgroundColor:darkMode
                  ? Colors.verusDarkModeForm
                  : Colors.tertiaryColor,
              
            }}
          />
        </View>
        <View style={{...Styles.wideBlockDense, paddingTop: 0}}>
          <Checkbox.Item
            labelStyle={{
              color:darkMode?Colors.secondaryColor:'black'
            }}
            uncheckedColor={
              darkMode ? Colors.secondaryColor : Colors.quinaryColor
            }
            color={Colors.primaryColor}
            label={'Find using mapped PBaaS currency'}
            status={
              useMappedCurrency ? 'checked' : 'unchecked'
            }
            onPress={() => setUseMappedCurrency(!useMappedCurrency)}
            mode="android"
          />
        </View>
        <View style={Styles.wideBlockDense}>
          <Button mode="contained" onPress={submitData}>
            Continue
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};