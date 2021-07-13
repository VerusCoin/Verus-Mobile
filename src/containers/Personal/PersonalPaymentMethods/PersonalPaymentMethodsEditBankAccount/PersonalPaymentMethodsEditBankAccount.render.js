import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List, Portal } from "react-native-paper";
import Styles from "../../../../styles";
import TextInputModal from "../../../../components/TextInputModal/TextInputModal"
import ListSelectionModal from "../../../../components/ListSelectionModal/ListSelectionModal";
import Colors from "../../../../globals/colors";
import DatePickerModal from "../../../../components/DatePickerModal/DatePickerModal";
import PhoneNumberModal from "../../../../components/PhoneNumberModal/PhoneNumberModal";
import { PERSONAL_BANK_COUNTRY } from "../../../../utils/constants/personal";
import { ISO_3166_COUNTRIES } from "../../../../utils/constants/iso3166";
import { BANK_ACCOUNT_KEYS, DEFAULT_BANK_KEYS } from "../../../../utils/constants/bankAccountKeys";

const PersonalPaymentMethodsEditBankAccountRenderInputBlock = function (
  value = "",
  description,
  placeholder,
  title,
  key,
  modalKey,
  renderIndex
) {
  return (
    <React.Fragment key={renderIndex}>
      <List.Subheader>{title}</List.Subheader>
      <Divider />
      <List.Item
        title={value.length > 0 ? value : placeholder}
        titleStyle={{
          color:
            value.length > 0 ? Colors.quaternaryColor : Colors.verusDarkGray,
        }}
        right={(props) => (
          <List.Icon {...props} icon={"account-edit"} size={20} />
        )}
        onPress={
          this.state.loading
            ? () => {}
            : () => this.setState({ [modalKey]: key })
        }
        description={description}
      />
      <Divider />
    </React.Fragment>
  );
};

const PersonalPaymentMethodsEditBankAccountRenderAddressSelector = function (
  value = "",
  description,
  title,
  renderIndex
) {
  return (
    <React.Fragment key={renderIndex}>
      <List.Subheader>{title}</List.Subheader>
      <Divider />
      <List.Item
        title={value}
        titleStyle={{
          color: value.includes("Configure address")
            ? Colors.verusDarkGray
            : Colors.quaternaryColor,
        }}
        right={(props) => (
          <List.Icon {...props} icon={"chevron-right"} size={20} />
        )}
        onPress={
          this.state.loading
            ? () => {}
            : () => this.openEditBankAccountAddress()
        }
        description={description}
      />
      <Divider />
    </React.Fragment>
  );
};

const PersonalPaymentMethodsEditBankAccountRenderInputKey = function (key, renderIndex) {
  if (this.TEXT_INPUT_FIELDS[key]) {
    return PersonalPaymentMethodsEditBankAccountRenderInputBlock.call(
      this,
      this.state.bankAccount[key],
      this.TEXT_INPUT_FIELDS[key].description,
      this.TEXT_INPUT_FIELDS[key].placeholder,
      this.TEXT_INPUT_FIELDS[key].title,
      key,
      "currentTextInputModal",
      renderIndex
    );
  } else if (this.LIST_SELECTION_FIELDS[key]) {
    return PersonalPaymentMethodsEditBankAccountRenderInputBlock.call(
      this,
      this.state.bankAccount[key],
      this.LIST_SELECTION_FIELDS[key].description,
      this.LIST_SELECTION_FIELDS[key].placeholder,
      this.LIST_SELECTION_FIELDS[key].title,
      key,
      "currentListSelectionModal",
      renderIndex
    );
  } else if (this.DATE_PICKER_FIELDS[key]) {
    return PersonalPaymentMethodsEditBankAccountRenderInputBlock.call(
      this,
      this.renderDate(
        this.state.bankAccount[key].day,
        this.state.bankAccount[key].month,
        this.state.bankAccount[key].year
      ),
      this.DATE_PICKER_FIELDS[key].description,
      this.DATE_PICKER_FIELDS[key].placeholder,
      this.DATE_PICKER_FIELDS[key].title,
      key,
      "currentDatePickerModal",
      renderIndex
    );
  } else if (this.PHONE_NUMBER_FIELDS[key]) {
    return PersonalPaymentMethodsEditBankAccountRenderInputBlock.call(
      this,
      this.state.bankAccount[key].calling_code != null ||
        this.state.bankAccount[key].number != null
        ? `${this.state.bankAccount[key].calling_code} ${this.state.bankAccount[key].number}`
        : "",
      this.PHONE_NUMBER_FIELDS[key].description,
      this.PHONE_NUMBER_FIELDS[key].placeholder,
      this.PHONE_NUMBER_FIELDS[key].title,
      key,
      "currentPhoneNumberModal",
      renderIndex
    );
  } else if (this.ADDRESS_SELECTION_FIELDS[key]) {
    const address = this.state.bankAccount[key]

    return PersonalPaymentMethodsEditBankAccountRenderAddressSelector.call(
      this,
      address.street1.length > 0
        ? `${address.street1}${
            address.street2.length > 0 ? `, ${address.street2}` : ""
          }`
        : "Configure address",
      `${address.postal_code.length > 0 ? `${address.postal_code} ` : ""}${
        address.state_province_region.length > 0
          ? `${address.state_province_region}, `
          : ""
      }${address.city.length > 0 ? `${address.city}, ` : "Unknown City, "}${
        ISO_3166_COUNTRIES[address.country] != null
          ? `${ISO_3166_COUNTRIES[address.country].emoji} ${
              ISO_3166_COUNTRIES[address.country].name
            }`
          : "Unknown Country"
      }`,
      this.ADDRESS_SELECTION_FIELDS[key].title,
      renderIndex
    );
  } else return <React.Fragment key={renderIndex} />;
}

export const PersonalPaymentMethodsEditBankAccountRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <Portal>
          {this.state.currentTextInputModal != null && (
            <TextInputModal
              value={this.state.bankAccount[this.state.currentTextInputModal]}
              visible={this.state.currentTextInputModal != null}
              onChange={(text) => {
                if (text != null)
                  this.setState({
                    bankAccount: {
                      ...this.state.bankAccount,
                      [this.state.currentTextInputModal]: text,
                    },
                  });
              }}
              cancel={() => this.closeModal()}
            />
          )}
          {this.state.currentListSelectionModal != null && (
            <ListSelectionModal
              flexHeight={3}
              value={
                this.state.bankAccount[this.state.currentListSelectionModal]
              }
              visible={this.state.currentListSelectionModal != null}
              onSelect={(item) => {
                if (item != null)
                  this.setState({
                    bankAccount: {
                      ...this.state.bankAccount,
                      [this.state.currentListSelectionModal]: item.key,
                    },
                  });
              }}
              data={
                this.LIST_SELECTION_FIELDS[this.state.currentListSelectionModal]
                  .data
              }
              title={
                this.LIST_SELECTION_FIELDS[this.state.currentListSelectionModal]
                  .title
              }
              cancel={() => this.closeModal()}
            />
          )}
          {this.state.currentDatePickerModal != null && (
            <DatePickerModal
              title={
                this.DATE_PICKER_FIELDS[this.state.currentDatePickerModal].title
              }
              flexHeight={0.5}
              visible={this.state.currentDatePickerModal != null}
              initialDate={
                this.state.bankAccount[this.state.currentDatePickerModal] !=
                  null &&
                this.state.bankAccount[this.state.currentDatePickerModal].day !=
                  null
                  ? new Date()
                  : new Date(
                      Date.UTC(
                        this.state.bankAccount[
                          this.state.currentDatePickerModal
                        ].year,
                        this.state.bankAccount[
                          this.state.currentDatePickerModal
                        ].month,
                        this.state.bankAccount[
                          this.state.currentDatePickerModal
                        ].day,
                        3,
                        0,
                        0
                      )
                    )
              }
              onSelect={() => {}}
              cancel={(date) => {
                this.setState(
                  {
                    bankAccount: {
                      ...this.state.bankAccount,
                      [this.state.currentDatePickerModal]: date,
                    },
                  },
                  () => this.closeModal()
                );
              }}
            />
          )}
          {this.state.currentPhoneNumberModal != null && (
            <PhoneNumberModal
              initialPhone={
                this.state.bankAccount[this.state.currentPhoneNumberModal]
              }
              title={
                this.PHONE_NUMBER_FIELDS[this.state.currentPhoneNumberModal]
                  .title
              }
              visible={this.state.currentPhoneNumberModal != null}
              onSelect={(item) => {}}
              cancel={(phone) => {
                this.setState(
                  {
                    bankAccount: {
                      ...this.state.bankAccount,
                      [this.state.currentPhoneNumberModal]: phone,
                    },
                  },
                  () => this.closeModal()
                );
              }}
            />
          )}
        </Portal>
        {this.state.bankAccount != null &&
        this.state.bankAccount[PERSONAL_BANK_COUNTRY] != null &&
        this.state.bankAccount[PERSONAL_BANK_COUNTRY].length != 0 ? (
          <React.Fragment>
            {BANK_ACCOUNT_KEYS[this.state.bankAccount[PERSONAL_BANK_COUNTRY]] ==
            null
              ? DEFAULT_BANK_KEYS.map((key, index) =>
                  PersonalPaymentMethodsEditBankAccountRenderInputKey.call(
                    this,
                    key,
                    index
                  )
                )
              : BANK_ACCOUNT_KEYS[
                  this.state.bankAccount[PERSONAL_BANK_COUNTRY]
                ].map((key, index) =>
                  PersonalPaymentMethodsEditBankAccountRenderInputKey.call(
                    this,
                    key,
                    index
                  )
                )}
          </React.Fragment>
        ) : (
          PersonalPaymentMethodsEditBankAccountRenderInputKey.call(
            this,
            PERSONAL_BANK_COUNTRY
          )
        )}
        <List.Subheader style={Styles.wide}>{"Bank account options"}</List.Subheader>
        <Divider />
        <List.Item
          title={"Delete bank account"}
          titleStyle={{
            color: Colors.warningButtonColor,
          }}
          right={(props) => <List.Icon {...props} icon={"close"} size={20} />}
          onPress={
            this.state.loading ? () => {} : () => this.tryDeleteBankAccount()
          }
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
