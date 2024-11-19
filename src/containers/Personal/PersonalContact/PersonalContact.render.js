import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import DatePickerModal from "../../../components/DatePickerModal/DatePickerModal";
import ListSelectionModal from "../../../components/ListSelectionModal/ListSelectionModal";
import PhoneNumberModal from "../../../components/PhoneNumberModal/PhoneNumberModal";
import TextInputModal from "../../../components/TextInputModal/TextInputModal";
import Styles from "../../../styles";
import { ISO_3166_COUNTRIES, ISO_3166_ALPHA_2_CODES } from "../../../utils/constants/iso3166";
import { CALLING_CODES_TO_ISO_3166 } from "../../../utils/constants/callingCodes";
import { PERSONAL_EMAILS, PERSONAL_NATIONALITIES, PERSONAL_PHONE_NUMBERS } from "../../../utils/constants/personal";
import { renderPersonalPhoneNumber } from "../../../utils/personal/displayUtils";

export const PersonalContactRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.addPropertyModal.open &&
            this.state.addPropertyModal.property === PERSONAL_EMAILS && (
              <TextInputModal
                visible={
                  this.state.addPropertyModal.open &&
                  this.state.addPropertyModal.property === PERSONAL_EMAILS
                }
                onChange={() => {}}
                cancel={(text) =>
                  this.finishEditEmailFromAddress(
                    text,
                    this.state.addPropertyModal.index
                  )
                }
              />
            )}
          {this.state.addPropertyModal.open &&
            this.state.addPropertyModal.property === PERSONAL_PHONE_NUMBERS && (
              <PhoneNumberModal
                initialPhone={
                  this.state.contact.phone_numbers &&
                  this.state.contact.phone_numbers[
                    this.state.addPropertyModal.index
                  ]
                    ? this.state.contact.phone_numbers[
                        this.state.addPropertyModal.index
                      ]
                    : null
                }
                title={this.state.addPropertyModal.label}
                visible={
                  this.state.addPropertyModal.open &&
                  this.state.addPropertyModal.property ===
                    PERSONAL_PHONE_NUMBERS
                }
                onSelect={(item) => {}}
                cancel={(phone) =>
                  this.finishPhoneEdit(phone, this.state.addPropertyModal.index)
                }
              />
            )}
          {this.state.editPropertyModal.open && (
            <ListSelectionModal
              title={this.state.editPropertyModal.label}
              flexHeight={0.5}
              visible={this.state.editPropertyModal.open}
              onSelect={(item) => this.selectEditPropertyButton(item.key)}
              data={this.EDIT_PROPERTY_BUTTONS}
              cancel={() => this.closeEditPropertyModal()}
            />
          )}
        </Portal>
        <List.Subheader>{"Email addresses"}</List.Subheader>
        <Divider />
        {this.state.contact.emails == null
          ? null
          : this.state.contact.emails.map((email, index) => {
              return (
                <React.Fragment key={index}>
                  <List.Item
                    key={index}
                    title={email.address}
                    right={(props) => (
                      <List.Icon {...props} icon={"account-edit"} size={20} />
                    )}
                    onPress={() =>
                      this.openEditPropertyModal(
                        `Email ${index + 1}`,
                        PERSONAL_EMAILS,
                        index
                      )
                    }
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
        <List.Item
          title={"Add email"}
          right={(props) => <List.Icon {...props} icon={"plus"} size={20} />}
          onPress={() => this.openAddEmailModal()}
        />
        <Divider />
        {/* <List.Subheader>{"Phone numbers"}</List.Subheader>
        <Divider />
        {this.state.contact.phone_numbers == null
          ? null
          : this.state.contact.phone_numbers.map((phone, index) => {
              const type = phone.type;
              const typeFr = type.charAt(0).toUpperCase() + type.slice(1);

              return (
                <React.Fragment key={index}>
                  <List.Item
                    key={index}
                    title={renderPersonalPhoneNumber(phone).title}
                    description={typeFr}
                    right={(props) => (
                      <List.Icon {...props} icon={"account-edit"} size={20} />
                    )}
                    onPress={() =>
                      this.openEditPropertyModal(
                        `Phone ${index + 1}`,
                        PERSONAL_PHONE_NUMBERS,
                        index
                      )
                    }
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
        <List.Item
          title={"Add phone number"}
          right={(props) => <List.Icon {...props} icon={"plus"} size={20} />}
          onPress={() => this.openAddPhoneModal()}
        />
        <Divider /> */}
      </ScrollView>
    </SafeAreaView>
  );
};
