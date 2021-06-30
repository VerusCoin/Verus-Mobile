import React from "react";
import { Text, SafeAreaView, ScrollView, View } from "react-native";
import { Divider, List, Avatar, Title } from "react-native-paper";
import Styles from "../../../styles";

export const PersonalInfoRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <View style={Styles.centerContainer}>
          <Avatar.Text
            size={96}
            label={`${this.state.attributes.name.first
              .charAt(0)
              .toUpperCase()}${this.state.attributes.name.last
              .charAt(0)
              .toUpperCase()}`}
            style={{
              marginVertical: 16,
            }}
          />
          <Title style={{ fontSize: 28, marginBottom: 16, padding: 0 }}>{`${
            this.state.attributes.name.first
          } ${
            this.state.attributes.name.middle != null &&
            this.state.attributes.name.middle.length > 0
              ? this.state.attributes.name.middle + " "
              : ""
          }${this.state.attributes.name.last}`}</Title>
        </View>
        <Divider />
        <List.Item
          title={"Personal Details"}
          description={"Name, birthday, nationalities, etc."}
          onPress={this.state.loading ? () => {} : () => this.openAttributes()}
          right={(props) => (
            <List.Icon {...props} icon={"chevron-right"} size={20} />
          )}
        />
        <Divider />
        <List.Item
          title={"Contact Points"}
          description={"Email addresses, phone numbers, etc."}
          right={(props) => (
            <List.Icon {...props} icon={"chevron-right"} size={20} />
          )}
        />
        <Divider />
        <List.Item
          title={"Locations"}
          description={"Physical addresses, tax countries, etc."}
          right={(props) => (
            <List.Icon {...props} icon={"chevron-right"} size={20} />
          )}
        />
        <Divider />
        <List.Item
          title={"Payment Info"}
          description={"Bank accounts, crypto addresses/identities, etc."}
          right={(props) => (
            <List.Icon {...props} icon={"chevron-right"} size={20} />
          )}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
