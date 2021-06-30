import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import Styles from "../../../../styles";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal"

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
          title={this.state.name.first}
          right={(props) => <List.Icon {...props} icon={"account-edit"} size={20} />}
          onPress={this.state.loading ? () => {} : () => this.setState({ currentTextInputModal: "first" })}
        />
        <Divider />
        <List.Subheader>{"Middle"}</List.Subheader>
        <Divider />
        <List.Item
          title={this.state.name.middle}
          right={(props) => <List.Icon {...props} icon={"account-edit"} size={20} />}
          onPress={this.state.loading ? () => {} : () => this.setState({ currentTextInputModal: "middle" })}
        />
        <Divider />
        <List.Subheader>{"Last"}</List.Subheader>
        <Divider />
        <List.Item
          title={this.state.name.last}
          right={(props) => <List.Icon {...props} icon={"account-edit"} size={20} />}
          onPress={this.state.loading ? () => {} : () => this.setState({ currentTextInputModal: "last" })}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
