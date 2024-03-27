import React from "react";
import { Text, SafeAreaView, ScrollView, View } from "react-native";
import { Divider, List, Avatar, Title } from "react-native-paper";
import Styles from "../../../styles";
import { renderPersonalFullName } from "../../../utils/personal/displayUtils";
import { primitives } from "verusid-ts-client"
const { IDENTITYDATA_FIRSTNAME, IDENTITYDATA_LASTNAME, IDENTITYDATA_PERSONAL_DETAILS} = primitives;
export const PersonalInfoRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <View style={Styles.centerContainer}>
          <Avatar.Text
            size={96}
            label={`${this.state.attributes[IDENTITYDATA_FIRSTNAME.vdxfid]
              .charAt(0)
              .toUpperCase()}${this.state.attributes[IDENTITYDATA_LASTNAME.vdxfid].charAt(0).toUpperCase()}`}
            style={{
              marginVertical: 16,
            }}
          />
          <Title
            numberOfLines={1}
            style={{ fontSize: 28, marginBottom: 16, paddingVertical: 0, paddingHorizontal: 16 }}
          >
            {renderPersonalFullName(this.state.attributes).title}
          </Title>
        </View>
        <Divider />
        <List.Item
          title={"Personal Details"}
          description={"Name, birthday, nationalities, etc."}
          onPress={this.state.loading ? () => {} : () => this.openAttributes()}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
        />
        <Divider />
        <List.Item
          title={"Contact"}
          description={"Email addresses, phone numbers, etc."}
          onPress={this.state.loading ? () => {} : () => this.openContact()}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
        />
        <Divider />
        <List.Item
          title={"Locations"}
          description={"Physical addresses, tax countries & IDs, etc."}
          onPress={this.state.loading ? () => {} : () => this.openLocations()}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
        />
        <Divider />
        <List.Item
          title={"Banking Information"}
          description={"Bank accounts"}
          onPress={this.state.loading ? () => {} : () => this.openPaymentMethods()}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
        />
        <Divider />
        <List.Item
          title={"Documents & Images"}
          description={"Proof of identity, proof of address, etc."}
          onPress={this.state.loading ? () => {} : () => this.openImages()}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
