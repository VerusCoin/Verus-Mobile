import React from "react";
import { ScrollView, View } from "react-native";
import TextInputMask from 'react-native-text-input-mask';
import { Text, TextInput, RadioButton, List, Divider } from "react-native-paper";
import Styles from "../../styles/";
import SemiModal from "../SemiModal";
import {
  PERSONAL_PHONE_TYPE_MOBILE,
  PERSONAL_PHONE_TYPE_HOME,
  PERSONAL_PHONE_TYPE_WORK,
} from "../../utils/constants/personal";
import Colors from "../../globals/colors";

export const PhoneNumberModalRender = function () {
  const { visible, cancel, title } = this.props

  return (
    <SemiModal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => cancel(this.state.phone)}
      flexHeight={4}
      contentContainerStyle={{ backgroundColor:this.props.darkMode?Colors.darkModeColor:"white" }}
    >
      <View style={[Styles.centerContainer,
      {backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor}
      ]}>
        <View
          style={{
            ...Styles.headerContainerSafeArea,
            minHeight: 36,
            maxHeight: 36,
            paddingBottom: 8,
            backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor
          }}
        >
          <Text
            style={{
              ...Styles.centralHeader,
              ...Styles.smallMediumFont,  
              color:this.props.darkMode?Colors.secondaryColor:'black'
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
            backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor
          }}
        >
          <View
            style={{
              display: "flex",
              flexDirection: "row",
              width: "90%",
              marginTop: 16,
              backgroundColor:this.props.darkMode?Colors.darkModeColor:Colors.secondaryColor
            }}
          >
            <TextInput
              style={{ flex: 1,
                backgroundColor:this.props.darkMode?Colors.verusDarkModeForm:Colors.ultraUltraLightGrey
              }}
              theme={{
                colors: {
                  text: this.props.darkMode
                    ? Colors.secondaryColor
                    : 'black',
                  placeholder: this.props.darkMode
                    ? Colors.verusDarkGray
                    : Colors.verusDarkGray,
                },
              }}
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
              style={{ flex: 2,
                backgroundColor:this.props.darkMode?Colors.verusDarkModeForm:Colors.ultraUltraLightGrey
              }}
              theme={{
                colors: {
                  text: this.props.darkMode
                    ? Colors.secondaryColor
                    : 'black',
                  placeholder: this.props.darkMode
                    ? Colors.verusDarkGray
                    : Colors.verusDarkGray,
                },
              }}
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
            />
          </View>
          <View style={{ ...Styles.fullWidth, marginTop: 16 }}>
            <Divider 
            style={{
              backgroundColor:this.props.darkMode?Colors.secondaryColor:Colors.ultraUltraLightGrey
            }}
            />
            <List.Subheader style={[
              Styles.wide,
              {
                color:this.props.darkMode?Colors.lightGrey:Colors.defaultGrayColor
              }
            ]}
            
            >{"Phone Type"}</List.Subheader>
            <Divider />
          </View>
          <View style={Styles.fullWidth}>
            <RadioButton.Group
              style={{ width: "100%" }}
              value={this.state.phone.type}
            >
              <RadioButton.Item
              labelStyle={{
                color:this.props.darkMode?Colors.secondaryColor:'black'
              }}
                label="Mobile"
                onPress={() =>
                  this.editPhone("type", PERSONAL_PHONE_TYPE_MOBILE)
                }
                value={PERSONAL_PHONE_TYPE_MOBILE}
              />
              <RadioButton.Item
                labelStyle={{
                  color:this.props.darkMode?Colors.secondaryColor:'black'
                }}
                label="Home"
                onPress={() => this.editPhone("type", PERSONAL_PHONE_TYPE_HOME)}
                value={PERSONAL_PHONE_TYPE_HOME}
              />
              <RadioButton.Item
                labelStyle={{
                  color:this.props.darkMode?Colors.secondaryColor:'black'
                }}
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
