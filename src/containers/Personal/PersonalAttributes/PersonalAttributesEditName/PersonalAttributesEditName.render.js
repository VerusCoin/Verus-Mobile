import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import Styles from "../../../../styles";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal"
import Colors from "../../../../globals/colors";
import { primitives } from "verusid-ts-client"
const { IDENTITYDATA_PERSONAL_DETAILS, IDENTITYDATA_FIRSTNAME, IDENTITYDATA_MIDDLENAME, IDENTITYDATA_LASTNAME, IDENTITYDATA_DATEOFBIRTH, IDENTITYDATA_NATIONALITY } = primitives;

export const PersonalAttributesEditNameRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.currentTextInputModal != null && (
            <TextInputModal
              value={this.state.attributes[this.state.currentTextInputModal]}
              visible={this.state.currentTextInputModal != null}
              onChange={(text) => {
                if (text != null)
                  this.setState({
                    attributes: {
                      ...this.state.attributes,
                      [this.state.currentTextInputModal]: text,
                    },
                  });
              }}
              cancel={() => this.closeTextInputModal()}
            />
          )}
        </Portal>
        <List.Subheader>{"First"}</List.Subheader>
        <Divider />
        <List.Item
          title={
            !!this.state.attributes[IDENTITYDATA_FIRSTNAME.vdxfid] == false
              ? "required"
              : this.state.attributes[IDENTITYDATA_FIRSTNAME.vdxfid]
          }
          titleStyle={{
            color:
            !!this.state.attributes[IDENTITYDATA_FIRSTNAME.vdxfid] == false
                ? Colors.verusDarkGray
                : Colors.basicButtonColor,
          }}
          right={(props) => <List.Icon {...props} icon={"account-edit"} size={20} />}
          onPress={
            this.state.loading ? () => {} : () => this.setState({ currentTextInputModal: IDENTITYDATA_FIRSTNAME.vdxfid })
          }
        />
        <Divider />
        <List.Subheader>{"Middle"}</List.Subheader>
        <Divider />
        <List.Item
          title={
            !!this.state.attributes[IDENTITYDATA_MIDDLENAME.vdxfid] == false
              ? "optional"
              : this.state.attributes[IDENTITYDATA_MIDDLENAME.vdxfid]
          }
          titleStyle={{
            color:
            !!this.state.attributes[IDENTITYDATA_MIDDLENAME.vdxfid] == false
                ? Colors.verusDarkGray
                : Colors.basicButtonColor,
          }}
          right={(props) => <List.Icon {...props} icon={"account-edit"} size={20} />}
          onPress={
            this.state.loading ? () => {} : () => this.setState({ currentTextInputModal: IDENTITYDATA_MIDDLENAME.vdxfid })
          }
        />
        <Divider />
        <List.Subheader>{"Last"}</List.Subheader>
        <Divider />
        <List.Item
          title={
            !!this.state.attributes[IDENTITYDATA_LASTNAME.vdxfid] == false
              ? "required"
              : this.state.attributes[IDENTITYDATA_LASTNAME.vdxfid]
          }
          titleStyle={{
            color:
            !!this.state.attributes[IDENTITYDATA_LASTNAME.vdxfid] == false
                ? Colors.verusDarkGray
                : Colors.basicButtonColor,
          }}
          right={(props) => <List.Icon {...props} icon={"account-edit"} size={20} />}
          onPress={
            this.state.loading ? () => {} : () => this.setState({ currentTextInputModal: IDENTITYDATA_LASTNAME.vdxfid })
          }
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
