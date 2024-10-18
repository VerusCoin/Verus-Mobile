import React from "react";
import { ScrollView, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { TextInput, Button, Paragraph } from "react-native-paper";
import Styles from "../../../../styles";
import { SEND_MODAL_IDENTITY_TO_REVOKE_FIELD } from "../../../../utils/constants/sendModal";
import Colors from "../../../../globals/colors";

export const RevokeIdentityFormRender = ({submitData, updateSendFormData, formDataValue, networkName}) => {
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
            label="i-Address or VerusID handle to revoke"
            value={formDataValue}
            mode="outlined"
            onChangeText={(text) =>
              updateSendFormData(SEND_MODAL_IDENTITY_TO_REVOKE_FIELD, text)
            }
            autoCapitalize={"none"}
            autoCorrect={false}
          />
          <Paragraph style={{ color: Colors.quaternaryColor, paddingLeft: 16 }}>
            {`${networkName} blockchain`}
          </Paragraph>
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Button mode="contained" onPress={submitData}>
            Revoke
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};