import React from "react";
import { ScrollView, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { TextInput, Button} from "react-native-paper";
import Styles from "../../../../styles";
import { SEND_MODAL_IDENTITY_TO_LINK_FIELD } from "../../../../utils/constants/sendModal";
import Colors from "../../../../globals/colors";

export const LinkIdentityFormRender = ({submitData, updateSendFormData, formDataValue,darkMode}) => {
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
            label="i-Address or VerusID handle"
            value={formDataValue}
            mode="outlined"
            onChangeText={(text) =>
              updateSendFormData(SEND_MODAL_IDENTITY_TO_LINK_FIELD, text)
            }
            style={{
              marginTop: -10,
              backgroundColor:darkMode
                  ? Colors.verusDarkModeForm
                  : Colors.tertiaryColor,
              
            }}
            theme={{
              colors: {
                text: darkMode
                  ? Colors.secondaryColor
                  : Colors.ultraLightGrey,
                placeholder: darkMode
                  ? Colors.primaryColor
                  : Colors.verusDarkGray,
              },
            }}
            autoCapitalize={"none"}
            autoCorrect={false}
          />
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Button mode="contained" onPress={submitData}>
            Link
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};