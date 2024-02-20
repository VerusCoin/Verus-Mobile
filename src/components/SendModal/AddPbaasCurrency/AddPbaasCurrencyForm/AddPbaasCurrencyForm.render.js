import React from "react";
import { ScrollView, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { TextInput, Button } from "react-native-paper";
import Styles from "../../../../styles";
import { SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD } from "../../../../utils/constants/sendModal";
import Colors from "../../../../globals/colors";

export const AddPbaasCurrencyFormRender = ({submitData, updateSendFormData, formDataValue,darkMode}) => {
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
            label="i-Address or currency name"
            value={formDataValue}
            mode="outlined"
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
            onChangeText={(text) =>
              updateSendFormData(SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD, text)
            }
            autoCapitalize={"none"}
            autoCorrect={false}
          />
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Button mode="contained" onPress={submitData}>
            Continue
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};