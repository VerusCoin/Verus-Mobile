import React from "react";
import { SafeAreaView, ScrollView } from "react-native";
import { Divider, List } from "react-native-paper";
import Styles from "../../../styles";
import { ISO_3166_COUNTRIES } from "../../../utils/constants/iso3166";

export const PersonalPaymentMethodsRender = function () {
  return (
    <SafeAreaView style={Styles.defaultRoot}>
      <ScrollView style={Styles.fullWidth}>
        <List.Subheader>{"Bank accounts"}</List.Subheader>
        <Divider />
        {this.state.payment_methods.bank_accounts == null
          ? null
          : this.state.payment_methods.bank_accounts.map((bankAccount, index) => {
              const accountLocaleString = ISO_3166_COUNTRIES[
                bankAccount.country
              ]
                ? `${ISO_3166_COUNTRIES[bankAccount.country].emoji} Account`
                : "Bank Account";
              const accountNumberString =
                bankAccount.account_number != null &&
                bankAccount.account_number.length > 4
                  ? ` ending in ${bankAccount.account_number.slice(-4)}`
                  : "";
              const accountDescription = `${
                bankAccount.primary_currency != null &&
                bankAccount.primary_currency.length > 0
                  ? bankAccount.primary_currency + " "
                  : ""
              }${bankAccount.account_type}`;

              return (
                <React.Fragment key={index}>
                  <List.Item
                    key={index}
                    title={`${accountLocaleString}${accountNumberString}`}
                    description={accountDescription}
                    right={(props) => (
                      <List.Icon {...props} icon={"account-edit"} size={20} />
                    )}
                    onPress={() => this.openEditBankAccount(index)}
                  />
                  <Divider />
                </React.Fragment>
              );
            })}
        <List.Item
          title={"Add bank account"}
          right={(props) => <List.Icon {...props} icon={"chevron-right"} size={20} />}
          onPress={() => this.openEditBankAccount()}
        />
        <Divider />
      </ScrollView>
    </SafeAreaView>
  );
};
