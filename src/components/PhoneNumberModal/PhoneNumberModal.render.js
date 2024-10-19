import React from "react";
import { ScrollView, View } from "react-native";
//import TextInputMask from 'react-native-text-input-mask';
import { Text, TextInput, RadioButton, List, Divider } from "react-native-paper";
import Styles from "../../styles/";
import SemiModal from "../SemiModal";
import {
  PERSONAL_PHONE_TYPE_MOBILE,
  PERSONAL_PHONE_TYPE_HOME,
  PERSONAL_PHONE_TYPE_WORK,
} from "../../utils/constants/personal";

export const PhoneNumberModalRender = function () {
  const { visible, cancel, title } = this.props

  return (
    <SemiModal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => cancel(this.state.phone)}
      flexHeight={4}
      contentContainerStyle={{ backgroundColor: "white" }}
    >
      <View style={Styles.centerContainer}>
        <View
          style={{
            ...Styles.headerContainerSafeArea,
            minHeight: 36,
            maxHeight: 36,
            paddingBottom: 8,
          }}
        >
          <Text
            style={{
              ...Styles.centralHeader,
              ...Styles.smallMediumFont,
            }}
          >
            {title}
          </Text>
        </View>
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
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              width: "90%",
              marginTop: 16,
            }}
          >
            {/* <TextInput
              style={{ flex: 1 }}
              label="Ext."
              mode="outlined"
              returnKeyType="done"
              value={this.state.formattedExt}
              right={<Text>{"t"}</Text>}
              render={(props) => (
                <TextInputMask
                  {...props}
                  onChangeText={(formatted, extracted) => {
                    this.setCallingCode(formatted, extracted);
                  }}
                  keyboardType="phone-pad"
                  mask={"+[0000]"}
                />
              )}
            />
            <TextInput
              style={{ flex: 2 }}
              label="Phone"
              mode="outlined"
              returnKeyType="done"
              value={this.state.formattedPhone}
              render={(props) => (
                <TextInputMask
                  {...props}
                  onChangeText={(formatted, extracted) => {
                    this.setNumber(formatted, extracted);
                  }}
                  keyboardType="phone-pad"
                  mask={"[000] [000] [0000]"}
                />
              )}
            /> */}
          </View>
          <View style={{ ...Styles.fullWidth, marginTop: 16 }}>
            <Divider />
            <List.Subheader style={Styles.wide}>{"Phone Type"}</List.Subheader>
            <Divider />
          </View>
          <View style={Styles.fullWidth}>
            <RadioButton.Group
              style={{ width: "100%" }}
              value={this.state.phone.type}
            >
              <RadioButton.Item
                label="Mobile"
                onPress={() =>
                  this.editPhone("type", PERSONAL_PHONE_TYPE_MOBILE)
                }
                value={PERSONAL_PHONE_TYPE_MOBILE}
              />
              <RadioButton.Item
                label="Home"
                onPress={() => this.editPhone("type", PERSONAL_PHONE_TYPE_HOME)}
                value={PERSONAL_PHONE_TYPE_HOME}
              />
              <RadioButton.Item
                label="Work"
                onPress={() => this.editPhone("type", PERSONAL_PHONE_TYPE_WORK)}
                value={PERSONAL_PHONE_TYPE_WORK}
              />
            </RadioButton.Group>
          </View>
          <Divider />
        </ScrollView>
      </View>
    </SemiModal>
  );
};
