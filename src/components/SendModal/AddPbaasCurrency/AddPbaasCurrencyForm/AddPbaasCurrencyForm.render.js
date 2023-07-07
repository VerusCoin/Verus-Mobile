import React from "react";
import { ScrollView, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { TextInput, Button } from "react-native-paper";
import Styles from "../../../../styles";
import { SEND_MODAL_PBAAS_CURRENCY_TO_ADD_FIELD } from "../../../../utils/constants/sendModal";

export const AddPbaasCurrencyFormRender = ({submitData, updateSendFormData, formDataValue}) => {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <ScrollView
        style={{
          ...Styles.flexBackground,
          ...Styles.fullWidth,
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