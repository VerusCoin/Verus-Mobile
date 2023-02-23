import React from "react";
import { ScrollView, View, TouchableWithoutFeedback, Keyboard } from "react-native";
import { TextInput, Button } from "react-native-paper";
import Styles from "../../../../styles";
import {
  SEND_MODAL_IDENTITY_TO_LINK_FIELD, SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
} from "../../../../utils/constants/sendModal";

export const ProvisionIdentityFormRender = function () {
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
          justifyContent: 'flex-start',
        }}>
        <View style={Styles.wideBlock}>
          <TextInput
            returnKeyType="done"
            label="i-Address or VerusID handle"
            value={
              this.state.assignedIdentity
                ? this.state.friendlyNameMap[this.state.assignedIdentity]
                  ? `${
                      this.state.friendlyNameMap[this.state.assignedIdentity]
                    }@`
                  : this.state.assignedIdentity
                : data[SEND_MODAL_IDENTITY_TO_PROVISION_FIELD]
            }
            mode="outlined"
            disabled={this.state.assignedIdentity != null || this.state.loading}
            onChangeText={text => {
              if (this.state.assignedIdentity == null) {
                this.props.updateSendFormData(
                  SEND_MODAL_IDENTITY_TO_PROVISION_FIELD,
                  text,
                );
              }
            }}
            autoCapitalize={'none'}
            autoCorrect={false}
          />
        </View>
        <View style={{...Styles.wideBlock, paddingTop: 0}}>
          <Button mode="contained" onPress={() => this.submitData()} disabled={this.state.loading}>
            Continue
          </Button>
        </View>
      </ScrollView>
    </TouchableWithoutFeedback>
  );
};