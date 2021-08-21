import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import Styles from "../../../../styles";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal"
import Colors from "../../../../globals/colors";

export const PersonalAttributesEditNameRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.currentTextInputModal != null && (
            <TextInputModal
              value={this.state.name[this.state.currentTextInputModal]}
              visible={this.state.currentTextInputModal != null}
              onChange={(text) => {
                if (text != null)
                  this.setState({
                    name: {
                      ...this.state.name,
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
            this.state.name.first == null || this.state.name.first.length == 0
              ? "required"
              : this.state.name.first
          }
          titleStyle={{
            color:
              this.state.name.first == null || this.state.name.first.length == 0
                ? Colors.verusDarkGray
                : Colors.basicButtonColor,
          }}
          right={(props) => <List.Icon {...props} icon={"account-edit"} size={20} />}
          onPress={
            this.state.loading ? () => {} : () => this.setState({ currentTextInputModal: "first" })
          }
        />
        <Divider />
        <List.Subheader>{"Middle"}</List.Subheader>
        <Divider />
        <List.Item
          title={
            this.state.name.middle == null || this.state.name.middle.length == 0
              ? "optional"
              : this.state.name.middle
          }
          titleStyle={{
            color:
              this.state.name.middle == null || this.state.name.middle.length == 0
                ? Colors.verusDarkGray
                : Colors.basicButtonColor,
          }}
          right={(props) => <List.Icon {...props} icon={"account-edit"} size={20} />}
          onPress={
            this.state.loading ? () => {} : () => this.setState({ currentTextInputModal: "middle" })
          }
        />
        <Divider />
        <List.Subheader>{"Last"}</List.Subheader>
        <Divider />
        <List.Item
          title={
            this.state.name.last == null || this.state.name.last.length == 0
              ? "required"
              : this.state.name.last
          }
          titleStyle={{
            color:
              this.state.name.last == null || this.state.name.last.length == 0
                ? Colors.verusDarkGray
                : Colors.basicButtonColor,
          }}
          right={(props) => <List.Icon {...props} icon={"account-edit"} size={20} />}
          onPress={
            this.state.loading ? () => {} : () => this.setState({ currentTextInputModal: "last" })
          }
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
