import React from "react";
import { ScrollView, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { TextInput, Button } from "react-native-paper";
import Styles from "../../../../styles";
import {
  SEND_MODAL_IDENTITY_TO_LINK_FIELD,
} from "../../../../utils/constants/sendModal";

export const LinkIdentityFormRender = function () {
  const { data } = this.props.sendModal;

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
            label="i-Address or VerusID handle"
            value={data[SEND_MODAL_IDENTITY_TO_LINK_FIELD]}
            mode="outlined"
            onChangeText={(text) =>
              this.props.updateSendFormData(SEND_MODAL_IDENTITY_TO_LINK_FIELD, text)
            }
            autoCapitalize={"none"}
            autoCorrect={false}
          />
        </View>
        <View style={{ ...Styles.wideBlock, paddingTop: 0 }}>
          <Button mode="contained" onPress={() => this.submitData()}>
            Link
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};